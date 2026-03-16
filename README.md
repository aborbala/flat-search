# Flat Search Notifier

An automated flat/apartment search tool that scrapes various property providers in Berlin, saves new listings to a local database (JSON), and sends notifications via a Telegram Bot.

## Supported Companies

The scraper currently monitors the following platforms for flats:
- **Degewo**
- **Gesobau**
- **Gewobag**
- **Howoge**
- **WBM**
- **Stadt und Land**
- **Berlinovo**

## Configuration

Your primary search criteria are located in `config.js` in the project root. This file allows you to quickly alter what kind of flats you are looking for.

### `config.js`

This file is where we import the sensitive IDs from your `.env` file. You can adjust your housing requirements here:

```javascript
require('dotenv').config();

module.exports = {
  minRooms: 1,
  maxRooms: 2,
  minArea: 40,
  maxArea: 55,
  maxPrice: 900, // Warmmiete (total rent) in EUR
  telegramToken: process.env.TELEGRAM_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID
};
```

You can update this file safely whenever your budget or sizing needs change. The scraper will utilize these constraints dynamically.

### `.env` (Sensitive Information)

Since your Telegram ID and Bot Token are sensitive information, they are stored securely in a local environment variable file named `.env`. This file is completely ignored by Git (using `.gitignore`) so it won't be pushed publicly.

Ensure you have a `.env` file in the project root that looks like this:

```env
TELEGRAM_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_sensitive_telegram_chat_id_here
PORT=3000
SCRIPE_INTERVAL_MINUTES=15
```

## How to Set Up and Start

To grab the latest changes, install dependencies, and turn the server on, run the following commands sequentially in your terminal:

1. **Pull the latest changes from GitHub:**
   ```bash
   git pull origin main
   ```

2. **Install all project dependencies:**
   ```bash
   npm install
   ```

3. **Start the background process & server:**
   ```bash
   node server.js
   ```

Once running, the application serves a simple frontend on `http://localhost:3000` (or whatever `PORT` you chose). A background CRON job will wake up periodically (based on `SCRIPE_INTERVAL_MINUTES`) and scrape all the integrated companies.

## Additional Features & Info

- The project relies on `data/flats.json` to persist listed flats. Outdated flats will automatically be removed from your frontend during successful scrape intervals, while new listings will send an alert trigger to your Telegram App.
- Geocoding features attempt to gather latitude/longitude coordinates to show exact plot locations on your map.
- The telegram token and app chat token are piped cleanly to the node-telegram-bot instance without floating directly inside the `config.js` text or Git history.
