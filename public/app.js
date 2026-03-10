const map = L.map('map', {
    zoomControl: false
}).setView([52.5200, 13.4050], 11);

// Premium Dark Map Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

const flatList = document.getElementById('flat-list');
const stats = document.getElementById('stats');
let markers = [];

async function fetchFlats() {
    try {
        const response = await fetch('/api/flats');
        const flats = await response.json();
        renderFlats(flats);
    } catch (error) {
        console.error('Error fetching flats:', error);
        stats.textContent = 'Error loading flats.';
    }
}

function renderFlats(flats) {
    flatList.innerHTML = '';
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    stats.textContent = `Found ${flats.length} flats recently.`;

    flats.forEach((flat, index) => {
        // Create Sidebar Card
        const card = document.createElement('div');
        card.className = 'flat-card';
        card.innerHTML = `
            <h3>${flat.title}</h3>
            <div class="flat-address">${flat.address}</div>
            <div class="flat-details">
                <span class="price">${flat.price}</span>
                <span>${flat.area}</span>
                <span>${flat.rooms}</span>
            </div>
            <div class="flat-actions">
                <button class="btn-map" onclick="zoomToFlat(${index}, event)">Show on Map</button>
                <a href="${flat.link}" target="_blank" class="btn-link">View Details</a>
            </div>
        `;
        
        card.onclick = () => {
            if (flat.lat && flat.lon) {
                map.flyTo([flat.lat, flat.lon], 15);
            }
        };

        flatList.appendChild(card);

        // Add Map Marker
        if (flat.lat && flat.lon) {
            const marker = L.marker([flat.lat, flat.lon]).addTo(map);
            marker.bindPopup(`
                <div style="font-family: 'Outfit', sans-serif;">
                    <strong style="display:block; margin-bottom:5px;">${flat.title}</strong>
                    <div style="color: #10b981; font-weight: 600; margin-bottom: 5px;">${flat.price}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">${flat.address}</div>
                    <a href="${flat.link}" target="_blank" style="color: #6366f1; text-decoration: none; font-size: 0.8rem; font-weight: 600; display: block;">View listing</a>
                </div>
            `);
            markers.push(marker);
            marker.flatIndex = index;
        } else {
            markers.push(null);
        }
    });

    if (flats.length > 0 && markers.some(m => m)) {
        // Option to fit bounds
    }
}

window.zoomToFlat = (index, event) => {
    event.stopPropagation();
    const marker = markers[index];
    if (marker) {
        const latLng = marker.getLatLng();
        map.flyTo(latLng, 16);
        marker.openPopup();
    }
};

fetchFlats();
// Refresh every minute
setInterval(fetchFlats, 60000);
