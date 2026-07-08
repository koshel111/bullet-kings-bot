// ============================================
// src/handlers/admin.js - АДМИНКА
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

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
  
  Object.values(users).forEach(data => {
    totalCards += data.cards?.length || 0;
    totalMatches += data.matches || 0;
  });
  
  const text = 
    '👑 *АДМИН-ПАНЕЛЬ*\n\n' +
    `📊 *Статистика:*\n` +
    `👥 Пользователей: ${totalUsers}\n` +
    `📚 Всего карт: ${totalCards}\n` +
    `⚔️ Матчей: ${totalMatches}\n\n` +
    '*Выбери действие:*';
  
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💰 Выдать монеты', 'admin_coins')],
      [Markup.button.callback('💎 Выдать кристаллы', 'admin_crystals')],
      [Markup.button.callback('📦 Выдать карту', 'admin_card')],
      [Markup.button.callback('📢 Рассылка', 'admin_broadcast')],
      [Markup.button.callback('🗑️ Очистить БД', 'admin_clear_db')],
      [Markup.button.callback('🔙 Назад', 'back')],
    ])
  });
  
  await ctx.reply('📱 Или используй кнопки под клавиатурой:', {
    reply_markup: {
      keyboard: [
        ['💰 Выдать монеты', '💎 Выдать кристаллы'],
        ['📦 Выдать карту', '📢 Рассылка'],
        ['🗑️ Очистить БД', '🔙 Назад'],
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
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_crystals', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💎 *Выдать кристаллы*\n\nОтправь ID и сумму через пробел:\n`123456789 50`\nИли `all 10`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_card', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📦 *Выдать карту*\n\nОтправь ID пользователя и название карты:\n`123456789 Александр Овечкин`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📢 *Рассылка*\n\nОтправь сообщение для рассылки всем пользователям.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
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
  });

  // КНОПКИ ПОД КЛАВИАТУРОЙ
  bot.hears('💰 Выдать монеты', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      '💰 *Выдать монеты*\n\nОтправь ID и сумму через пробел:\n`123456789 500`\nИли `all 100`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears('💎 Выдать кристаллы', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      '💎 *Выдать кристаллы*\n\nОтправь ID и сумму через пробел:\n`123456789 50`\nИли `all 10`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears('📦 Выдать карту', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      '📦 *Выдать карту*\n\nОтправь ID пользователя и название карты:\n`123456789 Александр Овечкин`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears('📢 Рассылка', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply('📢 *Рассылка*\n\nОтправь сообщение для рассылки.', { parse_mode: 'Markdown' });
  });

  bot.hears('🗑️ Очистить БД', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.reply('✅ База данных очищена!');
  });

  bot.hears('🔙 Назад', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply('🔙 Возвращаюсь...', { reply_markup: { remove_keyboard: true } });
    await showAdminMenu(ctx);
  });

};
