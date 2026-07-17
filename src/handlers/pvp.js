// ============================================
// src/handlers/pvp.js - PvP РЕЖИМ (С ПОКАЗОМ СОСТАВОВ)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ХРАНИЛИЩЕ ДЛЯ PvP
const pvpQueue = [];
const pvpMatches = {};
const pvpTimers = {};
const playerActiveMatches = {};

let botInstance = null;

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function getRarityEmoji(rarity) {
  const emojis = {
    'Обычный': '⬜',
    'Редкий': '🟩',
    'Элитный': '🔵',
    'Эпический': '🟣',
    'Легендарный': '⭐',
    'Икона': '🔥'
  };
  return emojis[rarity] || '⬜';
}

function getTeamRating(team) {
  if (!team || team.length === 0) return 0;
  const total = team.reduce((sum, p) => sum + (p.overall || 0), 0);
  return Math.round(total / team.length);
}

function hasActiveMatch(userId) {
  for (const matchId in pvpMatches) {
    const match = pvpMatches[matchId];
    if (!match.isFinished && (match.player1 === userId || match.player2 === userId)) {
      return matchId;
    }
  }
  if (playerActiveMatches[userId]) {
    const matchId = playerActiveMatches[userId];
    if (pvpMatches[matchId] && !pvpMatches[matchId].isFinished) {
      return matchId;
    }
  }
  return null;
}

async function sendMessageToPlayer(playerId, text, keyboard = null) {
  if (!botInstance) {
    console.error('❌ Бот не инициализирован!');
    return;
  }
  try {
    const options = { parse_mode: 'Markdown' };
    if (keyboard) {
      options.reply_markup = keyboard.reply_markup;
    }
    await botInstance.telegram.sendMessage(playerId, text, options);
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения игроку:', error.message);
  }
}

// ✅ РАСЧЁТ ШАНСА ГОЛА
function calculateShot(playerAction, goalieAction, playerOverall = 80) {
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
  
  let ratingBonus = 0;
  if (playerOverall >= 96) ratingBonus = 0.40;
  else if (playerOverall >= 91) ratingBonus = 0.30;
  else if (playerOverall >= 86) ratingBonus = 0.20;
  else if (playerOverall >= 81) ratingBonus = 0.10;
  else if (playerOverall >= 71) ratingBonus = 0;
  else ratingBonus = -0.10;
  
  let probability = multiplier * randomFactor * (1 + ratingBonus);
  
  if (playerOverall >= 90) {
    probability = Math.max(probability, 0.30);
  }
  if (playerOverall >= 95) {
    probability = Math.max(probability, 0.40);
  }
  
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return { isGoal: Math.random() < probability, probability: Math.round(probability * 100) };
}

