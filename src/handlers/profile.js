// ============================================
// src/handlers/profile.js - ВЫБОР СОСТАВА (ПОЛНАЯ ВЕРСИЯ)
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

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function getPositionEmoji(position) {
  if (position === 'G') return '🧤';
  return '🏒';
}

function getPositionName(position) {
  if (position === 'G') return 'Вратарь';
  if (position === 'LW' || position === 'RW' || position === 'C') return 'Нападающий';
  if (position === 'D') return 'Защитник';
  return 'Полевой';
}

// ============================================
// ПОКАЗ СОСТАВА
// ============================================
async function showTeam(ctx, bot, userId) {
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  // Разделяем
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '👥 *Твоя команда*\n\n';
  text += '📋 *Текущий состав:*\n\n';
  
  // 5 полевых слотов
  text += '🏒 *Полевые игроки (слоты 1-5):*\n';
  for (let i = 0; i < 5; i++) {
    const player = teamForwards[i];
    if (player) {
      const emoji = getRarityEmoji(player.rarity);
      text += (i+1) + '. ' + emoji + ' ' + player.name + ' - ' + player.rarity + ' (' + player.overall + ' OVR)\n';
    } else {
      text +=   . [0] | Игрок не добавлен\n;
    }
  }
  
  // Вратарь (слот 6)
  text += '\n🧤 *Вратарь (слот 6):*\n';
  if (teamGoalie) {
    const emoji = getRarityEmoji(teamGoalie.rarity);
    text +=   6.   -  ( OVR)\n;
  } else {
    text +=   6. [0] | Игрок не добавлен\n;
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
        [Markup.button.callback('🗑️ Очистить состав', 'clear_team')],
        [Markup.button.callback('🔙 Назад', 'back')],
      ])
    }
  );
}

