// ============================================
// src/handlers/tournament.js - ПОЛНАЯ ТУРНИРНАЯ СИСТЕМА
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const TOURNAMENT_PATH = path.join(__dirname, '../../data/tournament.json');

// ============================================
// РАБОТА С ФАЙЛАМИ
// ============================================
function getTournamentData() {
  try {
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
          '1': 'Любая карта 96+ (3 варианта)',
          '2': '100⭐ + 20💎',
          '3': '50⭐'
        }
      };
      fs.writeFileSync(TOURNAMENT_PATH, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(TOURNAMENT_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Ошибка чтения турнира:', error.message);
    return { isActive: false, name: 'Турнир', season: 1, players: {}, isFinished: true };
  }
}

function saveTournamentData(data) {
  try {
    fs.writeFileSync(TOURNAMENT_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Ошибка сохранения турнира:', error.message);
  }
}

function getUsers() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return {};
  }
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================
function addTournamentResult(playerId, isWin, isDraw = false) {
  const tournament = getTournamentData();
  
  // ✅ ТУРНИР ДОЛЖЕН БЫТЬ АКТИВЕН
  if (!tournament.isActive || tournament.isFinished) {
    console.log('⚠️ Турнир неактивен или завершён, очки не начисляются');
    return false;
  }
  
  if (!tournament.players[playerId]) {
    tournament.players[playerId] = { 
      wins: 0, 
      draws: 0, 
      losses: 0, 
      points: 0, 
      matches: 0 
    };
  }
  
  const p = tournament.players[playerId];
  p.matches++;
  if (isWin) { 
    p.wins++; 
    p.points += 2; 
  } else if (isDraw) { 
    p.draws++; 
    p.points += 1; 
  } else { 
    p.losses++; 
  }
  
  saveTournamentData(tournament);
  console.log(`🏆 [Турнир] ${playerId}: ${isWin ? 'победа' : isDraw ? 'ничья' : 'поражение'}, очков: ${p.points}`);
  return true;
}

