const axios = require('axios');
const cheerio = require('cheerio');

const cleanNum = (val) => {
  if (val === null || val === undefined) return 0;
  let str = String(val);
  let cleaned = str.replace(/[^\d,\.]/g, '').trim();
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
      cleaned = cleaned.replace(/,/g, '');
  } else {
      if (cleaned.includes(',')) cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
};


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
    'tx_openimmo_immobilie[nettokaltmiete]': '0_900',
    'tx_openimmo_immobilie[wohnflaeche_start]': '40',
    'tx_openimmo_immobilie[wohnflaeche_end]': '55',
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

        const priceNum = cleanNum(price);
        const areaNum = cleanNum(area);
        const roomsNum = cleanNum(rooms);

        if (roomsNum >= 1 && roomsNum <= 2 && priceNum <= 900 && areaNum >= 40 && areaNum <= 55) {
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
        }
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
        // Add a small random delay (1-2 seconds) to avoid rate limiting
        const delay = Math.floor(Math.random() * 1000) + 1000;
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
            const zip = await fetchDegewoZipCode(flat.link);
            if (zip) {
                const street = flat.address.split('|')[0].trim();
                queryAddress = `${street}, ${zip} Berlin, Germany`;
                flat.fullAddress = queryAddress; 
            } else {
                queryAddress = flat.address.split('|')[0].trim() + ', Berlin, Germany';
            }
        } else if (['Gesobau', 'Gewobag', 'Howoge', 'WBM'].includes(flat.source)) {
            queryAddress = flat.address + ', Germany';
        }

        // Delay to avoid overwhelming free APIs
        await new Promise(resolve => setTimeout(resolve, 3100));

        console.log(`Geocoding (${flat.source}): ${queryAddress}`);
        
        // Try Photon (komoot.io) which is OSM-based but often more permissive
        const response = await axios.get('https://photon.komoot.io/api/', {
            params: {
                q: queryAddress,
                limit: 1
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (response.data && response.data.features && response.data.features.length > 0) {
            const feature = response.data.features[0];
            flat.lat = feature.geometry.coordinates[1];
            flat.lon = feature.geometry.coordinates[0];
            console.log(`Geocoded ${flat.title} to ${flat.lat}, ${flat.lon} (Photon)`);
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
  const url = 'https://www.gesobau.de/mieten/wohnungssuche/?resultsPerPage=10000&resultsPage=0&resultAsJSON=1&befilter[0]=kanal_stringM:Bestand&befilter[1]=nutzungsart_stringS:WOHNEN';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const data = response.data;
    const flats = [];
    
    for (const item of data) {
        const roomsNum = cleanNum(item.raw.zimmer_intS);
        const areaNum = cleanNum(item.raw.wohnflaeche_floatS);
        const priceNum = cleanNum(item.raw.warmmiete_floatS);
        
        if (roomsNum >= 1 && roomsNum <= 2 && areaNum >= 40 && areaNum <= 55 && priceNum <= 900) {
            flats.push({
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
            });
        }
    }
    console.log(`Found ${flats.length} filtered flats on Gesobau (from ${data.length} total).`);
    return flats;
  } catch (error) {
    console.error('Error scraping Gesobau:', error.message);
    return [];
  }
}

async function scrapeGewobag() {
  console.log('Scraping Gewobag...');
  const url = 'https://www.gewobag.de/fuer-mietinteressentinnen/mietangebote/wohnung/?objekttyp%5B%5D=wohnung&gesamtmiete_von=&gesamtmiete_bis=&gesamtflaeche_von=&gesamtflaeche_bis=&zimmer_von=&zimmer_bis=&sort-by=';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0'
      }
    });
    const $ = cheerio.load(response.data);
    const results = [];

    $('article.angebot-big-box').each((i, element) => {
        const $el = $(element);
        const title = $el.find('h3.angebot-title').text().trim();
        const link = $el.find('a.read-more-link').attr('href');
        const id = link.split('/').filter(Boolean).pop();
        const address = $el.find('address').text().trim().replace(/\s+/g, ' ');
        
        let priceStr = '0';
        $el.find('tr.angebot-kosten').each((j, row) => {
            if ($(row).find('th').text().includes('Gesamtmiete')) {
                priceStr = $(row).find('td').text().trim();
            }
        });

        let areaStr = '0';
        let roomsStr = '0';
        const areaText = $el.find('tr.angebot-area td').text().trim();
        if (areaText) {
            const parts = areaText.split('|').map(p => p.trim());
            roomsStr = parts[0];
            areaStr = parts[1];
        }

        const priceNum = cleanNum(priceStr);
        const areaNum = cleanNum(areaStr);
        const roomsNum = cleanNum(roomsStr);

        if (roomsNum >= 1 && roomsNum <= 2 && priceNum <= 900 && areaNum >= 40 && areaNum <= 55) {
            results.push({
                id,
                title,
                link,
                address,
                price: priceStr,
                area: areaStr,
                rooms: roomsStr,
                source: 'Gewobag'
            });
        }
    });

    console.log(`Found ${results.length} filtered flats on Gewobag (from ${$('article.angebot-big-box').length} total).`);
    return results;
  } catch (error) {
    console.error('Error scraping Gewobag:', error.message);
    return [];
  }
}

