// ============================================
// src/handlers/battlepass.js - С УВЕДОМЛЕНИЯМИ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji, getRandomCard } = require('../data/players');
const { ALL_JERSEYS, ALL_ARENAS } = require('../data/cosmetics');

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
    3: { free: { jersey: true }, premium: { jersey: true } },
    4: { free: { coins: 30 }, premium: { coins: 70, crystals: 5 } },
    5: { free: { crystals: 5 }, premium: { crystals: 10 } },
    6: { free: { coins: 35 }, premium: { coins: 80 } },
    7: { free: { pack: "Базовый" }, premium: { pack: "Премиум" } },
    8: { free: { coins: 40 }, premium: { coins: 90, crystals: 10 } },
    9: { free: { crystals: 10 }, premium: { arena: true } },
    10: { free: { coins: 50 }, premium: { coins: 100, crystals: 15 } },
    11: { free: { jersey: true }, premium: { jersey: true } },
    12: { free: { coins: 60 }, premium: { coins: 120, crystals: 5 } },
    13: { free: { crystals: 15 }, premium: { crystals: 25 } },
    14: { free: { coins: 70 }, premium: { coins: 140 } },
    15: { free: { pack: "Премиум" }, premium: { pack: "Легендарный" } },
    16: { free: { coins: 80 }, premium: { coins: 160, crystals: 10 } },
    17: { free: { arena: true }, premium: { arena: true } },
    18: { free: { coins: 90 }, premium: { coins: 180, crystals: 15 } },
    19: { free: { crystals: 20 }, premium: { crystals: 30 } },
    20: { free: { coins: 100 }, premium: { coins: 200, crystals: 20 } },
    21: { free: { jersey: true }, premium: { jersey: true } },
    22: { free: { coins: 110 }, premium: { coins: 220, crystals: 10 } },
    23: { free: { crystals: 25 }, premium: { crystals: 35 } },
    24: { free: { coins: 120 }, premium: { coins: 240, crystals: 15 } },
    25: { free: { pack: "Сезонный" }, premium: { pack: "Сезонный", crystals: 50 } },
    26: { free: { coins: 130 }, premium: { coins: 260, crystals: 20 } },
    27: { free: { arena: true }, premium: { arena: true } },
    28: { free: { coins: 140 }, premium: { coins: 280, crystals: 25 } },
    29: { free: { crystals: 30 }, premium: { crystals: 40 } },
    30: { 
      free: { card: "Семён Кошелев", overall: 93 }, 
      premium: { card: "Семён Кошелев", overall: 96, pack: "Сезонный" } 
    },
  }
};

function getLevelByXP(xp) {
  let level = 0;
  let remainingXp = xp;
  while (remainingXp >= 20 && level < 30) {
    remainingXp -= 20;
    level++;
  }
  return { level, remainingXp };
}

function getProgress(level) {
  return Math.round((level / 30) * 100);
}

function getRandomJersey() {
  if (!ALL_JERSEYS || ALL_JERSEYS.length === 0) {
    return { name: "Обычная форма", rarity: "Обычная", emoji: "🎽" };
  }
  const jersey = ALL_JERSEYS[Math.floor(Math.random() * ALL_JERSEYS.length)];
  return { name: jersey.name, rarity: jersey.rarity, emoji: jersey.emoji || "🎽" };
}

function getRandomArena() {
  if (!ALL_ARENAS || ALL_ARENAS.length === 0) {
    return { name: "Обычная арена", rarity: "Обычная", emoji: "🏟️" };
  }
  const arena = ALL_ARENAS[Math.floor(Math.random() * ALL_ARENAS.length)];
  return { name: arena.name, rarity: arena.rarity, emoji: arena.emoji || "🏟️" };
}