// ✅ ПОКАЗ СОСТАВОВ И РЕЙТИНГОВ
async function showTeamInfo(matchId) {
  const match = pvpMatches[matchId];
  if (!match) return;
  
  const player1Team = match.player1Team || [];
  const player2Team = match.player2Team || [];
  
  const rating1 = getTeamRating(player1Team);
  const rating2 = getTeamRating(player2Team);
  
  // Состав игрока 1
  let text1 = `👤 *${match.player1Name}*\n`;
  text1 += `📊 Рейтинг состава: ${rating1}\n\n`;
  text1 += `🏒 *Полевые:*\n`;
  
  const forwards1 = player1Team.filter(p => p.position !== 'G');
  const goalie1 = player1Team.find(p => p.position === 'G');
  
  forwards1.forEach((p, i) => {
    const emoji = getRarityEmoji(p.rarity);
    text1 += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
  });
  
  if (goalie1) {
    const emoji = getRarityEmoji(goalie1.rarity);
    text1 += `\n🧤 *Вратарь:* ${emoji} ${goalie1.name} (${goalie1.overall} OVR)`;
  } else {
    text1 += `\n🧤 *Вратарь:* ❌ Нет`;
  }
  
  // Состав игрока 2
  let text2 = `👤 *${match.player2Name}*\n`;
  text2 += `📊 Рейтинг состава: ${rating2}\n\n`;
  text2 += `🏒 *Полевые:*\n`;
  
  const forwards2 = player2Team.filter(p => p.position !== 'G');
  const goalie2 = player2Team.find(p => p.position === 'G');
  
  forwards2.forEach((p, i) => {
    const emoji = getRarityEmoji(p.rarity);
    text2 += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
  });
  
  if (goalie2) {
    const emoji = getRarityEmoji(goalie2.rarity);
    text2 += `\n🧤 *Вратарь:* ${emoji} ${goalie2.name} (${goalie2.overall} OVR)`;
  } else {
    text2 += `\n🧤 *Вратарь:* ❌ Нет`;
  }
  
  // Отправляем обоим игрокам информацию о составах
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Готов к матчу!', `pvp_ready_${matchId}`)]
  ]);
  
  await sendMessageToPlayer(
    match.player1,
    `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `📋 *Твой состав:*\n${text1}\n\n` +
    `📋 *Состав соперника:*\n${text2}\n\n` +
    `📊 Рейтинг твоего состава: ${rating1}\n` +
    `📊 Рейтинг состава соперника: ${rating2}\n\n` +
    `${rating1 > rating2 ? '🔥 Твой состав сильнее!' : rating1 < rating2 ? '⚠️ Состав соперника сильнее!' : '⚖️ Составы равны!'}\n\n` +
    `Нажми "Готов", чтобы начать матч!`,
    keyboard
  );
  
  await sendMessageToPlayer(
    match.player2,
    `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `📋 *Твой состав:*\n${text2}\n\n` +
    `📋 *Состав соперника:*\n${text1}\n\n` +
    `📊 Рейтинг твоего состава: ${rating2}\n` +
    `📊 Рейтинг состава соперника: ${rating1}\n\n` +
    `${rating2 > rating1 ? '🔥 Твой состав сильнее!' : rating2 < rating1 ? '⚠️ Состав соперника сильнее!' : '⚖️ Составы равны!'}\n\n` +
    `Нажми "Готов", чтобы начать матч!`,
    keyboard
  );
}

// ПОИСК СОПЕРНИКА
async function findOpponent(ctx) {
  const userId = ctx.from.id;
  const user = ctx.from;
  
  const activeMatch = hasActiveMatch(userId);
  if (activeMatch) {
    await ctx.reply('⚠️ У вас уже есть активный матч! Дождитесь его завершения.');
    return;
  }
  
  if (pvpQueue.includes(userId)) {
    await ctx.reply('⏳ Вы уже в очереди на поиск соперника!');
    return;
  }
  
  const users = getUsers();
  const data = users[userId];
  if (!data) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  const team = data.team || [];
  const forwards = team.filter(p => p.position !== 'G');
  const goalie = team.find(p => p.position === 'G');
  
  if (forwards.length < 5) {
    await ctx.reply('❌ *В команде меньше 5 полевых игроков!*\n\nСобери состав (5 полевых + вратарь).', { parse_mode: 'Markdown' });
    return;
  }
  
  if (!goalie) {
    await ctx.reply('❌ *Нет вратаря!*\n\nДобавь вратаря в состав.', { parse_mode: 'Markdown' });
    return;
  }
  
  pvpQueue.push(userId);
  
  const msg = await ctx.reply(
    `🔍 *Поиск соперника...*\n\n` +
    `👤 ${user.first_name}\n` +
    `⏳ В очереди: ${pvpQueue.length} игроков\n\n` +
    `💡 Для отмены нажмите кнопку ниже`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отменить поиск', 'pvp_cancel')]
      ])
    }
  );
  
  pvpTimers[userId] = {
    messageId: msg.message_id,
    chatId: ctx.chat.id,
    timeout: setTimeout(() => {
      const index = pvpQueue.indexOf(userId);
      if (index !== -1) {
        pvpQueue.splice(index, 1);
        ctx.telegram.editMessageText(
          ctx.chat.id,
          msg.message_id,
          null,
          '⏰ *Поиск отменён!*\n\nПрошло 30 секунд. Попробуйте снова.',
          { parse_mode: 'Markdown' }
        ).catch(() => {});
        delete pvpTimers[userId];
      }
    }, 30000)
  };
  
  if (pvpQueue.length >= 2) {
    const player1Id = pvpQueue.shift();
    const player2Id = pvpQueue.shift();
    
    if (pvpTimers[player1Id]) {
      clearTimeout(pvpTimers[player1Id].timeout);
      delete pvpTimers[player1Id];
    }
    if (pvpTimers[player2Id]) {
      clearTimeout(pvpTimers[player2Id].timeout);
      delete pvpTimers[player2Id];
    }
    
    await createPvPMatch(ctx, player1Id, player2Id);
  }
}

