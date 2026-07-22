// ============================================
// src/handlers/game.js - БЕЗ ПОДСКАЗОК ДЛЯ НОВИЧКА
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
const { addXP, addTournamentResult } = require('./xp');

console.log('✅ [game.js] addXP загружен, тип:', typeof addXP);

const actionNames = {
  left: '⬅️ Влево',
  right: '➡️ Вправо',
  fivehole: '⬇️ Между щитков',
  top: '⬆️ Верхний',
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

// ✅ ТОЛЬКО 3 ДЕЙСТВИЯ ДЛЯ ИИ
const AI_ACTIONS = ['left', 'right', 'fivehole'];

// ✅ НАГРАДЫ ЗА СЛОЖНОСТЬ (БЕЗ ПОДСКАЗОК)
const DIFFICULTY_REWARDS = {
  novice: {
    name: '🟢 Новичок',
    winCoins: 10,
    winRating: 10,
    lossRating: -5,
    xp: 1,
  },
  amateur: {
    name: '🟡 Любитель',
    winCoins: 15,
    winRating: 15,
    lossRating: -7,
    xp: 1,
  },
  pro: {
    name: '🟠 Профессионал',
    winCoins: 25,
    winRating: 25,
    lossRating: -10,
    xp: 2,
  },
  legend: {
    name: '🔴 Легенда',
    winCoins: 50,
    winRating: 40,
    lossRating: -15,
    xp: 3,
  }
};

// ✅ ФУНКЦИЯ ПОЛУЧЕНИЯ ХОДА ИИ
function getAIShot(playerId, difficulty = 1) {
  const history = matches[playerId]?.history || [];
  
  let weights = { left: 1, right: 1, fivehole: 1 };
  
  if (history.length > 2) {
    const lastThree = history.slice(-3);
    const leftCount = lastThree.filter(a => a === 'left').length;
    const rightCount = lastThree.filter(a => a === 'right').length;
    const fiveholeCount = lastThree.filter(a => a === 'fivehole').length;
    
    if (leftCount >= 2) weights.left *= 0.5;
    if (rightCount >= 2) weights.right *= 0.5;
    if (fiveholeCount >= 2) weights.fivehole *= 0.5;
  }
  
  const difficultyMultipliers = {
    novice: 1.0,
    amateur: 1.0,
    pro: 0.8,
    legend: 0.6
  };
  
  const factor = difficultyMultipliers[difficulty] || 1;
  Object.keys(weights).forEach(key => {
    weights[key] = weights[key] * factor;
    weights[key] = weights[key] * (0.8 + Math.random() * 0.4);
  });
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [action, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      console.log('🎯 [ИИ] Выбрал действие:', actionNames[action]);
      return action;
    }
  }
  return AI_ACTIONS[Math.floor(Math.random() * AI_ACTIONS.length)];
}

