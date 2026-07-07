// ============================================
// src/handlers/game.js - СЕРИЯ БУЛЛИТОВ
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
// ХРАНИМ СОСТОЯНИЕ МАТЧЕЙ
// ============================================
const matches = {};

// ============================================
// УМНЫЙ ИИ (РЕАЛИСТИЧНЫЙ ВРАТАРЬ)
// ============================================
function getAIAction(playerId, difficulty = 1) {
  const actions = ['left', 'right', 'stand', 'low', 'glove', 'aggressive'];
  const history = matches[playerId]?.history || [];
  
  let weights = { left: 1, right: 1, stand: 1, low: 1, glove: 1, aggressive: 1 };
  
  if (history.length > 2) {
    const lastThree = history.slice(-3);
    const leftCount = lastThree.filter(a => a === 'left').length;
    const rightCount = lastThree.filter(a => a === 'right').length;
    const topCount = lastThree.filter(a => a === 'top').length;
    const fiveholeCount = lastThree.filter(a => a === 'fivehole').length;
    const dekeCount = lastThree.filter(a => a === 'deke').length;
    const wristCount = lastThree.filter(a => a === 'wrist').length;
    const slapCount = lastThree.filter(a => a === 'slap').length;
    
    if (leftCount >= 2) { weights.left += 3; weights.stand += 1; }
    if (rightCount >= 2) { weights.right += 3; weights.stand += 1; }
    if (topCount >= 2) { weights.stand += 2; weights.glove += 2; }
    if (fiveholeCount >= 2) { weights.low += 3; weights.stand += 1; }
    if (dekeCount >= 2) { weights.aggressive += 3; weights.stand += 1; }
    if (wristCount >= 2) { weights.glove += 2; weights.stand += 1; }
    if (slapCount >= 2) { weights.low += 2; weights.glove += 1; }
  }
  
  const difficultyBonus = { novice: 0.5, amateur: 0.7, pro: 1.0, legend: 1.5 };
  const factor = difficultyBonus[difficulty] || 1;
  Object.keys(weights).forEach(key => { weights[key] = weights[key] * factor; });
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return action;
  }
  return actions[Math.floor(Math.random() * actions.length)];
}

// ============================================
// РАСЧЁТ БРОСКА (ПОЛНАЯ ТАБЛИЦА 42 КОМБИНАЦИИ)
// ============================================
function calculateShot(playerAction, goalieAction, difficulty = 1) {
  const actionBonus = {
    'left': { 'left': 0.05, 'right': 0.75, 'stand': 0.40, 'low': 0.35, 'glove': 0.35, 'aggressive': 0.60 },
    'right': { 'left': 0.75, 'right': 0.05, 'stand': 0.40, 'low': 0.35, 'glove': 0.35, 'aggressive': 0.60 },
    'top': { 'left': 0.70, 'right': 0.70, 'stand': 0.15, 'low': 0.65, 'glove': 0.65, 'aggressive': 0.40 },
    'fivehole': { 'left': 0.65, 'right': 0.65, 'stand': 0.10, 'low': 0.05, 'glove': 0.70, 'aggressive': 0.35 },
    'deke': { 'left': 0.55, 'right': 0.55, 'stand': 0.35, 'low': 0.45, 'glove': 0.45, 'aggressive': 0.10 },
    'wrist': { 'left': 0.45, 'right': 0.45, 'stand': 0.35, 'low': 0.55, 'glove': 0.10, 'aggressive': 0.55 },
    'slap': { 'left': 0.45, 'right': 0.45, 'stand': 0.35, 'low': 0.10, 'glove': 0.55, 'aggressive': 0.55 }
  };

  const multiplier = actionBonus[playerAction]?.[goalieAction] || 0.5;
  const randomFactor = 0.7 + Math.random() * 0.6;
  const difficultyBonus = { novice: 1.5, amateur: 1.2, pro: 0.9, legend: 0.6 };
  const defenseFactor = difficultyBonus[difficulty] || 1;
  
  let probability = multiplier * randomFactor * defenseFactor;
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return { isGoal: Math.random() < probability, probability: Math.round(probability * 100) };
}