// СОЗДАНИЕ PvP МАТЧА
async function createPvPMatch(ctx, player1Id, player2Id) {
  const users = getUsers();
  const player1Data = users[player1Id];
  const player2Data = users[player2Id];
  
  const matchId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  
  console.log('📊 [PvP] Создаём матч:', matchId);
  
  const player1Team = player1Data?.team || [];
  const player2Team = player2Data?.team || [];
  
  pvpMatches[matchId] = {
    id: matchId,
    player1: player1Id,
    player2: player2Id,
    player1Name: player1Data?.name || 'Игрок 1',
    player2Name: player2Data?.name || 'Игрок 2',
    player1Score: 0,
    player2Score: 0,
    round: 0,
    maxRounds: 5,
    isFinished: false,
    isSuddenDeath: false,
    currentTurn: null,
    usedPlayers1: [],
    usedPlayers2: [],
    waitingForAction: false,
    currentShooter: null,
    lastShot: null,
    player1Team: player1Team,
    player2Team: player2Team,
    waitingForGoalie: false,
    pendingShot: null,
    currentGoalie: null,
    player1Ready: false,
    player2Ready: false,
    started: false,
    lastThrow: null,
    lastPlayer: null,
    lastProbability: 0
  };
  
  playerActiveMatches[player1Id] = matchId;
  playerActiveMatches[player2Id] = matchId;
  
  // ✅ ПОКАЗЫВАЕМ СОСТАВЫ ОБОИМ ИГРОКАМ
  await showTeamInfo(matchId);
}

