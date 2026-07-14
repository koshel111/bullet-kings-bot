// ============================================
// src/handlers/xp.js - УПРАВЛЕНИЕ XP
// ============================================

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsersDirect() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
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

const XP_WIN = 1;
const XP_LOSS = 0;
const XP_PER_LEVEL = 20;
const MAX_LEVEL = 30;

function getLevelByXP(xp) {
  let level = 0;
  let remainingXp = xp;
  while (remainingXp >= XP_PER_LEVEL && level < MAX_LEVEL) {
    remainingXp -= XP_PER_LEVEL;
    level++;
  }
  return { level, remainingXp };
}

function autoClaimRewards(data, currentLevel, isPremium = false, ctx = null) {
  const claimed = data.claimed_rewards || [];
  let newRewards = 0;
  
  const REWARDS = {
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
  };
  
  for (let level = 1; level <= currentLevel; level++) {
    const key = isPremium ? "p_" + level : "f_" + level;
    if (claimed.includes(key)) continue;
    
    const reward = REWARDS[level];
    if (!reward) continue;
    
    // Даём награду
    const rewards = isPremium ? reward.premium : reward.free;
    if (rewards.coins) data.coins = (data.coins || 0) + rewards.coins;
    if (rewards.crystals) data.crystals = (data.crystals || 0) + rewards.crystals;
    if (rewards.pack) {
      if (!data.packs) data.packs = {};
      if (!data.packs[rewards.pack]) data.packs[rewards.pack] = [];
      data.packs[rewards.pack].push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 6) });
    }
    
    claimed.push(key);
    newRewards++;
  }
  
  data.claimed_rewards = claimed;
  return newRewards;
}

// ✅ ГЛАВНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ XP
async function addXP(userId, amount, ctx = null) {
  console.log('📈 [addXP] ===== НАЧАЛО =====');
  console.log('📈 [addXP] Добавляем XP:', userId, '+', amount);
  
  try {
    const users = getUsersDirect();
    console.log('📈 [addXP] БД прочитана, пользователей:', Object.keys(users).length);
    
    const data = users[userId];
    
    if (!data) {
      console.log('❌ [addXP] Пользователь не найден!');
      return false;
    }
    
    const currentXP = data.battlepass_xp || 0;
    console.log('📈 [addXP] Текущий XP до добавления:', currentXP);
    
    data.battlepass_xp = currentXP + amount;
    
    console.log('📊 [addXP] Было:', currentXP, 'Стало:', data.battlepass_xp);
    
    const oldLevel = getLevelByXP(currentXP).level;
    const newLevel = getLevelByXP(data.battlepass_xp).level;
    
    console.log('📊 [addXP] Уровни:', oldLevel, '->', newLevel);
    
    if (newLevel > oldLevel) {
      console.log('🎉 Новый уровень! Выдаём награды...');
      const result = autoClaimRewards(data, newLevel, data.battlepass_premium || 0, ctx);
      console.log('🎉 Выдано наград:', result);
    }
    
    saveUsers(users);
    console.log('✅ [addXP] XP сохранён!');
    console.log('✅ [addXP] Итоговый XP в БД:', data.battlepass_xp);
    console.log('📈 [addXP] ===== КОНЕЦ =====');
    return true;
  } catch (error) {
    console.error('❌ [addXP] Ошибка:', error);
    return false;
  }
}

module.exports = {
  addXP,
  XP_WIN,
  XP_LOSS,
  XP_PER_LEVEL,
  MAX_LEVEL,
  getLevelByXP
};