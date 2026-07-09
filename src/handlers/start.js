// ============================================
// src/handlers/start.js - ГЛАВНОЕ МЕНЮ
// ============================================

const { Markup } = require('telegraf');
const { STARTING_CARDS } = require('../data/players');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}));
    return {};
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

async function showMainMenu(ctx, bot) {
  const user = ctx.from;
  const users = getUsers();
  
  if (!users[user.id]) {
    users[user.id] = {
      name: user.first_name,
      coins: 100,
      crystals: 10,
      rating: 0,
      league: "Бронза",
      wins: 0,
      losses: 0,
      draws: 0,
      matches: 0,
      cards: STARTING_CARDS.map(c => ({ ...c, count: 1 })),
      team: STARTING_CARDS.map(c => ({ ...c })),
      battlepass_xp: 0,
      battlepass_premium: 0,
      claimed_rewards: [],
      lastBonus: null,
    };
    saveUsers(users);
  }
  
  const data = users[user.id];
  
  const text = 
    "🏒 *Добро пожаловать в Bullet Kings!*\n\n" +
    "Привет, " + user.first_name + "! 👋\n\n" +
    "🔥 *Твоя статистика:*\n" +
    "🏆 Рейтинг: " + data.rating + "\n" +
    "🥇 Лига: " + data.league + "\n" +
    "⭐ Монет: " + data.coins + "\n" +
    "💎 Кристаллов: " + data.crystals + "\n" +
    "✅ Побед: " + data.wins + "\n" +
    "📊 Матчей: " + data.matches + "\n" +
    "👥 В команде: " + data.team.length + " игроков\n" +
    "📚 Карт: " + data.cards.length + "\n\n" +
    "Выбери действие:";
  
  // Кнопки в сообщении
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🎮 Играть", "play")],
      [Markup.button.callback("👥 Команда", "team")],
      [Markup.button.callback("📚 Коллекция", "collection")],
      [Markup.button.callback("🛒 Магазин", "shop")],
      [Markup.button.callback("👤 Профиль", "profile")],
      [Markup.button.callback("🎖️ Пропуск", "battlepass")],
      [Markup.button.callback("📅 Бонус", "bonus")],
    ])
  });
  
  // Кнопки под клавиатурой
  await ctx.reply("📱 Или используй кнопки под клавиатурой:", {
    reply_markup: {
      keyboard: [
        ["🎮 Играть", "👥 Команда"],
        ["📚 Коллекция", "🛒 Магазин"],
        ["👤 Профиль", "🎖️ Пропуск", "📅 Бонус"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

module.exports = (bot) => {
  
  bot.start(async (ctx) => {
    await showMainMenu(ctx, bot);
  });

  bot.action("back", async (ctx) => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx, bot);
  });

  // ОБРАБОТЧИКИ КНОПОК ПОД КЛАВИАТУРОЙ
  bot.hears("🎮 Играть", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.telegram.editMessageText(
      ctx.chat.id,
      ctx.message.message_id,
      null,
      "🎮 *Выбери режим:*",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🤖 Против ИИ", "play_ai")],
          [Markup.button.callback("⚔️ PvP", "play_pvp")],
          [Markup.button.callback("🔙 Назад", "back")],
        ])
      }
    );
  });

  bot.hears("👥 Команда", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("team")(ctx);
  });

  bot.hears("📚 Коллекция", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("collection")(ctx);
  });

  bot.hears("🛒 Магазин", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("shop")(ctx);
  });

  bot.hears("👤 Профиль", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("profile")(ctx);
  });

  bot.hears("🎖️ Пропуск", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("battlepass")(ctx);
  });

  bot.hears("📅 Бонус", async (ctx) => {
    await ctx.answerCbQuery();
    await bot.action("bonus")(ctx);
  });

};
