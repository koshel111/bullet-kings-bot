// ============================================
// src/handlers/battlepass.js - БОЕВОЙ ПРОПУСК
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji, getRandomCard } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

const BATTLEPASS = {
  MAX_LEVEL: 30,
  XP_PER_LEVEL: 20,
  PRICE: 100,
  SEASON_NAME: "🏆 Начало великой истории",
  REWARDS: {
    1: { free: { coins: 20 }, premium: { coins: 50, crystals: 5 } },
    2: { free: { coins: 25 }, premium: { coins: 60 } },
    3: { free: { jersey: "Обычная" }, premium: { jersey: "Обычная" } },
    4: { free: { coins: 30 }, premium: { coins: 70, crystals: 5 } },
    5: { free: { crystals: 5 }, premium: { crystals: 10 } },
    6: { free: { coins: 35 }, premium: { coins: 80 } },
    7: { free: { pack: "Базовый" }, premium: { pack: "Премиум" } },
    8: { free: { coins: 40 }, premium: { coins: 90, crystals: 10 } },
    9: { free: { crystals: 10 }, premium: { arena: "Обычная" } },
    10: { free: { coins: 50 }, premium: { coins: 100, crystals: 15 } },
    11: { free: { jersey: "Редкая" }, premium: { jersey: "Редкая" } },
    12: { free: { coins: 60 }, premium: { coins: 120, crystals: 5 } },
    13: { free: { crystals: 15 }, premium: { crystals: 25 } },
    14: { free: { coins: 70 }, premium: { coins: 140 } },
    15: { free: { pack: "Премиум" }, premium: { pack: "Легендарный" } },
    16: { free: { coins: 80 }, premium: { coins: 160, crystals: 10 } },
    17: { free: { arena: "Редкая" }, premium: { arena: "Редкая" } },
    18: { free: { coins: 90 }, premium: { coins: 180, crystals: 15 } },
    19: { free: { crystals: 20 }, premium: { crystals: 30 } },
    20: { free: { coins: 100 }, premium: { coins: 200, crystals: 20 } },
    21: { free: { jersey: "Эпическая" }, premium: { jersey: "Эпическая" } },
    22: { free: { coins: 110 }, premium: { coins: 220, crystals: 10 } },
    23: { free: { crystals: 25 }, premium: { crystals: 35 } },
    24: { free: { coins: 120 }, premium: { coins: 240, crystals: 15 } },
    25: { free: { pack: "Сезонный" }, premium: { pack: "Сезонный", crystals: 50 } },
    26: { free: { coins: 130 }, premium: { coins: 260, crystals: 20 } },
    27: { free: { arena: "Эпическая" }, premium: { arena: "Эпическая" } },
    28: { free: { coins: 140 }, premium: { coins: 280, crystals: 25 } },
    29: { free: { crystals: 30 }, premium: { crystals: 40 } },
    30: { 
      free: { card: "Семён Кошелев", overall: 93 }, 
      premium: { card: "Семён Кошелев", overall: 96, pack: "Сезонный" } 
    },
  }
};

const XP_PER_MATCH = 20;

function getLevelByXP(xp) {
  let level = 0;
  let remainingXp = xp;
  while (remainingXp >= BATTLEPASS.XP_PER_LEVEL && level < BATTLEPASS.MAX_LEVEL) {
    remainingXp -= BATTLEPASS.XP_PER_LEVEL;
    level++;
  }
  return { level, remainingXp };
}

function getProgress(level) {
  const currentLevelXp = level * BATTLEPASS.XP_PER_LEVEL;
  const nextLevelXp = (level + 1) * BATTLEPASS.XP_PER_LEVEL;
  const progress = Math.round((currentLevelXp / nextLevelXp) * 100);
  return Math.min(progress, 100);
}