function openPack(packType) {
  const weights = {
    "basic": { "Обычный": 45, "Редкий": 30, "Элитный": 18, "Эпический": 6.9, "Легендарный": 0.1, "Икона": 0 },
    "premium": { "Обычный": 0, "Редкий": 30, "Элитный": 35, "Эпический": 25, "Легендарный": 9, "Икона": 1 },
    "legendary": { "Обычный": 0, "Редкий": 0, "Элитный": 15, "Эпический": 35, "Легендарный": 40, "Икона": 10 },
    "seasonal": { "Обычный": 0, "Редкий": 0, "Элитный": 5, "Эпический": 10, "Легендарный": 50, "Икона": 35 },
  };
  
  const packWeights = weights[packType] || weights.basic;
  const total = Object.values(packWeights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  let selectedRarity = "Обычный";
  for (const [rarity, weight] of Object.entries(packWeights)) {
    random -= weight;
    if (random <= 0) { selectedRarity = rarity; break; }
  }
  
  const { PLAYERS } = require('../data/players');
  const filtered = PLAYERS.filter(p => p.rarity === selectedRarity);
  if (filtered.length === 0) return PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getPositionName(position) {
  if (position === 'G') return 'Вратарь';
  if (position === 'LW' || position === 'RW' || position === 'C') return 'Нападающий';
  if (position === 'D') return 'Защитник';
  return 'Полевой';
}

function giveReward(data, reward, isPremium = false) {
  const rewards = isPremium ? reward.premium : reward.free;
  if (!rewards) return [];

  let rewardText = [];

  if (rewards.coins) {
    data.coins = (data.coins || 0) + rewards.coins;
    rewardText.push("⭐ " + rewards.coins + " монет");
  }
  if (rewards.crystals) {
    data.crystals = (data.crystals || 0) + rewards.crystals;
    rewardText.push("💎 " + rewards.crystals + " кристаллов");
  }
  
  if (rewards.pack) {
    if (!data.packs) data.packs = {};
    if (!data.packs[rewards.pack]) data.packs[rewards.pack] = [];
    data.packs[rewards.pack].push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      obtained: Date.now()
    });
    rewardText.push("📦 " + rewards.pack + " пак");
  }
  
  if (rewards.jersey) {
    if (!data.jerseys) data.jerseys = [];
    const randomJersey = getRandomJersey();
    data.jerseys.push({ 
      id: "bp_jersey_" + Date.now(), 
      name: randomJersey.name, 
      rarity: randomJersey.rarity, 
      emoji: randomJersey.emoji,
      isTemporary: !isPremium 
    });
    rewardText.push("🎽 " + randomJersey.name + " (" + randomJersey.rarity + ")");
  }
  
  if (rewards.arena) {
    if (!data.arenas) data.arenas = [];
    const randomArena = getRandomArena();
    data.arenas.push({ 
      id: "bp_arena_" + Date.now(), 
      name: randomArena.name, 
      rarity: randomArena.rarity, 
      emoji: randomArena.emoji,
      isTemporary: !isPremium 
    });
    rewardText.push("🏟️ " + randomArena.name + " (" + randomArena.rarity + ")");
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
    rewardText.push("🃏 " + cardData.name + " (" + cardData.overall + " OVR)");
  }
  
  return rewardText;
}

async function sendPackNotification(ctx, userId, packType) {
  try {
    const packNames = {
      "Базовый": "📦 Базовый пак",
      "Премиум": "🎁 Премиум пак",
      "Легендарный": "💎 Легендарный пак",
      "Сезонный": "🎁 Сезонный пак"
    };
    
    const text = 
      "🎖️ *Вы получили пак из боевого пропуска!*\n\n" +
      "📦 " + (packNames[packType] || packType) + "\n\n" +
      "🔥 Нажми кнопку, чтобы открыть пак!";
    
    await ctx.telegram.sendMessage(Number(userId), text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📦 Открыть пак", "open_pack_" + packType + "_" + userId)]
      ])
    });
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление о паке:", e.message);
  }
}

function autoClaimRewards(data, currentLevel, isPremium = false, ctx = null) {
  const claimed = data.claimed_rewards || [];
  let newRewards = 0;
  let rewardList = [];
  let packNotifications = [];
  
  for (let level = 1; level <= currentLevel; level++) {
    const key = isPremium ? "p_" + level : "f_" + level;
    if (claimed.includes(key)) continue;
    
    const reward = BATTLEPASS.REWARDS[level];
    if (!reward) continue;
    
    const rewardText = giveReward(data, reward, isPremium);
    claimed.push(key);
    newRewards++;
    rewardList.push({ level, rewardText, isPremium });
    
    const rewards = isPremium ? reward.premium : reward.free;
    if (rewards && rewards.pack) {
      packNotifications.push({ level, packType: rewards.pack });
    }
  }
  
  data.claimed_rewards = claimed;
  
  if (ctx && packNotifications.length > 0) {
    setTimeout(async () => {
      for (const notif of packNotifications) {
        await sendPackNotification(ctx, ctx.from.id, notif.packType);
        await new Promise(r => setTimeout(r, 500));
      }
    }, 1000);
  }
  
  return { newRewards, rewardList, packNotifications };
}

