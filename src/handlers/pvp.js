// ============================================
// src/handlers/pvp.js - ПОЛНЫЙ PvP РЕЖИМ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { addXP, addTournamentResult } = require('./xp');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ ХРАНИЛИЩА
const pvpQueue = [];
const pvpMatches = {};
const pvpTimers = {};
const playerActiveMatches = {};
const playerMessages = {};
const onlinePlayers = new Set();

let botInstance = null;

// ✅ КОНСТАНТЫ
const MAX_ROUNDS = 5;
const SEARCH_TIMEOUT = 30000; // 30 секунд
const MIN_PLAYERS_FOR_MATCH = 2;
const XP_WIN = 2;
const COINS_WIN = 30;
const RATING_WIN = 20;
const RATING_LOSS = -5;

// ✅ ФУНКЦИИ РАБОТЫ С БАЗОЙ
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

function getOnlineCount() {
  return onlinePlayers.size;
}

function getQueueCount() {
  return pvpQueue.length;
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

async function sendOrEditMessage(playerId, text, keyboard = null, messageId = null) {
  if (!botInstance) {
    console.error('❌ Бот не инициализирован!');
    return null;
  }
  
  try {
    const options = { parse_mode: 'Markdown' };
    if (keyboard) {
      options.reply_markup = keyboard.reply_markup;
    }
    
    if (messageId) {
      try {
        await botInstance.telegram.editMessageText(playerId, messageId, null, text, options);
        return messageId;
      } catch (error) {
        if (error.message && error.message.includes('message is not modified')) {
          return messageId;
        }
        const msg = await botInstance.telegram.sendMessage(playerId, text, options);
        return msg.message_id;
      }
    } else {
      const msg = await botInstance.telegram.sendMessage(playerId, text, options);
      return msg.message_id;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки/редактирования сообщения:', error.message);
    return null;
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
  const randomFactor = 0.85 + Math.random() * 0.3;
  
  let ratingBonus = 0;
  if (playerOverall >= 96) ratingBonus = 0.35;
  else if (playerOverall >= 91) ratingBonus = 0.25;
  else if (playerOverall >= 86) ratingBonus = 0.15;
  else if (playerOverall >= 81) ratingBonus = 0.05;
  else if (playerOverall >= 71) ratingBonus = 0;
  else ratingBonus = -0.10;
  
  let probability = multiplier * randomFactor * (1 + ratingBonus);
  
  if (playerOverall >= 95) {
    probability = Math.max(probability, 0.50);
  } else if (playerOverall >= 90) {
    probability = Math.max(probability, 0.35);
  } else if (playerOverall >= 85) {
    probability = Math.max(probability, 0.25);
  }
  
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return { isGoal: Math.random() < probability, probability: Math.round(probability * 100) };
}

// ✅ НАЗВАНИЯ ДЕЙСТВИЙ
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

// ============================================
// ПОИСК СОПЕРНИКА
// ============================================
async function findOpponent(ctx) {
  const userId = ctx.from.id;
  const user = ctx.from;
  
  console.log('🔍 [PvP] Поиск соперника для:', userId);
  
  // ✅ ПРОВЕРКА АКТИВНОГО МАТЧА
  const activeMatch = hasActiveMatch(userId);
  if (activeMatch) {
    await ctx.reply('⚠️ У вас уже есть активный матч! Дождитесь его завершения.');
    return;
  }
  
  // ✅ ПРОВЕРКА В ОЧЕРЕДИ
  if (pvpQueue.includes(userId)) {
    await ctx.reply('⏳ Вы уже в очереди на поиск соперника!');
    return;
  }
  
  // ✅ ПРОВЕРКА СОСТАВА
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
  
  // ✅ ДОБАВЛЯЕМ В ОЧЕРЕДЬ
  pvpQueue.push(userId);
  console.log('📊 [PvP] В очереди:', pvpQueue.length, 'игроков');
  
  // ✅ ПОКАЗЫВАЕМ СООБЩЕНИЕ О ПОИСКЕ С ТАЙМЕРОМ
  let seconds = 0;
  const totalSeconds = Math.floor(SEARCH_TIMEOUT / 1000);
  
  const msg = await ctx.reply(
    `🔍 *Поиск соперника...*\n\n` +
    `👤 ${user.first_name}\n` +
    `⏳ В очереди: ${pvpQueue.length} игроков\n` +
    `🕐 ${seconds}/${totalSeconds} сек.\n\n` +
    `💡 Для отмены нажмите кнопку ниже`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отменить поиск', 'pvp_cancel')]
      ])
    }
  );
  
  // ✅ ЗАПУСКАЕМ ТАЙМЕР ОБНОВЛЕНИЯ
  const timerInterval = setInterval(async () => {
    seconds++;
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        null,
        `🔍 *Поиск соперника...*\n\n` +
        `👤 ${user.first_name}\n` +
        `⏳ В очереди: ${pvpQueue.length} игроков\n` +
        `🕐 ${seconds}/${totalSeconds} сек.\n\n` +
        `💡 Для отмены нажмите кнопку ниже`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Отменить поиск', 'pvp_cancel')]
          ])
        }
      );
    } catch (e) {
      clearInterval(timerInterval);
    }
  }, 1000);
  
  // ✅ СОХРАНЯЕМ ТАЙМЕР
  pvpTimers[userId] = {
    messageId: msg.message_id,
    chatId: ctx.chat.id,
    interval: timerInterval,
    timeout: setTimeout(async () => {
      const index = pvpQueue.indexOf(userId);
      if (index !== -1) {
        pvpQueue.splice(index, 1);
        clearInterval(timerInterval);
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            msg.message_id,
            null,
            `⏰ *Время поиска истекло!*\n\n` +
            `Соперник не найден за ${totalSeconds} секунд.\n\n` +
            `*Выбери действие:*`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
                [Markup.button.callback('🔄 Начать поиск снова', 'pvp_find')],
                [Markup.button.callback('🔙 Назад', 'play')],
              ])
            }
          );
        } catch (e) {}
        delete pvpTimers[userId];
      }
    }, SEARCH_TIMEOUT)
  };
  
  // ✅ ЕСЛИ НАШЛИСЬ 2 ИГРОКА — СОЗДАЁМ МАТЧ
  if (pvpQueue.length >= MIN_PLAYERS_FOR_MATCH) {
    const player1Id = pvpQueue.shift();
    const player2Id = pvpQueue.shift();
    
    // Очищаем таймеры
    if (pvpTimers[player1Id]) {
      clearInterval(pvpTimers[player1Id].interval);
      clearTimeout(pvpTimers[player1Id].timeout);
      delete pvpTimers[player1Id];
    }
    if (pvpTimers[player2Id]) {
      clearInterval(pvpTimers[player2Id].interval);
      clearTimeout(pvpTimers[player2Id].timeout);
      delete pvpTimers[player2Id];
    }
    
    await createPvPMatch(ctx, player1Id, player2Id);
  }
}

