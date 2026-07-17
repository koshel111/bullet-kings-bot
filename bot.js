// ============================================
// BULLET KINGS - ГЛАВНЫЙ БОТ
// ============================================

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден в .env!');
  process.exit(1);
}

// ============================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// ============================================
const { connectDB } = require('./src/database/mongoose');

(async () => {
  try {
    await connectDB();
    console.log('✅ База данных подключена');
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    console.log('⚠️ Бот запущен без MongoDB, используем JSON');
  }
})();

// ============================================
// ЗАЩИТА ОТ ДУБЛИРОВАНИЯ
// ============================================
const lockFile = path.join(__dirname, '.bot.lock');
if (fs.existsSync(lockFile)) {
  console.log('⚠️ Бот уже запущен! Завершаем дублирующий процесс...');
  process.exit(0);
}

try {
  fs.writeFileSync(lockFile, Date.now().toString());
  console.log('🔒 Файл блокировки создан');
} catch (err) {
  console.error('❌ Не удалось создать файл блокировки:', err.message);
}

function removeLockFile() {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('🔓 Файл блокировки удалён');
    }
  } catch (err) {
    console.error('❌ Ошибка удаления блокировки:', err.message);
  }
}

process.on('SIGINT', () => {
  console.log('📥 Получен SIGINT');
  removeLockFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📥 Получен SIGTERM');
  removeLockFile();
  process.exit(0);
});

process.on('exit', () => {
  removeLockFile();
});

process.on('uncaughtException', (err) => {
  console.error('❌ Необработанное исключение:', err.message);
  removeLockFile();
  process.exit(1);
});

// ============================================
// СОЗДАНИЕ БОТА
// ============================================
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
require('./src/handlers/tournament')(bot);
require('./src/handlers/subscription')(bot);
require('./src/handlers/donate')(bot);

// ============================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================
const { showMainMenu } = require('./src/handlers/start');
const { showTournament } = require('./src/handlers/tournament');
const { showDonateShop } = require('./src/handlers/donate');
const { handleCheckSubscription } = require('./src/handlers/subscription');

bot.action('back', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const battlepassPath = path.join(__dirname, 'src/handlers/battlepass.js');
    delete require.cache[require.resolve(battlepassPath)];
  } catch (e) {}
  await showMainMenu(ctx, bot);
});

bot.action('tournament', async (ctx) => {
  await ctx.answerCbQuery();
  await showTournament(ctx);
});

bot.action('donate', async (ctx) => {
  await ctx.answerCbQuery();
  await showDonateShop(ctx);
});

bot.action('check_subscription', async (ctx) => {
  await handleCheckSubscription(ctx);
});

// ============================================
// ЗАПУСК БОТА
// ============================================
async function startBot() {
  try {
    await bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query']
    });
    
    console.log('✅ Бот успешно запущен!');
    console.log('🤖 @' + bot.botInfo.username);
    console.log('📅 ' + new Date().toLocaleString());
    console.log('🆔 PID:', process.pid);
    
    // Запускаем автоматическую проверку турнира (каждый час)
    const { checkTournamentAutoFinish } = require('./src/handlers/tournament');
    setInterval(() => {
      checkTournamentAutoFinish();
    }, 60 * 60 * 1000); // Каждый час
    
  } catch (error) {
    console.error('❌ Ошибка запуска:', error.message);
    
    if (error.message.includes('Conflict')) {
      console.log('⚠️ Конфликт! Подождите 30 секунд и перезапустите.');
    }
    
    removeLockFile();
    process.exit(1);
  }
}

startBot();