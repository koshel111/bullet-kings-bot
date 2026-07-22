// ============================================
// BULLET KINGS - ГЛАВНЫЙ БОТ
// ============================================

const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./src/database/mongoose');

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден в .env!');
  process.exit(1);
}

// ============================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// ============================================
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
  console.error(err.stack);
  removeLockFile();
  process.exit(1);
});

// ============================================
// СОЗДАНИЕ БОТА
// ============================================
const bot = new Telegraf(BOT_TOKEN);

// ============================================
// ФУНКЦИЯ ДЛЯ БЕЗОПАСНОЙ РЕГИСТРАЦИИ ОБРАБОТЧИКОВ
// ============================================
function registerHandler(name, handler, bot) {
  try {
    if (typeof handler === 'function') {
      handler(bot);
      console.log(`✅ ${name} handler зарегистрирован (как функция)`);
      return true;
    } else if (handler && typeof handler.register === 'function') {
      handler.register(bot);
      console.log(`✅ ${name} handler зарегистрирован (как объект с register)`);
      return true;
    } else {
      console.warn(`⚠️ ${name} handler не является функцией и не имеет метода register`);
      console.warn(`   Тип: ${typeof handler}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка регистрации ${name}:`, error.message);
    return false;
  }
}

// ============================================
// ПОДКЛЮЧАЕМ ОБРАБОТЧИКИ
// ============================================
try {
  // 1. Start
  const startHandler = require('./src/handlers/start');
  registerHandler('Start', startHandler, bot);

  // 2. Game
  const gameHandler = require('./src/handlers/game');
  registerHandler('Game', gameHandler, bot);

  // 3. Shop
  const shopHandler = require('./src/handlers/shop');
  registerHandler('Shop', shopHandler, bot);

  // 4. Profile
  const profileHandler = require('./src/handlers/profile');
  registerHandler('Profile', profileHandler, bot);

  // 5. ShopCosmetics
  const shopCosmeticsHandler = require('./src/handlers/shopCosmetics');
  registerHandler('ShopCosmetics', shopCosmeticsHandler, bot);

  // 6. Admin
  const adminHandler = require('./src/handlers/admin');
  registerHandler('Admin', adminHandler, bot);

  // 7. Battlepass
  const battlepassHandler = require('./src/handlers/battlepass');
  registerHandler('Battlepass', battlepassHandler, bot);

  // 8. Subscription
  const subscriptionHandler = require('./src/handlers/subscription');
  if (typeof subscriptionHandler.checkSubscription === 'function') {
    console.log('✅ Subscription handler загружен (как объект)');
  } else {
    registerHandler('Subscription', subscriptionHandler, bot);
  }

  // 9. PvP
  const pvpHandler = require('./src/handlers/pvp');
  registerHandler('PvP', pvpHandler, bot);

  // 10. Tournament
  const tournamentHandler = require('./src/handlers/tournament');
  if (typeof tournamentHandler.showTournament === 'function') {
    console.log('✅ Tournament handler загружен (как объект)');
  } else {
    registerHandler('Tournament', tournamentHandler, bot);
  }

  // 11. XP
  console.log('✅ XP handler загружен (через другие обработчики)');

  console.log('✅ Все обработчики загружены!');
} catch (error) {
  console.error('❌ Ошибка загрузки обработчиков:', error.message);
  console.error(error.stack);
}

// ============================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================

// Кнопка "Назад"
bot.action('back', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const startHandler = require('./src/handlers/start');
    if (typeof startHandler.showMainMenu === 'function') {
      await startHandler.showMainMenu(ctx, bot);
    } else {
      await ctx.reply('🏠 Главное меню');
    }
  } catch (e) {
    console.error('❌ Ошибка кнопки назад:', e.message);
    await ctx.reply('🏠 Главное меню');
  }
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