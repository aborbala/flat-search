const express = require('express');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const { scrapeDegewo, geocodeFlat } = require('./scraper');
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
    const degewoFlats = await scrapeDegewo();
    
    let newFlatsCount = 0;
    const updatedFlats = [...existingFlats];

    for (const flat of degewoFlats) {
        if (isNewFlat(flat, existingFlats)) {
            console.log(`New flat found: ${flat.title}`);
            const geocodedFlat = await geocodeFlat(flat);
            updatedFlats.push(geocodedFlat);
            await sendNotification(geocodedFlat);
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
