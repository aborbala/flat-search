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
    const json = JSON.stringify(flats, null, 2);
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    } catch (error) {
        console.error('Could not create data directory:', error.message);
    }

    // Try atomic write (tmp + rename). renameSync fails on some Android/FUSE
    // storage (EXDEV/EPERM), so fall back to a direct write if it throws.
    const tmp = DATA_FILE + '.tmp';
    try {
        fs.writeFileSync(tmp, json, 'utf8');
        fs.renameSync(tmp, DATA_FILE);
    } catch (error) {
        console.error('Atomic save failed, falling back to direct write:', error.message);
        try { fs.unlinkSync(tmp); } catch (_) {}
        try {
            fs.writeFileSync(DATA_FILE, json, 'utf8');
        } catch (writeError) {
            console.error('FATAL: could not persist flats — duplicates will repeat:', writeError.message);
            return;
        }
    }

    // Verify the write actually landed, so persistence failures are never silent
    if (!fs.existsSync(DATA_FILE)) {
        console.error('FATAL: flats.json missing after save — persistence is broken');
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
