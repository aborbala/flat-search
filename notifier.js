const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const token = config.telegramToken;
const chatId = config.telegramChatId;

const bot = new TelegramBot(token, { polling: false });

async function sendNotification(flat) {
    const mapsLine = (flat.lat && flat.lon)
        ? `\n🗺 [Open in Google Maps](https://maps.google.com/?q=${flat.lat},${flat.lon})`
        : '';

    const addressLine = flat.address && flat.address !== flat.title
        ? `\n📍 ${flat.address}`
        : '';

    const message = `🏠 *New flat — ${flat.source}*
───────────────────
📌 *${flat.title}*${addressLine}${mapsLine}
───────────────────
💶 ${flat.price}
📐 ${flat.area}
🚪 ${flat.rooms} room(s)
───────────────────
🔗 [View listing](${flat.link})`;

    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`Notification sent for: ${flat.title}`);
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}

module.exports = {
    sendNotification
};