// ГОТОВНОСТЬ К МАТЧУ
async function pvpReady(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match) {
    await ctx.reply('❌ Матч не найден!');
    return;
  }
  
  if (match.isFinished) {
    await ctx.reply('❌ Матч уже завершён!');
    return;
  }
  
  if (match.started) {
    await ctx.reply('⏳ Матч уже начался!');
    return;
  }
  
  if (match.player1 === userId) {
    match.player1Ready = true;
  } else if (match.player2 === userId) {
    match.player2Ready = true;
  } else {
    await ctx.reply('❌ Вы не участвуете в этом матче!');
    return;
  }
  
  const readyCount = (match.player1Ready ? 1 : 0) + (match.player2Ready ? 1 : 0);
  
  const statusText = `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `👤 ${match.player1Name} ${match.player1Ready ? '✅' : '⏳'}\n` +
    `👤 ${match.player2Name} ${match.player2Ready ? '✅' : '⏳'}\n` +
    `📊 Готовность: ${readyCount}/2\n\n` +
    `${readyCount === 2 ? '🎯 Все готовы! Начинаем матч!' : 'Ожидаем подтверждения от соперника...'}`;
  
  await ctx.telegram.sendMessage(match.player1, statusText, { parse_mode: 'Markdown' });
  await ctx.telegram.sendMessage(match.player2, statusText, { parse_mode: 'Markdown' });
  
  if (readyCount === 2) {
    match.started = true;
    match.currentTurn = match.player1;
    
    await showPvPPlayerSelectionToPlayer(match.player1, matchId);
    
    await ctx.telegram.sendMessage(
      match.player2,
      `⏳ *Ожидание хода соперника...*\n\n` +
      `👤 ${match.player1Name} выбирает игрока для броска.\n` +
      `Подождите, скоро ваш ход!`,
      { parse_mode: 'Markdown' }
    );
  }
}

// ПОКАЗ ВЫБОРА ИГРОКА
async function showPvPPlayerSelectionToPlayer(playerId, matchId) {
  const match = pvpMatches[matchId];
  if (!match || match.isFinished) return;
  
  const isPlayer1 = playerId === match.player1;
  const team = isPlayer1 ? match.player1Team : match.player2Team;
  const usedPlayers = isPlayer1 ? match.usedPlayers1 : match.usedPlayers2;
  const forwards = team.filter(p => p.position !== 'G');
  const available = forwards.filter((p, i) => !usedPlayers.includes(i));
  
  if (available.length === 0) {
    if (match.isSuddenDeath) {
      if (isPlayer1) {
        match.usedPlayers1 = [];
      } else {
        match.usedPlayers2 = [];
      }
      await showPvPPlayerSelectionToPlayer(playerId, matchId);
      return;
    }
    
    const isAfterMaxRounds = match.round >= match.maxRounds;
    const isScoreDifferent = match.player1Score !== match.player2Score;
    
    if (isAfterMaxRounds && isScoreDifferent) {
      match.isFinished = true;
      await finishPvPMatch(matchId);
      return;
    }
    
    match.currentTurn = match.currentTurn === match.player1 ? match.player2 : match.player1;
    await showPvPPlayerSelectionToPlayer(match.currentTurn, matchId);
    return;
  }
  
  const buttons = [];
  available.forEach((player, index) => {
    const originalIndex = forwards.indexOf(player);
    const emoji = ['⚡', '🔥', '⭐', '💫', '🌟'][index] || '🏒';
    buttons.push([Markup.button.callback(
      `${emoji} ${player.name} (${player.overall} OVR)`, 
      `pvp_pick_${matchId}_${isPlayer1 ? '1' : '2'}_${originalIndex}`
    )]);
  });
  
  buttons.push([Markup.button.callback('🏳️ Сдаться', `pvp_forfeit_${matchId}`)]);
  
  const myScore = isPlayer1 ? match.player1Score : match.player2Score;
  const oppScore = isPlayer1 ? match.player2Score : match.player1Score;
  const myName = isPlayer1 ? match.player1Name : match.player2Name;
  const oppName = isPlayer1 ? match.player2Name : match.player1Name;
  
  let text = `⚔️ *PvP МАТЧ*\n\n`;
  text += `👤 ${myName} (ваш ход)\n`;
  text += `👤 ${oppName}\n`;
  text += `📊 Счёт: ${myScore} - ${oppScore}\n`;
  text += `🔢 Раунд ${match.round + 1} ${match.isSuddenDeath ? '(ДО ГОЛА!)' : 'из ' + match.maxRounds}\n\n`;
  text += `*Выбери полевого игрока для броска:*`;
  
  try {
    await sendMessageToPlayer(playerId, text, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('❌ Ошибка при отправке выбора игрока:', error.message);
  }
}

// ВЫБОР БРОСКА
async function pvpChooseShot(ctx, matchId, playerNum, playerIndex) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) {
    await ctx.reply('❌ Матч не найден или завершён!');
    return;
  }
  
  if (match.currentTurn !== userId) {
    await ctx.reply('⏳ Сейчас ход соперника!');
    return;
  }
  
  const isPlayer1 = match.player1 === userId;
  const team = isPlayer1 ? match.player1Team : match.player2Team;
  const forwards = team.filter(p => p.position !== 'G');
  const player = forwards[playerIndex];
  
  if (!player) {
    await ctx.reply('❌ Игрок не найден!');
    return;
  }
  
  match.currentShooter = { playerNum, playerIndex, player };
  match.waitingForAction = true;
  
  const buttons = [
    [Markup.button.callback('⬅️ Влево', `pvp_throw_${matchId}_left`)],
    [Markup.button.callback('➡️ Вправо', `pvp_throw_${matchId}_right`)],
    [Markup.button.callback('⬆️ Верхний', `pvp_throw_${matchId}_top`)],
    [Markup.button.callback('⬇️ Между щитков', `pvp_throw_${matchId}_fivehole`)],
    [Markup.button.callback('🔄 Финт', `pvp_throw_${matchId}_deke`)],
    [Markup.button.callback('✋ Кистевой', `pvp_throw_${matchId}_wrist`)],
    [Markup.button.callback('💥 Щелчок', `pvp_throw_${matchId}_slap`)],
  ];
  
  await ctx.editMessageText(
    `🎯 *Выбран полевой игрок:* ${player.name} (${player.overall} OVR)\n\n*Выбери действие:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// ОБРАБОТКА БРОСКА
