// ============================================
// src/handlers/admin.js - АДМИНКА (ФИНАЛ)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomCard, getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

const ADMINS = [
  1205576607,
];

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function isAdmin(userId) {
  return ADMINS.includes(userId);
}

function openSeasonalPack() {
  const weights = {
    'Обычный': 0,
    'Редкий': 0,
    'Элитный': 5,
    'Эпический': 10,
    'Легендарный': 50,
    'Икона': 35
  };
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  let selectedRarity = 'Элитный';
  
  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      selectedRarity = rarity;
      break;
    }
  }
  
  const { PLAYERS } = require('../data/players');
  const filtered = PLAYERS.filter(p => p.rarity === selectedRarity);
  
  if (filtered.length === 0) {
    return PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  }
  
  return filtered[Math.floor(Math.random() * filtered.length)];
}

async function sendSeasonalPackNotification(ctx, userId, card) {
  try {
    const emoji = getRarityEmoji(card.rarity);
    
    await ctx.telegram.sendMessage(userId, 
      `🎁 *Вам выдан СЕЗОННЫЙ ПАК!*\n\n` +
      `👑 Выдал: администратор\n\n` +
      `📦 *Содержимое:*\n` +
      `  • ${emoji} ${card.name} (${card.rarity})\n` +
      `  • 200 монет\n` +
      `  • 20 кристаллов\n\n` +
      `📊 *Редкость:* ${card.rarity}\n` +
      `🏒 *Позиция:* ${card.position === 'G' ? 'Вратарь' : 'Полевой'}\n\n` +
      `💡 Карта уже добавлена в коллекцию!`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.log(`❌ Не удалось отправить уведомление ${userId}:`, e.message);
  }
}

async function showAdminMenu(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.reply('⛔ Доступ запрещён!');
    return;
  }
  
  const users = getUsers();
  const totalUsers = Object.keys(users).length;
  let totalCards = 0;
  let totalMatches = 0;
  let totalCoins = 0;
  let totalCrystals = 0;
  
  Object.values(users).forEach(data => {
    totalCards += data.cards?.length || 0;
    totalMatches += data.matches || 0;
    totalCoins += data.coins || 0;
    totalCrystals += data.crystals || 0;
  });
  
  const text = 
    '👑 *АДМИН-ПАНЕЛЬ*\n\n' +
    `📊 *СТАТИСТИКА:*\n` +
    `👥 Пользователей: ${totalUsers}\n` +
    `📚 Всего карт: ${totalCards}\n` +
    `⚔️ Матчей: ${totalMatches}\n` +
    `⭐ Монет в игре: ${totalCoins}\n` +
    `💎 Кристаллов: ${totalCrystals}\n\n` +
    '*Выбери действие:*';
  
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💰 Выдать монеты', 'admin_coins')],
      [Markup.button.callback('💎 Выдать кристаллы', 'admin_crystals')],
      [Markup.button.callback('📦 Выдать карту', 'admin_card')],
      [Markup.button.callback('🎁 Сезонный пак', 'admin_season')],
      [Markup.button.callback('📢 Рассылка', 'admin_broadcast')],
      [Markup.button.callback('🗑️ Очистить БД', 'admin_clear_db')],
      [Markup.button.callback('🔙 Назад', 'back')],
    ])
  });
  
  await ctx.reply('📱 Используй кнопки под клавиатурой:', {
    reply_markup: {
      keyboard: [
        ['💰 Выдать монеты', '💎 Выдать кристаллы'],
        ['📦 Выдать карту', '🎁 Сезонный пак'],
        ['📢 Рассылка', '🗑️ Очистить БД'],
        ['🔙 Назад'],
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

module.exports = (bot) => {
  
  bot.command('admin', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ Доступ запрещён!');
      return;
    }
    await ctx.reply('👑 Добро пожаловать в админ-панель!');
    await showAdminMenu(ctx);
  });

  bot.action('admin_panel', async (ctx) => {
    await ctx.answerCbQuery();
    await showAdminMenu(ctx);
  });

  bot.action('admin_coins', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💰 *Выдать монеты*\n\nОтправь ID и сумму через пробел:\n`123456789 500`\nИли `all 100`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_crystals', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💎 *Выдать кристаллы*\n\nОтправь ID и сумму через пробел:\n`123456789 50`\nИли `all 10`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_card', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📦 *Выдать карту*\n\nОтправь ID пользователя и название карты:\n`123456789 Александр Овечкин`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('admin_season', async (ctx) => {
    await ctx.answerCbQuery();
    await adminSeasonalPack(ctx);
  });

  bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    await adminBroadcast(ctx);
  });

  bot.action('admin_clear_db', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    await ctx.reply(
      '⚠️ *Очистить БД?*\n\nЭто удалит ВСЕХ пользователей!\nДействие необратимо!',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ ДА, УДАЛИТЬ', 'admin_confirm_clear')],
          [Markup.button.callback('❌ НЕТ, ОТМЕНА', 'admin_panel')],
        ])
      }
    );
  });

  bot.action('admin_confirm_clear', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.editMessageText('✅ База данных очищена!');
    await ctx.reply('✅ Готово!', { reply_markup: { remove_keyboard: true } });
  });

  // КНОПКИ ПОД КЛАВИАТУРОЙ
  bot.hears('💰 Выдать монеты', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminGiveCoins(ctx);
  });

  bot.hears('💎 Выдать кристаллы', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminGiveCrystals(ctx);
  });

  bot.hears('📦 Выдать карту', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminGiveCard(ctx);
  });

  bot.hears('🎁 Сезонный пак', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminSeasonalPack(ctx);
  });

  bot.hears('📢 Рассылка', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminBroadcast(ctx);
  });

  bot.hears('🗑️ Очистить БД', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await adminClearDB(ctx);
  });

  bot.hears('🔙 Назад', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply('🔙 Возвращаюсь...', { reply_markup: { remove_keyboard: true } });
    
    const mainMenu = Markup.inlineKeyboard([
      [Markup.button.callback('🎮 Играть', 'play')],
      [Markup.button.callback('👥 Команда', 'team')],
      [Markup.button.callback('📚 Коллекция', 'collection')],
      [Markup.button.callback('🛒 Магазин', 'shop')],
      [Markup.button.callback('👤 Профиль', 'profile')],
      [Markup.button.callback('📅 Бонус', 'bonus')],
    ]);
    
    await ctx.reply('🏒 *Bullet Kings*\n\nГлавное меню:', {
      parse_mode: 'Markdown',
      ...mainMenu
    });
  });

  // ОБРАБОТКА ТЕКСТА
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    const text = ctx.text;
    const parts = text.split(' ');
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      await adminGiveCoins(ctx, parts[0], parts[1]);
      return;
    }
    
    if (parts.length === 1 && (text === 'all' || !isNaN(text))) {
      await adminSeasonalPack(ctx, text);
      return;
    }
    
    if (parts.length >= 2 && !isNaN(parts[0])) {
      const cardName = parts.slice(1).join(' ');
      await adminGiveCard(ctx, parts[0], cardName);
      return;
    }
    
    if (text.length > 10 && !text.startsWith('/')) {
      await adminBroadcast(ctx, text);
    }
  });

  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  async function adminGiveCoins(ctx, target = null, amount = null) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    if (target && amount) {
      const users = getUsers();
      if (target === 'all') {
        Object.keys(users).forEach(id => {
          users[id].coins = (users[id].coins || 0) + parseInt(amount);
        });
        saveUsers(users);
        await ctx.reply(`✅ Выдано ${amount}⭐ всем!`);
        return;
      }
      if (!users[target]) {
        await ctx.reply('❌ Пользователь не найден!');
        return;
      }
      users[target].coins = (users[target].coins || 0) + parseInt(amount);
      saveUsers(users);
      await ctx.reply(`✅ Выдано ${amount}⭐ пользователю ${target}!`);
      return;
    }
    
    await ctx.reply(
      '💰 *Выдать монеты*\n\nОтправь ID и сумму через пробел:\n`123456789 500`\nИли `all 100`',
      { parse_mode: 'Markdown' }
    );
  }

  async function adminGiveCrystals(ctx, target = null, amount = null) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    if (target && amount) {
      const users = getUsers();
      if (target === 'all') {
        Object.keys(users).forEach(id => {
          users[id].crystals = (users[id].crystals || 0) + parseInt(amount);
        });
        saveUsers(users);
        await ctx.reply(`✅ Выдано ${amount}💎 всем!`);
        return;
      }
      if (!users[target]) {
        await ctx.reply('❌ Пользователь не найден!');
        return;
      }
      users[target].crystals = (users[target].crystals || 0) + parseInt(amount);
      saveUsers(users);
      await ctx.reply(`✅ Выдано ${amount}💎 пользователю ${target}!`);
      return;
    }
    
    await ctx.reply(
      '💎 *Выдать кристаллы*\n\nОтправь ID и сумму через пробел:\n`123456789 50`\nИли `all 10`',
      { parse_mode: 'Markdown' }
    );
  }

  async function adminGiveCard(ctx, target = null, cardName = null) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    if (target && cardName) {
      const users = getUsers();
      if (!users[target]) {
        await ctx.reply('❌ Пользователь не найден!');
        return;
      }
      const { PLAYERS } = require('../data/players');
      const card = PLAYERS.find(p => p.name.toLowerCase().includes(cardName.toLowerCase()));
      if (!card) {
        await ctx.reply('❌ Карта не найдена!');
        return;
      }
      const cardWithId = {
        ...card,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        count: 1
      };
      const existing = users[target].cards.find(c => c.name === card.name && c.position === card.position);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
      } else {
        users[target].cards.push(cardWithId);
      }
      saveUsers(users);
      await ctx.reply(`✅ Выдана карта ${card.name} пользователю ${target}!`);
      return;
    }
    
    const { PLAYERS } = require('../data/players');
    const uniqueCards = [...new Set(PLAYERS.map(c => c.name))];
    let text = '📦 *Выдать карту*\n\nОтправь ID и название:\n`123456789 Александр Овечкин`\n\n📋 Доступные карты:\n';
    text += uniqueCards.slice(0, 20).map(c => `  • ${c}`).join('\n');
    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  async function adminSeasonalPack(ctx, target = null) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    if (target) {
      const users = getUsers();
      const targets = target === 'all' ? Object.keys(users) : [target];
      let successCount = 0;
      
      for (const id of targets) {
        if (!users[id]) continue;
        const card = openSeasonalPack();
        const cardWithId = {
          ...card,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          count: 1
        };
        const existing = users[id].cards.find(c => c.name === card.name && c.position === card.position);
        if (existing) {
          existing.count = (existing.count || 1) + 1;
        } else {
          users[id].cards.push(cardWithId);
        }
        users[id].coins = (users[id].coins || 0) + 200;
        users[id].crystals = (users[id].crystals || 0) + 20;
        
        await sendSeasonalPackNotification(ctx, id, card);
        successCount++;
      }
      
      saveUsers(users);
      await ctx.reply(`✅ Сезонный пак выдан ${successCount} пользователям!`);
      await ctx.reply('✅ Готово!', { reply_markup: { remove_keyboard: true } });
      return;
    }
    
    await ctx.reply(
      '🎁 *Сезонный пак*\n\nОтправь ID пользователя:\n`123456789`\nИли `all`',
      { parse_mode: 'Markdown' }
    );
  }

  async function adminBroadcast(ctx, message = null) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    if (message) {
      const users = getUsers();
      let sent = 0;
      for (const [id] of Object.entries(users)) {
        try {
          await ctx.telegram.sendMessage(id, `📢 *РАССЫЛКА*\n\n${message}`, { parse_mode: 'Markdown' });
          sent++;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100));
      }
      await ctx.reply(`✅ Рассылка отправлена ${sent} пользователям!`);
      await ctx.reply('✅ Готово!', { reply_markup: { remove_keyboard: true } });
      return;
    }
    
    await ctx.reply('📢 *Рассылка*\n\nОтправь сообщение для рассылки.', { parse_mode: 'Markdown' });
  }

  async function adminClearDB(ctx) {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.reply('✅ База данных очищена!', { reply_markup: { remove_keyboard: true } });
  }
};
