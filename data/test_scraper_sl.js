const axios = require('axios');
const config = require('./config');

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

async function scrapeStadtUndLand() {
  console.log('Scraping Stadt und Land...');
  const url = 'https://d2396ha8oiavw0.cloudfront.net/sul-main/immoSearch';
  
  try {
    const response = await axios.post(url, {}, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': 'https://stadtundland.de',
        'Referer': 'https://stadtundland.de/'
      }
    });

    const data = response.data.data || [];
    const results = [];

    for (const item of data) {
        if (item.details && item.details.immoType === 'wohnung') {
            const roomsNum = cleanNum(item.details.rooms);
            const areaNum = cleanNum(item.details.livingSpace);
            const priceNum = cleanNum(item.costs.totalRent || item.costs.warmRent);

            if (roomsNum >= config.minRooms && roomsNum <= config.maxRooms && areaNum >= config.minArea && areaNum <= config.maxArea && priceNum <= config.maxPrice) {
                const id = item.details.immoNumber || Math.random().toString();
                const addressObj = item.address || {};
                const addressStr = `${addressObj.street || ''} ${addressObj.house_number || ''}, ${addressObj.postal_code || ''} ${addressObj.city || ''}`.trim();

                results.push({
                    id: id.toString(),
                    title: item.headline,
                    // Stadt und Land does not provide direct clear URLs in search list, so we fallback to root
                    link: 'https://stadtundland.de/Mieten/index.php', 
                    address: addressStr.replace(/\s+/g, ' '),
                    price: (item.costs.totalRent || item.costs.warmRent) + ' €',
                    area: item.details.livingSpace + ' m²',
                    rooms: item.details.rooms,
                    source: 'Stadt und Land'
                });
            }
        }
    }
    
    console.log(`Found ${results.length} filtered flats on Stadt und Land.`);
    return results;
  } catch (error) {
    console.error('Error scraping Stadt und Land:', error.message);
    return [];
  }
}

scrapeStadtUndLand().then(r => console.log(r));