async function pvpHandleThrow(ctx, matchId, throwType) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) {
    await ctx.reply('❌ Матч не найден или завершён!');
    return;
  }
  
  if (match.currentTurn !== userId) {
    await ctx.reply('⏳ Сейчас ход соперника!');
    return;
  }
  
  const isPlayer1 = match.player1 === userId;
  const shooter = match.currentShooter;
  if (!shooter) {
    await ctx.reply('❌ Ошибка! Выберите игрока сначала.');
    return;
  }
  
  const usedPlayers = isPlayer1 ? match.usedPlayers1 : match.usedPlayers2;
  usedPlayers.push(shooter.playerIndex);
  
  const opponentId = isPlayer1 ? match.player2 : match.player1;
  
  match.pendingShot = {
    shooter: shooter.player,
    shotType: throwType,
    playerNum: shooter.playerNum,
    isPlayer1: isPlayer1,
    playerOverall: shooter.player.overall || 80
  };
  
  match.waitingForGoalie = true;
  match.currentGoalie = opponentId;
  
  const throwNames = {
    left: '⬅️ Влево',
    right: '➡️ Вправо',
    top: '⬆️ Верхний',
    fivehole: '⬇️ Между щитков',
    deke: '🔄 Финт',
    wrist: '✋ Кистевой',
    slap: '💥 Щелчок'
  };
  
  match.lastThrow = throwNames[throwType] || throwType;
  match.lastPlayer = shooter.player.name;
  
  const buttons = [
    [Markup.button.callback('🧤 Закрыть левый угол', `pvp_goalie_${matchId}_left`)],
    [Markup.button.callback('🧤 Закрыть правый угол', `pvp_goalie_${matchId}_right`)],
    [Markup.button.callback('🧍 Стоять', `pvp_goalie_${matchId}_stand`)],
    [Markup.button.callback('🛡️ Опустить щитки', `pvp_goalie_${matchId}_low`)],
    [Markup.button.callback('🧤 Ловушка', `pvp_goalie_${matchId}_glove`)],
    [Markup.button.callback('💪 Агрессивный выход', `pvp_goalie_${matchId}_aggressive`)],
  ];
  
  await ctx.telegram.sendMessage(
    opponentId,
    `🧤 *Вратарь!*\n\n` +
    `🎯 Соперник: ${isPlayer1 ? match.player1Name : match.player2Name}\n` +
    `🏒 Игрок: ${shooter.player.name} (${shooter.player.overall} OVR)\n\n` +
    `*Выбери действие вратаря:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
  
  await ctx.editMessageText(
    `⏳ *Ожидание ответа от соперника...*\n\n` +
    `🧤 ${isPlayer1 ? match.player2Name : match.player1Name} выбирает действие вратаря.`,
    { parse_mode: 'Markdown' }
  );
}

// ДЕЙСТВИЕ ВРАТАРЯ
async function pvpGoalieAction(ctx, matchId, goalieAction) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) {
    await ctx.reply('❌ Матч не найден или завершён!');
    return;
  }
  
  if (match.currentGoalie !== userId) {
    await ctx.reply('⏳ Сейчас не ваш ход!');
    return;
  }
  
  const pendingShot = match.pendingShot;
  if (!pendingShot) {
    await ctx.reply('❌ Нет активного броска!');
    return;
  }
  
  const shooter = pendingShot.shooter;
  const shotType = pendingShot.shotType;
  const isPlayer1 = pendingShot.isPlayer1;
  const playerOverall = pendingShot.playerOverall || 80;
  
  const result = calculateShot(shotType, goalieAction, playerOverall);
  
  if (result.isGoal) {
    if (isPlayer1) {
      match.player1Score++;
    } else {
      match.player2Score++;
    }
  }
  
  match.round++;
  match.waitingForGoalie = false;
  match.currentGoalie = null;
  match.pendingShot = null;
  match.lastProbability = result.probability;
  
  const isAfterMaxRounds = match.round >= match.maxRounds;
  const isScoreDifferent = match.player1Score !== match.player2Score;
  const isScoreEqual = match.player1Score === match.player2Score;
  
  if (isAfterMaxRounds && isScoreEqual) {
    match.isSuddenDeath = true;
    match.maxRounds = Infinity;
    match.usedPlayers1 = [];
    match.usedPlayers2 = [];
  }
  
  if (match.isSuddenDeath) {
    if (match.player1Score !== match.player2Score) {
      match.isFinished = true;
    }
  } else {
    if (isAfterMaxRounds && isScoreDifferent) {
      match.isFinished = true;
    }
  }
  
  const throwNames = {
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
  
  let resultText = `🎯 *${shooter.name} бросает!*\n`;
  resultText += `🎯 *Твой бросок:* ${throwNames[shotType] || shotType}\n`;
  resultText += `🧤 *Вратарь:* ${goalieNames[goalieAction] || goalieAction}\n`;
  resultText += `${result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*'}\n\n`;
  resultText += `📊 *Шанс гола:* ${result.probability}% (рейтинг ${playerOverall})\n\n`;
  resultText += `📊 *Счёт:* ${match.player1Name} ${match.player1Score} — ${match.player2Score} ${match.player2Name}\n`;
  resultText += `🔢 Раунд ${match.round} ${match.isSuddenDeath ? '(ДО ГОЛА!)' : 'из ' + match.maxRounds}`;
  
  const resultKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 Продолжить', `pvp_continue_${matchId}`)]
  ]);
  
  await ctx.telegram.sendMessage(match.player1, resultText, { parse_mode: 'Markdown', ...resultKeyboard });
  await ctx.telegram.sendMessage(match.player2, resultText, { parse_mode: 'Markdown', ...resultKeyboard });
  
  if (match.isFinished) {
    await finishPvPMatch(matchId);
    return;
  }
  
  match.currentTurn = match.currentTurn === match.player1 ? match.player2 : match.player1;
  
  await showPvPPlayerSelectionToPlayer(match.currentTurn, matchId);
  
  const waitingPlayer = match.currentTurn === match.player1 ? match.player2 : match.player1;
  await ctx.telegram.sendMessage(
    waitingPlayer,
    `⏳ *Ожидание хода соперника...*\n\n` +
    `👤 ${match.currentTurn === match.player1 ? match.player1Name : match.player2Name} выбирает игрока для броска.\n` +
    `Подождите, скоро ваш ход!`,
    { parse_mode: 'Markdown' }
  );
}

