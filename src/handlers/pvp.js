// ============================================
// src/handlers/pvp.js - PvP РЕЖИМ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ ХРАНИЛИЩЕ ДЛЯ PvP
const pvpQueue = []; // Очередь игроков
const pvpMatches = {}; // Активные матчи
const pvpTimers = {}; // Таймеры для матчей

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function getPositionName(position) {
  if (position === 'G') return 'Вратарь';
  if (position === 'LW' || position === 'RW' || position === 'C') return 'Нападающий';
  if (position === 'D') return 'Защитник';
  return 'Полевой';
}

// ✅ ПОИСК СОПЕРНИКА
async function findOpponent(ctx) {
  const userId = ctx.from.id;
  const user = ctx.from;
  
  // Проверяем, есть ли уже в очереди
  if (pvpQueue.includes(userId)) {
    await ctx.reply('⏳ Вы уже в очереди на поиск соперника!');
    return;
  }
  
  // Проверяем, есть ли активный матч
  if (pvpMatches[userId] || Object.values(pvpMatches).some(m => m.player1 === userId || m.player2 === userId)) {
    await ctx.reply('⚠️ У вас уже есть активный матч!');
    return;
  }
  
  // Проверяем состав
  const users = getUsers();
  const data = users[userId];
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
  
  // Добавляем в очередь
  pvpQueue.push(userId);
  
  // Отправляем сообщение о поиске
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
  
  // Сохраняем ID сообщения для отмены
  pvpTimers[userId] = {
    messageId: msg.message_id,
    timeout: setTimeout(() => {
      // Автоматическая отмена через 30 секунд
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
  
  // Проверяем, есть ли уже кто-то в очереди
  if (pvpQueue.length >= 2) {
    // Находим двух игроков
    const player1Id = pvpQueue.shift();
    const player2Id = pvpQueue.shift();
    
    // Удаляем таймеры
    if (pvpTimers[player1Id]) {
      clearTimeout(pvpTimers[player1Id].timeout);
      delete pvpTimers[player1Id];
    }
    if (pvpTimers[player2Id]) {
      clearTimeout(pvpTimers[player2Id].timeout);
      delete pvpTimers[player2Id];
    }
    
    // Создаём матч
    await createPvPMatch(ctx, player1Id, player2Id);
  }
}

// ✅ СОЗДАНИЕ PvP МАТЧА
async function createPvPMatch(ctx, player1Id, player2Id) {
  const users = getUsers();
  const player1Data = users[player1Id];
  const player2Data = users[player2Id];
  
  const matchId = Date.now().toString();
  
  pvpMatches[matchId] = {
    id: matchId,
    player1: player1Id,
    player2: player2Id,
    player1Name: player1Data.name || 'Игрок 1',
    player2Name: player2Data.name || 'Игрок 2',
    player1Score: 0,
    player2Score: 0,
    round: 0,
    maxRounds: 5,
    isFinished: false,
    isSuddenDeath: false,
    currentTurn: player1Id, // Кто сейчас бросает
    usedPlayers1: [],
    usedPlayers2: [],
    waitingForAction: false,
    currentShooter: null,
    lastShot: null,
    player1Team: player1Data.team || [],
    player2Team: player2Data.team || [],
    player1Goalies: player1Data.team.filter(p => p.position === 'G') || [],
    player2Goalies: player2Data.team.filter(p => p.position === 'G') || [],
    currentGoalie: null
  };
  
  // Уведомляем игроков
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🎯 Начать матч!', `pvp_start_${matchId}`)]
  ]);
  
  await ctx.telegram.sendMessage(
    player1Id,
    `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `👤 Соперник: ${player2Data.name || 'Игрок 2'}\n` +
    `🏒 Нажмите кнопку, чтобы начать матч!`,
    { parse_mode: 'Markdown', ...keyboard }
  );
  
  await ctx.telegram.sendMessage(
    player2Id,
    `⚔️ *СОПЕРНИК НАЙДЕН!*\n\n` +
    `👤 Соперник: ${player1Data.name || 'Игрок 1'}\n` +
    `🏒 Нажмите кнопку, чтобы начать матч!`,
    { parse_mode: 'Markdown', ...keyboard }
  );
}

// ✅ НАЧАЛО PvP МАТЧА
async function startPvPMatch(ctx, matchId) {
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
  
  // Проверяем, что игрок участвует в матче
  if (match.player1 !== userId && match.player2 !== userId) {
    await ctx.reply('❌ Вы не участвуете в этом матче!');
    return;
  }
  
  // Показываем выбор игрока для броска
  await showPvPPlayerSelection(ctx, matchId);
}

// ✅ ПОКАЗ ВЫБОРА ИГРОКА ДЛЯ БРОСКА
async function showPvPPlayerSelection(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) return;
  
  const isPlayer1 = match.player1 === userId;
  const team = isPlayer1 ? match.player1Team : match.player2Team;
  const usedPlayers = isPlayer1 ? match.usedPlayers1 : match.usedPlayers2;
  const forwards = team.filter(p => p.position !== 'G');
  const available = forwards.filter((p, i) => !usedPlayers.includes(i));
  
  // Проверяем, все ли игроки использованы
  if (available.length === 0) {
    // В овертайме сбрасываем
    if (match.isSuddenDeath) {
      if (isPlayer1) {
        match.usedPlayers1 = [];
      } else {
        match.usedPlayers2 = [];
      }
      await showPvPPlayerSelection(ctx, matchId);
      return;
    }
    
    // Завершаем раунд
    await finishPvPRound(ctx, matchId);
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
  
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
  const myScore = isPlayer1 ? match.player1Score : match.player2Score;
  const oppScore = isPlayer1 ? match.player2Score : match.player1Score;
  
  let text = `⚔️ *PvP МАТЧ*\n\n`;
  text += `👤 Вы: ${isPlayer1 ? match.player1Name : match.player2Name}\n`;
  text += `👤 Соперник: ${opponentName}\n`;
  text += `📊 Счёт: ${myScore} - ${oppScore}\n`;
  text += `🔢 Раунд ${match.round + 1} ${match.isSuddenDeath ? '(ДО ГОЛА!)' : 'из ' + match.maxRounds}\n\n`;
  text += `*Выбери полевого игрока для броска:*`;
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ✅ ВЫБОР БРОСКА В PvP
async function pvpChooseShot(ctx, matchId, playerNum, playerIndex) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) return;
  
  const isPlayer1 = match.player1 === userId;
  const team = isPlayer1 ? match.player1Team : match.player2Team;
  const forwards = team.filter(p => p.position !== 'G');
  const player = forwards[playerIndex];
  
  if (!player) {
    await ctx.reply('❌ Игрок не найден!');
    return;
  }
  
  // Сохраняем выбранного игрока
  match.currentShooter = { playerNum, playerIndex, player };
  match.waitingForAction = true;
  
  const buttons = [
    [Markup.button.callback('⬅️ Влево', `pvp_shot_${matchId}_left`)],
    [Markup.button.callback('➡️ Вправо', `pvp_shot_${matchId}_right`)],
    [Markup.button.callback('⬆️ Верхний', `pvp_shot_${matchId}_top`)],
    [Markup.button.callback('⬇️ Между щитков', `pvp_shot_${matchId}_fivehole`)],
    [Markup.button.callback('🔄 Финт', `pvp_shot_${matchId}_deke`)],
    [Markup.button.callback('✋ Кистевой', `pvp_shot_${matchId}_wrist`)],
    [Markup.button.callback('💥 Щелчок', `pvp_shot_${matchId}_slap`)],
  ];
  
  await ctx.editMessageText(
    `🎯 *Выбран игрок:* ${player.name} (${player.overall} OVR)\n\n*Выбери действие:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// ✅ ОБРАБОТКА БРОСКА В PvP
async function pvpHandleShot(ctx, matchId, shotType) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) return;
  
  const isPlayer1 = match.player1 === userId;
  
  // Проверяем, что это ход игрока
  if ((isPlayer1 && match.currentTurn !== match.player1) ||
      (!isPlayer1 && match.currentTurn !== match.player2)) {
    await ctx.reply('⏳ Сейчас ход соперника!');
    return;
  }
  
  // Получаем данные о броске
  const shooter = match.currentShooter;
  if (!shooter) {
    await ctx.reply('❌ Ошибка! Выберите игрока сначала.');
    return;
  }
  
  // Сохраняем бросок
  const usedPlayers = isPlayer1 ? match.usedPlayers1 : match.usedPlayers2;
  usedPlayers.push(shooter.playerIndex);
  
  // Отправляем сопернику запрос на выбор вратаря
  const opponentId = isPlayer1 ? match.player2 : match.player1;
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
  
  // Сохраняем информацию о броске
  match.pendingShot = {
    shooter: shooter.player,
    shotType: shotType,
    playerNum: shooter.playerNum,
    isPlayer1: isPlayer1
  };
  
  match.waitingForGoalie = true;
  match.currentGoalie = opponentId;
  
  // Отправляем сопернику выбор вратаря
  const buttons = [
    [Markup.button.callback('🧤 Закрыть левый угол', `pvp_goalie_${matchId}_left`)],
    [Markup.button.callback('🧤 Закрыть правый угол', `pvp_goalie_${matchId}_right`)],
    [Markup.button.callback('🧍 Стоять', `pvp_goalie_${matchId}_stand`)],
    [Markup.button.callback('🛡️ Опустить щитки', `pvp_goalie_${matchId}_low`)],
    [Markup.button.callback('🧤 Ловушка', `pvp_goalie_${matchId}_glove`)],
    [Markup.button.callback('💪 Агрессивный выход', `pvp_goalie_${matchId}_aggressive`)],
  ];
  
  const shotNames = {
    left: '⬅️ Влево',
    right: '➡️ Вправо',
    top: '⬆️ Верхний',
    fivehole: '⬇️ Между щитков',
    deke: '🔄 Финт',
    wrist: '✋ Кистевой',
    slap: '💥 Щелчок'
  };
  
  // Уведомляем соперника
  await ctx.telegram.editMessageText(
    opponentId,
    ctx.callbackQuery.message.message_id,
    null,
    `🧤 *Вратарь!*\n\n` +
    `🎯 Соперник: ${isPlayer1 ? match.player1Name : match.player2Name}\n` +
    `🏒 Игрок: ${shooter.player.name}\n` +
    `🎯 Бросок: ${shotNames[shotType] || shotType}\n\n` +
    `*Выбери действие вратаря:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
  
  // Сообщаем текущему игроку, что ждём ответа
  await ctx.editMessageText(
    `⏳ *Ожидание ответа от соперника...*\n\n` +
    `🧤 ${opponentName} выбирает действие вратаря.`,
    { parse_mode: 'Markdown' }
  );
}

// ✅ ОБРАБОТКА ДЕЙСТВИЯ ВРАТАРЯ В PvP
async function pvpGoalieAction(ctx, matchId, goalieAction) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) return;
  
  // Проверяем, что это ход вратаря
  if (match.currentGoalie !== userId) {
    await ctx.reply('⏳ Сейчас не ваш ход!');
    return;
  }
  
  const pendingShot = match.pendingShot;
  if (!pendingShot) {
    await ctx.reply('❌ Нет активного броска!');
    return;
  }
  
  // Рассчитываем результат
  const shooter = pendingShot.shooter;
  const shotType = pendingShot.shotType;
  const isPlayer1 = pendingShot.isPlayer1;
  
  // Простая логика для PvP (можно усложнить)
  const goalieSuccess = {
    left: { left: 0.9, right: 0.2, stand: 0.5, low: 0.4, glove: 0.4, aggressive: 0.3 },
    right: { left: 0.2, right: 0.9, stand: 0.5, low: 0.4, glove: 0.4, aggressive: 0.3 },
    top: { left: 0.4, right: 0.4, stand: 0.8, low: 0.3, glove: 0.3, aggressive: 0.5 },
    fivehole: { left: 0.4, right: 0.4, stand: 0.7, low: 0.9, glove: 0.3, aggressive: 0.5 },
    deke: { left: 0.5, right: 0.5, stand: 0.4, low: 0.4, glove: 0.4, aggressive: 0.8 },
    wrist: { left: 0.5, right: 0.5, stand: 0.4, low: 0.4, glove: 0.8, aggressive: 0.4 },
    slap: { left: 0.5, right: 0.5, stand: 0.4, low: 0.8, glove: 0.4, aggressive: 0.4 }
  };
  
  const successRate = goalieSuccess[goalieAction]?.[shotType] || 0.5;
  const isGoal = Math.random() > successRate;
  
  // Обновляем счёт
  if (isGoal) {
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
  
  // Проверяем завершение матча
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
  
  // Отправляем результат
  const shotNames = {
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
  
  const resultText = `⚡ *РЕЗУЛЬТАТ БРОСКА!*\n\n` +
    `🎯 Игрок: ${shooter.name}\n` +
    `🎯 Бросок: ${shotNames[shotType] || shotType}\n` +
    `🧤 Вратарь: ${goalieNames[goalieAction] || goalieAction}\n` +
    `${isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*'}\n\n` +
    `📊 Счёт: ${match.player1Name} ${match.player1Score} - ${match.player2Score} ${match.player2Name}`;
  
  // Отправляем результат обоим игрокам
  const resultKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📊 Продолжить', `pvp_continue_${matchId}`)]
  ]);
  
  await ctx.telegram.sendMessage(match.player1, resultText, { parse_mode: 'Markdown', ...resultKeyboard });
  await ctx.telegram.sendMessage(match.player2, resultText, { parse_mode: 'Markdown', ...resultKeyboard });
  
  // Если матч завершён
  if (match.isFinished) {
    await finishPvPMatch(ctx, matchId);
    return;
  }
  
  // Меняем ход
  match.currentTurn = match.currentTurn === match.player1 ? match.player2 : match.player1;
}

// ✅ ПРОДОЛЖЕНИЕ PvP МАТЧА
async function continuePvP(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match || match.isFinished) return;
  
  if (match.currentTurn === userId) {
    await showPvPPlayerSelection(ctx, matchId);
  } else {
    await ctx.reply('⏳ Сейчас ход соперника. Подождите...');
  }
}

