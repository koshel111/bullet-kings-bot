// ============================================
// src/handlers/profile.js - С ЛОГИРОВАНИЕМ
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
  if (!lastBonusDate) return '🎁 Доступен!';
  const nextBonus = new Date(lastBonusDate);
  nextBonus.setHours(nextBonus.getHours() + 24);
  const diff = nextBonus - now;
  if (diff <= 0) return '🎁 Доступен!';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}ч ${minutes}м ${seconds}с`;
}

// ============================================
// ГЛАВНЫЙ ЭКРАН КОМАНДЫ
// ============================================
async function showTeam(ctx) {
  console.log('👥 [showTeam] Показываем команду');
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
    text += '❌ Состав пуст! Нажми "Редактировать состав" ниже.\n\n';
  } else {
    text += '🏒 *Полевые (5):*\n';
    if (teamForwards.length === 0) {
      text += '  Нет игроков\n';
    } else {
      teamForwards.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        text += `  ${i+1}. ${emoji} ${p.name} (${p.overall} OVR)\n`;
      });
      for (let i = teamForwards.length; i < 5; i++) {
        text += `  ${i+1}. 🔲 Пусто\n`;
      }
    }
    
    if (teamGoalie) {
      const emoji = getRarityEmoji(teamGoalie.rarity);
      text += `\n🧤 *Вратарь:*\n  ${emoji} ${teamGoalie.name} (${teamGoalie.overall} OVR)\n`;
    } else {
      text += '\n🧤 *Вратарь:* 🔲 Пусто\n';
    }
  }
  
  text += `\n📊 Всего карт: ${allCards.length}`;
  text += `\n📊 В составе: ${teamForwards.length}/5 полевых, ${teamGoalie ? '1/1' : '0/1'} вратарь`;
  
  const buttons = [
    [Markup.button.callback('🔄 Редактировать состав', 'edit_team')],
  ];
  if (hasTeam) {
    buttons.push([Markup.button.callback('🗑️ Очистить состав', 'clear_team')]);
  }
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ============================================
// РЕДАКТИРОВАНИЕ СОСТАВА
// ============================================
async function showEditTeam(ctx) {
  console.log('📋 [showEditTeam] Показываем редактирование состава');
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '📋 *РЕДАКТИРОВАНИЕ СОСТАВА*\n\n';
  text += 'Нажми на игрока, чтобы добавить или убрать из состава.\n\n';
  
  // ПОЛЕВЫЕ ИГРОКИ
  text += '🏒 *Полевые игроки (нужно 5):*\n';
  if (forwards.length === 0) {
    text += '  ❌ Нет полевых игроков! Открой паки в магазине.\n\n';
  } else {
    forwards.forEach((player) => {
      const inTeam = teamForwards.some(p => p.id === player.id);
      const emoji = getRarityEmoji(player.rarity);
      const status = inTeam ? '✅ В СОСТАВЕ' : '➕ ДОБАВИТЬ';
      const statusEmoji = inTeam ? '✅' : '➕';
      text += `  ${statusEmoji} ${emoji} ${player.name} (${player.overall} OVR) — ${status}\n`;
    });
    text += `\n📊 В составе: ${teamForwards.length}/5\n`;
  }
  
  // ВРАТАРИ
  text += '\n🧤 *Вратари (нужно 1):*\n';
  if (goalies.length === 0) {
    text += '  ❌ Нет вратарей! Открой паки в магазине.\n\n';
  } else {
    goalies.forEach((player) => {
      const inTeam = teamGoalie && teamGoalie.id === player.id;
      const emoji = getRarityEmoji(player.rarity);
      const status = inTeam ? '✅ В СОСТАВЕ' : '➕ ДОБАВИТЬ';
      const statusEmoji = inTeam ? '✅' : '➕';
      text += `  ${statusEmoji} ${emoji} ${player.name} (${player.overall} OVR) — ${status}\n`;
    });
    text += `\n📊 В составе: ${teamGoalie ? 1 : 0}/1\n`;
  }
  
  // КНОПКИ
  const buttons = [];
  
  // Кнопки для полевых
  forwards.forEach((player, index) => {
    const inTeam = teamForwards.some(p => p.id === player.id);
    const label = inTeam ? `❌ ${player.name}` : `➕ ${player.name}`;
    buttons.push([Markup.button.callback(label, `toggle_forward_${index}`)]);
  });
  
  // Кнопки для вратарей
  goalies.forEach((player, index) => {
    const inTeam = teamGoalie && teamGoalie.id === player.id;
    const label = inTeam ? `❌ ${player.name}` : `➕ ${player.name}`;
    buttons.push([Markup.button.callback(label, `toggle_goalie_${index}`)]);
  });
  
  buttons.push([Markup.button.callback('✅ Сохранить состав', 'save_team')]);
  buttons.push([Markup.button.callback('🗑️ Очистить состав', 'clear_team')]);
  buttons.push([Markup.button.callback('🔙 Назад', 'team')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ПОЛЕВОГО ИГРОКА
// ============================================
async function toggleForward(ctx, index) {
  console.log('🏒 [toggleForward] Индекс:', index);
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const player = forwards[index];
  
  if (!player) {
    console.log('❌ [toggleForward] Игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  console.log('🔍 [toggleForward] Игрок:', player.name, 'ID:', player.id);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const goalies = currentTeam.filter(p => p.position === 'G');
  
  const inTeam = teamForwards.some(p => p.id === player.id);
  console.log('📊 [toggleForward] В составе:', inTeam);
  
  if (inTeam) {
    const newForwards = teamForwards.filter(p => p.id !== player.id);
    data.team = [...goalies, ...newForwards];
    console.log('✅ [toggleForward] Убран из состава');
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
  } else {
    if (teamForwards.length >= 5) {
      console.log('⚠️ [toggleForward] Уже 5 полевых!');
      const sorted = [...teamForwards].sort((a, b) => a.overall - b.overall);
      const weakest = sorted[0];
      
      if (weakest) {
        const buttons = [
          [Markup.button.callback(`🔄 Заменить ${weakest.name} (${weakest.overall} OVR)`, `replace_forward_${player.id}_${weakest.id}`)],
          [Markup.button.callback('❌ Отмена', 'edit_team')]
        ];
        
        await ctx.editMessageText(
          `❌ *Уже 5 полевых игроков!*\n\n` +
          `Хочешь заменить самого слабого игрока?\n` +
          `🔄 ${weakest.name} (${weakest.overall} OVR) → ${player.name} (${player.overall} OVR)`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
          }
        );
        return;
      }
      
      await ctx.answerCbQuery('❌ Уже 5 полевых!');
      return;
    }
    
    const newForwards = [...teamForwards, { ...player, count: 1 }];
    data.team = [...goalies, ...newForwards];
    console.log('✅ [toggleForward] Добавлен в состав');
    await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав`);
  }
  
  saveUsers(users);
  await showEditTeam(ctx);
}

