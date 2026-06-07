const express = require('express');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const _log = console.log.bind(console);
const _err = console.error.bind(console);
const ts = () => new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' });
console.log = (...a) => _log(`[${ts()}]`, ...a);
console.error = (...a) => _err(`[${ts()}]`, ...a);

const { scrapeDegewo, scrapeGesobau, scrapeGewobag, scrapeHowoge, scrapeWbm, scrapeStadtUndLand, scrapeBerlinovo, geocodeFlat } = require('./scraper');

const { loadFlats, saveFlats, isNewFlat } = require('./storage');
const { sendNotification } = require('./notifier');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/flats', (req, res) => {
    let flats = loadFlats();
    // Sort newest on top based on addedAt
    flats.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
    res.json(flats);
});

let scraperRunning = false;

async function runScraper() {
    if (scraperRunning) {
        console.log('Scraper already running, skipping this run.');
        return;
    }
    scraperRunning = true;
    try {
        console.log('--- Starting Scraper Run ---');
        const existingFlats = loadFlats();

        console.log('Fetching flats from providers...');
        const degewoFlats = await scrapeDegewo();
        const gesobauFlats = await scrapeGesobau();
        const gewobagFlats = await scrapeGewobag();
        const howogeFlats = await scrapeHowoge();
        const wbmFlats = await scrapeWbm();
        const stadtUndLandFlats = await scrapeStadtUndLand();
        const berlinovoFlats = await scrapeBerlinovo();
        const immoscoutFlats = null; // Disabled: Relying on official ImmoScout24 email alerts instead

        const activeProviders = {};
        // Only trust a provider's results for removal if it returned data (not null = scraper error,
        // not empty = could be a temporary API/filter quirk that would wrongly wipe stored flats)
        if (degewoFlats !== null && degewoFlats.length > 0) activeProviders['Degewo'] = degewoFlats;
        if (gesobauFlats !== null && gesobauFlats.length > 0) activeProviders['Gesobau'] = gesobauFlats;
        if (gewobagFlats !== null && gewobagFlats.length > 0) activeProviders['Gewobag'] = gewobagFlats;
        if (howogeFlats !== null && howogeFlats.length > 0) activeProviders['Howoge'] = howogeFlats;
        if (wbmFlats !== null && wbmFlats.length > 0) activeProviders['WBM'] = wbmFlats;
        if (stadtUndLandFlats !== null && stadtUndLandFlats.length > 0) activeProviders['Stadt und Land'] = stadtUndLandFlats;
        if (berlinovoFlats !== null && berlinovoFlats.length > 0) activeProviders['Berlinovo'] = berlinovoFlats;

        const allScrapedFlats = Object.values(activeProviders).flat();

        let newFlatsCount = 0;

        // Remove flats that are no longer present for successful scrapers
        let flatsRemoved = 0;
        let updatedFlats = existingFlats.filter(existingFlat => {
            // Only remove if we successfully scraped that provider this run
            if (activeProviders[existingFlat.source]) {
                const stillExists = activeProviders[existingFlat.source].some(
                    scraped => scraped.id === existingFlat.id
                );
                if (!stillExists) {
                    console.log(`Flat removed (no longer listed on ${existingFlat.source}): ${existingFlat.title}`);
                    flatsRemoved++;
                    return false;
                }
            }
            return true;
        });

        for (const flat of allScrapedFlats) {
            if (isNewFlat(flat, updatedFlats)) { // Use updatedFlats to avoid double-processing in the same run
                console.log(`New flat found from ${flat.source}: ${flat.title}`);

                // Geocode only if coordinates are missing (Degewo/Gewobag)
                const processedFlat = (flat.lat && flat.lon) ? flat : await geocodeFlat(flat);

                // Add a timestamp for when this listing was first found
                processedFlat.addedAt = new Date().toISOString();

                updatedFlats.push(processedFlat);

                // Save after EACH new flat to ensure we don't lose progress and API stays updated
                saveFlats(updatedFlats);

                await sendNotification(processedFlat);
                newFlatsCount++;
            }
        }

        if (newFlatsCount > 0 || flatsRemoved > 0) {
            saveFlats(updatedFlats);
            console.log(`Saved ${newFlatsCount} new flats. Removed ${flatsRemoved} outdated flats.`);
        } else {
            console.log('No new flats found and no flats removed.');
        }
        console.log('--- Scraper Run Finished ---');
    } finally {
        scraperRunning = false;
    }
}

// Run every 15 minutes
const interval = process.env.SCRIPE_INTERVAL_MINUTES || 15;
cron.schedule(`*/${interval} * * * *`, async () => {
    await runScraper();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Scraper scheduled to run every ${interval} minutes.`);
    
    // Run initially
    runScraper();
});
