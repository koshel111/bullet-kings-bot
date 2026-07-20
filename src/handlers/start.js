// ============================================
// src/handlers/start.js - С КНОПКОЙ START
// ============================================

const { Markup } = require('telegraf');
const { STARTING_CARDS } = require('../data/players');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsersDirect() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({}));
      return {};
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Ошибка чтения БД:', error);
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// ✅ КНОПКА START В МЕНЮ
async function showMainMenu(ctx, bot) {
  const user = ctx.from;
  const users = getUsersDirect();
  
  if (!users[user.id]) {
    users[user.id] = {
      name: user.first_name,
      coins: 100,
      crystals: 10,
      dust: 0,
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
      arenas: [],
      tournament_win: false,
      tournament_prize: null,
      tournament_place: null
    };
    saveUsers(users);
  }
  
  const data = users[user.id];
  const xp = data.battlepass_xp || 0;
  const bpLevel = Math.floor(xp / 20);
  const nextLevelXP = (bpLevel + 1) * 20;
  const xpToNext = Math.min(nextLevelXP - xp, 20);
  
  const progressBarLength = 10;
  const currentLevelProgress = xp % 20;
  const filledBars = Math.floor((currentLevelProgress / 20) * progressBarLength);
  const emptyBars = progressBarLength - filledBars;
  const progressBar = '▓'.repeat(filledBars) + '░'.repeat(emptyBars);
  
  // ✅ ПРОВЕРКА ПОБЕДЫ В ТУРНИРЕ
  let tournamentText = '';
  if (data.tournament_win && data.tournament_place === 1) {
    tournamentText = '\n🏆 *ТЫ ПОБЕДИЛ В ТУРНИРЕ!*\nВыбери свою награду в разделе 🏆 Турнир\n';
  }
  
  const text = 
    "🏒 *Добро пожаловать в Bullet Kings!*\n\n" +
    "Привет, " + user.first_name + "! 👋\n\n" +
    "🔥 *Твоя статистика:*\n" +
    "🏆 Рейтинг: " + data.rating + "\n" +
    "🥇 Лига: " + data.league + "\n" +
    "⭐ Монет: " + data.coins + "\n" +
    "💎 Кристаллов: " + data.crystals + "\n" +
    "💎 Пыль: " + (data.dust || 0) + "\n" +
    "✅ Побед: " + data.wins + "\n" +
    "📊 Матчей: " + data.matches + "\n" +
    "🎖️ БП уровень: " + bpLevel + "/30\n" +
    "🎖️ XP: " + xp + " / " + nextLevelXP + "\n" +
    "📊 " + progressBar + "\n" +
    "🎯 До следующего уровня: " + xpToNext + " XP\n" +
    "👥 В команде: " + data.team.length + " игроков\n" +
    "📚 Карт: " + data.cards.length + 
    tournamentText +
    "\n\n📋 *Главное меню:*\n\n" +
    "🎮 Играть — сражайся с ИИ или PvP\n" +
    "👥 Команда — управляй составом\n" +
    "📚 Коллекция — все твои карты\n" +
    "🛒 Магазин — паки и бусты\n" +
    "💎 Донат — купить кристаллы\n" +
    "👤 Профиль — твоя статистика\n" +
    "🎖️ Пропуск — боевой пропуск\n" +
    "📦 Инвентарь — паки и косметика\n" +
    "🎨 Косметика — формы и арены\n" +
    "🏆 Турнир — турнирная таблица\n" +
    "📅 Бонус — ежедневный бонус";
  
  // ✅ ДОБАВЛЯЕМ КНОПКУ START
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("📱 /start", "start_command")],
      [Markup.button.callback("🎮 Играть", "play")],
      [Markup.button.callback("👥 Команда", "team")],
      [Markup.button.callback("📚 Коллекция", "collection")],
      [Markup.button.callback("🛒 Магазин", "shop")],
      [Markup.button.callback("💎 Донат", "donate")],
      [Markup.button.callback("👤 Профиль", "profile")],
      [Markup.button.callback("🎖️ Пропуск", "battlepass")],
      [Markup.button.callback("📦 Инвентарь", "inventory")],
      [Markup.button.callback("🎨 Косметика", "cosmetics_menu")],
      [Markup.button.callback("🏆 Турнир", "tournament")],
      [Markup.button.callback("📅 Бонус", "bonus")],
    ])
  });
}

module.exports = (bot) => {
  
  bot.start(async (ctx) => {
    await showMainMenu(ctx, bot);
  });

  // ✅ ОБРАБОТЧИК КНОПКИ START
  bot.action("start_command", async (ctx) => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx, bot);
  });

  module.exports.showMainMenu = showMainMenu;

  bot.action("play", async (ctx) => {
    await ctx.answerCbQuery();
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