function giveReward(data, reward, isPremium = false) {
  const rewards = isPremium ? reward.premium : reward.free;
  if (!rewards) return;

  if (rewards.coins) data.coins = (data.coins || 0) + rewards.coins;
  if (rewards.crystals) data.crystals = (data.crystals || 0) + rewards.crystals;
  
  if (rewards.pack) {
    const { getRandomCard } = require('../data/players');
    const weights = {
      "Базовый": { "Обычный": 45, "Редкий": 30, "Элитный": 18, "Эпический": 6.9, "Легендарный": 0.1, "Икона": 0 },
      "Премиум": { "Обычный": 0, "Редкий": 30, "Элитный": 35, "Эпический": 25, "Легендарный": 9, "Икона": 1 },
      "Легендарный": { "Обычный": 0, "Редкий": 0, "Элитный": 15, "Эпический": 35, "Легендарный": 40, "Икона": 10 },
      "Сезонный": { "Обычный": 0, "Редкий": 0, "Элитный": 5, "Эпический": 10, "Легендарный": 50, "Икона": 35 },
    };
    
    const packWeights = weights[rewards.pack] || weights["Базовый"];
    const total = Object.values(packWeights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    let selectedRarity = "Обычный";
    for (const [rarity, weight] of Object.entries(packWeights)) {
      random -= weight;
      if (random <= 0) { selectedRarity = rarity; break; }
    }
    
    const card = getRandomCard(selectedRarity);
    if (card) {
      const cardWithId = { ...card, id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
      const existing = data.cards.find(c => c.name === card.name && c.position === card.position);
      if (existing) existing.count = (existing.count || 1) + 1;
      else data.cards.push(cardWithId);
    }
  }
  
  if (rewards.jersey) {
    if (!data.jerseys) data.jerseys = [];
    const jerseyId = "bp_jersey_" + Date.now();
    data.jerseys.push({ id: jerseyId, name: rewards.jersey, rarity: rewards.jersey, isTemporary: !isPremium });
  }
  
  if (rewards.arena) {
    if (!data.arenas) data.arenas = [];
    const arenaId = "bp_arena_" + Date.now();
    data.arenas.push({ id: arenaId, name: rewards.arena, rarity: rewards.arena, isTemporary: !isPremium });
  }
  
  if (rewards.card) {
    const cardData = {
      name: rewards.card,
      overall: rewards.overall || 93,
      rarity: "Легендарная",
      position: "C",
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      count: 1
    };
    
    const existing = data.cards.find(c => c.name === cardData.name && c.position === cardData.position);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      data.cards.push(cardData);
    }
  }
}

function autoClaimRewards(data, currentLevel, isPremium = false) {
  const claimed = data.claimed_rewards || [];
  let newRewards = 0;
  
  for (let level = 1; level <= currentLevel; level++) {
    const key = isPremium ? "p_" + level : "f_" + level;
    if (claimed.includes(key)) continue;
    
    const reward = BATTLEPASS.REWARDS[level];
    if (!reward) continue;
    
    giveReward(data, reward, isPremium);
    claimed.push(key);
    newRewards++;
  }
  
  data.claimed_rewards = claimed;
  return newRewards;
}

async function showBattlepass(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply("❌ Ошибка! Попробуй /start");
    return;
  }
  
  const xp = data.battlepass_xp || 0;
  const { level } = getLevelByXP(xp);
  const progress = getProgress(level);
  const isPremium = data.battlepass_premium || 0;
  const maxLevel = BATTLEPASS.MAX_LEVEL;
  
  let text = "🎖️ *БОЕВОЙ ПРОПУСК*\n\n";
  text += "🏆 " + BATTLEPASS.SEASON_NAME + "\n\n";
  text += "📊 Уровень: " + level + "/" + maxLevel + "\n";
  text += "🔋 XP: " + xp + " / " + ((level + 1) * BATTLEPASS.XP_PER_LEVEL) + "\n";
  text += "📈 Прогресс: " + progress + "%\n";
  text += "⚡ 1 матч = " + XP_PER_MATCH + " XP\n\n";
  
  if (isPremium) {
    text += "💎 *Премиум активирован!*\n\n";
    text += "📋 *Премиум даёт:*\n";
    text += "  ✅ В 2 раза больше наград\n";
    text += "  ✅ Постоянные формы и арены\n";
    text += "  ✅ Улучшенные паки\n";
    text += "  ✅ Семён Кошелев 96 OVR\n";
    text += "  ✅ Сезонный пак на 30 уровне\n\n";
  } else {
    text += "💎 Купить премиум за " + BATTLEPASS.PRICE + " кристаллов\n\n";
    text += "📋 *Премиум даёт:*\n";
    text += "  ✅ В 2 раза больше наград\n";
    text += "  ✅ Постоянные формы и арены\n";
    text += "  ✅ Улучшенные паки\n";
    text += "  ✅ Семён Кошелев 96 OVR (вместо 93)\n";
    text += "  ✅ Сезонный пак на 30 уровне\n\n";
  }
  
  text += "📋 *ВСЕ НАГРАДЫ:*\n\n";
  
  for (let i = 1; i <= maxLevel; i++) {
    const reward = BATTLEPASS.REWARDS[i];
    if (!reward) continue;
    
    text += "📍 *Уровень " + i + "*\n";
    
    if (reward.free) {
      text += "🆓 Бесплатный: ";
      const free = reward.free;
      const parts = [];
      if (free.coins) parts.push("⭐ " + free.coins);
      if (free.crystals) parts.push("💎 " + free.crystals);
      if (free.pack) parts.push("📦 " + free.pack + " пак");
      if (free.jersey) parts.push("🎽 Форма: " + free.jersey + " (временная)");
      if (free.arena) parts.push("🏟️ Арена: " + free.arena + " (временная)");
      if (free.card) parts.push("🃏 " + free.card + " (" + (free.overall || 93) + " OVR)");
      text += parts.join(", ") + "\n";
    }
    
    if (isPremium && reward.premium) {
      text += "💎 Премиум: ";
      const premium = reward.premium;
      const parts = [];
      if (premium.coins) parts.push("⭐ " + premium.coins);
      if (premium.crystals) parts.push("💎 " + premium.crystals);
      if (premium.pack) parts.push("📦 " + premium.pack + " пак");
      if (premium.jersey) parts.push("🎽 Форма: " + premium.jersey + " (навсегда)");
      if (premium.arena) parts.push("🏟️ Арена: " + premium.arena + " (навсегда)");
      if (premium.card) parts.push("🃏 " + premium.card + " (" + (premium.overall || 96) + " OVR)");
      text += parts.join(", ") + "\n";
    }
    
    text += "\n";
  }
  
  const buttons = [];
  if (!isPremium) {
    buttons.push([Markup.button.callback("💎 Купить премиум (" + BATTLEPASS.PRICE + "💎)", "bp_buy")]);
  }
  buttons.push([Markup.button.callback("🔄 Обновить", "bp_refresh")]);
  buttons.push([Markup.button.callback("🔙 Назад", "back")]);
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons)
  });
}