// ============================================
// ЗАМЕНА ПОЛЕВОГО ИГРОКА
// ============================================
async function replaceForward(ctx, newPlayerId, oldPlayerId) {
  console.log('🔄 [replaceForward] Новый:', newPlayerId, 'Старый:', oldPlayerId);
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const goalies = currentTeam.filter(p => p.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  
  const newForwards = teamForwards.filter(p => p.id !== oldPlayerId);
  
  const allCards = data.cards || [];
  const newPlayer = allCards.find(p => p.id === newPlayerId);
  
  if (!newPlayer) {
    console.log('❌ [replaceForward] Новый игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  newForwards.push({ ...newPlayer, count: 1 });
  data.team = [...goalies, ...newForwards];
  
  saveUsers(users);
  console.log('✅ [replaceForward] Замена выполнена');
  await ctx.answerCbQuery(`✅ ${newPlayer.name} заменил игрока`);
  await showEditTeam(ctx);
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ВРАТАРЯ - С ЛОГАМИ
// ============================================
async function toggleGoalie(ctx, index) {
  console.log('🧤 [toggleGoalie] ===== НАЧАЛО =====');
  console.log('🧤 [toggleGoalie] Индекс:', index);
  console.log('🧤 [toggleGoalie] ctx.from.id:', ctx.from.id);
  console.log('🧤 [toggleGoalie] ctx.match:', ctx.match);
  
  const userId = ctx.from.id;
  const users = getUsers();
  console.log('🧤 [toggleGoalie] Пользователей в БД:', Object.keys(users).length);
  
  const data = users[userId];
  if (!data) {
    console.log('❌ [toggleGoalie] Пользователь не найден!');
    await ctx.answerCbQuery('❌ Пользователь не найден!');
    return;
  }
  
  const allCards = data.cards || [];
  console.log('🧤 [toggleGoalie] Всего карт:', allCards.length);
  
  const currentTeam = data.team || [];
  console.log('🧤 [toggleGoalie] Текущий состав:', currentTeam.length, 'игроков');
  
  const goalies = allCards.filter(c => c.position === 'G');
  console.log('🧤 [toggleGoalie] Всего вратарей:', goalies.length);
  
  if (index >= goalies.length) {
    console.log('❌ [toggleGoalie] Индекс вне диапазона! Индекс:', index, 'Доступно:', goalies.length);
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  const player = goalies[index];
  console.log('🧤 [toggleGoalie] Выбран игрок:', player.name, 'ID:', player.id, 'OVR:', player.overall);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  console.log('🧤 [toggleGoalie] Текущий вратарь:', teamGoalie ? teamGoalie.name : 'НЕТ');
  console.log('🧤 [toggleGoalie] Полевых в составе:', teamForwards.length);
  
  // Проверяем, есть ли игрок в составе
  const inTeam = teamGoalie && teamGoalie.id === player.id;
  console.log('🧤 [toggleGoalie] Игрок в составе вратарём:', inTeam);
  
  if (inTeam) {
    // ✅ УБИРАЕМ ВРАТАРЯ
    console.log('🧤 [toggleGoalie] Убираем вратаря из состава');
    data.team = [...teamForwards];
    saveUsers(users);
    console.log('✅ [toggleGoalie] Вратарь убран, сохранено');
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
    await showEditTeam(ctx);
    return;
  }
  
  // ✅ ДОБАВЛЯЕМ ВРАТАРЯ
  console.log('🧤 [toggleGoalie] Добавляем вратаря в состав');
  
  if (teamGoalie) {
    // Если вратарь уже есть — предлагаем заменить
    console.log('🧤 [toggleGoalie] Вратарь уже есть, предлагаем замену');
    const buttons = [
      [Markup.button.callback(`🔄 Заменить ${teamGoalie.name} (${teamGoalie.overall} OVR)`, `replace_goalie_${player.id}_${teamGoalie.id}`)],
      [Markup.button.callback('❌ Отмена', 'edit_team')]
    ];
    
    await ctx.editMessageText(
      `❌ *Вратарь уже выбран!*\n\n` +
      `Хочешь заменить вратаря?\n` +
      `🔄 ${teamGoalie.name} (${teamGoalie.overall} OVR) → ${player.name} (${player.overall} OVR)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
    return;
  }
  
  // Добавляем нового вратаря
  console.log('🧤 [toggleGoalie] Добавляем нового вратаря');
  data.team = [...teamForwards, { ...player, count: 1 }];
  saveUsers(users);
  console.log('✅ [toggleGoalie] Вратарь добавлен, сохранено');
  await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав как вратарь`);
  await showEditTeam(ctx);
}

// ============================================
// ЗАМЕНА ВРАТАРЯ
// ============================================
async function replaceGoalie(ctx, newPlayerId, oldPlayerId) {
  console.log('🔄 [replaceGoalie] Новый:', newPlayerId, 'Старый:', oldPlayerId);
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  
  const allCards = data.cards || [];
  const newPlayer = allCards.find(p => p.id === newPlayerId);
  
  if (!newPlayer) {
    console.log('❌ [replaceGoalie] Новый игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  console.log('🔄 [replaceGoalie] Заменяем на:', newPlayer.name);
  data.team = [...teamForwards, { ...newPlayer, count: 1 }];
  saveUsers(users);
  
  console.log('✅ [replaceGoalie] Замена выполнена');
  await ctx.answerCbQuery(`✅ ${newPlayer.name} стал вратарём`);
  await showEditTeam(ctx);
}

// ============================================
// СОХРАНЕНИЕ СОСТАВА
// ============================================
async function saveTeam(ctx) {
  console.log('💾 [saveTeam] Сохраняем состав');
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  if (teamForwards.length !== 5) {
    console.log('❌ [saveTeam] Не хватает полевых:', teamForwards.length);
    await ctx.editMessageText(
      `❌ *Нужно 5 полевых игроков!*\n\nСейчас: ${teamForwards.length}/5\n\nДобавь ещё ${5 - teamForwards.length} полевых игроков.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  if (!teamGoalie) {
    console.log('❌ [saveTeam] Нет вратаря');
    await ctx.editMessageText(
      '❌ *Нужен вратарь!*\n\nДобавь вратаря в состав.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  data.teamReady = true;
  saveUsers(users);
  console.log('✅ [saveTeam] Состав сохранён');
  
  await ctx.editMessageText(
    '✅ *Состав сохранён!*\n\n' +
    '🏒 5 полевых игроков\n' +
    '🧤 1 вратарь\n\n' +
    'Теперь ты можешь играть матчи! 🎮',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад', 'team')],
      ])
    }
  );
}

// ============================================
// ОЧИСТКА СОСТАВА
// ============================================
async function clearTeam(ctx) {
  console.log('🗑️ [clearTeam] Очищаем состав');
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  data.team = [];
  data.teamReady = false;
  saveUsers(users);
  console.log('✅ [clearTeam] Состав очищен');
  await ctx.answerCbQuery('🗑️ Состав очищен');
  await showTeam(ctx);
}

// ============================================
// ПРОФИЛЬ
// ============================================
async function showProfile(ctx) {
  console.log('👤 [showProfile] Показываем профиль');
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
  
  const teamForwards = data.team.filter(p => p.position !== 'G');
  const teamGoalie = data.team.find(p => p.position === 'G');
  
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
    `👥 В команде: ${teamForwards.length} полевых, ${teamGoalie ? '1 вратарь' : '0 вратарей'}\n` +
    `🎖️ БП уровень: ${bpLevel}\n` +
    `🎖️ XP: ${xp}\n` +
    `📅 Бонус: ${bonusText}\n\n` +
    '📋 *Редкости:*\n' + (rarityText || 'Нет карт'),
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    }
  );
}

// ============================================
// КОЛЛЕКЦИЯ
// ============================================
async function showCollection(ctx) {
  console.log('📚 [showCollection] Показываем коллекцию');
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
}

// ============================================
// БОНУС
// ============================================
async function getBonus(ctx) {
  console.log('🎁 [getBonus] Получаем бонус');
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
}

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = (bot) => {
  
  bot.action('team', async (ctx) => {
    console.log('🔘 [action] team');
    await ctx.answerCbQuery();
    await showTeam(ctx);
  });

  bot.action('edit_team', async (ctx) => {
    console.log('🔘 [action] edit_team');
    await ctx.answerCbQuery();
    await showEditTeam(ctx);
  });

  bot.action(/toggle_forward_(\d+)/, async (ctx) => {
    console.log('🔘 [action] toggle_forward:', ctx.match[1]);
    await ctx.answerCbQuery();
    await toggleForward(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/toggle_goalie_(\d+)/, async (ctx) => {
    console.log('🔘 [action] toggle_goalie:', ctx.match[1]);
    console.log('🔘 [action] Полный ctx.match:', ctx.match);
    await ctx.answerCbQuery();
    // ✅ ВЫЗЫВАЕМ ПРАВИЛЬНУЮ ФУНКЦИЮ
    await toggleGoalie(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/replace_forward_(.+)_(.+)/, async (ctx) => {
    console.log('🔘 [action] replace_forward');
    await ctx.answerCbQuery();
    await replaceForward(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action(/replace_goalie_(.+)_(.+)/, async (ctx) => {
    console.log('🔘 [action] replace_goalie');
    await ctx.answerCbQuery();
    await replaceGoalie(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action('save_team', async (ctx) => {
    console.log('🔘 [action] save_team');
    await ctx.answerCbQuery();
    await saveTeam(ctx);
  });

  bot.action('clear_team', async (ctx) => {
    console.log('🔘 [action] clear_team');
    await ctx.answerCbQuery();
    await clearTeam(ctx);
  });

  bot.action('profile', async (ctx) => {
    console.log('🔘 [action] profile');
    await ctx.answerCbQuery();
    await showProfile(ctx);
  });

  bot.action('collection', async (ctx) => {
    console.log('🔘 [action] collection');
    await ctx.answerCbQuery();
    await showCollection(ctx);
  });

  bot.action('bonus', async (ctx) => {
    console.log('🔘 [action] bonus');
    await getBonus(ctx);
  });

};