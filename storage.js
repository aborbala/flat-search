const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'flats.json');

function loadFlats() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Error loading flats (corrupt data file?):', error);
        return [];
    }
}

function saveFlats(flats) {
    // Plain direct write — simple and reliable on Android/Termux FUSE storage.
    // (tmp+renameSync "atomic" writes misbehave on some Android filesystems.)
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(flats, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving flats:', error);
    }
}

const stripQuery = url => (url || '').split('?')[0];

function isNewFlat(flat, existingFlats) {
    return !existingFlats.some(f =>
        (f.source === flat.source && f.id === flat.id) ||
        (stripQuery(f.link) === stripQuery(flat.link) && !!flat.link)
    );
}

module.exports = {
    loadFlats,
    saveFlats,
    isNewFlat
};
