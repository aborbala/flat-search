const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'flats.json');

function loadFlats() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading flats:', error);
        return [];
    }
}

function saveFlats(flats) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(flats, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving flats:', error);
    }
}

function isNewFlat(flat, existingFlats) {
    // Check by ID or Link for robustness
    return !existingFlats.some(f => f.id === flat.id || f.link === flat.link);
}

module.exports = {
    loadFlats,
    saveFlats,
    isNewFlat
};
