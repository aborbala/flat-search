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
    const tmp = DATA_FILE + '.tmp';
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(tmp, JSON.stringify(flats, null, 2), 'utf8');
        fs.renameSync(tmp, DATA_FILE);
    } catch (error) {
        console.error('Error saving flats:', error);
        try { fs.unlinkSync(tmp); } catch (_) {}
    }
}

const stripQuery = url => (url || '').split('?')[0];

// Same provider + address + area = same physical flat, regardless of ID/link changes
const sameContent = (a, b) =>
    a.source === b.source &&
    a.address && b.address && a.address === b.address &&
    a.area && b.area && a.area === b.area;

function isNewFlat(flat, existingFlats) {
    return !existingFlats.some(f =>
        (f.source === flat.source && f.id === flat.id) ||
        (stripQuery(f.link) === stripQuery(flat.link) && !!flat.link) ||
        sameContent(f, flat)
    );
}

module.exports = {
    loadFlats,
    saveFlats,
    isNewFlat
};