// ============================================
// ОЧИСТКА СОСТАВА
// ============================================
async function clearTeam(ctx, userId) {
  const users = getUsers();
  const data = users[userId];
  data.team = [];
  saveUsers(users);
  await ctx.editMessageText('✅ Состав очищен!');
  await showTeam(ctx, null, userId);
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const bonus = Math.floor(Math.random() * 50) + 10;
    data.coins += bonus;
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    await ctx.editMessageText('🎁 *Бонус получен!*\n\n⭐ +' + bonus + ' монет', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    });
  });

  // ============================================
  // КОМАНДА (ГЛАВНЫЙ ЭКРАН)
  // ============================================
  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    await showTeam(ctx, bot, ctx.from.id);
  });

  // ============================================
  // ОЧИСТКА СОСТАВА
  // ============================================
  bot.action('clear_team', async (ctx) => {
    await ctx.answerCbQuery();
    await clearTeam(ctx, ctx.from.id);
  });

  // ============================================
  // РЕДАКТИРОВАНИЕ СОСТАВА
  // ============================================
  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const currentTeam = data.team || [];
    
    const teamForwards = currentTeam.filter(p => p.position !== 'G');
    const teamGoalie = currentTeam.find(p => p.position === 'G');
    
    let text = '🧑‍🏫 *Выбери слот для заполнения:*\n\n';
    text += '🏒 *Полевые игроки (слоты 1-5):*\n';
    for (let i = 0; i < 5; i++) {
      const player = teamForwards[i];
      if (player) {
        const emoji = getRarityEmoji(player.rarity);
        text +=   .   -  ( OVR)\n;
      } else {
        text +=   . [0] | Игрок не добавлен\n;
      }
    }
    
    text += '\n🧤 *Вратарь (слот 6):*\n';
    if (teamGoalie) {
      const emoji = getRarityEmoji(teamGoalie.rarity);
      text +=   6.   -  ( OVR)\n;
    } else {
      text +=   6. [0] | Игрок не добавлен\n;
    }
    
    text += '\n📊 *Нажми на номер слота, чтобы заполнить или заменить игрока:*';
    
    const buttons = [
      [Markup.button.callback('1️⃣ Слот 1', 'slot_0')],
      [Markup.button.callback('2️⃣ Слот 2', 'slot_1')],
      [Markup.button.callback('3️⃣ Слот 3', 'slot_2')],
      [Markup.button.callback('4️⃣ Слот 4', 'slot_3')],
      [Markup.button.callback('5️⃣ Слот 5', 'slot_4')],
      [Markup.button.callback('6️⃣ Вратарь', 'slot_goalie')],
      [Markup.button.callback('🔙 К составу', 'team')],
    ];
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  });

  // ============================================
  // ВЫБОР СЛОТА
  // ============================================
  bot.action(/slot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const slotType = ctx.match[1];
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    
    let filteredCards = [];
    let slotName = '';
    let maxSlots = 5;
    
    if (slotType === 'goalie') {
      // Вратари
      filteredCards = allCards.filter(c => c.position === 'G');
      slotName = 'вратаря';
      maxSlots = 1;
    } else {
      // Полевые игроки
      const slotIndex = parseInt(slotType);
      filteredCards = allCards.filter(c => c.position !== 'G');
      slotName = слот ;
      maxSlots = 5;
    }
    
    // Убираем игроков, которые уже в составе (кроме текущего слота)
    const currentTeam = data.team || [];
    const currentSlotPlayer = currentTeam[parseInt(slotType)];
    const otherTeam = currentTeam.filter((p, i) => i !== parseInt(slotType) && p.position !== 'G');
    
    filteredCards = filteredCards.filter(c => {
      // Если игрок уже в составе и не в текущем слоте — скрываем
      if (otherTeam.some(p => p.id === c.id)) return false;
      return true;
    });
    
    if (filteredCards.length === 0) {
      await ctx.editMessageText(
        '❌ *Нет доступных игроков для ' + slotName + '!*\n\n' +
        'Открой паки в магазине, чтобы получить новых игроков. 🛒',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 К составу', 'edit_team')]
          ])
        }
      );
      return;
    }
    
    let text = 📋 *Выбери игрока для :*\n\n;
    text += Всего доступно: \n\n;
    
    const buttons = [];
    filteredCards.forEach((player, index) => {
      const emoji = getRarityEmoji(player.rarity);
      const posEmoji = getPositionEmoji(player.position);
      const posName = getPositionName(player.position);
      text += ${index + 1}.    -  ( OVR) []\n;
      buttons.push([Markup.button.callback(${index + 1}️⃣ , select_player__)]);
    });
    
    text += '\n📊 *Нажми на номер карты, чтобы добавить в состав:*';
    
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
  // ВЫБОР ИГРОКА ДЛЯ СЛОТА
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
    let slotIndex;
    let isGoalie = false;
    
    if (slotType === 'goalie') {
      const goalies = allCards.filter(c => c.position === 'G');
      player = goalies[playerIndex];
      isGoalie = true;
    } else {
      const forwards = allCards.filter(c => c.position !== 'G');
      player = forwards[playerIndex];
      slotIndex = parseInt(slotType);
    }
    
    if (!player) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    // Убираем игрока из других слотов
    if (isGoalie) {
      data.team = data.team.filter(p => p.position !== 'G');
      data.team.push({ ...player, count: 1 });
    } else {
      // Убираем из других полевых слотов
      data.team = data.team.filter(p => p.id !== player.id || p.position === 'G');
      
      // Добавляем в нужный слот
      const teamForwards = data.team.filter(p => p.position !== 'G');
      if (slotIndex < teamForwards.length) {
        data.team[slotIndex] = { ...player, count: 1 };
      } else {
        data.team.push({ ...player, count: 1 });
      }
    }
    
    saveUsers(users);
    
    // Возвращаемся к редактированию состава
    await bot.action('edit_team')(ctx);
  });

  // ============================================
  // КОЛЛЕКЦИЯ
  // ============================================
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
        const position = c.position === 'G' ? '🧤' : '🏒';
        text += emoji + ' ' + position + ' ' + c.name + ' - ' + c.rarity + ' (' + c.overall + ' OVR) x' + (c.count || 1) + '\n';
      });
      text += '\nВсего карт: ' + data.cards.length;
    }
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    });
  });

  // ============================================
  // ПРОФИЛЬ
  // ============================================
  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const rarityCount = {};
    data.cards.forEach(c => {
      rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + (c.count || 1);
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
    
    await ctx.editMessageText(
      '👤 *Профиль*\n\n' +
      'Имя: ' + user.first_name + '\n' +
      'ID: ' + user.id + '\n\n' +
      '📊 *Статистика:*\n' +
      '🏆 Рейтинг: ' + data.rating + '\n' +
      '🥇 Лига: ' + data.league + '\n' +
      '✅ Побед: ' + data.wins + '\n' +
      '❌ Поражений: ' + data.losses + '\n' +
      '⚖️ Ничьих: ' + data.draws + '\n' +
      '⭐ Монет: ' + data.coins + '\n' +
      '💎 Кристаллов: ' + data.crystals + '\n' +
      '📚 Карт: ' + data.cards.length + '\n' +
      '📊 Матчей: ' + data.matches + '\n' +
      '👥 В команде: ' + forwards + ' полевых, ' + (goalie ? '1 вратарь' : '0 вратарей') + '\n\n' +
      '📋 *Карты по редкостям:*\n' + rarityText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });
};