// ============================================
// НАЗВАНИЯ ДЕЙСТВИЙ
// ============================================
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
    
    // Создаём новый матч
    matches[user.id] = {
      difficulty: difficulty,
      playerScore: 0,
      aiScore: 0,
      round: 0,
      maxRounds: 5,
      isFinished: false,
      history: [],
      isSuddenDeath: false
    };
    
    await ctx.editMessageText(
      '🤖 *Матч против ИИ (' + difficultyNames[difficulty] + ')*\n\n' +
      '📊 Счёт: Ты 0 — 0 ИИ\n' +
      '🔢 Раунд 1 из 5\n\n' +
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
          [Markup.button.callback('🏳️ Сдаться', 'forfeit')],
        ])
      }
    );
  });

  bot.action(/shot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAction = ctx.match[1];
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён! Начни новый.');
      return;
    }
    
    const difficulty = match.difficulty;
    const difficultyNames = { novice: 'Новичок', amateur: 'Любитель', pro: 'Профессионал', legend: 'Легенда' };
    
    // Ход игрока
    const goalieAction = getAIAction(user.id, difficulty);
    const result = calculateShot(playerAction, goalieAction, difficulty);
    
    match.history.push(playerAction);
    match.round++;
    
    if (result.isGoal) {
      match.playerScore++;
    }
    
    // Ход ИИ (только если матч ещё не закончен)
    let aiResult = null;
    let aiAction = null;
    let aiGoalieAction = null;
    
    if (!match.isFinished) {
      aiAction = ['left', 'right', 'top', 'fivehole', 'deke', 'wrist', 'slap'][Math.floor(Math.random() * 7)];
      aiGoalieAction = getAIAction(user.id + '_ai', difficulty);
      aiResult = calculateShot(aiAction, aiGoalieAction, difficulty);
      if (aiResult.isGoal) {
        match.aiScore++;
      }
    }
    
    // Проверка окончания матча
    const isMatchEnd = match.round >= match.maxRounds || match.playerScore !== match.aiScore;
    
    if (match.round >= match.maxRounds && match.playerScore === match.aiScore) {
      // Ничья → переход в режим "до гола"
      match.isSuddenDeath = true;
    }
    
    if (match.isSuddenDeath && (result.isGoal || (aiResult && aiResult.isGoal))) {
      match.isFinished = true;
    }
    
    if (match.round >= match.maxRounds && match.playerScore !== match.aiScore) {
      match.isFinished = true;
    }
    
    // Сохраняем данные
    const users = getUsers();
    const data = users[user.id];
    if (match.isFinished) {
      const isWin = match.playerScore > match.aiScore;
      if (isWin) {
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
    }
    
    // Формируем результат
    let resultText = '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
    resultText += '🧤 *Вратарь:* ' + goalieNames[goalieAction] + '\n';
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*') + '\n\n';
    
    if (aiAction) {
      resultText += '🤖 *Ход ИИ:* ' + actionNames[aiAction] + '\n';
      resultText += '🧤 *Вратарь:* ' + goalieNames[aiGoalieAction] + '\n';
      resultText += (aiResult.isGoal ? '⚡ *ГОЛ!* 😱' : '😤 *СЭЙВ!*') + '\n\n';
    }
    
    resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    resultText += '🔢 Раунд ' + match.round + (match.isSuddenDeath ? ' (ДО ГОЛА!)' : ' из ' + match.maxRounds) + '\n';
    
    if (match.isFinished) {
      const isWin = match.playerScore > match.aiScore;
      resultText += '\n🏁 *МАТЧ ЗАВЕРШЁН!*\n';
      resultText += (isWin ? '🎉 *ПОБЕДА!* +20⭐ +25 рейтинга' : '😔 *ПОРАЖЕНИЕ...* -10 рейтинга') + '\n';
      resultText += '🏆 Рейтинг: ' + data.rating + '\n';
      resultText += '🥇 Лига: ' + data.league + '\n';
      resultText += '⭐ Монет: ' + data.coins;
      
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
    } else {
      const nextRound = match.round + 1;
      const roundText = match.isSuddenDeath ? 'ДО ГОЛА!' : (nextRound + ' из ' + match.maxRounds);
      
      resultText += '\n*Выбери действие для раунда ' + roundText + ':*';
      
      await ctx.editMessageText(
        resultText,
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
            [Markup.button.callback('🏳️ Сдаться', 'forfeit')],
          ])
        }
      );
    }
  });

  bot.action('forfeit', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const match = matches[user.id];
    if (match) {
      match.isFinished = true;
    }
    await ctx.editMessageText(
      '🏳️ *Матч завершён досрочно!*\n\nТы сдался 😔',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
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
