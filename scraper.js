const axios = require('axios');
const cheerio = require('cheerio');
const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

async function scrapeDegewo() {
  console.log('Scraping Degewo...');
  
  const url = 'https://www.degewo.de/immosuche';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://www.degewo.de/',
    'Origin': 'https://www.degewo.de'
  };

  const data = new URLSearchParams({
    'tx_openimmo_immobilie[search]': 'search',
    'tx_openimmo_immobilie[page]': '1',
    'tx_openimmo_immobilie[nettokaltmiete]': '0_700',
    'tx_openimmo_immobilie[wohnflaeche_start]': '40',
    'tx_openimmo_immobilie[wohnflaeche_end]': '60',
    'tx_openimmo_immobilie[anzahlZimmer_start]': '1',
    'tx_openimmo_immobilie[anzahlZimmer_end]': '2',
    'tx_openimmo_immobilie[sortBy]': 'immobilie_preise_warmmiete',
    'tx_openimmo_immobilie[sortOrder]': 'asc'
  });

  try {
    const response = await axios.post(url, data.toString(), { headers });
    const $ = cheerio.load(response.data);
    const flats = [];

    $('article.article-list__item').each((i, element) => {
        const $el = $(element);
        const link = 'https://www.degewo.de' + $el.find('a').attr('href');
        const id = link.split('/').pop();
        const title = $el.find('h2.article__title').text().trim();
        const address = $el.find('span.article__meta').text().trim().replace(/\s+/g, ' ');
        
        const price = $el.find('.article__price-tag .price').text().trim();
        const rooms = $el.find('.article__properties-item:nth-child(1) .text').text().trim();
        const area = $el.find('.article__properties-item:nth-child(2) .text').text().trim();

        flats.push({
            id,
            title,
            link,
            address,
            price,
            area,
            rooms,
            source: 'Degewo'
        });
    });

    console.log(`Found ${flats.length} flats on Degewo.`);
    return flats;
  } catch (error) {
    console.error('Error scraping Degewo:', error.message);
    return [];
  }
}

async function fetchDegewoZipCode(link) {
    try {
        // Add a small random delay (1-3 seconds) to avoid rate limiting
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        const response = await axios.get(link, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0' }
        });
        const $ = cheerio.load(response.data);
        
        // Address is usually in span.expose__meta
        const fullAddress = $('span.expose__meta').first().text().trim();
        if (!fullAddress) {
            console.warn(`Could not find address on detail page: ${link}`);
            return null;
        }

        const parts = fullAddress.split('|');
        if (parts.length > 1) {
            const zipPart = parts[1].trim(); 
            const zipMatch = zipPart.match(/\d{5}/);
            if (zipMatch) {
                return zipMatch[0];
            }
        }
        console.warn(`Could not extract ZIP from address string: "${fullAddress}"`);
    } catch (error) {
        console.error(`Error fetching detail page for ${link}:`, error.message);
    }
    return null;
}

async function geocodeFlat(flat) {
    try {
        if (!flat.address) {
            console.warn(`No address for flat: ${flat.title}`);
            return flat;
        }

        let queryAddress = flat.address;

        if (flat.source === 'Degewo') {
            console.log(`Fetching ZIP code for Degewo flat: ${flat.link}`);
            const zip = await fetchDegewoZipCode(flat.link);
            if (zip) {
                const street = flat.address.split('|')[0].trim();
                queryAddress = `${street}, ${zip} Berlin, Germany`;
                flat.fullAddress = queryAddress; // Store full address for display
            } else {
                queryAddress = flat.address.split('|')[0].trim() + ', Berlin, Germany';
            }
        } else if (flat.source === 'Gesobau') {
            queryAddress = flat.address + ', Germany';
        }

        console.log(`Geocoding: ${queryAddress}`);
        const res = await geocoder.geocode(queryAddress);
        
        if (res.length > 0) {
            flat.lat = res[0].latitude;
            flat.lon = res[0].longitude;
            console.log(`Geocoded ${flat.title} to ${flat.lat}, ${flat.lon}`);
        } else {
            console.warn(`Geocoding returned no results for: ${queryAddress}`);
        }
    } catch (error) {
        console.error(`Geocoding failed for ${flat.address}:`, error.message);
    }
    return flat;
}

async function scrapeGesobau() {
  console.log('Scraping Gesobau...');
  const url = 'https://www.gesobau.de/mieten/wohnungssuche/?tx_solr[filter][0]=zimmer:\'1-1\'&resultsPerPage=10000&resultsPage=0&resultAsJSON=1&befilter[0]=kanal_stringM:Bestand&befilter[1]=nutzungsart_stringS:WOHNEN';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const data = response.data;
    const flats = data.map(item => ({
      id: item.uid.toString(),
      title: item.raw.title,
      link: 'https://www.gesobau.de' + item.detail,
      address: item.raw.adresse_stringS + ', ' + item.raw.plz_stringS + ' ' + item.raw.ort_stringS,
      price: item.raw.warmmiete_floatS + ' €',
      area: item.raw.wohnflaeche_floatS + ' m²',
      rooms: item.raw.zimmer_intS.toString(),
      lat: item.lat,
      lon: item.lng,
      source: 'Gesobau'
    }));
    console.log('Found ' + flats.length + ' flats on Gesobau.');
    return flats;
  } catch (error) {
    console.error('Error scraping Gesobau:', error.message);
    return [];
  }
}

module.exports = {
  scrapeGesobau,
  scrapeDegewo,
  geocodeFlat
};