async function buyPremium(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply("❌ Ошибка! Попробуй /start");
    return;
  }
  
  if (data.battlepass_premium) {
    await ctx.reply("💎 У тебя уже есть премиум!");
    return;
  }
  
  if ((data.crystals || 0) < BATTLEPASS.PRICE) {
    await ctx.reply("❌ Недостаточно кристаллов! Нужно " + BATTLEPASS.PRICE + "💎");
    return;
  }
  
  data.crystals -= BATTLEPASS.PRICE;
  data.battlepass_premium = 1;
  
  const xp = data.battlepass_xp || 0;
  const { level } = getLevelByXP(xp);
  const claimed = autoClaimRewards(data, level, true);
  
  saveUsers(users);
  
  await ctx.reply(
    "✅ *Премиум куплен!*\n\n" +
    "💎 Выдано " + claimed + " наград за премиум путь!\n" +
    "📊 Текущий уровень: " + level + "\n\n" +
    "📋 *Что ты получил:*\n" +
    "  ✅ В 2 раза больше наград\n" +
    "  ✅ Постоянные формы и арены\n" +
    "  ✅ Улучшенные паки\n" +
    "  ✅ Семён Кошелев 96 OVR\n" +
    "  ✅ Сезонный пак на 30 уровне",
    { parse_mode: "Markdown" }
  );
}

async function addXP(userId, amount) {
  const users = getUsers();
  const data = users[userId];
  if (!data) return;
  
  const oldLevel = getLevelByXP(data.battlepass_xp || 0).level;
  data.battlepass_xp = (data.battlepass_xp || 0) + amount;
  const newLevel = getLevelByXP(data.battlepass_xp).level;
  
  if (newLevel > oldLevel) {
    autoClaimRewards(data, newLevel, data.battlepass_premium || 0);
  }
  
  saveUsers(users);
}

module.exports = {
  addXP,
  XP_PER_MATCH,
  autoClaimRewards
};

module.exports = (bot) => {
  bot.action("battlepass", async (ctx) => {
    await ctx.answerCbQuery();
    await showBattlepass(ctx);
  });

  bot.action("bp_buy", async (ctx) => {
    await ctx.answerCbQuery();
    await buyPremium(ctx);
  });

  bot.action("bp_refresh", async (ctx) => {
    await ctx.answerCbQuery();
    await showBattlepass(ctx);
  });
};

module.exports.addXP = addXP;
