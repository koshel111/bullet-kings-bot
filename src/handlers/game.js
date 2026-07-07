// ============================================
// src/handlers/game.js - ИГРА (РЕЙТИНГ НЕ УХОДИТ В МИНУС)
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
// УМНЫЙ ИИ
// ============================================
function getAIAction(playerId, difficulty = 1) {
  const actions = ['jumpLeft', 'jumpRight', 'stand', 'coverLow', 'glove', 'aggressive'];
  
  const history = playerHistory[playerId] || [];
  const lastAction = history.length > 0 ? history[history.length - 1] : null;
  
  let weights = {
    jumpLeft: 1,
    jumpRight: 1,
    stand: 1,
    coverLow: 1,
    glove: 1,
    aggressive: 1
  };
  
  if (history.length > 3) {
    const lastThree = history.slice(-3);
    const leftCount = lastThree.filter(a => a === 'left').length;
    const rightCount = lastThree.filter(a => a === 'right').length;
    const topCount = lastThree.filter(a => a === 'top').length;
    const fiveholeCount = lastThree.filter(a => a === 'fivehole').length;
    const dekeCount = lastThree.filter(a => a === 'deke').length;
    const wristCount = lastThree.filter(a => a === 'wrist').length;
    const slapCount = lastThree.filter(a => a === 'slap').length;
    
    if (leftCount >= 2) { weights.jumpRight += 2; weights.stand += 1; }
    if (rightCount >= 2) { weights.jumpLeft += 2; weights.stand += 1; }
    if (topCount >= 2) { weights.stand += 2; weights.glove += 1; }
    if (fiveholeCount >= 2) { weights.stand += 2; weights.coverLow += 2; }
    if (dekeCount >= 2) { weights.aggressive += 3; weights.jumpLeft += 1; weights.jumpRight += 1; }
    if (wristCount >= 2) { weights.glove += 2; weights.stand += 1; }
    if (slapCount >= 2) { weights.pads += 2; weights.glove += 1; }
  }
  
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
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return action;
  }
  return actions[Math.floor(Math.random() * actions.length)];
}

function calculateShot(playerAction, goalieAction, difficulty = 1) {
  const actionBonus = {
    'left': { 'jumpRight': 0.8, 'stand': 0.5, 'coverLow': 0.3 },
    'right': { 'jumpLeft': 0.8, 'stand': 0.5, 'coverLow': 0.3 },
    'top': { 'stand': 0.3, 'glove': 0.6, 'jumpLeft': 0.5, 'jumpRight': 0.5 },
    'fivehole': { 'stand': 0.8, 'coverLow': 0.2, 'aggressive': 0.3 },
    'deke': { 'aggressive': 1.2, 'jumpLeft': 0.6, 'jumpRight': 0.6, 'stand': 0.4 },
    'wrist': { 'glove': 0.7, 'stand': 0.4, 'jumpLeft': 0.5, 'jumpRight': 0.5 },
    'slap': { 'pads': 0.4, 'glove': 0.6, 'stand': 0.3 }
  };

  const multiplier = actionBonus[playerAction]?.[goalieAction] || 0.5;
  const randomFactor = 0.7 + Math.random() * 0.6;
  
  const difficultyBonus = {
    novice: 1.5,
    amateur: 1.2,
    pro: 0.9,
    legend: 0.6
  };
  const defenseFactor = difficultyBonus[difficulty] || 1;
  
  let probability = multiplier / (0.5 + 0.1) * randomFactor * defenseFactor;
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
      jumpLeft: '⬅️ Прыжок влево',
      jumpRight: '➡️ Прыжок вправо',
      stand: '🧍 Стоять',
      coverLow: '⬇️ Закрыть низ',
      glove: '🧤 Ловушка',
      aggressive: '💪 Агрессивный'
    };
    
    if (result.isGoal) {
      data.wins++;
      data.coins += 20;
      data.rating += 25;
    } else {
      data.losses++;
      // ✅ РЕЙТИНГ НЕ УХОДИТ В МИНУС!
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