async function scrapeHowoge() {
  console.log('Scraping Howoge...');
  const url = 'https://www.howoge.de/?type=999&tx_howrealestate_json_list[action]=immoList';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://www.howoge.de',
    'Referer': 'https://www.howoge.de/immobiliensuche/wohnungssuche.html'
  };

  const data = 'tx_howrealestate_json_list%5Bpage%5D=1&tx_howrealestate_json_list%5Blimit%5D=100&tx_howrealestate_json_list%5Blang%5D=&tx_howrealestate_json_list%5Brooms%5D=&tx_howrealestate_json_list%5Bwbs%5D=';

  try {
    const response = await axios.post(url, data, { headers });
    const immoobjects = response.data.immoobjects || [];
    const results = [];

    for (const item of immoobjects) {
        const roomsNum = item.rooms;
        const areaNum = item.area;
        const priceNum = item.rent;

        if (roomsNum >= 1 && roomsNum <= 2 && areaNum >= 40 && areaNum <= 55 && priceNum <= 900) {
            results.push({
                id: item.uid.toString(),
                title: item.title,
                link: 'https://www.howoge.de' + item.link,
                address: item.title, 
                price: item.rent + ' €',
                area: item.area + ' m²',
                rooms: item.rooms.toString(),
                lat: item.coordinates ? parseFloat(item.coordinates.lat) : null,
                lon: item.coordinates ? parseFloat(item.coordinates.lng) : null,
                source: 'Howoge'
            });
        }
    }

    console.log(`Found ${results.length} filtered flats on Howoge (from ${immoobjects.length} total).`);
    return results;
  } catch (error) {
    console.error('Error scraping Howoge:', error.message);
    return [];
  }
}

async function scrapeWbm() {
  console.log('Scraping WBM...');
  const url = 'https://www.wbm.de/wohnungen-berlin/angebote/';
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0'
      }
    });
    const $ = cheerio.load(response.data);
    const results = [];

    $('.openimmo-search-list-item').each((i, element) => {
        const $el = $(element);
        const title = $el.find('.imageTitle').text().trim();
        const linkElem = $el.find('a.immo-button-cta, .btn.sign');
        let link = linkElem.attr('href');
        if (link && !link.startsWith('http')) {
            link = 'https://www.wbm.de' + link;
        }
        
        const id = $el.attr('data-uid');
        const address = $el.find('.address').text().trim().replace(/\s+/g, ' ');

        const priceStr = $el.find('.main-property-rent').text().trim();
        const areaStr = $el.find('.main-property-size').text().trim();
        const roomsStr = $el.find('.main-property-rooms').text().trim();

        const priceNum = cleanNum(priceStr);
        const areaNum = cleanNum(areaStr);
        const roomsNum = cleanNum(roomsStr);

        if (id && roomsNum >= 1 && roomsNum <= 2 && priceNum <= 900 && areaNum >= 40 && areaNum <= 55) {
            results.push({
                id,
                title,
                link,
                address,
                price: priceStr,
                area: areaStr,
                rooms: roomsStr,
                source: 'WBM'
            });
        }
    });

    console.log(`Found ${results.length} filtered flats on WBM.`);
    return results;
  } catch (error) {
    console.error('Error scraping WBM:', error.message);
    return [];
  }
}

module.exports = {
  scrapeGesobau,
  scrapeDegewo,
  scrapeGewobag,
  scrapeHowoge,
  scrapeWbm,
  geocodeFlat
};