// ПРОДОЛЖЕНИЕ МАТЧА
async function continuePvP(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) {
    await ctx.reply('❌ Матч завершён!');
    return;
  }
  
  if (match.currentTurn === userId) {
    await showPvPPlayerSelectionToPlayer(userId, matchId);
  } else {
    await ctx.reply('⏳ Сейчас ход соперника. Подождите...');
  }
}

// ЗАВЕРШЕНИЕ PvP МАТЧА
async function finishPvPMatch(matchId) {
  const match = pvpMatches[matchId];
  if (!match) return;
  
  const winner = match.player1Score > match.player2Score ? match.player1 : match.player2;
  const loser = match.player1Score > match.player2Score ? match.player2 : match.player1;
  const winnerName = match.player1Score > match.player2Score ? match.player1Name : match.player2Name;
  
  const users = getUsers();
  const winnerData = users[winner];
  const loserData = users[loser];
  
  if (winnerData) {
    winnerData.wins = (winnerData.wins || 0) + 1;
    winnerData.coins = (winnerData.coins || 0) + 30;
    winnerData.rating = (winnerData.rating || 0) + 20;
  }
  
  if (loserData) {
    loserData.losses = (loserData.losses || 0) + 1;
    loserData.rating = Math.max(0, (loserData.rating || 0) - 5);
  }
  
  saveUsers(users);
  
  const resultText = `🏁 *МАТЧ ЗАВЕРШЁН!*\n\n` +
    `📊 *Итоговый счёт:*\n` +
    `🔥 ${match.player1Name}: ${match.player1Score}\n` +
    `🔥 ${match.player2Name}: ${match.player2Score}\n` +
    `🔢 Раундов: ${match.round}\n\n` +
    `🎉 *ПОБЕДИТЕЛЬ: ${winnerName}!*\n\n` +
    `🏆 +30⭐ +20 рейтинга\n` +
    `😔 Поражение: -5 рейтинга\n\n` +
    `Выбери действие:`;
  
  const finalKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Сыграть ещё', 'pvp_find')],
    [Markup.button.callback('🔙 Назад', 'back')]
  ]);
  
  await sendMessageToPlayer(match.player1, resultText, finalKeyboard);
  await sendMessageToPlayer(match.player2, resultText, finalKeyboard);
  
  delete playerActiveMatches[match.player1];
  delete playerActiveMatches[match.player2];
  delete pvpMatches[matchId];
}

