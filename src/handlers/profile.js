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

// 🔥 ДОБАВЛЯЕМ ФУНКЦИЮ ТАЙМЕРА!
function getTimeUntilNextBonus(lastBonusDate) {
  const now = new Date();
  
  if (!lastBonusDate) {
    return '🎁 Доступен!';
  }
  
  const nextBonus = new Date(lastBonusDate);
  nextBonus.setHours(nextBonus.getHours() + 24);
  
  const diff = nextBonus - now;
  
  if (diff <= 0) {
    return '🎁 Доступен!';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours}ч ${minutes}м ${seconds}с`;
}

async function showTeam(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '👥 *ТВОЯ КОМАНДА*\n\n';
  
  if (teamForwards.length === 0 && !teamGoalie) {
    text += '❌ Состав пуст!\n';
  } else {
    text += '🏒 *Полевые:*\n';
    if (teamForwards.length === 0) {
      text += '  Нет игроков\n';
    } else {
      teamForwards.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        text += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
      });
    }
    
    if (teamGoalie) {
      const emoji = getRarityEmoji(teamGoalie.rarity);
      text += `\n🧤 *Вратарь:*\n  ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR)\n`;
    } else {
      text += '\n🧤 *Вратарь:* Нет\n';
    }
  }
  
  text += '\n📊 *Коллекция:*\n';
  text += `📚 Карт: ${allCards.length}\n`;
  text += `🏒 Полевых: ${forwards.length}\n`;
  text += `🧤 Вратарей: ${goalies.length}\n`;
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Собрать состав', 'edit_team')],
      [Markup.button.callback('🗑️ Очистить состав', 'clear_team')],
      [Markup.button.callback('🔙 Назад', 'back')],
    ])
  });
}

async function showEditTeam(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '📋 *РЕДАКТИРОВАНИЕ СОСТАВА*\n\n';
  
  for (let i = 0; i < 5; i++) {
    const player = teamForwards[i] || null;
    if (player) {
      const emoji = getRarityEmoji(player.rarity);
      text += `${i+1}. ${emoji} ${player.name} (${player.overall} OVR)\n`;
    } else {
      text += `${i+1}. 🔲 Пусто\n`;
    }
  }
  
  if (teamGoalie) {
    const emoji = getRarityEmoji(teamGoalie.rarity);
    text += `\n6. ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR)`;
  } else {
    text += `\n6. 🔲 Пусто`;
  }
  
  text += '\n\n📊 *Нажми на номер слота:*';
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('1️⃣', 'slot_0'), Markup.button.callback('2️⃣', 'slot_1'), Markup.button.callback('3️⃣', 'slot_2')],
      [Markup.button.callback('4️⃣', 'slot_3'), Markup.button.callback('5️⃣', 'slot_4'), Markup.button.callback('6️⃣ Вратарь', 'slot_goalie')],
      [Markup.button.callback('🔙 Назад', 'team')],
    ])
  });
}

async function showPlayersForSlot(ctx, slotType) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  let available = [];
  let slotName = '';
  
  if (slotType === 'goalie') {
    available = allCards.filter(c => c.position === 'G');
    slotName = 'вратаря';
  } else {
    available = allCards.filter(c => c.position !== 'G');
    slotName = `слот ${parseInt(slotType) + 1}`;
  }
  
  const teamIds = currentTeam.map(p => p.id);
  
  let text = `📋 *Выбери игрока для ${slotName}:*\n\n`;
  
  if (available.length === 0) {
    text += '❌ Нет доступных игроков!\n';
    text += 'Открой паки в магазине 🛒';
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🛒 В магазин', 'shop')],
        [Markup.button.callback('🔙 Назад', 'edit_team')],
      ])
    });
    return;
  }
  
  const buttons = [];
  available.forEach((player, index) => {
    const emoji = getRarityEmoji(player.rarity);
    const posEmoji = getPositionEmoji(player.position);
    const posName = getPositionName(player.position);
    const inTeam = teamIds.includes(player.id);
    const mark = inTeam ? '✅' : '➕';
    
    text += `${index + 1}. ${mark} ${posEmoji} ${emoji} ${player.name} - ${posName} (${player.overall} OVR)\n`;
    buttons.push([Markup.button.callback(`${index + 1}`, `pick_player_${slotType}_${index}`)]);
  });
  
  text += '\n✅ — уже в составе, ➕ — можно добавить';
  buttons.push([Markup.button.callback('🔙 Назад', 'edit_team')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

async function addPlayerToTeam(ctx, slotType, playerIndex) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  
  let player;
  if (slotType === 'goalie') {
    const goalies = allCards.filter(c => c.position === 'G');
    player = goalies[playerIndex];
  } else {
    const forwards = allCards.filter(c => c.position !== 'G');
    player = forwards[playerIndex];
  }
  
  if (!player) {
    await ctx.editMessageText('❌ Игрок не найден!');
    return;
  }
  
  let newTeam = data.team.filter(p => p.id !== player.id);
  
  if (slotType === 'goalie') {
    newTeam = newTeam.filter(p => p.position !== 'G');
    newTeam.push({ ...player, count: 1 });
  } else {
    const slotIndex = parseInt(slotType);
    const forwards = newTeam.filter(p => p.position !== 'G');
    const goalies = newTeam.filter(p => p.position === 'G');
    
    const newForwards = [...forwards];
    
    if (slotIndex < newForwards.length) {
      newForwards[slotIndex] = { ...player, count: 1 };
    } else {
      newForwards.push({ ...player, count: 1 });
    }
    
    newTeam = [...goalies, ...newForwards];
  }
  
  data.team = newTeam;
  saveUsers(users);
  
  await ctx.answerCbQuery(`✅ ${player.name} добавлен!`);
  await showEditTeam(ctx);
}

module.exports = (bot) => {
  
  // ============================================
  // БОНУС — С ТАЙМЕРОМ
  // ============================================
  bot.action('bonus', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      console.log('✅ Бонус нажат!');
      
      const user = ctx.from;
      const users = getUsers();
      const data = users[user.id];
      
      if (!data) {
        console.log('❌ Пользователь не найден!');
        await ctx.editMessageText('❌ Ошибка! Попробуй /start');
        return;
      }
      
      const now = new Date();
      
      // Проверяем, есть ли lastBonus
      if (data.lastBonus) {
        const timeLeft = getTimeUntilNextBonus(data.lastBonus);
        
        // Если бонус ещё не доступен
        if (timeLeft !== '🎁 Доступен!') {
          await ctx.editMessageText(
            `⏳ *Бонус уже получен!*\n\n` +
            `🕐 Следующий бонус через: ${timeLeft}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
            }
          );
          return;
        }
      }
      
      // Даём бонус
      const bonus = Math.floor(Math.random() * 50) + 10;
      data.coins += bonus;
      data.lastBonus = now.toISOString();
      saveUsers(users);
      
      console.log(`✅ Бонус выдан: +${bonus} монет`);
      
      await ctx.editMessageText(
        `🎁 *Бонус получен!*\n\n` +
        `⭐ +${bonus} монет\n` +
        `🕐 Следующий бонус через: 24ч 0м 0с`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
        }
      );
    } catch (error) {
      console.error('❌ Ошибка в бонусе:', error);
      await ctx.editMessageText('❌ Произошла ошибка! Попробуй позже.');
    }
  });

  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    await showTeam(ctx);
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
    await showPlayersForSlot(ctx, ctx.match[1]);
  });

  bot.action(/pick_player_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await addPlayerToTeam(ctx, ctx.match[1], parseInt(ctx.match[2]));
  });

  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '📚 *Коллекция:*\n\n';
    if (data.cards.length === 0) {
      text += 'У тебя пока нет карточек!';
    } else {
      data.cards.forEach((c) => {
        const emoji = getRarityEmoji(c.rarity);
        const pos = getPositionEmoji(c.position);
        const name = getPositionName(c.position);
        text += `${emoji} ${pos} ${c.name} - ${name} (${c.overall} OVR)\n`;
      });
      text += `\n📊 Всего: ${data.cards.length}`;
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
    ['Обычный', 'Редкий', 'Элитный', 'Эпический', 'Легендарный', 'Икона'].forEach(r => {
      if (rarityCount[r]) {
        rarityText += `${getRarityEmoji(r)} ${r}: ${rarityCount[r]}\n`;
      }
    });
    
    const forwards = data.team.filter(p => p.position !== 'G').length;
    const goalie = data.team.find(p => p.position === 'G');
    
    let bonusText = '🎁 Доступен!';
    if (data.lastBonus) {
      bonusText = getTimeUntilNextBonus(data.lastBonus);
    }
    
    await ctx.editMessageText(
      '👤 *Профиль*\n\n' +
      `Имя: ${user.first_name}\n` +
      `ID: ${user.id}\n\n` +
      '📊 *Статистика:*\n' +
      `🏆 Рейтинг: ${data.rating || 0}\n` +
      `🥇 Лига: ${data.league || 'Бронза'}\n` +
      `✅ Побед: ${data.wins || 0}\n` +
      `❌ Поражений: ${data.losses || 0}\n` +
      `⚖️ Ничьих: ${data.draws || 0}\n` +
      `⭐ Монет: ${data.coins || 0}\n` +
      `💎 Кристаллов: ${data.crystals || 0}\n` +
      `📚 Карт: ${data.cards.length}\n` +
      `📊 Матчей: ${data.matches || 0}\n` +
      `👥 В команде: ${forwards} полевых, ${goalie ? '1 вратарь' : '0 вратарей'}\n` +
      `📅 Бонус: ${bonusText}\n\n` +
      '📋 *Редкости:*\n' + (rarityText || 'Нет карт'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });
};