// ✅ ЗАВЕРШЕНИЕ PvP МАТЧА
async function finishPvPMatch(ctx, matchId) {
  const match = pvpMatches[matchId];
  if (!match) return;
  
  const winner = match.player1Score > match.player2Score ? match.player1 : match.player2;
  const loser = match.player1Score > match.player2Score ? match.player2 : match.player1;
  const winnerName = match.player1Score > match.player2Score ? match.player1Name : match.player2Name;
  
  // Начисляем награды
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
  
  const resultText = `🏁 *PvP МАТЧ ЗАВЕРШЁН!*\n\n` +
    `📊 Итоговый счёт:\n` +
    `👤 ${match.player1Name}: ${match.player1Score}\n` +
    `👤 ${match.player2Name}: ${match.player2Score}\n\n` +
    `🎉 *ПОБЕДИТЕЛЬ: ${winnerName}!*\n\n` +
    `🏆 +30⭐ +20 рейтинга\n` +
    `😔 Поражение: -5 рейтинга`;
  
  await ctx.telegram.sendMessage(match.player1, resultText, { parse_mode: 'Markdown' });
  await ctx.telegram.sendMessage(match.player2, resultText, { parse_mode: 'Markdown' });
  
  delete pvpMatches[matchId];
}

// ✅ ОТМЕНА ПОИСКА
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

