// ============================================
// src/handlers/game.js - ИСПРАВЛЕННЫЙ
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
    
    if (leftCount >= 2) { weights.right += 2; }
    if (rightCount >= 2) { weights.left += 2; }
    if (topCount >= 2) { weights.stand += 2; weights.glove += 2; }
    if (fiveholeCount >= 2) { weights.low += 3; }
    if (dekeCount >= 2) { weights.aggressive += 3; }
    if (wristCount >= 2) { weights.glove += 2; }
    if (slapCount >= 2) { weights.low += 2; }
  }
  
  const difficultyBonus = { novice: 0.5, amateur: 0.7, pro: 1.0, legend: 1.3 };
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
  const difficultyBonus = { novice: 1.4, amateur: 1.1, pro: 0.85, legend: 0.6 };
  const defenseFactor = difficultyBonus[difficulty] || 1;
  
  let probability = multiplier * randomFactor * defenseFactor;
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return { isGoal: Math.random() < probability, probability: Math.round(probability * 100) };
}

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
          [Markup.button.callback('🟢 Новичок', 'difficulty_novice')],
          [Markup.button.callback('🟡 Любитель', 'difficulty_amateur')],
          [Markup.button.callback('🟠 Профессионал', 'difficulty_pro')],
          [Markup.button.callback('🔴 Легенда', 'difficulty_legend')],
          [Markup.button.callback('🔙 Назад', 'play')],
        ])
      }
    );
  });

  bot.action(/difficulty_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const difficulty = ctx.match[1];
    const difficultyNames = { 
      novice: 'Новичок', 
      amateur: 'Любитель', 
      pro: 'Профессионал', 
      legend: 'Легенда' 
    };
    const user = ctx.from;
    
    const users = getUsers();
    const data = users[user.id];
    const team = data.team || [];
    
    const forwards = team.filter(p => p.position !== 'G');
    const goalie = team.find(p => p.position === 'G');
    
    if (forwards.length < 5) {
      await ctx.editMessageText(
        '❌ *В команде меньше 5 полевых игроков!*\n\n' +
        'Перейди в 👥 Команда и собери состав (5 полевых + вратарь).',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('👥 Перейти в команду', 'team')],
            [Markup.button.callback('🔙 Назад', 'play')],
          ])
        }
      );
      return;
    }
    
    if (!goalie) {
      await ctx.editMessageText(
        '❌ *Нет вратаря!*\n\n' +
        'Перейди в 👥 Команда и выбери вратаря.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('👥 Перейти в команду', 'team')],
            [Markup.button.callback('🔙 Назад', 'play')],
          ])
        }
      );
      return;
    }
    
    matches[user.id] = {
      difficulty: difficulty,
      difficultyName: difficultyNames[difficulty] || 'Профессионал',
      playerScore: 0,
      aiScore: 0,
      round: 0,
      maxRounds: 5,
      isFinished: false,
      history: [],
      isSuddenDeath: false,
      isPlayerTurn: true,
      currentShooter: 0,
      team: team,
      waitingForGoalie: false,
      lastShot: null
    };
    
    await showPlayerSelection(ctx, user, matches[user.id]);
  });

  async function showPlayerSelection(ctx, user, match) {
    const team = match.team.filter(p => p.position !== 'G');
    const buttons = [];
    
    team.forEach((player, index) => {
      const emoji = ['⚡', '🔥', '⭐', '💫', '🌟'][index] || '🏒';
      buttons.push([Markup.button.callback(
        emoji + ' ' + player.name + ' (' + player.overall + ' OVR)', 
        'select_player_' + index
      )]);
    });
    
    buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
    
    let text = '🤖 *Матч против ИИ (' + match.difficultyName + ')*\n\n';
    if (match.lastShot) {
      text += '⚡ *Последний бросок:*\n';
      text += '  ' + match.lastShot + '\n\n';
    }
    text += '📊 Счёт: Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    text += '🔢 Раунд ' + (match.round + 1) + (match.isSuddenDeath ? ' (ДО ГОЛА!)' : ' из ' + match.maxRounds) + '\n\n';
    text += '*Выбери полевого игрока, который будет бить буллит:*';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  }

  bot.action(/select_player_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerIndex = parseInt(ctx.match[1]);
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    const forwards = match.team.filter(p => p.position !== 'G');
    const player = forwards[playerIndex];
    
    if (!player) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    match.currentShooter = playerIndex;
    
    await ctx.editMessageText(
      '🎯 *Выбран полевой игрок:* ' + player.name + ' (' + player.overall + ' OVR)\n\n' +
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
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    if (!match.isPlayerTurn) {
      await ctx.editMessageText('⏳ Сейчас ход ИИ!');
      return;
    }
    
    const difficulty = match.difficulty;
    const forwards = match.team.filter(p => p.position !== 'G');
    const player = forwards[match.currentShooter];
    const goalie = match.team.find(p => p.position === 'G');
    
    if (!player) {
      await ctx.editMessageText('❌ Ошибка: игрок не найден!');
      return;
    }
    
    const goalieAction = ['left', 'right', 'stand', 'low', 'glove', 'aggressive'][Math.floor(Math.random() * 6)];
    const result = calculateShot(playerAction, goalieAction, difficulty);
    
    match.history.push(playerAction);
    match.round++;
    
    if (result.isGoal) {
      match.playerScore++;
    }
    
    match.isPlayerTurn = false;
    match.waitingForGoalie = true;
    
    match.lastShot = '🎯 ' + player.name + ' — ' + actionNames[playerAction] + ' → ' + (result.isGoal ? '⚡ ГОЛ!' : '😤 СЭЙВ!');
    
    let resultText = '🎯 *' + player.name + ' бросает!*\n';
    resultText += '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
    
    if (goalie) {
      resultText += '🧤 *' + goalie.name + ':* ' + goalieNames[goalieAction] + '\n';
    } else {
      resultText += '🧤 *Вратарь:* ' + goalieNames[goalieAction] + '\n';
    }
    
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
  });

  bot.action(/goalie_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const goalieAction = ctx.match[1];
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    if (!match.waitingForGoalie) {
      await ctx.editMessageText('⏳ Сейчас твой ход!');
      return;
    }
    
    const difficulty = match.difficulty;
    const goalie = match.team.find(p => p.position === 'G');
    
    const aiAction = getAIShot(user.id, difficulty);
    const result = calculateShot(aiAction, goalieAction, difficulty);
    
    if (result.isGoal) {
      match.aiScore++;
    }
    
    match.waitingForGoalie = false;
    match.isPlayerTurn = true;
    
    match.lastShot = '🤖 ' + actionNames[aiAction] + ' → ' + (result.isGoal ? '⚡ ГОЛ! 😱' : '😤 СЭЙВ!');
    
    const isFinishedAfterRounds = match.round >= match.maxRounds && match.playerScore !== match.aiScore;
    const isSuddenDeath = match.round >= match.maxRounds && match.playerScore === match.aiScore;
    
    if (isSuddenDeath) {
      match.isSuddenDeath = true;
    }
    
    if (match.isSuddenDeath && result.isGoal) {
      match.isFinished = true;
    }
    
    if (isFinishedAfterRounds) {
      match.isFinished = true;
    }
    
    let resultText = '🤖 *Ход ИИ:* ' + actionNames[aiAction] + '\n';
    
    if (goalie) {
      resultText += '🧤 *' + goalie.name + ':* ' + goalieNames[goalieAction] + '\n';
    } else {
      resultText += '🧤 *Вратарь:* ' + goalieNames[goalieAction] + '\n';
    }
    
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 😱' : '😤 *СЭЙВ!*') + '\n\n';
    resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    resultText += '🔢 Раунд ' + match.round + (match.isSuddenDeath ? ' (ДО ГОЛА!)' : ' из ' + match.maxRounds) + '\n\n';
    
    if (match.isFinished) {
      await finishMatch(ctx, user, match);
      return;
    }
    
    resultText += '*Выбери следующего полевого игрока для буллита:*';
    
    const forwards = match.team.filter(p => p.position !== 'G');
    const buttons = [];
    
    forwards.forEach((player, index) => {
      const emoji = ['⚡', '🔥', '⭐', '💫', '🌟'][index] || '🏒';
      buttons.push([Markup.button.callback(
        emoji + ' ' + player.name + ' (' + player.overall + ' OVR)', 
        'select_player_' + index
      )]);
    });
    
    buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
    
    await ctx.editMessageText(
      resultText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  });

  async function finishMatch(ctx, user, match) {
    const users = getUsers();
    const data = users[user.id];
    
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
    
    const matchResult = {
      playerScore: match.playerScore,
      aiScore: match.aiScore,
      isWin: isWin,
      rounds: match.round
    };
    
    delete matches[user.id];
    
    let resultText = '🏁 *МАТЧ ЗАВЕРШЁН!*\n\n';
    
    if (match.lastShot) {
      resultText += '⚡ *Последний бросок:*\n';
      resultText += '  ' + match.lastShot + '\n\n';
    }
    
    resultText += '📊 *Итоговый счёт:*\n';
    resultText += '🔥 Ты: ' + matchResult.playerScore + '\n';
    resultText += '🤖 ИИ: ' + matchResult.aiScore + '\n';
    resultText += '🔢 Раундов: ' + matchResult.rounds + '\n\n';
    
    if (isWin) {
      resultText += '🎉 *ПОБЕДА!* +20⭐ +25 рейтинга\n';
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