// ============================================
// ОТМЕНА ПОИСКА
// ============================================
async function cancelPvpSearch(ctx) {
  const userId = ctx.from.id;
  const index = pvpQueue.indexOf(userId);
  
  if (index !== -1) {
    pvpQueue.splice(index, 1);
    if (pvpTimers[userId]) {
      clearInterval(pvpTimers[userId].interval);
      clearTimeout(pvpTimers[userId].timeout);
      delete pvpTimers[userId];
    }
    await ctx.editMessageText(
      '❌ *Поиск отменён!*\n\nВыбери действие:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
          [Markup.button.callback('🔄 Начать поиск снова', 'pvp_find')],
          [Markup.button.callback('🔙 Назад', 'play')],
        ])
      }
    );
  } else {
    await ctx.reply('❌ Вы не в очереди!');
  }
}

// ============================================
// СОЗДАНИЕ PvP МАТЧА
// ============================================
async function createPvPMatch(ctx, player1Id, player2Id) {
  console.log('⚔️ [PvP] Создаём матч между:', player1Id, 'и', player2Id);
  
  const users = getUsers();
  const player1Data = users[player1Id];
  const player2Data = users[player2Id];
  
  const matchId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  
  pvpMatches[matchId] = {
    id: matchId,
    player1: player1Id,
    player2: player2Id,
    player1Name: player1Data?.name || 'Игрок 1',
    player2Name: player2Data?.name || 'Игрок 2',
    player1Score: 0,
    player2Score: 0,
    round: 0,
    maxRounds: MAX_ROUNDS,
    isFinished: false,
    isSuddenDeath: false,
    currentTurn: null,
    usedPlayers1: [],
    usedPlayers2: [],
    waitingForAction: false,
    currentShooter: null,
    lastShot: null,
    player1Team: player1Data?.team || [],
    player2Team: player2Data?.team || [],
    waitingForGoalie: false,
    pendingShot: null,
    currentGoalie: null,
    player1Ready: false,
    player2Ready: false,
    started: false,
    lastThrow: null,
    lastPlayer: null,
    lastProbability: 0,
    player1Rounds: 0,
    player2Rounds: 0
  };
  
  playerActiveMatches[player1Id] = matchId;
  playerActiveMatches[player2Id] = matchId;
  
  await showTeamInfo(matchId);
}

