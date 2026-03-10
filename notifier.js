const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(token, { polling: false });

async function sendNotification(flat) {
    const message = `
🏠 *New Flat Found!*

*${flat.title}*
📍 ${flat.address}
💰 ${flat.price} | 📏 ${flat.area} | 🚪 ${flat.rooms}

🔗 [View Details](${flat.link})
    `;

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
