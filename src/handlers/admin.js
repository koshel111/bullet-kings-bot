// ============================================
// src/handlers/admin.js - 
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
    await ctx.reply(' оступ запрещён!');
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
    ' *-Ь*\n\n' +
    ` *Статистика:*\n` +
    ` ользователей: ${totalUsers}\n` +
    ` сего карт: ${totalCards}\n` +
    ` атчей: ${totalMatches}\n\n` +
    '*ыбери действие:*';
  
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(' ыдать монеты', 'admin_coins')],
      [Markup.button.callback(' ыдать кристаллы', 'admin_crystals')],
      [Markup.button.callback(' ыдать карту', 'admin_card')],
      [Markup.button.callback(' ассылка', 'admin_broadcast')],
      [Markup.button.callback(' чистить ', 'admin_clear_db')],
      [Markup.button.callback(' азад', 'back')],
    ])
  });
  
  await ctx.reply(' ли используй кнопки под клавиатурой:', {
    reply_markup: {
      keyboard: [
        [' ыдать монеты', ' ыдать кристаллы'],
        [' ыдать карту', ' ассылка'],
        [' чистить ', ' азад'],
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
      await ctx.reply(' оступ запрещён!');
      return;
    }
    await ctx.reply(' обро пожаловать в админ-панель!');
    await showAdminMenu(ctx);
  });

  bot.action('admin_panel', async (ctx) => {
    await ctx.answerCbQuery();
    await showAdminMenu(ctx);
  });

  bot.action('admin_coins', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      ' *ыдать монеты*\n\nтправь ID и сумму через пробел:\n`123456789 500`\nли `all 100`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(' азад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_crystals', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      ' *ыдать кристаллы*\n\nтправь ID и сумму через пробел:\n`123456789 50`\nли `all 10`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(' азад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_card', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      ' *ыдать карту*\n\nтправь ID пользователя и название карты:\n`123456789 лександр вечкин`',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(' азад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      ' *ассылка*\n\nтправь сообщение для рассылки всем пользователям.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback(' азад', 'admin_panel')]])
      }
    );
  });

  bot.action('admin_clear_db', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    await ctx.reply(
      ' *чистить ?*\n\nто удалит СХ пользователей!\nействие необратимо!',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(' , ТЬ', 'admin_confirm_clear')],
          [Markup.button.callback(' Т, Т', 'admin_panel')],
        ])
      }
    );
  });

  bot.action('admin_confirm_clear', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.editMessageText(' аза данных очищена!');
  });

  //   Т
  bot.hears(' ыдать монеты', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      ' *ыдать монеты*\n\nтправь ID и сумму через пробел:\n`123456789 500`\nли `all 100`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears(' ыдать кристаллы', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      ' *ыдать кристаллы*\n\nтправь ID и сумму через пробел:\n`123456789 50`\nли `all 10`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears(' ыдать карту', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      ' *ыдать карту*\n\nтправь ID пользователя и название карты:\n`123456789 лександр вечкин`',
      { parse_mode: 'Markdown' }
    );
  });

  bot.hears(' ассылка', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(' *ассылка*\n\nтправь сообщение для рассылки.', { parse_mode: 'Markdown' });
  });

  bot.hears(' чистить ', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.reply(' аза данных очищена!');
  });

  bot.hears(' азад', async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(' озвращаюсь...', { reply_markup: { remove_keyboard: true } });
    await showAdminMenu(ctx);
  });

};