// ============================================
// ПОКАЗ СОСТАВОВ
// ============================================
async function showTeamInfo(matchId) {
  const match = pvpMatches[matchId];
  if (!match) return;
  
  console.log('📊 [PvP] Показываем составы для матча:', matchId);
  
  const player1Team = match.player1Team || [];
  const player2Team = match.player2Team || [];
  
  const rating1 = getTeamRating(player1Team);
  const rating2 = getTeamRating(player2Team);
  
  let text1 = `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n`;
  text1 += `👤 *${match.player1Name}*\n`;
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
  
  text1 += `\n\n👤 *${match.player2Name}*\n`;
  text1 += `📊 Рейтинг состава: ${rating2}\n\n`;
  text1 += `🏒 *Полевые:*\n`;
  
  const forwards2 = player2Team.filter(p => p.position !== 'G');
  const goalie2 = player2Team.find(p => p.position === 'G');
  
  forwards2.forEach((p, i) => {
    const emoji = getRarityEmoji(p.rarity);
    text1 += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
  });
  
  if (goalie2) {
    const emoji = getRarityEmoji(goalie2.rarity);
    text1 += `\n🧤 *Вратарь:* ${emoji} ${goalie2.name} (${goalie2.overall} OVR)`;
  } else {
    text1 += `\n🧤 *Вратарь:* ❌ Нет`;
  }
  
  text1 += `\n\n📊 Рейтинг твоего состава: ${rating1}`;
  text1 += `\n📊 Рейтинг состава соперника: ${rating2}`;
  text1 += `\n\n${rating1 > rating2 ? '🔥 Твой состав сильнее!' : rating1 < rating2 ? '⚠️ Состав соперника сильнее!' : '⚖️ Составы равны!'}`;
  text1 += `\n\nНажми "Готов", чтобы начать матч!`;
  
  let text2 = `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n`;
  text2 += `👤 *${match.player2Name}*\n`;
  text2 += `📊 Рейтинг состава: ${rating2}\n\n`;
  text2 += `🏒 *Полевые:*\n`;
  
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
  
  text2 += `\n\n👤 *${match.player1Name}*\n`;
  text2 += `📊 Рейтинг состава: ${rating1}\n\n`;
  text2 += `🏒 *Полевые:*\n`;
  
  forwards1.forEach((p, i) => {
    const emoji = getRarityEmoji(p.rarity);
    text2 += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
  });
  
  if (goalie1) {
    const emoji = getRarityEmoji(goalie1.rarity);
    text2 += `\n🧤 *Вратарь:* ${emoji} ${goalie1.name} (${goalie1.overall} OVR)`;
  } else {
    text2 += `\n🧤 *Вратарь:* ❌ Нет`;
  }
  
  text2 += `\n\n📊 Рейтинг твоего состава: ${rating2}`;
  text2 += `\n📊 Рейтинг состава соперника: ${rating1}`;
  text2 += `\n\n${rating2 > rating1 ? '🔥 Твой состав сильнее!' : rating2 < rating1 ? '⚠️ Состав соперника сильнее!' : '⚖️ Составы равны!'}`;
  text2 += `\n\nНажми "Готов", чтобы начать матч!`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Готов к матчу!', `pvp_ready_${matchId}`)]
  ]);
  
  const msg1 = await sendOrEditMessage(match.player1, text1, keyboard);
  const msg2 = await sendOrEditMessage(match.player2, text2, keyboard);
  
  if (msg1) playerMessages[match.player1] = msg1;
  if (msg2) playerMessages[match.player2] = msg2;
}

