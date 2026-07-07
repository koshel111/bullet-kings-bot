// ============================================
// src/handlers/game.js - С ВЫБОРОМ ВРАТАРЯ
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

const matches = {};

// ============================================
// УМНЫЙ ИИ (выбирает бросок)
// ============================================
function getAIShot(playerId, difficulty = 1) {
  const actions = ['left', 'right', 'top', 'fivehole', 'deke', 'wrist', 'slap'];
  const history = matches[playerId]?.history || [];
  
  let weights = { left: 1, right: 1, top: 1, fivehole: 1, deke: 1, wrist: 1, slap: 1 };
  
  if (history.length > 2) {
    const lastThree = history.slice(-3);
    const leftCount = lastThree.filter(a => a === 'left').length;
    const rightCount = lastThree.filter(a => a === 'right').length;
    const topCount = lastThree.filter(a => a === 'top').length;
    const fiveholeCount = lastThree.filter(a => a === 'fivehole').length;
    const dekeCount = lastThree.filter(a => a === 'deke').length;
    const wristCount = lastThree.filter(a => a === 'wrist').length;
    const slapCount = lastThree.filter(a => a === 'slap').length;
    
    if (leftCount >= 2) { weights.right += 2; weights.stand += 1; }
    if (rightCount >= 2) { weights.left += 2; weights.stand += 1; }
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
// РАСЧЁТ БРОСКА
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
  
  // ============================================
  // ГЛАВНОЕ МЕНЮ ИГРЫ
  // ============================================
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

  // ============================================
  // ВЫБОР СЛОЖНОСТИ
  // ============================================
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

  // ============================================
  // НАЧАЛО МАТЧА
  // ============================================
  bot.action(/ai_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const difficulty = ctx.match[1];
    const difficultyNames = { novice: 'Новичок', amateur: 'Любитель', pro: 'Профессионал', legend: 'Легенда' };
    const user = ctx.from;
    
    matches[user.id] = {
      difficulty: difficulty,
      playerScore: 0,
      aiScore: 0,
      round: 0,
      maxRounds: 5,
      isFinished: false,
      history: [],
      isSuddenDeath: false,
      isPlayerTurn: true
    };
    
    await ctx.editMessageText(
      '🤖 *Матч против ИИ (' + difficultyNames[difficulty] + ')*\n\n' +
      '📊 Счёт: Ты 0 — 0 ИИ\n' +
      '🔢 Раунд 1 из 5\n\n' +
      '*Твой ход! Выбери бросок:*',
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

  // ============================================
  // ХОД ИГРОКА (ВЫБОР БРОСКА)
  // ============================================
  bot.action(/shot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAction = ctx.match[1];
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    if (!match.isPlayerTurn) {
      await ctx.editMessageText('⏳ Сейчас ход ИИ!');
      return;
    }
    
    const difficulty = match.difficulty;
    
    // ИИ вратарь выбирает действие
    const goalieAction = ['left', 'right', 'stand', 'low', 'glove', 'aggressive'][Math.floor(Math.random() * 6)];
    const result = calculateShot(playerAction, goalieAction, difficulty);
    
    match.history.push(playerAction);
    match.round++;
    
    if (result.isGoal) {
      match.playerScore++;
    }
    
    // Переключаем ход на ИИ
    match.isPlayerTurn = false;
    
    // Сохраняем результат хода игрока для отображения
    const playerResult = {
      action: playerAction,
      goalieAction: goalieAction,
      isGoal: result.isGoal,
      probability: result.probability
    };
    
    // Проверяем, не закончился ли матч
    const isMatchOver = match.round >= match.maxRounds && match.playerScore !== match.aiScore;
    const isSuddenDeath = match.round >= match.maxRounds && match.playerScore === match.aiScore;
    
    if (isMatchOver || isSuddenDeath) {
      match.isFinished = true;
    }
    
    if (isSuddenDeath) {
      match.isSuddenDeath = true;
    }
    
    // Если матч не закончен — ход ИИ
    if (!match.isFinished) {
      // Показываем результат хода игрока и предлагаем выбрать защиту
      let resultText = '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
      resultText += '🧤 *Вратарь ИИ:* ' + goalieNames[goalieAction] + '\n';
      resultText += (result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*') + '\n\n';
      resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
      resultText += '🔢 Раунд ' + match.round + (match.isSuddenDeath ? ' (ДО ГОЛА!)' : ' из ' + match.maxRounds) + '\n\n';
      resultText += '🤖 *Ход ИИ! Выбери действие вратаря:*';
      
      await ctx.editMessageText(
        resultText,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🧤 Закрыть левый угол', 'goalie_left')],
            [Markup.button.callback('🧤 Закрыть правый угол', 'goalie_right')],
            [Markup.button.callback('🧍 Стоять', 'goalie_stand')],
            [Markup.button.callback('🛡️ Опустить щитки', 'goalie_low')],
            [Markup.button.callback('🧤 Ловушка', 'goalie_glove')],
            [Markup.button.callback('💪 Агрессивный выход', 'goalie_aggressive')],
          ])
        }
      );
      return;
    }
    
    // Если матч закончился — показываем результат
    await finishMatch(ctx, user, match);
  });

  // ============================================
  // ХОД ИИ (ИГРОК ВЫБИРАЕТ ДЕЙСТВИЕ ВРАТАРЯ)
  // ============================================
  bot.action(/goalie_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const goalieAction = ctx.match[1];
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    if (match.isPlayerTurn) {
      await ctx.editMessageText('⏳ Сейчас твой ход!');
      return;
    }
    
    const difficulty = match.difficulty;
    
    // ИИ выбирает бросок
    const aiAction = getAIShot(user.id, difficulty);
    const result = calculateShot(aiAction, goalieAction, difficulty);
    
    if (result.isGoal) {
      match.aiScore++;
    }
    
    // Переключаем ход на игрока
    match.isPlayerTurn = true;
    
    // Проверяем окончание матча
    const isMatchOver = match.round >= match.maxRounds && match.playerScore !== match.aiScore;
    const isSuddenDeath = match.round >= match.maxRounds && match.playerScore === match.aiScore;
    
    if (isMatchOver || isSuddenDeath) {
      match.isFinished = true;
    }
    
    if (isSuddenDeath) {
      match.isSuddenDeath = true;
    }
    
    // Если матч закончился
    if (match.isFinished) {
      await finishMatch(ctx, user, match);
      return;
    }
    
    // Показываем результат хода ИИ и предлагаем бросить
    let resultText = '🤖 *Ход ИИ:* ' + actionNames[aiAction] + '\n';
    resultText += '🧤 *Твой вратарь:* ' + goalieNames[goalieAction] + '\n';
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 😱' : '😤 *СЭЙВ!*') + '\n\n';
    resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    resultText += '🔢 Раунд ' + match.round + (match.isSuddenDeath ? ' (ДО ГОЛА!)' : ' из ' + match.maxRounds) + '\n\n';
    
    const nextRound = match.round + 1;
    const roundText = match.isSuddenDeath ? 'ДО ГОЛА!' : (nextRound + ' из ' + match.maxRounds);
    resultText += '*Твой ход! Выбери бросок для раунда ' + roundText + ':*';
    
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
  });

  // ============================================
  // ЗАВЕРШЕНИЕ МАТЧА
  // ============================================
  async function finishMatch(ctx, user, match) {
    const users = getUsers();
    const data = users[user.id];
    
    const isWin = match.playerScore > match.aiScore;
    const isDraw = match.playerScore === match.aiScore;
    
    if (isWin) {
      data.wins++;
      data.coins += 20;
      data.rating += 25;
    } else if (isDraw) {
      data.draws++;
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
    
    const matchResult = {
      playerScore: match.playerScore,
      aiScore: match.aiScore,
      isWin: isWin,
      isDraw: isDraw,
      rounds: match.round
    };
    
    delete matches[user.id];
    
    let resultText = '🏁 *МАТЧ ЗАВЕРШЁН!*\n\n';
    resultText += '📊 *Итоговый счёт:*\n';
    resultText += '🔥 Ты: ' + matchResult.playerScore + '\n';
    resultText += '🤖 ИИ: ' + matchResult.aiScore + '\n';
    resultText += '🔢 Раундов: ' + matchResult.rounds + '\n\n';
    
    if (isWin) {
      resultText += '🎉 *ПОБЕДА!* +20⭐ +25 рейтинга\n';
    } else if (isDraw) {
      resultText += '⚖️ *НИЧЬЯ!*\n';
    } else {
      resultText += '😔 *ПОРАЖЕНИЕ...* -10 рейтинга\n';
    }
    
    resultText += '\n📊 *Твоя статистика:*\n';
    resultText += '🏆 Рейтинг: ' + data.rating + '\n';
    resultText += '🥇 Лига: ' + data.league + '\n';
    resultText += '⭐ Монет: ' + data.coins + '\n';
    resultText += '✅ Побед: ' + data.wins + '\n';
    resultText += '❌ Поражений: ' + data.losses + '\n';
    resultText += '⚖️ Ничьих: ' + data.draws + '\n\n';
    resultText += 'Выбери действие:';
    
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
  }

  // ============================================
  // СДАЧА
  // ============================================
  bot.action('forfeit', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const match = matches[user.id];
    if (match) {
      match.isFinished = true;
      delete matches[user.id];
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

  // ============================================
  // PVP (В РАЗРАБОТКЕ)
  // ============================================
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
