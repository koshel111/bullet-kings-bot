// ============================================
// BULLET KINGS - ГЛАВНЫЙ БОТ (С ЗАЩИТОЙ)
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

// ЗАЩИТА ОТ ДУБЛИРОВАНИЯ
const lockFile = path.join(__dirname, '.bot.lock');
if (fs.existsSync(lockFile)) {
  console.log('⚠️ Бот уже запущен! Завершаем дублирующий процесс...');
  process.exit(0);
}

fs.writeFileSync(lockFile, Date.now().toString());

process.on('exit', () => {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('🔓 Файл блокировки удалён');
    }
  } catch (e) {}
});

process.on('SIGINT', () => {
  process.exit();
});

process.on('SIGTERM', () => {
  process.exit();
});

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

bot.action('back', async (ctx) => {
  await ctx.answerCbQuery();
  
  // ✅ ОЧИЩАЕМ КЭШ МОДУЛЕЙ
  try {
    // Очищаем кэш start.js
    const startPath = path.join(__dirname, 'src/handlers/start.js');
    delete require.cache[require.resolve(startPath)];
    
    // Очищаем кэш battlepass.js
    const battlepassPath = path.join(__dirname, 'src/handlers/battlepass.js');
    delete require.cache[require.resolve(battlepassPath)];
  } catch (e) {
    // Игнорируем ошибки
  }
  
  // Перезагружаем модули
  const freshStart = require('./src/handlers/start');
  
  // Показываем главное меню с обновлёнными данными
  await freshStart.showMainMenu(ctx, bot);
});

// ============================================
// ЗАПУСК С ОБРАБОТКОЙ ОШИБОК
// ============================================

async function startBot() {
  try {
    await bot.launch({
      dropPendingUpdates: true
    });
    
    console.log('✅ Бот запущен!');
    console.log('🤖 @' + bot.botInfo.username);
    console.log('📅 ' + new Date().toLocaleString());
    console.log('🆔 PID:', process.pid);
    
  } catch (error) {
    console.error('❌ Ошибка запуска:', error.message);
    
    if (error.message.includes('Conflict: terminated by other getUpdates request')) {
      console.log('⚠️ Обнаружен конфликт! Попробуйте:');
      console.log('1. Перезапустить сервис в Railway');
      console.log('2. Подождать 30 секунд и попробовать снова');
    }
    
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (e) {}
    
    process.exit(1);
  }
}

startBot();

process.once('SIGINT', () => {
  console.log('🛑 Остановка бота...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('🛑 Остановка бота...');
  bot.stop('SIGTERM');
  process.exit(0);
});