// ============================================
// ГОТОВНОСТЬ К МАТЧУ
// ============================================
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
  
  const text1 = `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `👤 ${match.player1Name} ${match.player1Ready ? '✅' : '⏳'}\n` +
    `👤 ${match.player2Name} ${match.player2Ready ? '✅' : '⏳'}\n` +
    `📊 Готовность: ${readyCount}/2\n\n` +
    `${readyCount === 2 ? '🎯 Все готовы! Начинаем матч!' : 'Ожидаем подтверждения от соперника...'}`;
  
  const text2 = text1;
  
  const keyboard1 = match.player1Ready ? null : Markup.inlineKeyboard([
    [Markup.button.callback('✅ Готов к матчу!', `pvp_ready_${matchId}`)]
  ]);
  
  const keyboard2 = match.player2Ready ? null : Markup.inlineKeyboard([
    [Markup.button.callback('✅ Готов к матчу!', `pvp_ready_${matchId}`)]
  ]);
  
  await sendOrEditMessage(match.player1, text1, keyboard1, playerMessages[match.player1]);
  await sendOrEditMessage(match.player2, text2, keyboard2, playerMessages[match.player2]);
  
  if (readyCount === 2) {
    match.started = true;
    match.currentTurn = match.player1;
    
    delete playerMessages[match.player1];
    delete playerMessages[match.player2];
    
    await showPvPPlayerSelection(match.player1, matchId);
    
    await sendOrEditMessage(
      match.player2,
      `⏳ *Ожидание хода соперника...*\n\n👤 ${match.player1Name} выбирает игрока для броска.\nПодождите, скоро ваш ход!`,
      null,
      playerMessages[match.player2]
    );
  }
}

// ============================================
// ПОКАЗ ВЫБОРА ИГРОКА
// ============================================
async function showPvPPlayerSelection(playerId, matchId) {
  const match = pvpMatches[matchId];
  if (!match || match.isFinished) return;
  
  const isPlayer1 = playerId === match.player1;
  const team = isPlayer1 ? match.player1Team : match.player2Team;
  const usedPlayers = isPlayer1 ? match.usedPlayers1 : match.usedPlayers2;
  const forwards = team.filter(p => p.position !== 'G');
  const available = forwards.filter((p, i) => !usedPlayers.includes(i));
  
  const playerRounds = isPlayer1 ? match.player1Rounds : match.player2Rounds;
  
  if (playerRounds >= MAX_ROUNDS) {
    const opponentRounds = isPlayer1 ? match.player2Rounds : match.player1Rounds;
    
    if (opponentRounds >= MAX_ROUNDS) {
      if (match.player1Score === match.player2Score) {
        match.isSuddenDeath = true;
        match.maxRounds = Infinity;
        match.usedPlayers1 = [];
        match.usedPlayers2 = [];
        match.player1Rounds = 0;
        match.player2Rounds = 0;
        await showPvPPlayerSelection(playerId, matchId);
        return;
      } else {
        match.isFinished = true;
        await finishPvPMatch(matchId);
        return;
      }
    } else {
      match.currentTurn = isPlayer1 ? match.player2 : match.player1;
      await showPvPPlayerSelection(match.currentTurn, matchId);
      
      await sendOrEditMessage(
        playerId,
        `⏳ *Ожидание хода соперника...*\n\n👤 ${match.currentTurn === match.player1 ? match.player1Name : match.player2Name} выбирает игрока для броска.`,
        null,
        playerMessages[playerId]
      );
      return;
    }
  }
  
  if (available.length === 0) {
    if (match.isSuddenDeath) {
      if (isPlayer1) {
        match.usedPlayers1 = [];
      } else {
        match.usedPlayers2 = [];
      }
      await showPvPPlayerSelection(playerId, matchId);
      return;
    }
    
    if (isPlayer1) {
      match.usedPlayers1 = [];
    } else {
      match.usedPlayers2 = [];
    }
    await showPvPPlayerSelection(playerId, matchId);
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
  text += `🔢 Ваши броски: ${playerRounds}/${MAX_ROUNDS}\n`;
  text += `🔢 Броски соперника: ${isPlayer1 ? match.player2Rounds : match.player1Rounds}/${MAX_ROUNDS}\n`;
  text += `📊 Раунд: ${match.round + 1}\n`;
  if (match.isSuddenDeath) {
    text += `⚡ *ОВЕРТАЙМ! БУЛЛИТЫ ДО ГОЛА!*\n`;
  }
  text += `\n*Выбери полевого игрока для броска:*`;
  
  const messageId = await sendOrEditMessage(playerId, text, Markup.inlineKeyboard(buttons), playerMessages[playerId]);
  if (messageId) playerMessages[playerId] = messageId;
}

// ============================================
// ВЫБОР БРОСКА
// ============================================
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
  
  const text = `🎯 *Выбран полевой игрок:* ${player.name} (${player.overall} OVR)\n\n*Выбери действие:*`;
  
  await sendOrEditMessage(userId, text, Markup.inlineKeyboard(buttons), playerMessages[userId]);
}

// ============================================
// ОБРАБОТКА БРОСКА
// ============================================
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
  
  if (isPlayer1) {
    match.player1Rounds++;
  } else {
    match.player2Rounds++;
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
  
  match.lastThrow = actionNames[throwType] || throwType;
  match.lastPlayer = shooter.player.name;
  
  const buttons = [
    [Markup.button.callback('🧤 Закрыть левый угол', `pvp_goalie_${matchId}_left`)],
    [Markup.button.callback('🧤 Закрыть правый угол', `pvp_goalie_${matchId}_right`)],
    [Markup.button.callback('🧍 Стоять', `pvp_goalie_${matchId}_stand`)],
    [Markup.button.callback('🛡️ Опустить щитки', `pvp_goalie_${matchId}_low`)],
    [Markup.button.callback('🧤 Ловушка', `pvp_goalie_${matchId}_glove`)],
    [Markup.button.callback('💪 Агрессивный выход', `pvp_goalie_${matchId}_aggressive`)],
  ];
  
  const goalieText = `🧤 *Вратарь!*\n\n🎯 Соперник: ${isPlayer1 ? match.player1Name : match.player2Name}\n🏒 Игрок: ${shooter.player.name} (${shooter.player.overall} OVR)\n\n*Выбери действие вратаря:*`;
  
  await sendOrEditMessage(opponentId, goalieText, Markup.inlineKeyboard(buttons), playerMessages[opponentId]);
  
  const waitingText = `⏳ *Ожидание ответа от соперника...*\n\n🧤 ${isPlayer1 ? match.player2Name : match.player1Name} выбирает действие вратаря.`;
  await sendOrEditMessage(userId, waitingText, null, playerMessages[userId]);
}

// ============================================
// ДЕЙСТВИЕ ВРАТАРЯ
// ============================================
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
  
  if (match.player1Rounds >= MAX_ROUNDS && match.player2Rounds >= MAX_ROUNDS) {
    if (match.player1Score !== match.player2Score) {
      match.isFinished = true;
    } else {
      match.isSuddenDeath = true;
      match.maxRounds = Infinity;
      match.usedPlayers1 = [];
      match.usedPlayers2 = [];
      match.player1Rounds = 0;
      match.player2Rounds = 0;
    }
  }
  
  if (match.isSuddenDeath && match.player1Score !== match.player2Score) {
    match.isFinished = true;
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
  
  const goalieNamesMap = {
    left: '🧤 Закрыл левый угол',
    right: '🧤 Закрыл правый угол',
    stand: '🧍 Стоя',
    low: '🛡️ Опустил щитки',
    glove: '🧤 Ловушка',
    aggressive: '💪 Агрессивный выход'
  };
  
  let resultText = `🎯 *${shooter.name} бросает!*\n`;
  resultText += `🎯 *Бросок:* ${throwNames[shotType] || shotType}\n`;
  resultText += `🧤 *Вратарь:* ${goalieNamesMap[goalieAction] || goalieAction}\n`;
  resultText += `${result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*'}\n\n`;
  resultText += `📊 *Шанс гола:* ${result.probability}% (рейтинг ${playerOverall})\n\n`;
  resultText += `📊 *Счёт:* ${match.player1Name} ${match.player1Score} — ${match.player2Score} ${match.player2Name}\n`;
  resultText += `🔢 Броски: ${match.player1Name} ${match.player1Rounds}/${MAX_ROUNDS}, ${match.player2Name} ${match.player2Rounds}/${MAX_ROUNDS}\n`;
  if (match.isSuddenDeath) {
    resultText += `⚡ *ОВЕРТАЙМ! БУЛЛИТЫ ДО ГОЛА!*\n`;
  }
  
  const resultKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 Продолжить', `pvp_continue_${matchId}`)]
  ]);
  
  await sendOrEditMessage(match.player1, resultText, resultKeyboard, playerMessages[match.player1]);
  await sendOrEditMessage(match.player2, resultText, resultKeyboard, playerMessages[match.player2]);
  
  if (match.isFinished) {
    await finishPvPMatch(matchId);
    return;
  }
  
  match.currentTurn = match.currentTurn === match.player1 ? match.player2 : match.player1;
  await showPvPPlayerSelection(match.currentTurn, matchId);
}

