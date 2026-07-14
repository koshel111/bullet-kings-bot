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
      packs: {},
      seasonal_packs: [],
      jerseys: [],
      arenas: []
    };
    saveUsers(users);
  }
  
  // ✅ ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ ДАННЫЕ ИЗ БД
  const freshUsers = getUsers();
  const data = freshUsers[user.id] || users[user.id];
  
  // ✅ ПОЛУЧАЕМ АКТУАЛЬНЫЙ XP
  const xp = data.battlepass_xp || 0;
  const bpLevel = Math.floor(xp / 20);
  
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
    "🎖️ БП уровень: " + bpLevel + "\n" +
    "🎖️ XP: " + xp + "\n" +
    "👥 В команде: " + data.team.length + " игроков\n" +
    "📚 Карт: " + data.cards.length + "\n\n" +
    "📋 *Главное меню:*\n\n" +
    "🎮 Играть — сражайся с ИИ или PvP\n" +
    "👥 Команда — управляй составом\n" +
    "📚 Коллекция — все твои карты\n" +
    "🛒 Магазин — паки и бусты\n" +
    "👤 Профиль — твоя статистика\n" +
    "🎖️ Пропуск — боевой пропуск\n" +
    "📦 Инвентарь — паки и косметика\n" +
    "🎨 Косметика — формы и арены\n" +
    "📅 Бонус — ежедневный бонус";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🎮 Играть", "play")],
      [Markup.button.callback("👥 Команда", "team")],
      [Markup.button.callback("📚 Коллекция", "collection")],
      [Markup.button.callback("🛒 Магазин", "shop")],
      [Markup.button.callback("👤 Профиль", "profile")],
      [Markup.button.callback("🎖️ Пропуск", "battlepass")],
      [Markup.button.callback("📦 Инвентарь", "inventory")],
      [Markup.button.callback("🎨 Косметика", "cosmetics_menu")],
      [Markup.button.callback("📅 Бонус", "bonus")],
    ])
  });
}

module.exports = (bot) => {
  
  bot.start(async (ctx) => {
    await showMainMenu(ctx, bot);
  });

  // ЭКСПОРТИРУЕМ showMainMenu ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ МОДУЛЯХ
  module.exports.showMainMenu = showMainMenu;

  // ОБРАБОТЧИК play (дублируется в game.js, но оставляем для совместимости)
  bot.action("play", async (ctx) => {
    await ctx.answerCbQuery();
    // Этот обработчик переопределён в game.js
    // Но если его нет - показываем выбор режима
    await ctx.editMessageText(
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

};