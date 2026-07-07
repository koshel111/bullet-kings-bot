// ============================================
// src/handlers/game.js - ИГРА (РЕАЛИСТИЧНЫЙ ВРАТАРЬ)
// ============================================

const { Markup } = require('telegraf');
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

// ============================================
// ХРАНИМ ИСТОРИЮ ДЕЙСТВИЙ ИГРОКА (для ИИ)
// ============================================
const playerHistory = {};

// ============================================
// УМНЫЙ ИИ (РЕАЛИСТИЧНЫЙ ВРАТАРЬ)
// ============================================
function getAIAction(playerId, difficulty = 1) {
  // Реалистичные действия вратаря (без прыжков!)
  const actions = ['left', 'right', 'stand', 'low', 'glove', 'aggressive'];
  
  const history = playerHistory[playerId] || [];
  
  // Веса для действий
  let weights = {
    left: 1,
    right: 1,
    stand: 1,
    low: 1,
    glove: 1,
    aggressive: 1
  };
  
  // Адаптация под игрока
  if (history.length > 3) {
    const lastThree = history.slice(-3);
    const leftCount = lastThree.filter(a => a === 'left').length;
    const rightCount = lastThree.filter(a => a === 'right').length;
    const topCount = lastThree.filter(a => a === 'top').length;
    const fiveholeCount = lastThree.filter(a => a === 'fivehole').length;
    const dekeCount = lastThree.filter(a => a === 'deke').length;
    const wristCount = lastThree.filter(a => a === 'wrist').length;
    const slapCount = lastThree.filter(a => a === 'slap').length;
    
    // Вратарь учится на твоих бросках
    if (leftCount >= 2) { weights.left += 3; weights.stand += 1; }
    if (rightCount >= 2) { weights.right += 3; weights.stand += 1; }
    if (topCount >= 2) { weights.stand += 2; weights.glove += 2; }
    if (fiveholeCount >= 2) { weights.low += 3; weights.stand += 1; }
    if (dekeCount >= 2) { weights.aggressive += 3; weights.stand += 1; }
    if (wristCount >= 2) { weights.glove += 2; weights.stand += 1; }
    if (slapCount >= 2) { weights.low += 2; weights.glove += 1; }
  }
  
  // Сложность
  const difficultyBonus = {
    novice: 0.5,
    amateur: 0.7,
    pro: 1.0,
    legend: 1.5
  };
  
  const factor = difficultyBonus[difficulty] || 1;
  Object.keys(weights).forEach(key => {
    weights[key] = weights[key] * factor;
  });
  
  // Выбор действия
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return action;
  }
  return actions[Math.floor(Math.random() * actions.length)];
}

// ============================================
// РАСЧЁТ БРОСКА (РЕАЛИСТИЧНЫЙ)
// ============================================
function calculateShot(playerAction, goalieAction, difficulty = 1) {
  // Таблица взаимодействия (реалистичная)
  const actionBonus = {
    'left': { 
      'left': 0.1,      // Вратарь закрыл левый угол → сэйв
      'right': 0.7,     // Вратарь не там → гол
      'stand': 0.4, 
      'low': 0.3, 
      'glove': 0.3, 
      'aggressive': 0.6 
    },
    'right': { 
      'left': 0.7, 
      'right': 0.1,     // Вратарь закрыл правый угол → сэйв
      'stand': 0.4, 
      'low': 0.3, 
      'glove': 0.3, 
      'aggressive': 0.6 
    },
    'top': { 
      'left': 0.5, 
      'right': 0.5, 
      'stand': 0.2,     // Стоя легче поймать верх
      'low': 0.6, 
      'glove': 0.6,     // Ловушка хороша для верха
      'aggressive': 0.3 
    },
    'fivehole': { 
      'left': 0.6, 
      'right': 0.6, 
      'stand': 0.8,     // Стоя — щитки закрыты → сэйв
      'low': 0.2,       // Закрыл низ → сэйв
      'glove': 0.7, 
      'aggressive': 0.3 
    },
    'deke': { 
      'left': 0.5, 
      'right': 0.5, 
      'stand': 0.3, 
      'low': 0.4, 
      'glove': 0.4, 
      'aggressive': 0.8  // Агрессивный выход против финта → сэйв
    },
    'wrist': { 
      'left': 0.4, 
      'right': 0.4, 
      'stand': 0.3, 
      'low': 0.5, 
      'glove': 0.2,     // Ловушка против кистевого → сэйв
      'aggressive': 0.5 
    },
    'slap': { 
      'left': 0.4, 
      'right': 0.4, 
      'stand': 0.3, 
      'low': 0.2,       // Щитки против щелчка → сэйв
      'glove': 0.5, 
      'aggressive': 0.5 
    }
  };

  const multiplier = actionBonus[playerAction]?.[goalieAction] || 0.5;
  const randomFactor = 0.7 + Math.random() * 0.6;
  
  // Сложность
  const difficultyBonus = {
    novice: 1.5,
    amateur: 1.2,
    pro: 0.9,
    legend: 0.6
  };
  const defenseFactor = difficultyBonus[difficulty] || 1;
  
  let probability = multiplier * randomFactor * defenseFactor;
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return {
    isGoal: Math.random() < probability,
    probability: Math.round(probability * 100)
  };
}