// ============================================
// ПРОДОЛЖЕНИЕ МАТЧА
// ============================================
async function continuePvP(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) {
    await ctx.reply('❌ Матч завершён!');
    return;
  }
  
  if (match.currentTurn === userId) {
    await showPvPPlayerSelection(userId, matchId);
  } else {
    await ctx.reply('⏳ Сейчас ход соперника. Подождите...');
  }
}

// ============================================
// ЗАВЕРШЕНИЕ PvP МАТЧА
// ============================================
async function finishPvPMatch(matchId) {
  const match = pvpMatches[matchId];
  if (!match) return;
  
  console.log('🏁 [PvP] Завершаем матч:', matchId);
  
  const winner = match.player1Score > match.player2Score ? match.player1 : match.player2;
  const loser = match.player1Score > match.player2Score ? match.player2 : match.player1;
  const winnerName = match.player1Score > match.player2Score ? match.player1Name : match.player2Name;
  
  const users = getUsers();
  const winnerData = users[winner];
  const loserData = users[loser];
  
  let xpResult = null;
  
  if (winnerData) {
    winnerData.wins = (winnerData.wins || 0) + 1;
    winnerData.coins = (winnerData.coins || 0) + COINS_WIN;
    winnerData.rating = (winnerData.rating || 0) + RATING_WIN;
    
    try {
      xpResult = await addXP(winner, XP_WIN);
      console.log('✅ [PvP] Добавлено ' + XP_WIN + ' XP победителю');
    } catch (error) {
      console.log('❌ [PvP] Ошибка добавления XP:', error.message);
    }
    
    try {
      await addTournamentResult(winner, true, false);
      console.log('🏆 [PvP] Турнирные очки добавлены победителю');
    } catch (error) {
      console.log('❌ [PvP] Ошибка добавления турнирных очков:', error.message);
    }
  }
  
  if (loserData) {
    loserData.losses = (loserData.losses || 0) + 1;
    loserData.rating = Math.max(0, (loserData.rating || 0) + RATING_LOSS);
  }
  
  saveUsers(users);
  
  const resultText = `🏁 *МАТЧ ЗАВЕРШЁН!*\n\n` +
    `📊 *Итоговый счёт:*\n` +
    `🔥 ${match.player1Name}: ${match.player1Score}\n` +
    `🔥 ${match.player2Name}: ${match.player2Score}\n` +
    `🔢 Раундов: ${match.round}\n\n` +
    `🎉 *ПОБЕДИТЕЛЬ: ${winnerName}!*\n\n` +
    `🏆 +${RATING_WIN} рейтинга\n` +
    `⭐ +${COINS_WIN} монет\n` +
    `🎖️ +${XP_WIN} XP\n\n` +
    `😔 Поражение: ${RATING_LOSS} рейтинга\n\n` +
    `Выбери действие:`;
  
  const finalKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Сыграть ещё', 'pvp_find')],
    [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
    [Markup.button.callback('🔙 Назад', 'play')]
  ]);
  
  await sendOrEditMessage(match.player1, resultText, finalKeyboard, playerMessages[match.player1]);
  await sendOrEditMessage(match.player2, resultText, finalKeyboard, playerMessages[match.player2]);
  
  delete playerActiveMatches[match.player1];
  delete playerActiveMatches[match.player2];
  delete pvpMatches[matchId];
  
  delete playerMessages[match.player1];
  delete playerMessages[match.player2];
}

