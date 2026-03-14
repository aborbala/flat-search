const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.wbm.de/wohnungen-berlin/angebote/', {headers:{'User-Agent':'Mozilla/5.0'}})
  .then(r => {
    const $ = cheerio.load(r.data);
    $('.openimmo-search-list-item').each((i, el)=>{
      console.log(
        $(el).find('.imageTitle').text().trim(), 
        '| rent:', $(el).find('.main-property-rent').text().trim(), 
        '| size:', $(el).find('.main-property-size').text().trim(), 
        '| rooms:', $(el).find('.main-property-rooms').text().trim()
      );
    });
  });
