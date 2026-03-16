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
