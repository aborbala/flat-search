const express = require('express');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const { scrapeDegewo, scrapeGesobau, scrapeGewobag, scrapeHowoge, geocodeFlat } = require('./scraper');

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

async function runScraper() {
    console.log('--- Starting Scraper Run ---');
    const existingFlats = loadFlats();
    
    console.log('Fetching flats from providers...');
    const degewoFlats = await scrapeDegewo();
    const gesobauFlats = await scrapeGesobau();
    const gewobagFlats = await scrapeGewobag();
    const howogeFlats = await scrapeHowoge();
    
    const allScrapedFlats = [...degewoFlats, ...gesobauFlats, ...gewobagFlats, ...howogeFlats];
    
    let newFlatsCount = 0;
    const updatedFlats = [...existingFlats];

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

    if (newFlatsCount > 0) {
        saveFlats(updatedFlats);
        console.log(`Saved ${newFlatsCount} new flats.`);
    } else {
        console.log('No new flats found.');
    }
    console.log('--- Scraper Run Finished ---');
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