function getAIShot() {
  const actions = ['left', 'right', 'top', 'fivehole', 'deke', 'wrist', 'slap'];
  return actions[Math.floor(Math.random() * actions.length)];
}

module.exports = (bot) => {
  
  bot.action('play', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🎮 *Выбери режим:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Против ИИ', 'play_ai')],
          [Markup.button.callback('⚔️ PvP', 'play_pvp')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('play_ai', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🤖 *Выбери сложность ИИ:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🟢 Новичок', 'ai_novice')],
          [Markup.button.callback('🟡 Любитель', 'ai_amateur')],
          [Markup.button.callback('🟠 Профессионал', 'ai_pro')],
          [Markup.button.callback('🔴 Легенда', 'ai_legend')],
          [Markup.button.callback('🔙 Назад', 'play')],
        ])
      }
    );
  });

  bot.action(/ai_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const difficulty = ctx.match[1];
    const difficultyNames = { novice: 'Новичок', amateur: 'Любитель', pro: 'Профессионал', legend: 'Легенда' };
    
    const user = ctx.from;
    if (!playerHistory[user.id]) {
      playerHistory[user.id] = [];
    }
    
    await ctx.editMessageText(
      '🤖 *Матч против ИИ (' + difficultyNames[difficulty] + ')*\n\n' +
      '*Выбери действие:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Влево', 'shot_left')],
          [Markup.button.callback('➡️ Вправо', 'shot_right')],
          [Markup.button.callback('⬆️ Верхний', 'shot_top')],
          [Markup.button.callback('⬇️ Между щитков', 'shot_fivehole')],
          [Markup.button.callback('🔄 Финт', 'shot_deke')],
          [Markup.button.callback('✋ Кистевой', 'shot_wrist')],
          [Markup.button.callback('💥 Щелчок', 'shot_slap')],
          [Markup.button.callback('🔙 Назад', 'play_ai')],
        ])
      }
    );
  });

  bot.action(/shot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAction = ctx.match[1];
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    if (!playerHistory[user.id]) {
      playerHistory[user.id] = [];
    }
    playerHistory[user.id].push(playerAction);
    if (playerHistory[user.id].length > 10) {
      playerHistory[user.id].shift();
    }
    
    const difficulty = 'pro';
    const difficultyNames = { novice: 'Новичок', amateur: 'Любитель', pro: 'Профессионал', legend: 'Легенда' };
    
    const goalieAction = getAIAction(user.id, difficulty);
    const result = calculateShot(playerAction, goalieAction, difficulty);
    
    const actionNames = {
      left: '⬅️ Влево',
      right: '➡️ Вправо',
      top: '⬆️ Верхний',
      fivehole: '⬇️ Между щитков',
      deke: '🔄 Финт',
      wrist: '✋ Кистевой',
      slap: '💥 Щелчок'
    };
    
    const goalieNames = {
      left: '🧤 Закрыл левый угол',
      right: '🧤 Закрыл правый угол',
      stand: '🧍 Стоя',
      low: '🛡️ Опустил щитки',
      glove: '🧤 Ловушка',
      aggressive: '💪 Агрессивный выход'
    };
    
    if (result.isGoal) {
      data.wins++;
      data.coins += 20;
      data.rating += 25;
    } else {
      data.losses++;
      data.rating = Math.max(0, data.rating - 10);
    }
    data.matches++;
    data.league = data.rating >= 2000 ? 'Легенда' :
                  data.rating >= 1800 ? 'Мастер' :
                  data.rating >= 1600 ? 'Алмаз' :
                  data.rating >= 1400 ? 'Платина' :
                  data.rating >= 1200 ? 'Золото' :
                  data.rating >= 1000 ? 'Серебро' : 'Бронза';
    
    saveUsers(users);
    
    const resultEmoji = result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*';
    const ratingChange = result.isGoal ? '+25' : '-10';
    const coinsChange = result.isGoal ? '+20' : '0';
    
    let resultText = '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
    resultText += '🧤 *Вратарь:* ' + goalieNames[goalieAction] + '\n\n';
    resultText += resultEmoji + '\n\n';
    resultText += '📊 *Результат:*\n';
    resultText += '🏆 Рейтинг: ' + data.rating + ' (' + ratingChange + ')\n';
    resultText += '🥇 Лига: ' + data.league + '\n';
    resultText += '⭐ Монет: ' + data.coins + ' (' + coinsChange + ')\n';
    resultText += '✅ Побед: ' + data.wins + '\n';
    resultText += '❌ Поражений: ' + data.losses + '\n';
    resultText += '📊 Шанс гола: ' + result.probability + '%';
    
    await ctx.editMessageText(
      resultText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Сыграть ещё', 'play_ai')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('play_pvp', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⚔️ *PvP режим*\n\n' +
      'Идёт поиск соперника... ⏳\n' +
      'Ожидание: до 20 секунд\n\n' +
      '⚠️ PvP в разработке!\n' +
      'Пока играй против ИИ 🤖',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });
};

