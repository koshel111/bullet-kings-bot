// ============================================
// src/handlers/tournament.js - УПРОЩЁННАЯ ВЕРСИЯ
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
        isFinished: false
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
  if (!tournament.isActive || tournament.isFinished) return;
  
  if (!tournament.players[playerId]) {
    tournament.players[playerId] = { wins: 0, draws: 0, losses: 0, points: 0, matches: 0 };
  }
  
  const p = tournament.players[playerId];
  p.matches++;
  if (isWin) { p.wins++; p.points += 2; }
  else if (isDraw) { p.draws++; p.points += 1; }
  else { p.losses++; }
  
  saveTournamentData(tournament);
}

function showTournament(ctx) {
  const tournament = getTournamentData();
  const users = getUsers();
  
  let text = '📊 *ТУРНИРНАЯ ТАБЛИЦА*\n\n';
  text += `🏆 ${tournament.name}\n`;
  text += `📅 Сезон ${tournament.season}\n`;
  
  if (tournament.isFinished) {
    text += '🏁 *ТУРНИР ЗАВЕРШЁН!*\n\n';
  } else {
    text += '🕐 До окончания: до 1 сентября\n\n';
  }
  
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 20);
  
  if (sorted.length === 0) {
    text += '❌ Пока нет участников\n';
    text += '💡 Играй матчи, чтобы попасть в таблицу!\n';
  } else {
    text += '📋 *ТОП-20:*\n\n';
    sorted.forEach(([id, stats], index) => {
      const userName = users[id]?.name || `Игрок${id}`;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index+1}.`;
      text += `${medal} ${userName} — ${stats.points} очков (${stats.wins}П, ${stats.draws}Н, ${stats.losses}П)\n`;
    });
  }
  
  text += `\n📊 Всего участников: ${Object.keys(tournament.players).length}`;
  
  const buttons = [[Markup.button.callback('🔄 Обновить', 'tournament_refresh')]];
  ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
}

// ============================================
// АДМИНСКИЕ ФУНКЦИИ
// ============================================
function adminStopTournament(ctx) {
  const tournament = getTournamentData();
  tournament.isActive = false;
  tournament.isFinished = true;
  saveTournamentData(tournament);
  ctx.reply('✅ *Турнир остановлен!*', { parse_mode: 'Markdown' });
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
  ctx.reply(`✅ *Новый турнир создан!*\n\n🏆 Сезон ${tournament.season}`, { parse_mode: 'Markdown' });
}

function adminSetTournamentName(ctx, name) {
  const tournament = getTournamentData();
  tournament.name = name;
  saveTournamentData(tournament);
  ctx.reply(`✅ *Название турнира обновлено!*\n\n🏆 ${name}`, { parse_mode: 'Markdown' });
}

function getTournamentWinners() {
  const tournament = getTournamentData();
  const users = getUsers();
  const sorted = Object.entries(tournament.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 3);
  
  let text = '';
  const medals = ['🥇', '🥈', '🥉'];
  sorted.forEach(([id, stats], index) => {
    const userName = users[id]?.name || `Игрок${id}`;
    text += `${medals[index]} ${userName} — ${stats.points} очков\n`;
  });
  return text || '❌ Нет победителей';
}

function selectPrizeCard(ctx, cardIndex) {
  ctx.reply('🏆 *Вы выбрали карту!*\n\nСкоро она появится в вашей коллекции!', { parse_mode: 'Markdown' });
}

// ============================================
// АВТОМАТИЧЕСКАЯ ПРОВЕРКА
// ============================================
function checkTournamentAutoFinish() {
  const tournament = getTournamentData();
  if (tournament.isFinished) return;
  
  const now = new Date();
  const end = new Date('2026-09-01T00:00:00.000Z');
  
  if (now >= end) {
    tournament.isFinished = true;
    tournament.isActive = false;
    saveTournamentData(tournament);
    console.log('🏆 Турнир автоматически завершён!');
  }
}

// ============================================
// ✅ ЭКСПОРТ (ТОЛЬКО ОДИН)
// ============================================
module.exports = {
  getTournamentData,
  saveTournamentData,
  addTournamentResult,
  showTournament,
  adminStopTournament,
  adminStartTournament,
  adminSetTournamentName,
  getTournamentWinners,
  selectPrizeCard,
  checkTournamentAutoFinish
};