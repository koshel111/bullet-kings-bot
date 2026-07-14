// ============================================
// BULLET KINGS - ГЛАВНЫЙ БОТ
// ============================================

const { Telegraf, session, Markup } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
require('./src/handlers/shopCosmetics')(bot);
require('./src/handlers/admin')(bot);
require('./src/handlers/battlepass')(bot);

// ============================================
// ОБРАБОТКА КНОПКИ НАЗАД
// ============================================
const { showMainMenu } = require('./src/handlers/start');

// Перехватываем кнопку "Назад" для очистки кэша
bot.action('back', async (ctx) => {
  await ctx.answerCbQuery();
  
  // ✅ ПРИНУДИТЕЛЬНО ОЧИЩАЕМ КЭШ БД (если есть)
  try {
    // Очищаем кэш модуля battlepass
    const battlepassPath = path.join(__dirname, 'src/handlers/battlepass.js');
    delete require.cache[require.resolve(battlepassPath)];
  } catch (e) {
    // Игнорируем ошибки
  }
  
  // Показываем главное меню с обновлёнными данными
  await showMainMenu(ctx, bot);
});

// ============================================
// ЗАПУСК
// ============================================
bot.launch().then(() => {
  console.log('✅ Бот запущен!');
  console.log('🤖 @' + bot.botInfo.username);
  console.log('📅 ' + new Date().toLocaleString());
}).catch((err) => {
  console.error('❌ Ошибка запуска:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));