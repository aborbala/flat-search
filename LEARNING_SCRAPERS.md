# Learning the Scraping Mechanisms

This document explains in detail how each scraper in this project operates. 
Web scraping is the process of extracting data from a website, either by reading the HTML code or by intercepting the background API requests (JSON). 

Here is a breakdown of the specific approaches used for each real estate company in `scraper.js`.

---

## 1. Gesobau (JSON API)
**Approach**: Direct JSON Fetching
**Method**: `GET`
**URL Structure**: `https://www.gesobau.de/mieten/wohnungssuche/?resultsPerPage=10000...&resultAsJSON=1`

**How it works**:
- This is the easiest type of scraper. By using the browser's developer tools (Network tab), we noticed that Gesobau's website requests a URL ending with `&resultAsJSON=1`.
- When you request this URL, the server responds with pure, structured JSON instead of HTML.
- **Parsing**: Because the response is already in JSON format, we don't need any complex string matching or HTML parsing tools (like Cheerio). We simply loop through the items array (`item.raw.zimmer_intS`, `item.raw.wohnflaeche_floatS`) and we get exactly what we need, including coordinates (`item.lat`, `item.lng`).

## 2. Howoge (JSON API)
**Approach**: POST Request to an API endpoint
**Method**: `POST`
**URL**: `https://www.howoge.de/?type=999&tx_howrealestate_json_list[action]=immoList`

**How it works**:
- Similar to Gesobau, Howoge heavily relies on a background application (API) to load the flats into their web page. 
- We send a `POST` request with specific form-urlencoded payload (e.g., `tx_howrealestate_json_list[page]=1`).
- The response is a perfectly formatted JSON object containing an array called `immoobjects`. 
- **Parsing**: We iterate over `response.data.immoobjects`, easily extracting the price (`item.rent`), area (`item.area`), and coordinates (`item.coordinates.lat`, `item.coordinates.lng`).

## 3. Stadt und Land (JSON API via Cloudfront)
**Approach**: POST Request to an external CDN/API
**Method**: `POST`
**URL**: `https://d2396ha8oiavw0.cloudfront.net/sul-main/immoSearch`

**How it works**:
- Instead of using their main domain, Stadt und Land hosts their search API on an AWS CloudFront domain.
- We send an empty `POST` request to this endpoint with special headers (`Origin` and `Referer` set to their main site) to pretend we are calling from the browser.
- It returns JSON. We filter out elements that are not apartments (`item.details.immoType === 'wohnung'`), then extract the total rent (`item.costs.totalRent`) and living space (`item.details.livingSpace`).

## 4. Degewo (HTML Parsing via form submission)
**Approach**: POST Request returning HTML
**Method**: `POST`
**URL**: `https://www.degewo.de/immosuche`

**How it works**:
- Degewo's search requires us to submit our search criteria through a form (`application/x-www-form-urlencoded`).
- The payload contains variables like `tx_openimmo_immobilie[nettokaltmiete]` for price and `tx_openimmo_immobilie[wohnflaeche_start]` for area.
- The server responds with HTML, not JSON.
- **Parsing**: We use the `cheerio` library, which basically works like jQuery for servers. We locate the apartment cards (`$('article.article-list__item')`) and traverse downwards (`$el.find('h2.article__title').text()`).
- Because Degewo doesn't give precise geographic coordinates upfront, a separate helper function (`fetchDegewoZipCode`) fetches the detail page just to get the zip code, and we use an external map API to geocode it later.

## 5. Gewobag (HTML Parsing via URL query parameters)
**Approach**: GET Request returning HTML
**Method**: `GET`
**URL**: `https://www.gewobag.de/fuer-mietinteressentinnen/mietangebote/wohnung/?...`

**How it works**:
- Gewobag puts the search parameters right in the URL.
- We download the raw HTML response and parse it with Cheerio. 
- **Parsing**: We loop over `$('article.angebot-big-box')`. The price and area are often trapped in messy HTML tables (`tr.angebot-kosten`, `tr.angebot-area`), so we have to loop through table rows inside the element and check the text content to figure out which column is the Price and which is the Area.

## 6. WBM (HTML Parsing)
**Approach**: GET Request returning HTML
**Method**: `GET`
**URL**: `https://www.wbm.de/wohnungen-berlin/angebote/`

**How it works**:
- Very similar to Gewobag. We fetch the HTML list of apartments.
- **Parsing**: We select `.openimmo-search-list-item`. We read the inner text of `.main-property-rent`, `.main-property-size`, and `.main-property-rooms` to pull the core details. We use our `cleanNum()` helper to convert strings like "1.200,50 €" safely into basic integers/floats for our logic to compare.

## 7. Berlinovo (Two-Step HTML Parsing)
**Approach**: GET Request Overview -> Async Request Details
**Method**: `GET`
**URL**: `https://www.berlinovo.de/de/wohnungen/suche`

**How it works**:
- Berlinovo is the most complex scraper here because the overview page does **not** contain the exact area (m²) for all flats, but it *does* contain the price, rooms, and GPS coordinates hidden inside a `.field--name-field-location-geofield` class!
- **Step 1:** We fetch the HTML of the main list and parse each `article.node--type-apartment`. We extract what we can: rent, room count, and GPS coordinates. We filter out flats that are instantly too expensive or don't match our room count.
- **Step 2:** For the flats that survived the first check, we extract their detail page URL. We then fire asynchronous background requests (`detailPromises.push(async () => {...})`) to visit those individual pages. From the detail page (`$detail('.field--name-field-net-area')`), we locate the exact living space area. 
- Only if the *detail* page area matches our constraints do we add it to the final array. We added random short delays between these detail requests to avoid making their server crash or blocking our IP limit.

---

### Core Helper Functions:
1. **`cleanNum(val)`**: European prices use commas (,) for decimals and dots (.) for thousands formatting (e.g. 1.500,00). Javascript expects 1500.00. This regex helper scrubs all characters except digits and ensures commas/dots translate correctly.
2. **`geocodeFlat(flat)`**: For websites that don't output coordinates natively (like Degewo and Gewobag), we rely on free services like Photon (Komoot.io) API. We pass the text address, and Photon returns latitude/longitude coordinates so we can draw it on a map later.
