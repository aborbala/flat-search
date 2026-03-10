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
    const flats = loadFlats();
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
        if (isNewFlat(flat, existingFlats)) {
            console.log(`New flat found from ${flat.source}: ${flat.title}`);
            
            // Geocode only if coordinates are missing (Degewo)
            const processedFlat = (flat.lat && flat.lon) ? flat : await geocodeFlat(flat);
            
            updatedFlats.push(processedFlat);
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
