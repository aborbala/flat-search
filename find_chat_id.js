const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Bot is polling for messages...');
console.log('Please send a message to your bot on Telegram to find your Chat ID.');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log(`Received message from Chat ID: ${chatId}`);
    bot.sendMessage(chatId, `Success! Your Chat ID is: ${chatId}. Please update your .env file if this is different from what you provided.`);
});