// ============================================
// СДАЧА В PvP
// ============================================
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
  const winnerName = match.player1 === userId ? match.player2Name : match.player1Name;
  
  const users = getUsers();
  const winnerData = users[winner];
  
  if (winnerData) {
    winnerData.wins = (winnerData.wins || 0) + 1;
    winnerData.coins = (winnerData.coins || 0) + COINS_WIN;
    winnerData.rating = (winnerData.rating || 0) + RATING_WIN;
    
    try {
      await addXP(winner, XP_WIN);
    } catch (error) {}
    
    try {
      await addTournamentResult(winner, true, false);
    } catch (error) {}
  }
  
  saveUsers(users);
  
  const resultText = `🏁 *Матч завершён досрочно!*\n\n` +
    `🏳️ ${match.player1 === userId ? match.player1Name : match.player2Name} сдался!\n\n` +
    `🎉 *ПОБЕДИТЕЛЬ: ${winnerName}!*`;
  
  await sendOrEditMessage(match.player1, resultText, null, playerMessages[match.player1]);
  await sendOrEditMessage(match.player2, resultText, null, playerMessages[match.player2]);
  
  delete playerActiveMatches[match.player1];
  delete playerActiveMatches[match.player2];
  delete pvpMatches[matchId];
  
  delete playerMessages[match.player1];
  delete playerMessages[match.player2];
}

// ============================================
// ОБНОВЛЕНИЕ ОНЛАЙН-ПОЛЬЗОВАТЕЛЕЙ
// ============================================
async function updateOnlineUsers() {
  try {
    const users = getUsers();
    const userIds = Object.keys(users);
    // В реальном проекте здесь должна быть более сложная логика
    // Например, проверка последней активности
    onlinePlayers.clear();
    userIds.forEach(id => onlinePlayers.add(id));
    console.log('👥 [PvP] Онлайн пользователей:', onlinePlayers.size);
  } catch (error) {
    console.error('❌ [PvP] Ошибка обновления онлайн:', error);
  }
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = {
  findOpponent,
  cancelPvpSearch,
  pvpReady,
  pvpChooseShot,
  pvpHandleThrow,
  pvpGoalieAction,
  continuePvP,
  pvpForfeit,
  getQueueCount,
  getOnlineCount,
  updateOnlineUsers,
  createPvPMatch,
  showTeamInfo,
  finishPvPMatch
};