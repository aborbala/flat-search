const axios = require('axios');

async function testStadtUndLand() {
  try {
    const response = await axios.post('https://d2396ha8oiavw0.cloudfront.net/sul-main/immoSearch', {}, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': 'https://stadtundland.de',
        'Referer': 'https://stadtundland.de/'
      }
    });
    console.log(JSON.stringify(response.data).substring(0, 1000));
    const fs = require('fs');
    fs.writeFileSync('data/stadtundland.json', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

testStadtUndLand();
