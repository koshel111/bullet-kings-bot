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

// ✅ ФУНКЦИЯ ДЛЯ ГЕНЕРАЦИИ ID
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

// ✅ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ И ДОБАВЛЕНИЯ ID
function ensureCardId(card) {
  if (!card.id) {
    card.id = generateId();
  }
  return card;
}

// ✅ ФУНКЦИЯ ДЛЯ НОРМАЛИЗАЦИИ КАРТЫ (сравнение по имени + позиции)
function getCardKey(card) {
  return card.name + '_' + card.position;
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
  
  // ✅ НОРМАЛИЗУЕМ ВСЕ КАРТЫ
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  console.log('📊 [showTeam] Всего карт:', allCards.length);
  console.log('📊 [showTeam] В составе полевых:', teamForwards.length);
  console.log('📊 [showTeam] В составе вратарь:', teamGoalie ? 'да' : 'нет');
  
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
  
  // ✅ НОРМАЛИЗУЕМ ВСЕ КАРТЫ
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  // ✅ СОЗДАЁМ SET ДЛЯ БЫСТРОЙ ПРОВЕРКИ (по ключу имя+позиция)
  const teamKeys = new Set(teamForwards.map(p => getCardKey(p)));
  const goalieKey = teamGoalie ? getCardKey(teamGoalie) : null;
  
  console.log('📊 [showEditTeam] Всего полевых:', forwards.length);
  console.log('📊 [showEditTeam] В составе полевых:', teamForwards.length);
  console.log('📊 [showEditTeam] Ключи в составе:', [...teamKeys]);
  
  let text = '📋 *РЕДАКТИРОВАНИЕ СОСТАВА*\n\n';
  text += 'Нажми на игрока, чтобы добавить или убрать из состава.\n\n';
  
  // ПОЛЕВЫЕ ИГРОКИ
  text += '🏒 *Полевые игроки (нужно 5):*\n';
  if (forwards.length === 0) {
    text += '  ❌ Нет полевых игроков! Открой паки в магазине.\n\n';
  } else {
    forwards.forEach((player) => {
      ensureCardId(player);
      const key = getCardKey(player);
      const inTeam = teamKeys.has(key);
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
      ensureCardId(player);
      const key = getCardKey(player);
      const inTeam = goalieKey === key;
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
    ensureCardId(player);
    const key = getCardKey(player);
    const inTeam = teamKeys.has(key);
    const label = inTeam ? `❌ ${player.name}` : `➕ ${player.name}`;
    buttons.push([Markup.button.callback(label, `team_toggle_forward_${index}`)]);
  });
  
  // Кнопки для вратарей
  goalies.forEach((player, index) => {
    ensureCardId(player);
    const key = getCardKey(player);
    const inTeam = goalieKey === key;
    const label = inTeam ? `❌ ${player.name}` : `➕ ${player.name}`;
    buttons.push([Markup.button.callback(label, `team_toggle_goalie_${index}`)]);
  });
  
  buttons.push([Markup.button.callback('✅ Сохранить состав', 'team_save')]);
  buttons.push([Markup.button.callback('🗑️ Очистить состав', 'team_clear')]);
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
  
  // НОРМАЛИЗУЕМ ВСЕ КАРТЫ
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const player = forwards[index];
  
  if (!player) {
    console.log('❌ [toggleForward] Игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  ensureCardId(player);
  const playerKey = getCardKey(player);
  console.log('🔍 [toggleForward] Игрок:', player.name, 'Ключ:', playerKey);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const goalies = currentTeam.filter(p => p.position === 'G');
  
  // ✅ ПРОВЕРЯЕМ ПО КЛЮЧУ (имя + позиция)
  const teamKeys = new Set(teamForwards.map(p => getCardKey(p)));
  const inTeam = teamKeys.has(playerKey);
  
  console.log('📊 [toggleForward] В составе:', inTeam);
  console.log('📊 [toggleForward] Всего полевых в составе:', teamForwards.length);
  
  if (inTeam) {
    // УБИРАЕМ ИЗ СОСТАВА (по ключу)
    const newForwards = teamForwards.filter(p => getCardKey(p) !== playerKey);
    data.team = [...goalies, ...newForwards];
    console.log('✅ [toggleForward] Убран из состава');
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
    saveUsers(users);
    await showEditTeam(ctx);
    return;
  }
  
  // ДОБАВЛЯЕМ В СОСТАВ
  if (teamForwards.length >= 5) {
    console.log('⚠️ [toggleForward] Уже 5 полевых!');
    
    // НАХОДИМ САМОГО СЛАБОГО ИГРОКА В СОСТАВЕ
    const sorted = [...teamForwards].sort((a, b) => (a.overall || 0) - (b.overall || 0));
    const weakest = sorted[0];
    
    console.log('📊 [toggleForward] Самый слабый:', weakest ? weakest.name : 'нет', 'OVR:', weakest ? weakest.overall : 'нет');
    console.log('📊 [toggleForward] Новый игрок OVR:', player.overall);
    
    // ✅ ПРОВЕРЯЕМ, ЧТО НОВЫЙ ИГРОК СИЛЬНЕЕ СЛАБОГО
    if (weakest && player.overall > weakest.overall) {
      const buttons = [
        [Markup.button.callback(`🔄 Заменить ${weakest.name} (${weakest.overall} OVR)`, `team_replace_forward_${player.id}_${weakest.id}`)],
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
    
    await ctx.answerCbQuery(`❌ ${player.name} слабее или равен текущим игрокам`);
    return;
  }
  
  // ДОБАВЛЯЕМ НОВОГО ИГРОКА
  const newForwards = [...teamForwards, { ...player, count: 1 }];
  data.team = [...goalies, ...newForwards];
  console.log('✅ [toggleForward] Добавлен в состав');
  await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав`);
  
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
  const allCards = data.cards || [];
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const goalies = currentTeam.filter(p => p.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  
  // Убираем старого игрока (по ID)
  const newForwards = teamForwards.filter(p => p.id !== oldPlayerId);
  
  // Находим нового игрока в коллекции
  const newPlayer = allCards.find(p => p.id === newPlayerId);
  
  if (!newPlayer) {
    console.log('❌ [replaceForward] Новый игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  ensureCardId(newPlayer);
  newForwards.push({ ...newPlayer, count: 1 });
  data.team = [...goalies, ...newForwards];
  
  saveUsers(users);
  console.log('✅ [replaceForward] Замена выполнена');
  await ctx.answerCbQuery(`✅ ${newPlayer.name} заменил игрока`);
  await showEditTeam(ctx);
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ВРАТАРЯ
// ============================================
async function toggleGoalie(ctx, index) {
  console.log('🧤 [toggleGoalie] Индекс:', index);
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const goalies = allCards.filter(c => c.position === 'G');
  const player = goalies[index];
  
  if (!player) {
    console.log('❌ [toggleGoalie] Игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  ensureCardId(player);
  const playerKey = getCardKey(player);
  console.log('🧤 [toggleGoalie] Игрок:', player.name, 'Ключ:', playerKey);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  const goalieKey = teamGoalie ? getCardKey(teamGoalie) : null;
  
  const inTeam = goalieKey === playerKey;
  console.log('🧤 [toggleGoalie] В составе:', inTeam);
  
  if (inTeam) {
    // УБИРАЕМ ВРАТАРЯ
    data.team = [...teamForwards];
    saveUsers(users);
    console.log('✅ [toggleGoalie] Вратарь убран');
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
    await showEditTeam(ctx);
    return;
  }
  
  // ДОБАВЛЯЕМ ВРАТАРЯ
  if (teamGoalie) {
    // Если вратарь уже есть — предлагаем заменить
    const buttons = [
      [Markup.button.callback(`🔄 Заменить ${teamGoalie.name} (${teamGoalie.overall} OVR)`, `team_replace_goalie_${player.id}_${teamGoalie.id}`)],
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
  data.team = [...teamForwards, { ...player, count: 1 }];
  saveUsers(users);
  console.log('✅ [toggleGoalie] Вратарь добавлен');
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
  const allCards = data.cards || [];
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const newPlayer = allCards.find(p => p.id === newPlayerId);
  
  if (!newPlayer) {
    console.log('❌ [replaceGoalie] Новый игрок не найден!');
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  ensureCardId(newPlayer);
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
  
  currentTeam.forEach(c => ensureCardId(c));
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  console.log('📊 [saveTeam] Полевых в составе:', teamForwards.length);
  console.log('📊 [saveTeam] Вратарь:', teamGoalie ? teamGoalie.name : 'нет');
  
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

  bot.action(/team_toggle_forward_(\d+)/, async (ctx) => {
    console.log('🔘 [action] team_toggle_forward:', ctx.match[1]);
    await ctx.answerCbQuery();
    await toggleForward(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/team_toggle_goalie_(\d+)/, async (ctx) => {
    console.log('🔘 [action] team_toggle_goalie:', ctx.match[1]);
    await ctx.answerCbQuery();
    await toggleGoalie(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/team_replace_forward_(.+)_(.+)/, async (ctx) => {
    console.log('🔘 [action] team_replace_forward');
    await ctx.answerCbQuery();
    await replaceForward(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action(/team_replace_goalie_(.+)_(.+)/, async (ctx) => {
    console.log('🔘 [action] team_replace_goalie');
    await ctx.answerCbQuery();
    await replaceGoalie(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action('team_save', async (ctx) => {
    console.log('🔘 [action] team_save');
    await ctx.answerCbQuery();
    await saveTeam(ctx);
  });

  bot.action('team_clear', async (ctx) => {
    console.log('🔘 [action] team_clear');
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