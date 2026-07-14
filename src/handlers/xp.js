// ============================================
// src/handlers/xp.js - УПРАВЛЕНИЕ XP
// ============================================

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// ✅ НАСТРОЙКИ XP
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

// ✅ ГЛАВНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ XP
async function addXP(userId, amount, ctx = null) {
  console.log('📈 [addXP] Добавляем XP:', userId, '+', amount);
  
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    console.log('❌ [addXP] Пользователь не найден!');
    return false;
  }
  
  const currentXP = data.battlepass_xp || 0;
  data.battlepass_xp = currentXP + amount;
  
  console.log('📊 [addXP] Было:', currentXP, 'Стало:', data.battlepass_xp);
  
  const oldLevel = getLevelByXP(currentXP).level;
  const newLevel = getLevelByXP(data.battlepass_xp).level;
  
  console.log('📊 [addXP] Уровни:', oldLevel, '->', newLevel);
  
  // ✅ АВТОМАТИЧЕСКИ ВЫДАЁМ НАГРАДЫ
  if (newLevel > oldLevel) {
    console.log('🎉 Новый уровень! Выдаём награды...');
    // Импортируем battlepass только когда нужно
    try {
      const battlepass = require('./battlepass');
      if (battlepass.autoClaimRewards) {
        const result = battlepass.autoClaimRewards(data, newLevel, data.battlepass_premium || 0, ctx);
        if (result.newRewards > 0) {
          console.log('🎉 Выдано наград:', result.newRewards);
        }
      }
    } catch (error) {
      console.log('⚠️ Не удалось выдать награды:', error.message);
    }
  }
  
  saveUsers(users);
  console.log('✅ [addXP] XP сохранён!');
  return true;
}

module.exports = {
  addXP,
  XP_WIN,
  XP_LOSS,
  XP_PER_LEVEL,
  MAX_LEVEL,
  getLevelByXP
};