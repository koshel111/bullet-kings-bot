// ============================================
// src/handlers/profile.js - ПОЛНЫЙ ФАЙЛ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');
const { CRAFTABLE_CARDS, getCraftableCardById } = require('../data/craftables');

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

// ✅ РЕЙТИНГ СОСТАВА
function getTeamRating(team) {
  if (!team || team.length === 0) return 0;
  const total = team.reduce((sum, p) => sum + (p.overall || 0), 0);
  return Math.round(total / team.length);
}

// ✅ ЦЕНЫ ЗА ОБМЕН КАРТ
const TRADE_PRICES = {
  'Обычный': { dust: 1, coins: 10 },
  'Редкий': { dust: 3, coins: 30 },
  'Элитный': { dust: 5, coins: 50 },
  'Эпический': { dust: 10, coins: 100 },
  'Легендарный': { dust: 25, coins: 250 },
  'Икона': { dust: 50, coins: 500 }
};

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
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  const teamRating = getTeamRating(currentTeam);
  
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
  
  text += `\n📊 Рейтинг состава: ${teamRating}`;
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
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const goalies = allCards.filter(c => c.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  const teamKeys = new Set(teamForwards.map(p => getCardKey(p)));
  const goalieKey = teamGoalie ? getCardKey(teamGoalie) : null;
  
  let text = '📋 *РЕДАКТИРОВАНИЕ СОСТАВА*\n\n';
  text += 'Нажми на игрока, чтобы добавить или убрать из состава.\n\n';
  
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
  
  const buttons = [];
  
  forwards.forEach((player, index) => {
    ensureCardId(player);
    const key = getCardKey(player);
    const inTeam = teamKeys.has(key);
    const label = inTeam ? `❌ ${player.name}` : `➕ ${player.name}`;
    buttons.push([Markup.button.callback(label, `team_toggle_forward_${index}`)]);
  });
  
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
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const forwards = allCards.filter(c => c.position !== 'G');
  const player = forwards[index];
  
  if (!player) {
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  ensureCardId(player);
  const playerKey = getCardKey(player);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const goalies = currentTeam.filter(p => p.position === 'G');
  const teamKeys = new Set(teamForwards.map(p => getCardKey(p)));
  const inTeam = teamKeys.has(playerKey);
  
  if (inTeam) {
    const newForwards = teamForwards.filter(p => getCardKey(p) !== playerKey);
    data.team = [...goalies, ...newForwards];
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
    saveUsers(users);
    await showEditTeam(ctx);
    return;
  }
  
  if (teamForwards.length >= 5) {
    const sorted = [...teamForwards].sort((a, b) => (a.overall || 0) - (b.overall || 0));
    const weakest = sorted[0];
    
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
  
  const newForwards = [...teamForwards, { ...player, count: 1 }];
  data.team = [...goalies, ...newForwards];
  await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав`);
  
  saveUsers(users);
  await showEditTeam(ctx);
}

// ============================================
// ЗАМЕНА ПОЛЕВОГО ИГРОКА
// ============================================
async function replaceForward(ctx, newPlayerId, oldPlayerId) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  const allCards = data.cards || [];
  
  allCards.forEach(c => ensureCardId(c));
  currentTeam.forEach(c => ensureCardId(c));
  
  const goalies = currentTeam.filter(p => p.position === 'G');
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  
  const newForwards = teamForwards.filter(p => p.id !== oldPlayerId);
  const newPlayer = allCards.find(p => p.id === newPlayerId);
  
  if (!newPlayer) {
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  ensureCardId(newPlayer);
  newForwards.push({ ...newPlayer, count: 1 });
  data.team = [...goalies, ...newForwards];
  
  saveUsers(users);
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
    await ctx.answerCbQuery('❌ Игрок не найден!');
    return;
  }
  
  ensureCardId(player);
  const playerKey = getCardKey(player);
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  const goalieKey = teamGoalie ? getCardKey(teamGoalie) : null;
  
  const inTeam = goalieKey === playerKey;
  
  if (inTeam) {
    data.team = [...teamForwards];
    saveUsers(users);
    await ctx.answerCbQuery(`❌ ${player.name} убран из состава`);
    await showEditTeam(ctx);
    return;
  }
  
  if (teamGoalie) {
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
  
  data.team = [...teamForwards, { ...player, count: 1 }];
  saveUsers(users);
  await ctx.answerCbQuery(`✅ ${player.name} добавлен в состав как вратарь`);
  await showEditTeam(ctx);
}

// ============================================
// ЗАМЕНА ВРАТАРЯ
// ============================================
async function replaceGoalie(ctx, newPlayerId, oldPlayerId) {
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
    await ctx.answerCbQuery('❌ Игрок не найден!');
    await showEditTeam(ctx);
    return;
  }
  
  ensureCardId(newPlayer);
  data.team = [...teamForwards, { ...newPlayer, count: 1 }];
  saveUsers(users);
  
  await ctx.answerCbQuery(`✅ ${newPlayer.name} стал вратарём`);
  await showEditTeam(ctx);
}

// ============================================
// СОХРАНЕНИЕ СОСТАВА
// ============================================
async function saveTeam(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  const currentTeam = data.team || [];
  
  currentTeam.forEach(c => ensureCardId(c));
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  if (teamForwards.length !== 5) {
    await ctx.editMessageText(
      `❌ *Нужно 5 полевых игроков!*\n\nСейчас: ${teamForwards.length}/5\n\nДобавь ещё ${5 - teamForwards.length} полевых игроков.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  if (!teamGoalie) {
    await ctx.editMessageText(
      '❌ *Нужен вратарь!*\n\nДобавь вратаря в состав.',
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  data.teamReady = true;
  saveUsers(users);
  
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
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  data.team = [];
  data.teamReady = false;
  saveUsers(users);
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
  
  if (!data) {
    await ctx.editMessageText('❌ Ошибка! Попробуй /start');
    return;
  }
  
  if (!data.cards) {
    data.cards = [];
    saveUsers(users);
  }
  
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
  const teamRating = getTeamRating(data.team);
  
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
    `💎 Пыль: ${data.dust || 0}\n` +
    `📚 Карт: ${data.cards.length}\n` +
    `📊 Матчей: ${data.matches || 0}\n` +
    `👥 В команде: ${teamForwards.length} полевых, ${teamGoalie ? '1 вратарь' : '0 вратарей'}\n` +
    `📊 Рейтинг состава: ${teamRating}\n` +
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
  
  if (!data || !data.cards) {
    await ctx.editMessageText('❌ Ошибка! Попробуй /start');
    return;
  }
  
  let text = '📚 *КОЛЛЕКЦИЯ*\n\n';
  text += `💎 Пыль: ${data.dust || 0}\n`;
  text += `📊 Карт: ${data.cards.length}\n\n`;
  
  if (data.cards.length === 0) {
    text += '❌ У тебя пока нет карточек!\n';
    text += 'Открой паки в магазине 🛒';
  } else {
    const grouped = {};
    data.cards.forEach(c => {
      const key = c.rarity || 'Обычный';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    
    const rarityOrder = ['Икона', 'Легендарный', 'Эпический', 'Элитный', 'Редкий', 'Обычный'];
    rarityOrder.forEach(rarity => {
      if (grouped[rarity]) {
        text += `\n*${rarity} (${grouped[rarity].length}):*\n`;
        grouped[rarity].forEach(c => {
          const emoji = getRarityEmoji(c.rarity);
          const pos = getPositionEmoji(c.position);
          const count = c.count || 1;
          const craftedMark = c.isCrafted ? ' 🔨' : '';
          text += `  ${emoji} ${pos} ${c.name} (${c.overall} OVR) x${count}${craftedMark}\n`;
          text += `  🆔 \`${c.id}\`\n`;
        });
      }
    });
  }
  
  text += '\n📋 *Команды:*\n';
  text += '`trade_ID_монеты` — обменять на монеты\n';
  text += '`trade_ID_пыль` — обменять на пыль\n';
  text += '`craft_list` — показать доступные карты для крафта\n\n';
  text += '💡 *Важно:* Нельзя обменять последнюю карту!';
  
  const buttons = [
    [Markup.button.callback('🔨 Крафт карт', 'craft_show')],
    [Markup.button.callback('🔙 Назад', 'back')]
  ];
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ============================================
// ОБМЕН КАРТЫ
// ============================================
async function tradeCard(ctx, cardId, currency) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.cards) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  const cardIndex = data.cards.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    await ctx.reply('❌ Карта не найдена!');
    return;
  }
  
  const card = data.cards[cardIndex];
  const prices = TRADE_PRICES[card.rarity];
  
  if (!prices) {
    await ctx.reply('❌ Неизвестная редкость карты!');
    return;
  }
  
  if (!card.count || card.count < 2) {
    await ctx.reply(`❌ У тебя только 1 карта "${card.name}". Нельзя обменять последнюю карту!`);
    return;
  }
  
  let reward = 0;
  let currencyName = '';
  
  if (currency === 'пыль') {
    reward = prices.dust;
    currencyName = 'пыли';
    data.dust = (data.dust || 0) + reward;
  } else if (currency === 'монеты') {
    reward = prices.coins;
    currencyName = 'монет';
    data.coins = (data.coins || 0) + reward;
  } else {
    await ctx.reply('❌ Используй: `trade_ID_монеты` или `trade_ID_пыль`', { parse_mode: 'Markdown' });
    return;
  }
  
  card.count = (card.count || 1) - 1;
  if (card.count <= 0) {
    data.cards.splice(cardIndex, 1);
  }
  
  saveUsers(users);
  
  await ctx.reply(
    `✅ *Обмен выполнен!*\n\n` +
    `🃏 ${card.name} (${card.rarity})\n` +
    `➡️ +${reward} ${currencyName}\n\n` +
    `📊 У тебя осталось ${card.count || 0} карт "${card.name}"`,
    { parse_mode: 'Markdown' }
  );
}

// ============================================
// ПОКАЗ КАРТ ДЛЯ КРАФТА
// ============================================
async function showCraftableCards(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  let text = '🔨 *КРАФТ КАРТ (СЕЗОН 1)*\n\n';
  text += `💎 Твоя пыль: ${data.dust || 0}\n\n`;
  text += '📋 *Доступные карты:*\n\n';
  
  CRAFTABLE_CARDS.forEach(card => {
    const existing = data.cards.find(c => c.name === card.name && c.position === card.position);
    const status = existing ? '❌ УЖЕ ЕСТЬ' : '✅ ДОСТУПЕН';
    const emoji = existing ? '🔒' : '🔓';
    
    text += `${emoji} *${card.name}* ${card.emoji}\n`;
    text += `  📊 ${card.overall} OVR | ${card.rarity} | ${card.league}\n`;
    text += `  💰 ${card.price} пыли | ${status}\n`;
    text += `  🆔 \`craft_${card.id}\`\n\n`;
  });
  
  text += '📋 *Как скрафтить:*\n';
  text += 'Отправь команду `craft_ID` — например `craft_ovechkin_season1`\n\n';
  text += '💡 Сезонные карты можно скрафтить только один раз!';
  
  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// ============================================
// КРАФТ КОНКРЕТНОЙ КАРТЫ
// ============================================
async function craftSpecificCard(ctx, cardId) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.cards) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  const cardTemplate = getCraftableCardById(cardId);
  if (!cardTemplate) {
    await ctx.reply('❌ Карта для крафта не найдена!\n\n📋 Доступные ID:\n' + 
      CRAFTABLE_CARDS.map(c => `  • \`${c.id}\` — ${c.name} (${c.overall} OVR) — ${c.price} пыли`).join('\n'),
      { parse_mode: 'Markdown' }
    );
    return;
  }
  
  const existing = data.cards.find(c => c.name === cardTemplate.name && c.position === cardTemplate.position);
  if (existing) {
    await ctx.reply(`❌ У тебя уже есть карта "${cardTemplate.name}"!\n\n💡 Сезонные карты можно скрафтить только один раз.`);
    return;
  }
  
  if ((data.dust || 0) < cardTemplate.price) {
    await ctx.reply(`❌ Недостаточно пыли!\n\nНужно: ${cardTemplate.price} пыли\nУ тебя: ${data.dust || 0} пыли`);
    return;
  }
  
  data.dust = (data.dust || 0) - cardTemplate.price;
  
  const newCard = {
    name: cardTemplate.name,
    overall: cardTemplate.overall,
    rarity: cardTemplate.rarity,
    position: cardTemplate.position,
    league: cardTemplate.league,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    count: 1,
    isCrafted: true,
    craftedFrom: cardId
  };
  
  data.cards.push(newCard);
  saveUsers(users);
  
  const emoji = cardTemplate.emoji || '🃏';
  const posName = cardTemplate.position === 'G' ? 'Вратарь' : 'Полевой';
  
  await ctx.reply(
    `✅ *Крафт выполнен!*\n\n` +
    `${emoji} *${cardTemplate.name}*\n` +
    `📊 ${cardTemplate.overall} OVR\n` +
    `🏆 ${cardTemplate.rarity}\n` +
    `🏒 ${posName}\n` +
    `🏟️ ${cardTemplate.league}\n\n` +
    `📝 ${cardTemplate.description}\n\n` +
    `💡 Карта добавлена в коллекцию!\n` +
    `💎 Осталось пыли: ${data.dust}`,
    { parse_mode: 'Markdown' }
  );
}

// ============================================
// БОНУС
// ============================================
async function getBonus(ctx) {
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
    await ctx.answerCbQuery();
    await showTeam(ctx);
  });

  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    await showEditTeam(ctx);
  });

  bot.action(/team_toggle_forward_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await toggleForward(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/team_toggle_goalie_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await toggleGoalie(ctx, parseInt(ctx.match[1]));
  });

  bot.action(/team_replace_forward_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await replaceForward(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action(/team_replace_goalie_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await replaceGoalie(ctx, ctx.match[1], ctx.match[2]);
  });

  bot.action('team_save', async (ctx) => {
    await ctx.answerCbQuery();
    await saveTeam(ctx);
  });

  bot.action('team_clear', async (ctx) => {
    await ctx.answerCbQuery();
    await clearTeam(ctx);
  });

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    await showProfile(ctx);
  });

  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    await showCollection(ctx);
  });

  bot.action('craft_show', async (ctx) => {
    await ctx.answerCbQuery();
    await showCraftableCards(ctx);
  });

  bot.action('bonus', async (ctx) => {
    await getBonus(ctx);
  });

  // ✅ ОБРАБОТКА КОМАНД
  bot.hears(/^craft_([a-zA-Z0-9_]+)$/, async (ctx) => {
    const cardId = ctx.match[1];
    if (cardId === 'list') {
      await showCraftableCards(ctx);
      return;
    }
    await craftSpecificCard(ctx, cardId);
  });

  bot.hears(/^trade_([a-zA-Z0-9_]+)_(монеты|пыль)$/, async (ctx) => {
    const cardId = ctx.match[1];
    const currency = ctx.match[2];
    await tradeCard(ctx, cardId, currency);
  });

};