function getLevelStatus(data, level, isPremium = false) {
  const claimed = data.claimed_rewards || [];
  const key = isPremium ? "p_" + level : "f_" + level;
  return claimed.includes(key);
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
  const maxLevel = 30;
  
  let text = "🎖️ *БОЕВОЙ ПРОПУСК*\n\n";
  text += "🏆 " + BATTLEPASS.SEASON_NAME + "\n\n";
  text += "📊 Уровень: " + level + "/" + maxLevel + "\n";
  text += "🔋 XP: " + xp + " / " + ((level + 1) * 20) + "\n";
  text += "📈 Прогресс: " + progress + "%\n";
  text += "⚡ 1 матч = 20 XP\n\n";
  
  if (isPremium) {
    text += "💎 *Премиум активирован!*\n\n";
  } else {
    text += "💎 Купить премиум за 100 кристаллов\n\n";
  }
  
  text += "📋 *ВСЕ НАГРАДЫ:*\n\n";
  
  for (let i = 1; i <= maxLevel; i++) {
    const reward = BATTLEPASS.REWARDS[i];
    if (!reward) continue;
    
    const freeClaimed = getLevelStatus(data, i, false);
    const premiumClaimed = getLevelStatus(data, i, true);
    
    const freeCheck = freeClaimed ? "✅" : "⬜";
    const premiumCheck = premiumClaimed ? "✅" : "⬜";
    
    text += "📍 *Уровень " + i + "*\n";
    
    if (reward.free) {
      text += freeCheck + " 🆓 Бесплатный: ";
      const free = reward.free;
      const parts = [];
      if (free.coins) parts.push("⭐ " + free.coins);
      if (free.crystals) parts.push("💎 " + free.crystals);
      if (free.pack) parts.push("📦 " + free.pack + " пак");
      if (free.jersey) parts.push("🎽 Рандомная форма");
      if (free.arena) parts.push("🏟️ Рандомная арена");
      if (free.card) parts.push("🃏 " + free.card + " (" + (free.overall || 93) + " OVR)");
      text += parts.join(", ") + "\n";
    }
    
    if (isPremium && reward.premium) {
      text += premiumCheck + " 💎 Премиум: ";
      const premium = reward.premium;
      const parts = [];
      if (premium.coins) parts.push("⭐ " + premium.coins);
      if (premium.crystals) parts.push("💎 " + premium.crystals);
      if (premium.pack) parts.push("📦 " + premium.pack + " пак");
      if (premium.jersey) parts.push("🎽 Рандомная форма (навсегда)");
      if (premium.arena) parts.push("🏟️ Рандомная арена (навсегда)");
      if (premium.card) parts.push("🃏 " + premium.card + " (" + (premium.overall || 96) + " OVR)");
      text += parts.join(", ") + "\n";
    }
    
    text += "\n";
  }
  
  const buttons = [];
  if (!isPremium) {
    buttons.push([Markup.button.callback("💎 Купить премиум (100💎)", "bp_buy")]);
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
  
  if ((data.crystals || 0) < 100) {
    await ctx.reply("❌ Недостаточно кристаллов! Нужно 100💎");
    return;
  }
  
  data.crystals -= 100;
  data.battlepass_premium = 1;
  
  const xp = data.battlepass_xp || 0;
  const { level } = getLevelByXP(xp);
  const result = autoClaimRewards(data, level, true, ctx);
  
  saveUsers(users);
  
  let text = "✅ *Премиум куплен!*\n\n";
  text += "💎 Выдано " + result.newRewards + " наград за премиум путь!\n";
  text += "📊 Текущий уровень: " + level + "\n\n";
  text += "📋 *Полученные награды:*\n";
  
  result.rewardList.forEach(item => {
    const rewardText = item.rewardText || [];
    if (rewardText.length > 0) {
      text += "  • Уровень " + item.level + ": " + rewardText.join(", ") + "\n";
    }
  });
  
  if (result.packNotifications && result.packNotifications.length > 0) {
    text += "\n\n📦 *Паки отправлены в инвентарь!*\n";
    text += "💡 Уведомления о паках придут через секунду.";
  }
  
  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function addXP(userId, amount, ctx = null) {
  const users = getUsers();
  const data = users[userId];
  if (!data) return;
  
  const oldLevel = getLevelByXP(data.battlepass_xp || 0).level;
  data.battlepass_xp = (data.battlepass_xp || 0) + amount;
  const newLevel = getLevelByXP(data.battlepass_xp).level;
  
  if (newLevel > oldLevel) {
    const result = autoClaimRewards(data, newLevel, data.battlepass_premium || 0, ctx);
    if (result.newRewards > 0) {
      console.log("🎉 Новые награды: " + result.newRewards + " шт.");
    }
  }
  
  saveUsers(users);
}

module.exports = {
  addXP,
  XP_PER_MATCH: 20,
  getLevelByXP,
  autoClaimRewards,
  showBattlepass,
  buyPremium
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

  bot.action(/open_pack_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const packType = ctx.match[1];
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    
    if (!data) {
      await ctx.editMessageText("❌ Ошибка! Попробуй /start");
      return;
    }
    
    if (!data.packs || !data.packs[packType] || data.packs[packType].length === 0) {
      await ctx.editMessageText("❌ У тебя нет таких паков!");
      return;
    }
    
    data.packs[packType].shift();
    if (data.packs[packType].length === 0) delete data.packs[packType];
    
    const card = openPack(packType);
    const cardWithId = { ...card, id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
    const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
    if (existing) existing.count = (existing.count || 1) + 1;
    else data.cards.push(cardWithId);
    
    saveUsers(users);
    
    const emoji = getRarityEmoji(cardWithId.rarity);
    const posName = getPositionName(cardWithId.position);
    const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный", seasonal: "Сезонный" };
    
    const remaining = data.packs?.[packType]?.length || 0;
    let text = "🎉 *" + (packNames[packType] || packType) + " пак открыт!*\n\n📋 *Карта:*\n  " + emoji + " *" + cardWithId.name + "*\n  🏒 Амплуа: " + posName + "\n  📊 Рейтинг: " + cardWithId.overall + " OVR\n  🏆 Редкость: " + cardWithId.rarity + "\n\n💡 Карта добавлена в коллекцию!";
    if (remaining > 0) text += "\n\n📦 Осталось паков: " + remaining;
    
    await ctx.editMessageText(text, { parse_mode: "Markdown" });
  });
};