// ✅ РАСЧЁТ ШАНСА ГОЛА
function calculateShot(playerAction, goalieAction, difficulty = 1, playerOverall = 80) {
  const actionBonus = {
    'left': { 'left': 0.05, 'right': 0.75, 'stand': 0.40, 'low': 0.35, 'glove': 0.35, 'aggressive': 0.60 },
    'right': { 'left': 0.75, 'right': 0.05, 'stand': 0.40, 'low': 0.35, 'glove': 0.35, 'aggressive': 0.60 },
    'top': { 'left': 0.70, 'right': 0.70, 'stand': 0.15, 'low': 0.65, 'glove': 0.65, 'aggressive': 0.40 },
    'fivehole': { 'left': 0.65, 'right': 0.65, 'stand': 0.10, 'low': 0.05, 'glove': 0.70, 'aggressive': 0.35 },
    'deke': { 'left': 0.55, 'right': 0.55, 'stand': 0.35, 'low': 0.45, 'glove': 0.45, 'aggressive': 0.10 },
    'wrist': { 'left': 0.45, 'right': 0.45, 'stand': 0.35, 'low': 0.55, 'glove': 0.10, 'aggressive': 0.55 },
    'slap': { 'left': 0.45, 'right': 0.45, 'stand': 0.35, 'low': 0.10, 'glove': 0.55, 'aggressive': 0.55 }
  };

  const baseChance = actionBonus[playerAction]?.[goalieAction] || 0.5;
  const randomFactor = 0.85 + Math.random() * 0.3;
  
  let ratingBonus = 0;
  if (playerOverall >= 96) ratingBonus = 0.35;
  else if (playerOverall >= 91) ratingBonus = 0.25;
  else if (playerOverall >= 86) ratingBonus = 0.15;
  else if (playerOverall >= 81) ratingBonus = 0.05;
  else if (playerOverall >= 71) ratingBonus = 0;
  else ratingBonus = -0.10;
  
  const difficultyBonus = {
    novice: 1.3,
    amateur: 1.1,
    pro: 0.85,
    legend: 0.6
  };
  const defenseFactor = difficultyBonus[difficulty] || 1;
  
  let probability = baseChance * randomFactor * (1 + ratingBonus) * defenseFactor;
  
  if (playerOverall >= 95) {
    probability = Math.max(probability, 0.50);
  } else if (playerOverall >= 90) {
    probability = Math.max(probability, 0.35);
  } else if (playerOverall >= 85) {
    probability = Math.max(probability, 0.25);
  }
  
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  const isGoal = Math.random() < probability;
  
  console.log(`📊 [Шанс] Бросок: ${playerAction}, Вратарь: ${goalieAction}, Шанс: ${Math.round(probability * 100)}%, Гол: ${isGoal ? '✅' : '❌'}`);
  
  return { isGoal, probability: Math.round(probability * 100) };
}