function getTimeUntilEnd() {
  const tournament = getTournamentData();
  const end = new Date(tournament.endDate);
  const now = new Date();
  const diff = end - now;
  
  if (diff <= 0) return 'Турнир завершён!';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

function showTournament(ctx) {
  const tournament = getTournamentData();
  const users = getUsers();
  
  let text = '📊 ТУРНИРНАЯ ТАБЛИЦА\n\n';
  text += `🏆 ${tournament.name}\n`;
  text += `📅 Сезон ${tournament.season}\n`;
  
  if (tournament.isFinished) {
    text += '🏁 ТУРНИР ЗАВЕРШЁН!\n\n';
  } else {
    text += `🕐 До окончания: ${getTimeUntilEnd()}\n\n`;
  }
  
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 20);
  
  if (sorted.length === 0) {
    text += '❌ Пока нет участников\n';
    text += '💡 Играй матчи, чтобы попасть в таблицу!\n';
  } else {
    text += '📋 ТОП-20:\n\n';
    sorted.forEach(([id, stats], index) => {
      const userName = users[id]?.name || `Игрок${id}`;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index+1}.`;
      text += `${medal} ${userName} — ${stats.points} очков (${stats.wins}п, ${stats.draws}н, ${stats.losses}п)\n`;
    });
  }
  
  text += `\n📊 Всего участников: ${Object.keys(tournament.players).length}`;
  
  text += '\n\n🏆 Призы:\n';
  text += `  🥇 1 место: ${tournament.prizes['1']}\n`;
  text += `  🥈 2 место: ${tournament.prizes['2']}\n`;
  text += `  🥉 3 место: ${tournament.prizes['3']}\n`;
  
  text += '\n📋 Как начисляются очки:\n';
  text += '  🏆 Победа: +2 очка\n';
  text += '  ⚖️ Ничья: +1 очко\n';
  text += '  💔 Поражение: 0 очков\n';
  text += '  🔄 Очки начисляются автоматически после каждого матча (ИИ и PvP)!';
  
  const buttons = [
    [Markup.button.callback('🔄 Обновить', 'tournament_refresh')],
    [Markup.button.callback('🔙 Назад', 'back')]
  ];
  
  ctx.editMessageText(text, { 
    parse_mode: 'HTML', 
    ...Markup.inlineKeyboard(buttons) 
  });
}

// ✅ ВЫБОР КАРТЫ ДЛЯ ПОБЕДИТЕЛЯ
function showPrizeSelection(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.tournament_win) {
    ctx.reply('❌ У вас нет права выбирать приз!');
    return;
  }
  
  const text = 
    '🏆 ВЫБЕРИ КАРТУ (96+)\n\n' +
    'Ты победитель турнира! Выбери одну карту:\n\n' +
    '1️⃣ 🔥 Александр Овечкин (99 OVR) — Полевой\n' +
    '2️⃣ 🔥 Сидни Кросби (97 OVR) — Полевой\n' +
    '3️⃣ 🔥 Коннор Макдэвид (98 OVR) — Полевой\n\n' +
    '📋 Отправь команду: prize_1, prize_2 или prize_3';
  
  ctx.reply(text, { parse_mode: 'HTML' });
}

function selectPrizeCard(ctx, cardIndex) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.tournament_win) {
    ctx.reply('❌ У вас нет права выбирать приз!');
    return;
  }
  
  const cards = [
    { name: 'Александр Овечкин', overall: 99, position: 'LW' },
    { name: 'Сидни Кросби', overall: 97, position: 'C' },
    { name: 'Коннор Макдэвид', overall: 98, position: 'C' }
  ];
  
  const card = cards[cardIndex - 1];
  if (!card) {
    ctx.reply('❌ Неверный выбор! Используй prize_1, prize_2 или prize_3');
    return;
  }
  
  const cardWithId = {
    ...card,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    count: 1,
    rarity: 'Икона'
  };
  
  data.cards.push(cardWithId);
  data.tournament_win = false;
  data.tournament_prize = card.name;
  saveUsers(users);
  
  ctx.reply(
    `✅ КАРТА ПОЛУЧЕНА!\n\n` +
    `🔥 ${card.name} (${card.overall} OVR)\n` +
    `🏆 Редкость: Икона\n` +
    `🏒 Позиция: ${card.position}\n\n` +
    `💡 Карта добавлена в коллекцию!`
  );
}

// ============================================
// АДМИНСКИЕ ФУНКЦИИ
// ============================================
function adminStopTournament(ctx) {
  const tournament = getTournamentData();
  if (tournament.isFinished) {
    ctx.reply('❌ Турнир уже завершён!');
    return;
  }
  
  tournament.isActive = false;
  tournament.isFinished = true;
  saveTournamentData(tournament);
  
  // ✅ ВЫДАЁМ НАГРАДЫ ТОП-3
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 3);
  
  const users = getUsers();
  const medals = ['🥇', '🥈', '🥉'];
  let resultText = '🏆 ТУРНИР ЗАВЕРШЁН!\n\n';
  resultText += '🏆 Победители:\n';
  
  sorted.forEach(([id, stats], index) => {
    const userName = users[id]?.name || `Игрок${id}`;
    resultText += `${medals[index]} ${userName} — ${stats.points} очков\n`;
    
    // ✅ ВЫДАЁМ НАГРАДЫ
    if (users[id]) {
      if (index === 0) {
        users[id].tournament_win = true;
        users[id].tournament_place = 1;
        users[id].coins = (users[id].coins || 0) + 500;
        users[id].crystals = (users[id].crystals || 0) + 50;
      } else if (index === 1) {
        users[id].coins = (users[id].coins || 0) + 100;
        users[id].crystals = (users[id].crystals || 0) + 20;
        users[id].tournament_place = 2;
      } else if (index === 2) {
        users[id].coins = (users[id].coins || 0) + 50;
        users[id].tournament_place = 3;
      }
    }
  });
  
  saveUsers(users);
  ctx.reply(resultText, { parse_mode: 'HTML' });
}

function adminStartTournament(ctx) {
  const tournament = getTournamentData();
  tournament.isActive = true;
  tournament.isFinished = false;
  tournament.players = {};
  tournament.season = (tournament.season || 0) + 1;
  tournament.startDate = new Date().toISOString();
  tournament.endDate = new Date('2026-09-01T00:00:00.000Z').toISOString();
  saveTournamentData(tournament);
  ctx.reply(
    `✅ НОВЫЙ ТУРНИР СОЗДАН!\n\n` +
    `🏆 Сезон ${tournament.season}\n` +
    `📅 До окончания: до 1 сентября\n\n` +
    `💡 Все игроки автоматически участвуют!`
  );
}

function adminSetTournamentName(ctx, name) {
  const tournament = getTournamentData();
  tournament.name = name;
  saveTournamentData(tournament);
  ctx.reply(`✅ Название турнира обновлено!\n\n🏆 ${name}`);
}

// ✅ АВТОМАТИЧЕСКАЯ ПРОВЕРКА ЗАВЕРШЕНИЯ
function checkTournamentAutoFinish() {
  const tournament = getTournamentData();
  if (tournament.isFinished) return;
  
  const now = new Date();
  const end = new Date(tournament.endDate);
  
  if (now >= end) {
    tournament.isFinished = true;
    tournament.isActive = false;
    saveTournamentData(tournament);
    console.log('🏆 Турнир автоматически завершён!');
    
    // ✅ ВЫДАЁМ НАГРАДЫ
    const sorted = Object.entries(tournament.players)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 3);
    
    const users = getUsers();
    sorted.forEach(([id, stats], index) => {
      if (users[id]) {
        if (index === 0) {
          users[id].tournament_win = true;
          users[id].tournament_place = 1;
        } else if (index === 1) {
          users[id].coins = (users[id].coins || 0) + 100;
          users[id].crystals = (users[id].crystals || 0) + 20;
          users[id].tournament_place = 2;
        } else if (index === 2) {
          users[id].coins = (users[id].coins || 0) + 50;
          users[id].tournament_place = 3;
        }
      }
    });
    saveUsers(users);
  }
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = {
  getTournamentData,
  saveTournamentData,
  addTournamentResult,
  showTournament,
  adminStopTournament,
  adminStartTournament,
  adminSetTournamentName,
  selectPrizeCard,
  showPrizeSelection,
  checkTournamentAutoFinish,
  getTimeUntilEnd
};