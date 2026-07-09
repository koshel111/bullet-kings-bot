// ============================================
// BULLET KINGS - ГЛАВНЫЙ БОТ (С БОЕВЫМ ПРОПУСКОМ)
// ============================================

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден в .env!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ============================================
// ПОДКЛЮЧАЕМ ОБРАБОТЧИКИ
// ============================================
require('./src/handlers/start')(bot);
require('./src/handlers/game')(bot);
require('./src/handlers/shop')(bot);
require('./src/handlers/profile')(bot);
  // ← НОВЫЙ ОБРАБОТЧИК!

// ============================================
// ЗАПУСК
// ============================================
bot.launch().then(() => {
  console.log('✅ Бот запущен!');
  console.log('🤖 @' + bot.botInfo.username);
}).catch((err) => {
  console.error('❌ Ошибка запуска:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