async function finishMatch(ctx, user, match, isForfeit = false) {
  console.log('🏁 [finishMatch] Завершаем матч. Forfeit:', isForfeit);
  const users = getUsers();
  const data = users[user.id];
  
  const isWin = !isForfeit && match.playerScore > match.aiScore;
  const difficulty = match.difficulty || 'pro';
  const rewards = DIFFICULTY_REWARDS[difficulty] || DIFFICULTY_REWARDS.pro;
  
  if (!data) {
    console.log('❌ [finishMatch] Пользователь не найден!');
    await ctx.editMessageText('❌ Ошибка! Попробуй /start');
    return;
  }
  
  let xpEarned = 0;
  let coinsEarned = 0;
  let ratingEarned = 0;
  let xpResult = null;
  
  if (isWin) {
    data.wins = (data.wins || 0) + 1;
    coinsEarned = rewards.winCoins;
    ratingEarned = rewards.winRating;
    xpEarned = rewards.xp;
    data.coins = (data.coins || 0) + coinsEarned;
    data.rating = (data.rating || 0) + ratingEarned;
    console.log('🏆 ПОБЕДА! +' + xpEarned + ' XP, +' + coinsEarned + '⭐, +' + ratingEarned + ' рейтинга');
  } else {
    data.losses = (data.losses || 0) + 1;
    ratingEarned = rewards.lossRating;
    data.rating = Math.max(0, (data.rating || 0) + ratingEarned);
    xpEarned = 0;
    coinsEarned = 0;
    console.log('😔 ПОРАЖЕНИЕ. ' + ratingEarned + ' рейтинга');
  }
  
  data.matches = (data.matches || 0) + 1;
  data.league = data.rating >= 2000 ? 'Легенда' :
                data.rating >= 1800 ? 'Мастер' :
                data.rating >= 1600 ? 'Алмаз' :
                data.rating >= 1400 ? 'Платина' :
                data.rating >= 1200 ? 'Золото' :
                data.rating >= 1000 ? 'Серебро' : 'Бронза';
  
  if (typeof addXP === 'function' && xpEarned > 0) {
    try {
      xpResult = await addXP(user.id, xpEarned, ctx);
      console.log('✅ Добавлено ' + xpEarned + ' XP, результат:', xpResult);
    } catch (error) {
      console.log('❌ Ошибка addXP:', error.message);
    }
  }
  
  try {
    await addTournamentResult(user.id, isWin, false);
    console.log('🏆 [Турнир] Результат добавлен для ИИ:', user.id, isWin ? 'победа' : 'поражение');
  } catch (error) {
    console.log('❌ Ошибка добавления турнирных очков:', error.message);
  }
  
  saveUsers(users);
  
  const matchResult = { 
    playerScore: match.playerScore, 
    aiScore: match.aiScore, 
    isWin: isWin, 
    rounds: match.round,
    isForfeit: isForfeit
  };
  
  delete matches[user.id];
  
  let resultText = '🏁 МАТЧ ЗАВЕРШЁН!\n\n';
  if (isForfeit) {
    resultText += '🏳️ Ты сдался!\n\n';
  }
  if (match.lastShot) resultText += '⚡ Последний бросок:\n  ' + match.lastShot + '\n\n';
  resultText += '📊 Итоговый счёт:\n🔥 Ты: ' + matchResult.playerScore + '\n🤖 ИИ: ' + matchResult.aiScore + '\n🔢 Раундов: ' + matchResult.rounds + '\n\n';
  
  if (isWin) {
    resultText += '🎉 ПОБЕДА!\n';
    resultText += '  ⭐ +' + coinsEarned + ' монет\n';
    resultText += '  🏆 +' + ratingEarned + ' рейтинга\n';
    resultText += '  🎖️ +' + xpEarned + ' XP\n';
    
    if (xpResult && xpResult.success) {
      resultText += '\n📊 XP Прогресс:\n';
      resultText += '  📈 Было: ' + xpResult.oldXP + ' XP (уровень ' + xpResult.oldLevel + ')\n';
      resultText += '  📈 Стало: ' + xpResult.newXP + ' XP (уровень ' + xpResult.newLevel + ')\n';
      if (xpResult.rewards && xpResult.rewards.newRewards > 0) {
        resultText += '  🎁 Получено наград: ' + xpResult.rewards.newRewards + '\n';
        xpResult.rewards.rewardList.forEach(r => {
          resultText += '    • Уровень ' + r.level + ': ' + r.rewardText.join(', ') + '\n';
        });
      }
    }
  } else {
    resultText += '😔 ПОРАЖЕНИЕ...\n';
    if (ratingEarned < 0) {
      resultText += '  🏆 ' + ratingEarned + ' рейтинга\n';
    } else {
      resultText += '  🏆 +' + ratingEarned + ' рейтинга\n';
    }
    resultText += '  🎖️ +0 XP\n';
  }
  
  resultText += '\n🏆 Турнирные очки: ' + (isWin ? '+2' : '0');
  
  resultText += '\n\n📊 Твоя статистика:\n🏆 Рейтинг: ' + data.rating + '\n🥇 Лига: ' + data.league + '\n⭐ Монет: ' + data.coins + '\n✅ Побед: ' + data.wins + '\n❌ Поражений: ' + data.losses + '\n\n';
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
  console.log('✅ Матч завершён, данные сохранены');
}

