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
  
  const hasTeam = teamForwards.length > 0 || teamGoalie;
  
  if (!hasTeam) {
    text += '❌ Состав пуст! Нажми "Собрать состав" ниже.\n\n';
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
  
  const buttons = [];
  
  if (!hasTeam) {
    buttons.push([Markup.button.callback('🔄 Собрать состав', 'edit_team')]);
  } else {
    buttons.push([Markup.button.callback('🔄 Заменить состав', 'edit_team')]);
  }
  
  buttons.push([Markup.button.callback('🗑️ Очистить состав', 'clear_team')]);
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

async function viewTeam(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '👁️ *ТВОЙ СОСТАВ*\n\n';
  
  if (teamForwards.length === 0 && !teamGoalie) {
    text += '❌ Состав пуст!\n';
  } else {
    text += '🏒 *Полевые:*\n';
    teamForwards.forEach((p, i) => {
      const emoji = getRarityEmoji(p.rarity);
      text += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
    });
    
    if (teamGoalie) {
      const emoji = getRarityEmoji(teamGoalie.rarity);
      text += `\n🧤 *Вратарь:*\n  ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR)\n`;
    }
  }
  
  text += '\n✅ Состав собран и готов к матчам!';
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Назад', 'team')],
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
  text += 'Выбери 5 полевых игроков и 1 вратаря.\n\n';
  
  for (let i = 0; i < 5; i++) {
    const player = teamForwards[i] || null;
    if (player) {
      const emoji = getRarityEmoji(player.rarity);
      text += `${i+1}. ✅ ${emoji} ${player.name} (${player.overall} OVR)\n`;
    } else {
      text += `${i+1}. 🔲 Пусто\n`;
    }
  }
  
  if (teamGoalie) {
    const emoji = getRarityEmoji(teamGoalie.rarity);
    text += `\n6. ✅ ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR)`;
  } else {
    text += `\n6. 🔲 Пусто`;
  }
  
  const teamForwardsCount = teamForwards.length;
  const hasGoalie = teamGoalie !== undefined;
  const isComplete = teamForwardsCount === 5 && hasGoalie;
  
  text += `\n\n📊 Прогресс: ${teamForwardsCount}/5 полевых, ${hasGoalie ? '✅' : '❌'} вратарь`;
  
  if (isComplete) {
    text += '\n\n✅ *Состав готов!* Нажми "Сохранить"';
  }
  
  const buttons = [
    [Markup.button.callback('1️⃣', 'slot_0'), Markup.button.callback('2️⃣', 'slot_1'), Markup.button.callback('3️⃣', 'slot_2')],
    [Markup.button.callback('4️⃣', 'slot_3'), Markup.button.callback('5️⃣', 'slot_4'), Markup.button.callback('6️⃣ Вратарь', 'slot_goalie')],
  ];
  
  if (teamForwardsCount > 0 || teamGoalie) {
    buttons.push([Markup.button.callback('❌ Убрать игрока', 'remove_player')]);
  }
  
  if (isComplete) {
    buttons.push([Markup.button.callback('✅ Сохранить состав', 'save_team')]);
  }
  
  buttons.push([Markup.button.callback('🗑️ Очистить состав', 'clear_team')]);
  buttons.push([Markup.button.callback('🔙 Назад', 'team')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

async function showRemovePlayer(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '❌ *Убрать игрока из состава*\n\n';
  text += 'Выбери игрока, которого хочешь убрать:\n\n';
  
  const buttons = [];
  
  teamForwards.forEach((p, i) => {
    const emoji = getRarityEmoji(p.rarity);
    text += `${i+1}. ${emoji} ${p.name} (${p.overall} OVR) - полевой\n`;
    buttons.push([Markup.button.callback(`❌ ${p.name}`, `remove_forward_${i}`)]);
  });
  
  if (teamGoalie) {
    const emoji = getRarityEmoji(teamGoalie.rarity);
    text += `\n6. ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR) - вратарь\n`;
    buttons.push([Markup.button.callback(`❌ ${teamGoalie.name}`, 'remove_goalie')]);
  }
  
  buttons.push([Markup.button.callback('🔙 Назад', 'edit_team')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

async function removeForward(ctx, index) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const forwards = currentTeam.filter(p => p.position !== 'G');
  const goalies = currentTeam.filter(p => p.position === 'G');
  
  if (index >= forwards.length) {
    await ctx.editMessageText('❌ Игрок не найден!');
    return;
  }
  
  const removed = forwards[index];
  const newForwards = forwards.filter((_, i) => i !== index);
  data.team = [...goalies, ...newForwards];
  
  saveUsers(users);
  await ctx.answerCbQuery(`❌ ${removed.name} убран из состава!`);
  await showEditTeam(ctx);
}

async function removeGoalie(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const forwards = currentTeam.filter(p => p.position !== 'G');
  const goalies = currentTeam.filter(p => p.position === 'G');
  
  if (goalies.length === 0) {
    await ctx.editMessageText('❌ Вратарь не найден!');
    return;
  }
  
  const removed = goalies[0];
  data.team = forwards;
  
  saveUsers(users);
  await ctx.answerCbQuery(`❌ ${removed.name} убран из состава!`);
  await showEditTeam(ctx);
}

async function saveTeam(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  if (teamForwards.length !== 5 || !teamGoalie) {
    await ctx.editMessageText('❌ Состав неполный!');
    return;
  }
  
  data.team = currentTeam;
  data.teamReady = true;
  saveUsers(users);
  
  await ctx.editMessageText(
    '✅ *Состав сохранён!*\n\n' +
    'Теперь ты можешь играть матчи.\n' +
    'Используй "Заменить состав", чтобы изменить игроков.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад', 'team')],
      ])
    }
  );
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
  
  // ✅ СОЗДАЁМ МАССИВ ID ИГРОКОВ В СОСТАВЕ
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
  
  // ✅ СОРТИРУЕМ: сначала те, кто НЕ в составе (➕), потом те, кто в составе (✅)
  const sortedAvailable = [...available].sort((a, b) => {
    const aInTeam = teamIds.includes(a.id);
    const bInTeam = teamIds.includes(b.id);
    if (aInTeam && !bInTeam) return 1;
    if (!aInTeam && bInTeam) return -1;
    return 0;
  });
  
  sortedAvailable.forEach((player, index) => {
    const emoji = getRarityEmoji(player.rarity);
    const posEmoji = getPositionEmoji(player.position);
    const posName = getPositionName(player.position);
    const inTeam = teamIds.includes(player.id);
    const mark = inTeam ? '✅' : '➕';
    const status = inTeam ? ' (в составе)' : '';
    
    text += `${index + 1}. ${mark} ${posEmoji} ${emoji} ${player.name} - ${posName} (${player.overall} OVR)${status}\n`;
    buttons.push([Markup.button.callback(
      `${inTeam ? '✅' : '➕'} ${player.name}`, 
      `pick_player_${slotType}_${index}`
    )]);
  });
  
  text += '\n✅ — уже в составе, ➕ — можно добавить';
  text += '\n\n💡 *Важно:* Если игрок уже в составе, он будет заменён на нового.';
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
  const currentTeam = data.team || [];
  
  // ✅ ПОЛУЧАЕМ ИГРОКА
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
  
  // ✅ ПРОВЕРЯЕМ, ЕСЛИ ИГРОК УЖЕ В СОСТАВЕ
  const teamIds = currentTeam.map(p => p.id);
  const isInTeam = teamIds.includes(player.id);
  
  if (slotType === 'goalie') {
    // Для вратаря
    if (isInTeam) {
      await ctx.editMessageText('❌ Этот вратарь уже в составе!');
      return;
    }
    
    // Проверяем, есть ли уже вратарь
    if (currentTeam.some(p => p.position === 'G')) {
      await ctx.editMessageText('❌ Вратарь уже выбран! Сначала убери текущего вратаря.');
      return;
    }
    
    // Добавляем вратаря
    const newTeam = [...currentTeam, { ...player, count: 1 }];
    data.team = newTeam;
  } else {
    // Для полевых игроков
    const slotIndex = parseInt(slotType);
    const forwards = currentTeam.filter(p => p.position !== 'G');
    const goalies = currentTeam.filter(p => p.position === 'G');
    
    if (isInTeam) {
      await ctx.editMessageText('❌ Этот игрок уже в составе!');
      return;
    }
    
    // Проверяем лимит
    if (forwards.length >= 5) {
      await ctx.editMessageText('❌ Уже 5 полевых игроков! Сначала убери кого-то.');
      return;
    }
    
    // Добавляем в указанный слот
    const newForwards = [...forwards];
    if (slotIndex < newForwards.length) {
      newForwards[slotIndex] = { ...player, count: 1 };
    } else {
      newForwards.push({ ...player, count: 1 });
    }
    
    data.team = [...goalies, ...newForwards];
  }
  
  saveUsers(users);
  await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав!`);
  await showEditTeam(ctx);
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const user = ctx.from;
      const users = getUsers();
      const data = users[user.id];
      
      if (!data) {
        await ctx.editMessageText('❌ Ошибка! Попробуй /start');
        return;
      }
      
      const now = new Date();
      
      if (data.lastBonus) {
        const timeLeft = getTimeUntilNextBonus(data.lastBonus);
        
        if (timeLeft !== '🎁 Доступен!') {
          await ctx.editMessageText(
            `⏳ *Бонус уже получен!*\n\n🕐 Через: ${timeLeft}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
            }
          );
          return;
        }
      }
      
      const bonus = Math.floor(Math.random() * 50) + 10;
      data.coins += bonus;
      data.lastBonus = now.toISOString();
      saveUsers(users);
      
      await ctx.editMessageText(
        `🎁 *Бонус получен!*\n\n⭐ +${bonus} монет\n🕐 Через: 24ч 0м 0с`,
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

  bot.action('view_team', async (ctx) => {
    await ctx.answerCbQuery();
    await viewTeam(ctx);
  });

  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    await showEditTeam(ctx);
  });

  bot.action('remove_player', async (ctx) => {
    await ctx.answerCbQuery();
    await showRemovePlayer(ctx);
  });

  bot.action(/remove_forward_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await removeForward(ctx, parseInt(ctx.match[1]));
  });

  bot.action('remove_goalie', async (ctx) => {
    await ctx.answerCbQuery();
    await removeGoalie(ctx);
  });

  bot.action('save_team', async (ctx) => {
    await ctx.answerCbQuery();
    await saveTeam(ctx);
  });

  bot.action('clear_team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    data.team = [];
    data.teamReady = false;
    saveUsers(users);
    await ctx.answerCbQuery('🗑️ Состав очищен');
    await showTeam(ctx);
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
    
    const xp = data.battlepass_xp || 0;
    const bpLevel = Math.floor(xp / 20);
    
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
      `🎖️ БП уровень: ${bpLevel}\n` +
      `🎖️ XP: ${xp}\n` +
      `📅 Бонус: ${bonusText}\n\n` +
      '📋 *Редкости:*\n' + (rarityText || 'Нет карт'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });
};