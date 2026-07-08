// ============================================
// src/handlers/profile.js - ИСПРАВЛЕННЫЙ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

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

function getPositionEmoji(position) {
  if (position === 'G') return '🧤';
  if (position === 'LW' || position === 'RW' || position === 'C') return '🏒';
  if (position === 'D') return '🛡️';
  return '🏒';
}

async function showEditTeam(ctx) {
  const userId = ctx.from.id;
  
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '📋 *ТЕКУЩИЙ СОСТАВ*\n\n';
  
  text += '🏒 *Нападающие и защитники (слоты 1-5):*\n';
  for (let i = 0; i < 5; i++) {
    const player = teamForwards[i] || null;
    if (player) {
      const emoji = getRarityEmoji(player.rarity);
      const posName = getPositionName(player.position);
      text += `${i+1}. [${player.overall}] ${emoji} | ${player.name} (${posName})\n`;
    } else {
      text += `${i+1}. [0] | Игрок не добавлен\n`;
    }
  }
  
  text += '\n🧤 *Вратарь (слот 6):*\n';
  if (teamGoalie) {
    const emoji = getRarityEmoji(teamGoalie.rarity);
    text += `6. [${teamGoalie.overall}] ${emoji} | ${teamGoalie.name} (Вратарь)\n`;
  } else {
    text += `6. [0] | Игрок не добавлен\n`;
  }
  
  const goaliesInCollection = allCards.filter(c => c.position === 'G');
  const forwardsInCollection = allCards.filter(c => c.position !== 'G');
  
  text += '\n📊 *Статистика коллекции:*\n';
  text += '📚 Всего карт: ' + allCards.length + '\n';
  text += '🏒 Полевых: ' + forwardsInCollection.length + '\n';
  text += '🧤 Вратарей: ' + goaliesInCollection.length + '\n';
  
  text += '\n📊 *Нажми на номер слота, чтобы заполнить или заменить игрока:*';
  
  const buttons = [
    [Markup.button.callback('1️⃣ Слот 1', 'slot_0')],
    [Markup.button.callback('2️⃣ Слот 2', 'slot_1')],
    [Markup.button.callback('3️⃣ Слот 3', 'slot_2')],
    [Markup.button.callback('4️⃣ Слот 4', 'slot_3')],
    [Markup.button.callback('5️⃣ Слот 5', 'slot_4')],
    [Markup.button.callback('6️⃣ Вратарь', 'slot_goalie')],
    [Markup.button.callback('🗑️ Очистить состав', 'clear_team')],
    [Markup.button.callback('🔙 Назад', 'team')],
  ];
  
  await ctx.editMessageText(
    text,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// 🔥 ФИКСИМ ТАЙМЕР: считаем до 24 часов
function getTimeUntilNextBonus() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м ${seconds}с`;
  } else {
    return `${minutes}м ${seconds}с`;
  }
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const now = new Date();
    const today = now.toDateString();
    
    // Проверяем, был ли бонус сегодня
    if (data.lastBonus === today) {
      const timeLeft = getTimeUntilNextBonus();
      await ctx.editMessageText(
        '⏳ *Бонус уже получен сегодня!*\n\n' +
        '🕐 Следующий бонус через: ' + timeLeft + '\n' +
        '📅 Возвращайся через 24 часа!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
        }
      );
      return;
    }
    
    const bonus = Math.floor(Math.random() * 50) + 10;
    data.coins += bonus;
    data.lastBonus = today;
    saveUsers(users);
    
    const timeLeft = getTimeUntilNextBonus();
    await ctx.editMessageText(
      '🎁 *Бонус получен!*\n\n' +
      '⭐ +' + bonus + ' монет\n' +
      '🕐 Следующий бонус через: ' + timeLeft,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });

  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    const forwards = allCards.filter(c => c.position !== 'G');
    const goalies = allCards.filter(c => c.position === 'G');
    const teamForwards = currentTeam.filter(p => p.position !== 'G');
    const teamGoalie = currentTeam.find(p => p.position === 'G');
    
    let text = '👥 *Твоя команда*\n\n';
    text += '📋 *Текущий состав:*\n\n';
    
    if (teamForwards.length === 0 && !teamGoalie) {
      text += 'У тебя пока нет игроков в команде!\n';
    } else {
      text += '🏒 *Полевые игроки:*\n';
      teamForwards.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        const posName = getPositionName(p.position);
        text += (i+1) + '. ' + emoji + ' ' + p.name + ' - ' + posName + ' (' + p.overall + ' OVR)\n';
      });
      
      if (teamGoalie) {
        const emoji = getRarityEmoji(teamGoalie.rarity);
        text += '\n🧤 *Вратарь:*\n';
        text += '  ' + emoji + ' ' + teamGoalie.name + ' - Вратарь (' + teamGoalie.overall + ' OVR)\n';
      }
    }
    
    text += '\n📊 *Всего карт:* ' + allCards.length + '\n';
    text += '🏒 Полевых: ' + forwards.length + '\n';
    text += '🧤 Вратарей: ' + goalies.length + '\n\n';
    text += '*Выбери действие:*';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Собрать состав', 'edit_team')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    await showEditTeam(ctx);
  });

  bot.action('clear_team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    data.team = [];
    saveUsers(users);
    await ctx.answerCbQuery('🗑️ Состав очищен');
    await showEditTeam(ctx);
  });

  bot.action(/slot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const slotType = ctx.match[1];
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    let filteredCards = [];
    let slotName = '';
    
    if (slotType === 'goalie') {
      filteredCards = allCards.filter(c => c.position === 'G');
      slotName = 'вратаря';
    } else {
      const slotIndex = parseInt(slotType);
      filteredCards = allCards.filter(c => c.position !== 'G');
      slotName = `слот ${slotIndex + 1}`;
    }
    
    // 🔥 ПОЛУЧАЕМ ID ВСЕХ ИГРОКОВ В СОСТАВЕ
    const teamIds = currentTeam.map(p => p.id);
    
    let text = `📋 *Выбери игрока для ${slotName}:*\n\n`;
    text += `Всего доступно: ${filteredCards.length}\n\n`;
    
    const buttons = [];
    filteredCards.forEach((player, index) => {
      const emoji = getRarityEmoji(player.rarity);
      const posEmoji = getPositionEmoji(player.position);
      const posName = getPositionName(player.position);
      
      // 🔥 ПРОВЕРЯЕМ, В СОСТАВЕ ЛИ ИГРОК
      const isInTeam = teamIds.includes(player.id);
      const checkMark = isInTeam ? '✅' : '➕';
      
      text += `${index + 1}. ${checkMark} ${posEmoji} ${emoji} ${player.name} - ${posName} (${player.overall} OVR)\n`;
      buttons.push([Markup.button.callback(
        `${index + 1}`, 
        `select_player_${slotType}_${index}`
      )]);
    });
    
    text += '\n📊 *Нажми на номер карты, чтобы добавить в состав:*\n';
    text += '✅ — уже в составе, ➕ — можно добавить';
    
    buttons.push([Markup.button.callback('🔙 К составу', 'edit_team')]);
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  });

  // ============================================
  // ВЫБОР ИГРОКА — ПОЛНАЯ ПЕРЕСБОРКА СОСТАВА
  // ============================================
  bot.action(/select_player_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const slotType = ctx.match[1];
    const playerIndex = parseInt(ctx.match[2]);
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    
    let player;
    let isGoalie = false;
    
    if (slotType === 'goalie') {
      const goalies = allCards.filter(c => c.position === 'G');
      player = goalies[playerIndex];
      isGoalie = true;
    } else {
      const forwards = allCards.filter(c => c.position !== 'G');
      player = forwards[playerIndex];
    }
    
    if (!player) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    // 🔥 УБИРАЕМ ИГРОКА ИЗ ВСЕХ СЛОТОВ
    const currentTeam = data.team || [];
    const otherPlayers = currentTeam.filter(p => p.id !== player.id);
    
    // 🔥 СОХРАНЯЕМ ВСЕХ, КРОМЕ ВЫБРАННОГО
    data.team = otherPlayers;
    
    // 🔥 ДОБАВЛЯЕМ ИГРОКА В НУЖНЫЙ СЛОТ
    if (isGoalie) {
      // Убираем всех вратарей
      data.team = data.team.filter(p => p.position !== 'G');
      data.team.push({ ...player, count: 1 });
    } else {
      const slotIndex = parseInt(slotType);
      
      // Получаем всех полевых
      const forwards = data.team.filter(p => p.position !== 'G');
      
      // Убираем всех полевых из состава
      data.team = data.team.filter(p => p.position === 'G');
      
      // Добавляем всех полевых обратно
      data.team.push(...forwards);
      
      // Вставляем нового игрока в нужный слот
      const insertIndex = Math.min(slotIndex, forwards.length);
      const newPlayer = { ...player, count: 1 };
      
      // Пересобираем с правильным порядком
      const allForwards = [...forwards];
      allForwards.splice(insertIndex, 0, newPlayer);
      
      // Добавляем всех полевых обратно
      data.team = data.team.filter(p => p.position === 'G');
      data.team.push(...allForwards);
    }
    
    saveUsers(users);
    await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав!`);
    await showEditTeam(ctx);
  });

  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '📚 *Твоя коллекция:*\n\n';
    if (data.cards.length === 0) {
      text += 'У тебя пока нет карточек!';
    } else {
      data.cards.forEach((c) => {
        const emoji = getRarityEmoji(c.rarity);
        const posEmoji = getPositionEmoji(c.position);
        const posName = getPositionName(c.position);
        text += emoji + ' ' + posEmoji + ' ' + c.name + ' - ' + posName + ' (' + c.overall + ' OVR)\n';
      });
      text += '\n📊 Всего карт: ' + data.cards.length;
    }
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    });
  });

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const rarityCount = {};
    data.cards.forEach(c => {
      rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + 1;
    });
    
    let rarityText = '';
    const rarities = ['Обычный', 'Редкий', 'Элитный', 'Эпический', 'Легендарный', 'Икона'];
    rarities.forEach(r => {
      if (rarityCount[r]) {
        const emoji = getRarityEmoji(r);
        rarityText += emoji + ' ' + r + ': ' + rarityCount[r] + '\n';
      }
    });
    
    const forwards = data.team.filter(p => p.position !== 'G').length;
    const goalie = data.team.find(p => p.position === 'G');
    
    const now = new Date();
    const today = now.toDateString();
    let bonusText = '';
    if (data.lastBonus === today) {
      const timeLeft = getTimeUntilNextBonus();
      bonusText = '✅ Получен сегодня (через ' + timeLeft + ')';
    } else {
      bonusText = '🎁 Доступен!';
    }
    
    await ctx.editMessageText(
      '👤 *Профиль*\n\n' +
      'Имя: ' + user.first_name + '\n' +
      'ID: ' + user.id + '\n\n' +
      '📊 *Статистика:*\n' +
      '🏆 Рейтинг: ' + (data.rating || 0) + '\n' +
      '🥇 Лига: ' + (data.league || 'Бронза') + '\n' +
      '✅ Побед: ' + (data.wins || 0) + '\n' +
      '❌ Поражений: ' + (data.losses || 0) + '\n' +
      '⚖️ Ничьих: ' + (data.draws || 0) + '\n' +
      '⭐ Монет: ' + (data.coins || 0) + '\n' +
      '💎 Кристаллов: ' + (data.crystals || 0) + '\n' +
      '📚 Карт: ' + data.cards.length + '\n' +
      '📊 Матчей: ' + (data.matches || 0) + '\n' +
      '👥 В команде: ' + forwards + ' полевых, ' + (goalie ? '1 вратарь' : '0 вратарей') + '\n' +
      '📅 Бонус: ' + bonusText + '\n\n' +
      '📋 *Карты по редкостям:*\n' + (rarityText || 'Нет карт'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });
};