// ✅ СДАЧА В PvP
async function pvpForfeit(ctx, matchId) {
  const userId = ctx.from.id;
  const match = pvpMatches[matchId];
  
  if (!match) {
    await ctx.reply('❌ Матч не найден!');
    return;
  }
  
  // Определяем победителя
  const winner = match.player1 === userId ? match.player2 : match.player1;
  match.isFinished = true;
  
  await ctx.reply('🏳️ *Вы сдались!*');
  await finishPvPMatch(ctx, matchId);
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = (bot) => {
  
  // ✅ НАЧАЛО ПОИСКА
  bot.action('pvp_find', async (ctx) => {
    await ctx.answerCbQuery();
    await findOpponent(ctx);
  });
  
  // ✅ ОТМЕНА ПОИСКА
  bot.action('pvp_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await cancelPvpSearch(ctx);
  });
  
  // ✅ НАЧАЛО МАТЧА
  bot.action(/pvp_start_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await startPvPMatch(ctx, ctx.match[1]);
  });
  
  // ✅ ВЫБОР ИГРОКА
  bot.action(/pvp_pick_(.+)_([12])_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpChooseShot(ctx, ctx.match[1], parseInt(ctx.match[2]), parseInt(ctx.match[3]));
  });
  
  // ✅ ВЫБОР БРОСКА
  bot.action(/pvp_shot_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpHandleShot(ctx, ctx.match[1], ctx.match[2]);
  });
  
  // ✅ ДЕЙСТВИЕ ВРАТАРЯ
  bot.action(/pvp_goalie_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpGoalieAction(ctx, ctx.match[1], ctx.match[2]);
  });
  
  // ✅ ПРОДОЛЖЕНИЕ
  bot.action(/pvp_continue_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await continuePvP(ctx, ctx.match[1]);
  });
  
  // ✅ СДАЧА
  bot.action(/pvp_forfeit_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await pvpForfeit(ctx, ctx.match[1]);
  });
};