// ОТМЕНА ПОИСКА
async function cancelPvpSearch(ctx) {
  const userId = ctx.from.id;
  const index = pvpQueue.indexOf(userId);
  
  if (index !== -1) {
    pvpQueue.splice(index, 1);
    if (pvpTimers[userId]) {
      clearTimeout(pvpTimers[userId].timeout);
      delete pvpTimers[userId];
    }
    await ctx.editMessageText('❌ *Поиск отменён!*', { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Вы не в очереди!');
  }
}

// СДАЧА В PvP
async function pvpForfeit(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match) {
    await ctx.reply('❌ Матч не найден!');
    return;
  }
  
  if (match.isFinished) {
    await ctx.reply('❌ Матч уже завершён!');
    return;
  }
  
  match.isFinished = true;
  
  const winner = match.player1 === userId ? match.player2 : match.player1;
  
  const users = getUsers();
  const winnerData = users[winner];
  
  if (winnerData) {
    winnerData.wins = (winnerData.wins || 0) + 1;
    winnerData.coins = (winnerData.coins || 0) + 30;
    winnerData.rating = (winnerData.rating || 0) + 20;
  }
  
  saveUsers(users);
  
  const resultText = `🏁 *Матч завершён досрочно!*\n\n` +
    `🏳️ ${match.player1 === userId ? match.player1Name : match.player2Name} сдался!\n\n` +
    `🎉 *ПОБЕДИТЕЛЬ: ${winner === match.player1 ? match.player1Name : match.player2Name}!*`;
  
  await ctx.telegram.sendMessage(match.player1, resultText, { parse_mode: 'Markdown' });
  await ctx.telegram.sendMessage(match.player2, resultText, { parse_mode: 'Markdown' });
  
  delete playerActiveMatches[match.player1];
  delete playerActiveMatches[match.player2];
  delete pvpMatches[matchId];
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = (bot) => {
  botInstance = bot;
  
  bot.action('pvp_find', async (ctx) => {
    await ctx.answerCbQuery();
    await findOpponent(ctx);
  });
  
  bot.action('pvp_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await cancelPvpSearch(ctx);
  });
  
  bot.action(/pvp_ready_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpReady(ctx, ctx.match[1]);
  });
  
  bot.action('pvp_wait', async (ctx) => {
    await ctx.answerCbQuery('⏳ Ожидаем соперника...');
  });
  
  bot.action(/pvp_start_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await startPvPMatch(ctx, ctx.match[1]);
  });
  
  bot.action(/pvp_pick_(.+)_([12])_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpChooseShot(ctx, ctx.match[1], parseInt(ctx.match[2]), parseInt(ctx.match[3]));
  });
  
  bot.action(/pvp_throw_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpHandleThrow(ctx, ctx.match[1], ctx.match[2]);
  });
  
  bot.action(/pvp_goalie_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpGoalieAction(ctx, ctx.match[1], ctx.match[2]);
  });
  
  bot.action(/pvp_continue_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await continuePvP(ctx, ctx.match[1]);
  });
  
  bot.action(/pvp_forfeit_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpForfeit(ctx, ctx.match[1]);
  });
};