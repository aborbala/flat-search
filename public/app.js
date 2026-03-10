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

    flats.forEach(flat => {
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
        `;
        
        card.onclick = () => {
            if (flat.lat && flat.lon) {
                map.flyTo([flat.lat, flat.lon], 14);
            }
            window.open(flat.link, '_blank');
        };

        flatList.appendChild(card);

        // Add Map Marker
        if (flat.lat && flat.lon) {
            const marker = L.marker([flat.lat, flat.lon]).addTo(map);
            marker.bindPopup(`
                <div style="font-family: 'Outfit', sans-serif;">
                    <strong style="display:block; margin-bottom:5px;">${flat.title}</strong>
                    <div style="color: #10b981; font-weight: 600;">${flat.price}</div>
                    <a href="${flat.link}" target="_blank" style="color: #6366f1; text-decoration: none; font-size: 0.8rem; display: block; margin-top: 5px;">View on Degewo</a>
                </div>
            `);
            markers.push(marker);
        }
    });

    if (flats.length > 0 && flats[0].lat) {
        // map.fitBounds(L.featureGroup(markers).getBounds());
    }
}

fetchFlats();
// Refresh every minute
setInterval(fetchFlats, 60000);