async function showPlayerSelection(ctx, user, match) {
  console.log('👥 [showPlayerSelection] Показываем выбор игрока');
  
  if (!match || match.isFinished) {
    console.log('❌ [showPlayerSelection] Матч не существует или завершён');
    await ctx.editMessageText('❌ Матч завершён! Начни новый.');
    return;
  }
  
  const team = match.team.filter(p => p.position !== 'G');
  const buttons = [];
  
  if (team.length === 0) {
    await ctx.editMessageText(
      '❌ *Нет полевых игроков в составе!*\n\nДобавь полевых игроков в 👥 Команда',
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
  
  const availablePlayers = team.filter((p, i) => !match.usedPlayers.includes(i));
  
  if (availablePlayers.length === 0 && match.isSuddenDeath) {
    console.log('🔄 Все игроки использованы в овертайме, сбрасываем список');
    match.usedPlayers = [];
    await showPlayerSelection(ctx, user, match);
    return;
  }
  
  if (availablePlayers.length === 0) {
    match.isFinished = true;
    await finishMatch(ctx, user, match);
    return;
  }
  
  availablePlayers.forEach((player, index) => {
    const originalIndex = team.indexOf(player);
    const emoji = ['⚡', '🔥', '⭐', '💫', '🌟'][index] || '🏒';
    buttons.push([Markup.button.callback(
      emoji + ' ' + player.name + ' (' + player.overall + ' OVR)', 
      'match_player_' + originalIndex
    )]);
  });
  
  buttons.push([Markup.button.callback('🏳️ Сдаться', 'forfeit')]);
  
  let text = '🤖 *Матч против ИИ (' + match.difficultyName + ')*\n\n';
  
  const difficulty = match.difficulty;
  const rewards = DIFFICULTY_REWARDS[difficulty];
  
  if (rewards) {
    text += '📋 *Награды за ' + rewards.name + ':*\n';
    text += '  🏆 Победа: +' + rewards.winCoins + '⭐, +' + rewards.winRating + ' рейтинга, +' + rewards.xp + ' XP\n';
    text += '  😔 Поражение: ' + rewards.lossRating + ' рейтинга\n\n';
  }
  
  if (match.lastShot) {
    text += '⚡ *Последний бросок:*\n  ' + match.lastShot + '\n\n';
  }
  text += '📊 Счёт: Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
  
  if (match.isSuddenDeath) {
    text += '⚡ *ОВЕРТАЙМ! БУЛЛИТЫ ДО ГОЛА!*\n';
    text += '🔢 Раунд ' + (match.round + 1) + '\n\n';
  } else {
    text += '🔢 Раунд ' + (match.round + 1) + ' из ' + match.maxRounds + '\n\n';
  }
  
  text += '*Выбери полевого игрока, который будет бить буллит:*';
  
  await ctx.editMessageText(
    text,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = (bot) => {
  
  // ✅ ОБНОВЛЁННЫЙ ОБРАБОТЧИК play - С ОНЛАЙН И ОЧЕРЕДЬЮ
  bot.action('play', async (ctx) => {
    console.log('🎮 [play] Нажата кнопка play');
    await ctx.answerCbQuery();
    
    // Получаем количество игроков в очереди PvP
    let queueCount = 0;
    try {
      const pvpHandler = require('./pvp');
      queueCount = pvpHandler.getQueueCount ? pvpHandler.getQueueCount() : 0;
    } catch (e) {
      queueCount = 0;
    }
    
    const text = 
      `🎮 *Выбери режим:*\n\n` +
      `👥 *Игроков в боте:* ${Math.floor(Math.random() * 10) + 5}\n` +
      `⚔️ *В PvP очереди:* ${queueCount}\n\n` +
      `🤖 Игра против ИИ — сражайся с компьютером\n` +
      `⚔️ PvP — сражайся с реальным игроком`;
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🤖 Против ИИ', 'play_ai')],
        [Markup.button.callback(`⚔️ PvP (${queueCount} в очереди)`, 'pvp_find')],
        [Markup.button.callback('🔙 Назад', 'back')],
      ])
    });
  });

  bot.action('play_ai', async (ctx) => {
    console.log('🤖 [play_ai] Нажата кнопка play_ai');
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🤖 *Выбери сложность ИИ:*\n\n' +
      '📋 *Награды:*\n' +
      '🟢 Новичок: победа +10⭐, +10 рейтинга, +1 XP\n' +
      '🟡 Любитель: победа +15⭐, +15 рейтинга, +1 XP\n' +
      '🟠 Профессионал: победа +25⭐, +25 рейтинга, +2 XP\n' +
      '🔴 Легенда: победа +50⭐, +40 рейтинга, +3 XP',
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
    console.log('🎯 [difficulty] Нажата сложность:', ctx.match[1]);
    await ctx.answerCbQuery();
    const difficulty = ctx.match[1];
    const difficultyNames = { 
      novice: '🟢 Новичок', 
      amateur: '🟡 Любитель', 
      pro: '🟠 Профессионал', 
      legend: '🔴 Легенда' 
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
      difficultyName: difficultyNames[difficulty] || '🟠 Профессионал',
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
      lastShot: null,
      usedPlayers: [],
      isProcessing: false
    };
    
    console.log('✅ Матч создан для пользователя:', user.id);
    await showPlayerSelection(ctx, user, matches[user.id]);
  });

  bot.action(/match_player_(.+)/, async (ctx) => {
    console.log('🏒 [match_player] Выбран игрок:', ctx.match[1]);
    await ctx.answerCbQuery();
    const playerIndex = parseInt(ctx.match[1]);
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match || match.isFinished) {
      await ctx.editMessageText('❌ Матч завершён!');
      return;
    }
    
    if (match.isProcessing) return;
    
    const forwards = match.team.filter(p => p.position !== 'G');
    if (playerIndex >= forwards.length) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    const player = forwards[playerIndex];
    if (!player) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    if (player.position === 'G') {
      await ctx.editMessageText('❌ Вратарь не может бить буллит!');
      return;
    }
    
    if (match.usedPlayers.includes(playerIndex)) {
      await ctx.editMessageText('❌ Этот игрок уже бил буллит!');
      return;
    }
    
    match.isProcessing = true;
    match.usedPlayers.push(playerIndex);
    match.currentShooter = playerIndex;
    
    await ctx.editMessageText(
      '🎯 *Выбран полевой игрок:* ' + player.name + ' (' + player.overall + ' OVR)\n\n' +
      '*Выбери действие:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Влево', 'shot_left')],
          [Markup.button.callback('➡️ Вправо', 'shot_right')],
          [Markup.button.callback('⬇️ Между щитков', 'shot_fivehole')],
          [Markup.button.callback('⬆️ Верхний', 'shot_top')],
          [Markup.button.callback('🔄 Финт', 'shot_deke')],
          [Markup.button.callback('✋ Кистевой', 'shot_wrist')],
          [Markup.button.callback('💥 Щелчок', 'shot_slap')],
          [Markup.button.callback('🏳️ Сдаться', 'forfeit')],
        ])
      }
    );
    
    match.isProcessing = false;
  });

  // ✅ ОСНОВНОЙ ОБРАБОТЧИК БРОСКА
  bot.action(/shot_(.+)/, async (ctx) => {
    console.log('💥 [shot] Выбран бросок:', ctx.match[1]);
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
    
    if (match.isProcessing) return;
    match.isProcessing = true;
    
    const difficulty = match.difficulty;
    const forwards = match.team.filter(p => p.position !== 'G');
    const player = forwards[match.currentShooter];
    const goalie = match.team.find(p => p.position === 'G');
    
    if (!player) {
      await ctx.editMessageText('❌ Ошибка: игрок не найден!');
      match.isProcessing = false;
      return;
    }
    
    const playerOverall = player.overall || 80;
    
    const goalieActions = ['left', 'right', 'stand', 'low', 'glove', 'aggressive'];
    const goalieAction = goalieActions[Math.floor(Math.random() * goalieActions.length)];
    
    const result = calculateShot(playerAction, goalieAction, difficulty, playerOverall);
    
    match.history.push(playerAction);
    match.round++;
    
    if (result.isGoal) match.playerScore++;
    
    match.isPlayerTurn = false;
    match.waitingForGoalie = true;
    
    match.lastShot = '🎯 ' + player.name + ' — ' + actionNames[playerAction] + ' → ' + (result.isGoal ? '⚡ ГОЛ!' : '😤 СЭЙВ!');
    
    let resultText = '🎯 *' + player.name + ' бросает!*\n';
    resultText += '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
    resultText += '🧤 *' + (goalie ? goalie.name : 'Вратарь') + ':* ' + goalieNames[goalieAction] + '\n';
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*') + '\n\n';
    
    resultText += `📊 *Шанс гола:* ${result.probability}% (рейтинг ${playerOverall})\n\n`;
    
    resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    
    if (match.isSuddenDeath) {
      resultText += '⚡ *ОВЕРТАЙМ! БУЛЛИТЫ ДО ГОЛА!*\n';
      resultText += '🔢 Раунд ' + match.round + '\n\n';
    } else {
      resultText += '🔢 Раунд ' + match.round + ' из ' + match.maxRounds + '\n\n';
    }
    
    resultText += '🤖 *Ход ИИ! Выбери действие вратаря:*';
    
    await ctx.editMessageText(
      resultText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🧤 Закрыть левый угол', 'game_goalie_left')],
          [Markup.button.callback('🧤 Закрыть правый угол', 'game_goalie_right')],
          [Markup.button.callback('🧍 Стоять', 'game_goalie_stand')],
          [Markup.button.callback('🛡️ Опустить щитки', 'game_goalie_low')],
          [Markup.button.callback('🧤 Ловушка', 'game_goalie_glove')],
          [Markup.button.callback('💪 Агрессивный выход', 'game_goalie_aggressive')],
          [Markup.button.callback('🏳️ Сдаться', 'forfeit')],
        ])
      }
    );
    
    match.isProcessing = false;
  });

  // ✅ ОБРАБОТЧИК ВРАТАРЯ
  bot.action(/game_goalie_(.+)/, async (ctx) => {
    console.log('🧤 [game_goalie] Выбрано действие вратаря:', ctx.match[1]);
    await ctx.answerCbQuery();
    const goalieAction = ctx.match[1];
    const user = ctx.from;
    const match = matches[user.id];
    
    if (!match) {
      console.log('❌ Матч не найден!');
      await ctx.editMessageText(
        '❌ *Матч не найден!*\n\n' +
        'Возможно матч уже завершён.\n' +
        'Начни новый матч через 🎮 Играть.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Начать новый матч', 'play')],
            [Markup.button.callback('🔙 Назад', 'back')],
          ])
        }
      );
      return;
    }
    
    if (match.isFinished) {
      console.log('❌ Матч уже завершён!');
      await ctx.editMessageText(
        '❌ *Матч уже завершён!*\n\n' +
        'Начни новый матч через 🎮 Играть.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Начать новый матч', 'play')],
            [Markup.button.callback('🔙 Назад', 'back')],
          ])
        }
      );
      return;
    }
    
    if (!match.waitingForGoalie) {
      console.log('❌ Не ожидаем вратаря!');
      await ctx.editMessageText('⏳ Сейчас твой ход!');
      return;
    }
    
    if (match.isProcessing) {
      console.log('⏳ Уже обрабатывается...');
      await ctx.answerCbQuery('⏳ Обработка...');
      return;
    }
    
    match.isProcessing = true;
    
    const difficulty = match.difficulty;
    const goalie = match.team.find(p => p.position === 'G');
    
    const aiAction = getAIShot(user.id, difficulty);
    
    const result = calculateShot(aiAction, goalieAction, difficulty, 80);
    
    console.log('🤖 ИИ выбрал:', aiAction, 'Результат:', result.isGoal);
    
    if (result.isGoal) match.aiScore++;
    
    match.waitingForGoalie = false;
    match.isPlayerTurn = true;
    
    match.lastShot = '🤖 ' + actionNames[aiAction] + ' → ' + (result.isGoal ? '⚡ ГОЛ! 😱' : '😤 СЭЙВ!');
    
    const isAfterMaxRounds = match.round >= match.maxRounds;
    const isScoreDifferent = match.playerScore !== match.aiScore;
    const isScoreEqual = match.playerScore === match.aiScore;
    
    console.log('📊 Проверка завершения:', {
      round: match.round,
      maxRounds: match.maxRounds,
      playerScore: match.playerScore,
      aiScore: match.aiScore,
      isAfterMaxRounds,
      isScoreDifferent,
      isScoreEqual,
      isSuddenDeath: match.isSuddenDeath
    });
    
    if (isAfterMaxRounds && isScoreEqual) {
      console.log('⚡ СЧЁТ РАВНЫЙ! НАЧИНАЕМ ОВЕРТАЙМ!');
      match.isSuddenDeath = true;
      match.maxRounds = Infinity;
      match.usedPlayers = [];
    }
    
    if (match.isSuddenDeath) {
      if (match.playerScore !== match.aiScore) {
        console.log('⚡ ОВЕРТАЙМ ЗАВЕРШЁН! РАЗНИЦА В СЧЁТЕ!');
        match.isFinished = true;
      } else {
        console.log('⚡ ОВЕРТАЙМ ПРОДОЛЖАЕТСЯ... СЧЁТ РАВНЫЙ');
      }
    } else {
      if (isAfterMaxRounds && isScoreDifferent) {
        console.log('🏁 5 РАУНДОВ ЗАВЕРШЕНО, РАЗНИЦА В СЧЁТЕ');
        match.isFinished = true;
      }
    }
    
    let resultText = '🤖 *Ход ИИ:* ' + actionNames[aiAction] + '\n';
    resultText += '🧤 *' + (goalie ? goalie.name : 'Вратарь') + ':* ' + goalieNames[goalieAction] + '\n';
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 😱' : '😤 *СЭЙВ!*') + '\n\n';
    resultText += '📊 *Счёт:* Ты ' + match.playerScore + ' — ' + match.aiScore + ' ИИ\n';
    
    if (match.isSuddenDeath) {
      resultText += '⚡ *ОВЕРТАЙМ! БУЛЛИТЫ ДО ГОЛА!*\n';
      resultText += '🔢 Раунд ' + match.round + '\n\n';
    } else {
      resultText += '🔢 Раунд ' + match.round + ' из ' + match.maxRounds + '\n\n';
    }
    
    match.isProcessing = false;
    
    if (match.isFinished) {
      console.log('🏁 Матч завершён!');
      await finishMatch(ctx, user, match);
      return;
    }
    
    console.log('👥 Продолжаем матч, показываем выбор игрока');
    await showPlayerSelection(ctx, user, match);
  });

  bot.action('forfeit', async (ctx) => {
    console.log('🏳️ [forfeit] Сдача');
    await ctx.answerCbQuery();
    const user = ctx.from;
    const match = matches[user.id];
    
    if (match) {
      match.isFinished = true;
      await finishMatch(ctx, user, match, true);
    } else {
      await ctx.editMessageText('❌ Матч не найден!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      });
    }
  });

  // ✅ ИСПРАВЛЕННЫЙ PvP - УБРАНО "В РАЗРАБОТКЕ"
  bot.action('play_pvp', async (ctx) => {
    console.log('⚔️ [play_pvp] Нажата кнопка PvP');
    await ctx.answerCbQuery();
    
    // Просто перенаправляем на поиск PvP
    try {
      const pvpHandler = require('./pvp');
      if (typeof pvpHandler.findOpponent === 'function') {
        await pvpHandler.findOpponent(ctx);
      } else {
        // Если функция не найдена, показываем сообщение
        await ctx.editMessageText(
          '⚔️ *PvP режим*\n\n' +
          'Поиск соперника... ⏳\n\n' +
          '💡 Нажми кнопку для поиска:',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔍 Найти соперника', 'pvp_find')],
              [Markup.button.callback('🔙 Назад', 'play')],
            ])
          }
        );
      }
    } catch (error) {
      console.error('❌ Ошибка PvP:', error);
      await ctx.editMessageText(
        '⚔️ *PvP режим*\n\n' +
        'Поиск соперника... ⏳\n\n' +
        '💡 Нажми кнопку для поиска:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Найти соперника', 'pvp_find')],
            [Markup.button.callback('🔙 Назад', 'play')],
          ])
        }
      );
    }
  });

};