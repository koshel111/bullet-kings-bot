// ============================================
// src/handlers/tournament.js - СЕЗОННЫЙ ТУРНИР
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { addXP } = require('./xp');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const TOURNAMENT_PATH = path.join(__dirname, '../../data/tournament.json');

// ЗАГРУЗКА ДАННЫХ ТУРНИРА
function getTournamentData() {
  if (!fs.existsSync(TOURNAMENT_PATH)) {
    const defaultData = {
      isActive: true,
      name: '🏆 Сезонный турнир 2026',
      season: 1,
      startDate: new Date().toISOString(),
      endDate: new Date('2026-09-01T00:00:00.000Z').toISOString(),
      players: {},
      isFinished: false,
      prizes: {
        "1": "Любая карта 96+ (3 варианта)",
        "2": "100⭐ + 20💎",
        "3": "50⭐"
      }
    };
    fs.writeFileSync(TOURNAMENT_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(TOURNAMENT_PATH));
}

function saveTournamentData(data) {
  fs.writeFileSync(TOURNAMENT_PATH, JSON.stringify(data, null, 2));
}

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

// ДОБАВЛЕНИЕ РЕЗУЛЬТАТА МАТЧА В ТУРНИР
async function addTournamentResult(playerId, isWin, isDraw = false) {
  const tournament = getTournamentData();
  
  if (!tournament.isActive || tournament.isFinished) return;
  
  if (!tournament.players[playerId]) {
    tournament.players[playerId] = {
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      matches: 0
    };
  }
  
  const player = tournament.players[playerId];
  player.matches++;
  
  if (isWin) {
    player.wins++;
    player.points += 2;
  } else if (isDraw) {
    player.draws++;
    player.points += 1;
  } else {
    player.losses++;
  }
  
  saveTournamentData(tournament);
}

// ПОКАЗ ТАБЛИЦЫ ТУРНИРА
async function showTournament(ctx) {
  const tournament = getTournamentData();
  const users = getUsers();
  
  let text = `📊 *ТУРНИРНАЯ ТАБЛИЦА*\n\n`;
  text += `🏆 ${tournament.name}\n`;
  text += `📅 Сезон ${tournament.season}\n`;
  text += `🕐 До окончания: ${getTimeLeft(tournament.endDate)}\n\n`;
  
  const sortedPlayers = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 50);
  
  if (sortedPlayers.length === 0) {
    text += '❌ Пока нет участников\n';
    text += '💡 Играй матчи, чтобы попасть в турнирную таблицу!\n';
  } else {
    text += '📋 *ТОП-50:*\n\n';
    text += '`#  Игрок            Очки  П  Н  П`\n';
    text += '`--------------------------------`\n';
    
    sortedPlayers.forEach(([id, stats], index) => {
      const userName = users[id]?.name || `Игрок${id}`;
      const shortName = userName.length > 15 ? userName.substring(0, 15) + '...' : userName.padEnd(15);
      const place = (index + 1).toString().padStart(2);
      const points = stats.points.toString().padStart(4);
      const wins = stats.wins.toString().padStart(2);
      const draws = stats.draws.toString().padStart(2);
      const losses = stats.losses.toString().padStart(2);
      
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${place}.`;
      text += `${medal} ${shortName} ${points}  ${wins}  ${draws}  ${losses}\n`;
    });
  }
  
  text += `\n📊 *Всего участников: ${Object.keys(tournament.players).length}`;
  text += `\n🏆 *Призы:*\n`;
  text += `  🥇 1 место: Любая карта 96+ (3 варианта)\n`;
  text += `  🥈 2 место: 100⭐ + 20💎\n`;
  text += `  🥉 3 место: 50⭐\n`;
  
  if (tournament.isFinished) {
    text += '\n🏁 *ТУРНИР ЗАВЕРШЁН!*\n';
    text += await getTournamentWinners();
  }
  
  const buttons = [
    [Markup.button.callback('🔄 Обновить', 'tournament_refresh')],
    [Markup.button.callback('🔙 Назад', 'back')]
  ];
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ПОЛУЧЕНИЕ ОСТАВШЕГОСЯ ВРЕМЕНИ
function getTimeLeft(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  
  if (diff <= 0) return '⏰ Турнир завершён!';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${days}д ${hours}ч ${minutes}м`;
}

// АВТОМАТИЧЕСКОЕ ЗАВЕРШЕНИЕ ТУРНИРА
async function finishTournament(ctx = null) {
  const tournament = getTournamentData();
  
  if (tournament.isFinished) return;
  
  const users = getUsers();
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points);
  
  if (sorted.length === 0) {
    if (ctx) await ctx.reply('❌ Нет участников для завершения турнира!');
    return;
  }
  
  const prizes = [
    { place: 1, prize: 'Любая карта 96+ (3 варианта)' },
    { place: 2, prize: '100⭐ + 20💎' },
    { place: 3, prize: '50⭐' }
  ];
  
  let resultText = '🏁 *СЕЗОННЫЙ ТУРНИР ЗАВЕРШЁН!*\n\n';
  resultText += `📊 *Итоговые результаты:*\n\n`;
  
  const winners = [];
  
  prizes.forEach((prize, index) => {
    if (sorted[index]) {
      const [id, stats] = sorted[index];
      const userName = users[id]?.name || `Игрок${id}`;
      resultText += `${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} *${userName}* — ${stats.points} очков\n`;
      resultText += `  🎁 Приз: ${prize.prize}\n\n`;
      
      const userData = users[id];
      if (userData) {
        if (index === 0) {
          userData.tournament_win = true;
          userData.tournament_prize = 'card_96';
          userData.tournament_place = 1;
        } else if (index === 1) {
          userData.coins = (userData.coins || 0) + 100;
          userData.crystals = (userData.crystals || 0) + 20;
          userData.tournament_place = 2;
        } else if (index === 2) {
          userData.coins = (userData.coins || 0) + 50;
          userData.tournament_place = 3;
        }
        winners.push({ id, userName, place: index + 1 });
      }
    }
  });
  
  saveUsers(users);
  
  tournament.isFinished = true;
  saveTournamentData(tournament);
  
  if (ctx) {
    await ctx.reply(resultText, { parse_mode: 'Markdown' });
  }
  
  for (const playerId of Object.keys(tournament.players)) {
    try {
      await ctx.telegram.sendMessage(
        playerId,
        `🏁 *СЕЗОННЫЙ ТУРНИР ЗАВЕРШЁН!*\n\n${resultText}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }
  
  return { resultText, winners };
}

// ПОЛУЧЕНИЕ ПОБЕДИТЕЛЕЙ
async function getTournamentWinners() {
  const tournament = getTournamentData();
  const users = getUsers();
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points);
  
  let text = '';
  const medals = ['🥇', '🥈', '🥉'];
  sorted.slice(0, 3).forEach(([id, stats], index) => {
    const userName = users[id]?.name || `Игрок${id}`;
    text += `${medals[index]} ${userName} — ${stats.points} очков\n`;
  });
  
  return text;
}

// АДМИНСКИЕ КОМАНДЫ
async function adminStopTournament(ctx) {
  const result = await finishTournament(ctx);
  if (result) {
    await ctx.reply(`✅ *Турнир остановлен!*\n\n${result.resultText}`, { parse_mode: 'Markdown' });
  }
}

async function adminStartTournament(ctx) {
  const tournament = getTournamentData();
  
  if (tournament.isActive && !tournament.isFinished) {
    await ctx.reply('⚠️ Турнир уже активен!');
    return;
  }
  
  const newSeason = tournament.isFinished ? tournament.season + 1 : tournament.season;
  
  const newData = {
    isActive: true,
    name: tournament.name || '🏆 Сезонный турнир',
    season: newSeason,
    startDate: new Date().toISOString(),
    endDate: new Date('2026-09-01T00:00:00.000Z').toISOString(),
    players: {},
    isFinished: false,
    prizes: tournament.prizes || {
      "1": "Любая карта 96+ (3 варианта)",
      "2": "100⭐ + 20💎",
      "3": "50⭐"
    }
  };
  
  saveTournamentData(newData);
  await ctx.reply(`✅ *Новый сезонный турнир создан!*\n\n🏆 Сезон ${newSeason}\n🕐 До окончания: до 1 сентября`, { parse_mode: 'Markdown' });
}

async function adminSetTournamentName(ctx, name) {
  const tournament = getTournamentData();
  tournament.name = name;
  saveTournamentData(tournament);
  await ctx.reply(`✅ *Название турнира обновлено!*\n\n🏆 ${name}`, { parse_mode: 'Markdown' });
}

// АВТОМАТИЧЕСКАЯ ПРОВЕРКА ЗАВЕРШЕНИЯ
function checkTournamentAutoFinish() {
  const tournament = getTournamentData();
  
  if (!tournament.isActive || tournament.isFinished) return;
  
  const now = new Date();
  const end = new Date(tournament.endDate);
  
  const isSeptemberFirst = now.getMonth() === 8 && now.getDate() === 1;
  const isMidnight = now.getHours() === 0 && now.getMinutes() === 0;
  
  if (isSeptemberFirst && isMidnight) {
    finishTournament();
  }
}

// ВЫБОР КАРТЫ ДЛЯ ПОБЕДИТЕЛЯ
async function showPrizeCardSelection(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.tournament_win) {
    await ctx.reply('❌ У вас нет права выбора карты!');
    return;
  }
  
  const cards = [
    { name: 'Александр Овечкин', overall: 99, position: 'LW', rarity: 'Икона' },
    { name: 'Сидни Кросби', overall: 97, position: 'C', rarity: 'Икона' },
    { name: 'Коннор Макдэвид', overall: 98, position: 'C', rarity: 'Икона' },
    { name: 'Никита Кучеров', overall: 96, position: 'RW', rarity: 'Легендарный' },
    { name: 'Андрей Василевский', overall: 97, position: 'G', rarity: 'Икона' }
  ];
  
  let text = '🏆 *ВЫБЕРИ КАРТУ (96+)*\n\n';
  text += 'Ты победитель турнира! Выбери одну карту:\n\n';
  
  const buttons = [];
  cards.slice(0, 3).forEach((card, index) => {
    const emoji = card.rarity === 'Икона' ? '🔥' : '⭐';
    text += `${index + 1}. ${emoji} ${card.name} (${card.overall} OVR) — ${card.position === 'G' ? 'Вратарь' : 'Полевой'}\n`;
    buttons.push([Markup.button.callback(
      `${index + 1}. ${card.name} (${card.overall})`,
      `prize_card_${index}`
    )]);
  });
  
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ВЫБОР КАРТЫ
async function selectPrizeCard(ctx, cardIndex) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.tournament_win) {
    await ctx.reply('❌ У вас нет права выбора карты!');
    return;
  }
  
  const cards = [
    { name: 'Александр Овечкин', overall: 99, position: 'LW', rarity: 'Икона' },
    { name: 'Сидни Кросби', overall: 97, position: 'C', rarity: 'Икона' },
    { name: 'Коннор Макдэвид', overall: 98, position: 'C', rarity: 'Икона' },
    { name: 'Никита Кучеров', overall: 96, position: 'RW', rarity: 'Легендарный' },
    { name: 'Андрей Василевский', overall: 97, position: 'G', rarity: 'Икона' }
  ];
  
  const card = cards[cardIndex];
  if (!card) {
    await ctx.reply('❌ Карта не найдена!');
    return;
  }
  
  const cardWithId = {
    ...card,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    count: 1
  };
  
  const existing = data.cards.find(c => c.name === card.name && c.position === card.position);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
  } else {
    data.cards.push(cardWithId);
  }
  
  data.tournament_win = false;
  data.tournament_prize = null;
  saveUsers(users);
  
  const emoji = card.rarity === 'Икона' ? '🔥' : '⭐';
  await ctx.editMessageText(
    `✅ *Карта получена!*\n\n` +
    `${emoji} *${card.name}*\n` +
    `📊 ${card.overall} OVR\n` +
    `🏆 ${card.rarity}\n` +
    `🏒 ${card.position === 'G' ? 'Вратарь' : 'Полевой'}\n\n` +
    `💡 Карта добавлена в коллекцию!`,
    { parse_mode: 'Markdown' }
  );
}

// ============================================
// ✅ ЭКСПОРТ
// ============================================
module.exports = {
  getTournamentData,
  saveTournamentData,
  addTournamentResult,
  showTournament,
  finishTournament,
  adminStopTournament,
  adminStartTournament,
  adminSetTournamentName,
  checkTournamentAutoFinish,
  getTournamentWinners,
  showPrizeCardSelection,
  selectPrizeCard
};