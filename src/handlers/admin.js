// ============================================
// src/handlers/admin.js - АДМИНКА (ПОЛНАЯ)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomCard, getRarityEmoji } = require('../data/players');
const { 
  toggleJerseyActive, 
  toggleArenaActive, 
  getShopStats, 
  getJerseyById, 
  getArenaById, 
  ALL_JERSEYS, 
  ALL_ARENAS,
  getActiveJerseys,
  getActiveArenas
} = require('../data/cosmetics');

const DB_PATH = path.join(__dirname, '../../data/database.json');

const ADMINS = [
  1205576607,
  1603657074,
];

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function isAdmin(userId) {
  return ADMINS.includes(Number(userId));
}

function getPositionName(position) {
  if (position === 'G') return 'Вратарь';
  if (position === 'LW' || position === 'RW' || position === 'C') return 'Нападающий';
  if (position === 'D') return 'Защитник';
  return 'Полевой';
}

function openPack(packType) {
  const weights = {
    "basic": { "Обычный": 45, "Редкий": 30, "Элитный": 18, "Эпический": 6.9, "Легендарный": 0.1, "Икона": 0 },
    "premium": { "Обычный": 0, "Редкий": 30, "Элитный": 35, "Эпический": 25, "Легендарный": 9, "Икона": 1 },
    "legendary": { "Обычный": 0, "Редкий": 0, "Элитный": 15, "Эпический": 35, "Легендарный": 40, "Икона": 10 },
    "seasonal": { "Обычный": 0, "Редкий": 0, "Элитный": 5, "Эпический": 10, "Легендарный": 50, "Икона": 35 },
  };
  
  const packWeights = weights[packType] || weights.basic;
  const total = Object.values(packWeights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  let selectedRarity = "Обычный";
  for (const [rarity, weight] of Object.entries(packWeights)) {
    random -= weight;
    if (random <= 0) { selectedRarity = rarity; break; }
  }
  
  const { PLAYERS } = require('../data/players');
  const filtered = PLAYERS.filter(p => p.rarity === selectedRarity);
  if (filtered.length === 0) return PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

async function sendPackNotification(ctx, userId, packType, count = 1) {
  try {
    const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный", seasonal: "Сезонный" };
    const text = count > 1 
      ? `📦 *Вам выдан ${packNames[packType]} пак (x${count})!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`
      : `📦 *Вам выдан ${packNames[packType]} пак!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`;
    await ctx.telegram.sendMessage(Number(userId), text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([ [Markup.button.callback(`📦 Открыть ${packNames[packType]} пак`, `open_pack_${packType}_${userId}`)] ])
    });
  } catch (e) { console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message); }
}

async function sendSeasonalPackNotification(ctx, userId, count = 1) {
  try {
    const text = count > 1 
      ? `🎁 *Вам выдан СЕЗОННЫЙ ПАК (x${count})!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`
      : `🎁 *Вам выдан СЕЗОННЫЙ ПАК!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`;
    await ctx.telegram.sendMessage(Number(userId), text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([ [Markup.button.callback("🎁 Открыть сезонный пак", "open_seasonal_" + userId)] ])
    });
  } catch (e) { console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message); }
}

async function sendCoinsNotification(ctx, userId, amount) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "💰 *Вам выдали монеты!*\n\n👑 Выдал: администратор\n⭐ Количество: " + amount + " монет\n\n💡 Монеты уже добавлены на счёт!",
      { parse_mode: "Markdown" }
    );
  } catch (e) { console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message); }
}

async function sendCrystalsNotification(ctx, userId, amount) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "💎 *Вам выдали кристаллы!*\n\n👑 Выдал: администратор\n💎 Количество: " + amount + " кристаллов\n\n💡 Кристаллы уже добавлены на счёт!",
      { parse_mode: "Markdown" }
    );
  } catch (e) { console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message); }
}

async function sendPremiumNotification(ctx, userId) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "💎 *Вам выдан ПРЕМИУМ боевого пропуска!*\n\n👑 Выдал: администратор\n\n📋 *Премиум даёт:*\n" +
      "  ✅ В 2 раза больше наград\n" +
      "  ✅ Постоянные формы и арены\n" +
      "  ✅ Улучшенные паки\n" +
      "  ✅ Семён Кошелев 96 OVR\n" +
      "  ✅ Сезонный пак на 30 уровне",
      { parse_mode: "Markdown" }
    );
  } catch (e) { console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message); }
}

async function openPackByButton(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  if (!data) { await ctx.editMessageText("❌ Ошибка! Попробуй /start"); return; }
  const parts = ctx.match[1].split('_');
  const packType = parts[0];
  if (!data.packs || !data.packs[packType] || data.packs[packType].length === 0) {
    await ctx.editMessageText("❌ У тебя нет таких паков!"); return;
  }
  data.packs[packType].shift();
  if (data.packs[packType].length === 0) delete data.packs[packType];
  const card = openPack(packType);
  const cardWithId = { ...card, id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
  const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
  if (existing) existing.count = (existing.count || 1) + 1;
  else data.cards.push(cardWithId);
  saveUsers(users);
  const emoji = getRarityEmoji(cardWithId.rarity);
  const posName = getPositionName(cardWithId.position);
  const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный", seasonal: "Сезонный" };
  const remaining = data.packs?.[packType]?.length || 0;
  let text = `🎉 *${packNames[packType]} пак открыт!*\n\n📋 *Карта:*\n  ${emoji} *${cardWithId.name}*\n  🏒 Амплуа: ${posName}\n  📊 Рейтинг: ${cardWithId.overall} OVR\n  🏆 Редкость: ${cardWithId.rarity}\n\n💡 Карта добавлена в коллекцию!`;
  if (remaining > 0) text += `\n\n📦 Осталось паков: ${remaining}`;
  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function openMultiplePacks(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  if (!data) { await ctx.editMessageText("❌ Ошибка! Попробуй /start"); return; }
  const parts = ctx.match[1].split('_');
  const packType = parts[0];
  if (!data.packs || !data.packs[packType] || data.packs[packType].length === 0) {
    await ctx.editMessageText("❌ У тебя нет таких паков!"); return;
  }
  const totalPacks = data.packs[packType].length;
  const results = [];
  for (let i = 0; i < totalPacks; i++) results.push(openPack(packType));
  delete data.packs[packType];
  for (const card of results) {
    const cardWithId = { ...card, id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
    const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
    if (existing) existing.count = (existing.count || 1) + 1;
    else data.cards.push(cardWithId);
  }
  saveUsers(users);
  const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный", seasonal: "Сезонный" };
  let text = `🎉 *Открыто ${totalPacks} ${packNames[packType]} паков!*\n\n📋 *Полученные карты:*\n\n`;
  results.forEach((card, index) => {
    const emoji = getRarityEmoji(card.rarity);
    const posName = getPositionName(card.position);
    text += `${index+1}. ${emoji} *${card.name}* - ${posName} (${card.overall} OVR) - ${card.rarity}\n`;
  });
  text += `\n💡 Все карты добавлены в коллекцию!`;
  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function openSeasonalPackByButton(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  if (!data) { await ctx.editMessageText("❌ Ошибка! Попробуй /start"); return; }
  if (!data.seasonal_packs || data.seasonal_packs.length === 0) {
    await ctx.editMessageText("❌ У тебя нет сезонных паков!"); return;
  }
  const cardData = data.seasonal_packs[0];
  data.seasonal_packs.shift();
  const cardWithId = { name: cardData.name, overall: cardData.overall || 85, rarity: cardData.rarity || "Легендарная", position: cardData.position || "C", id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
  const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
  if (existing) existing.count = (existing.count || 1) + 1;
  else data.cards.push(cardWithId);
  saveUsers(users);
  const emoji = getRarityEmoji(cardWithId.rarity);
  const posName = getPositionName(cardWithId.position);
  const remaining = data.seasonal_packs?.length || 0;
  let text = "🎉 *СЕЗОННЫЙ ПАК ОТКРЫТ!*\n\n📋 *Карта:*\n  " + emoji + " *" + cardWithId.name + "*\n  🏒 Амплуа: " + posName + "\n  📊 Рейтинг: " + cardWithId.overall + " OVR\n  🏆 Редкость: " + cardWithId.rarity + "\n\n💡 Карта добавлена в коллекцию!";
  if (remaining > 0) text += `\n\n📦 Осталось неоткрытых паков: ${remaining}`;
  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function showInventory(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  if (!data) { await ctx.reply("❌ Ошибка! Попробуй /start"); return; }
  let text = "📦 *ИНВЕНТАРЬ*\n\n";
  let hasPacks = false;
  const buttons = [];
  const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный" };
  for (const [type, name] of Object.entries(packNames)) {
    if (data.packs && data.packs[type] && data.packs[type].length > 0) {
      const count = data.packs[type].length;
      text += `📦 ${name} пак: ${count} шт.\n`;
      buttons.push([Markup.button.callback(`📦 Открыть ${name} (${count})`, `open_pack_${type}_${userId}`)]);
      buttons.push([Markup.button.callback(`📦 Открыть все ${name} (${count})`, `open_all_packs_${type}_${userId}`)]);
      hasPacks = true;
    }
  }
  if (data.seasonal_packs && data.seasonal_packs.length > 0) {
    const count = data.seasonal_packs.length;
    text += `🎁 Сезонный пак: ${count} шт.\n`;
    buttons.push([Markup.button.callback(`🎁 Открыть сезонный (${count})`, `open_seasonal_${userId}`)]);
    hasPacks = true;
  }
  if (!hasPacks) {
    text += "❌ У тебя нет паков!\n\n💡 Паки можно получить:\n• За победы в матчах\n• Через боевой пропуск\n• От администратора";
  }
  buttons.push([Markup.button.callback("🔙 Назад", "back")]);
  await ctx.reply(text, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
}

function getAllCardsStats() {
  const users = getUsers();
  const cardStats = {};
  
  Object.values(users).forEach(data => {
    if (!data.cards) return;
    data.cards.forEach(card => {
      const key = card.name + "_" + card.position;
      if (!cardStats[key]) {
        cardStats[key] = {
          name: card.name,
          position: card.position,
          overall: card.overall,
          rarity: card.rarity,
          count: 0,
          users: []
        };
      }
      cardStats[key].count += (card.count || 1);
    });
  });
  
  return Object.values(cardStats);
}

async function showAllCards(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  const cards = getAllCardsStats();
  cards.sort((a, b) => b.count - a.count);
  
  let text = "🃏 *ВСЕ КАРТЫ В ИГРЕ*\n\n";
  text += `📊 Всего уникальных карт: ${cards.length}\n\n`;
  
  const buttons = [];
  let page = 0;
  const pageSize = 20;
  const totalPages = Math.ceil(cards.length / pageSize);
  
  const start = page * pageSize;
  const end = Math.min(start + pageSize, cards.length);
  
  for (let i = start; i < end; i++) {
    const card = cards[i];
    const emoji = getRarityEmoji(card.rarity);
    const posName = getPositionName(card.position);
    text += `${i+1}. ${emoji} ${card.name} — ${posName} (${card.overall} OVR)\n`;
    text += `   📦 Владельцев: ${card.count} шт.\n\n`;
  }
  
  text += `\n📄 Страница ${page+1}/${totalPages}`;
  
  const navButtons = [];
  if (page > 0) navButtons.push(Markup.button.callback("⬅️", "cards_page_prev"));
  if (page < totalPages - 1) navButtons.push(Markup.button.callback("➡️", "cards_page_next"));
  if (navButtons.length > 0) buttons.push(navButtons);
  
  buttons.push([Markup.button.callback("🔙 Назад", "admin_panel")]);
  
  ctx.session = ctx.session || {};
  ctx.session.cardsPage = page;
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons)
  });
}

async function showCosmeticsManagement(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  const stats = getShopStats();
  const text = 
    "🏪 *Управление магазином косметики*\n\n" +
    "📊 *Статистика:*\n" +
    "🎽 Форм: " + stats.activeJerseys + "/" + stats.totalJerseys + " активных\n" +
    "🏟️ Арен: " + stats.activeArenas + "/" + stats.totalArenas + " активных\n\n" +
    "*Выбери категорию:*";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🎽 Формы", "admin_cosmetics_jerseys")],
      [Markup.button.callback("🏟️ Арены", "admin_cosmetics_arenas")],
      [Markup.button.callback("🔙 Назад", "admin_panel")],
    ])
  });
}

async function showJerseysManagement(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  const allJerseys = ALL_JERSEYS;
  const activeJerseys = getActiveJerseys();
  
  let text = "🎽 *Управление формами*\n\n";
  
  text += "✅ *В магазине:*\n";
  if (activeJerseys.length === 0) {
    text += "  Нет активных форм\n";
  } else {
    activeJerseys.forEach(j => {
      text += `  • ${j.id} — ${j.name} (${j.rarity})\n`;
    });
  }
  
  text += "\n📋 *Все формы:*\n";
  allJerseys.forEach(j => {
    const status = j.active !== false ? "✅" : "❌";
    text += `  ${status} ${j.id} — ${j.name} (${j.rarity})\n`;
  });
  
  text += "\n📋 *Команды:*\n";
  text += "`shop_add_form ID` — добавить в магазин\n";
  text += "`shop_remove_form ID` — убрать из магазина\n";
  text += "📌 *Пример:* `shop_add_form csk`\n";
  text += "📌 *Пример:* `shop_remove_form csk`\n";
  text += "\n🔄 Введи команду в чат!";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🎽 Список ID форм", "admin_cosmetics_jerseys_list")],
      [Markup.button.callback("🔙 Назад", "admin_cosmetics")],
    ])
  });
}

async function showArenasManagement(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  const allArenas = ALL_ARENAS;
  const activeArenas = getActiveArenas();
  
  let text = "🏟️ *Управление аренами*\n\n";
  
  text += "✅ *В магазине:*\n";
  if (activeArenas.length === 0) {
    text += "  Нет активных арен\n";
  } else {
    activeArenas.forEach(a => {
      text += `  • ${a.id} — ${a.name} (${a.rarity})\n`;
    });
  }
  
  text += "\n📋 *Все арены:*\n";
  allArenas.forEach(a => {
    const status = a.active !== false ? "✅" : "❌";
    text += `  ${status} ${a.id} — ${a.name} (${a.rarity})\n`;
  });
  
  text += "\n📋 *Команды:*\n";
  text += "`shop_add_arena ID` — добавить в магазин\n";
  text += "`shop_remove_arena ID` — убрать из магазина\n";
  text += "📌 *Пример:* `shop_add_arena msg`\n";
  text += "📌 *Пример:* `shop_remove_arena msg`\n";
  text += "\n🔄 Введи команду в чат!";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🏟️ Список ID арен", "admin_cosmetics_arenas_list")],
      [Markup.button.callback("🔙 Назад", "admin_cosmetics")],
    ])
  });
}

async function showJerseysList(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  let text = "🎽 *Список ID форм для команд:*\n\n";
  ALL_JERSEYS.forEach(j => {
    const status = j.active !== false ? "✅" : "❌";
    text += `${status} \`${j.id}\` — ${j.name}\n`;
  });
  
  text += "\n📋 *Команды:*\n";
  text += "`shop_add_form ID` — добавить в магазин\n";
  text += "`shop_remove_form ID` — убрать из магазина\n";
  text += "📌 *Пример:* `shop_add_form csk`";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Назад", "admin_cosmetics_jerseys")],
    ])
  });
}

async function showArenasList(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  
  let text = "🏟️ *Список ID арен для команд:*\n\n";
  ALL_ARENAS.forEach(a => {
    const status = a.active !== false ? "✅" : "❌";
    text += `${status} \`${a.id}\` — ${a.name}\n`;
  });
  
  text += "\n📋 *Команды:*\n";
  text += "`shop_add_arena ID` — добавить в магазин\n";
  text += "`shop_remove_arena ID` — убрать из магазина\n";
  text += "📌 *Пример:* `shop_add_arena msg`";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Назад", "admin_cosmetics_arenas")],
    ])
  });
}

async function showAdminMenu(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) { await ctx.reply("⛔ Доступ запрещён!"); return; }
  
  const users = getUsers();
  const totalUsers = Object.keys(users).length;
  let totalCards = 0, totalMatches = 0, totalCoins = 0, totalCrystals = 0;
  Object.values(users).forEach(data => {
    totalCards += data.cards?.length || 0;
    totalMatches += data.matches || 0;
    totalCoins += data.coins || 0;
    totalCrystals += data.crystals || 0;
  });
  
  const text = 
    "👑 *АДМИН-ПАНЕЛЬ*\n\n" +
    "📊 *СТАТИСТИКА:*\n" +
    "👥 Пользователей: " + totalUsers + "\n" +
    "📚 Всего карт: " + totalCards + "\n" +
    "⚔️ Матчей: " + totalMatches + "\n" +
    "⭐ Монет в игре: " + totalCoins + "\n" +
    "💎 Кристаллов: " + totalCrystals + "\n\n" +
    "*Выбери действие:*\n\n" +
    "📋 *Формат команд:*\n" +
    "💰 `coins_ID_СУММА` — монеты\n" +
    "💎 `crystals_ID_СУММА` — кристаллы\n" +
    "🃏 `card_ID_Название` — карта\n" +
    "📦 `pack_ID_тип_количество` — паки\n" +
    "🎁 `seasonal_ID_количество` — сезонные паки\n" +
    "🎖️ `skip_ID_уровней` — пропуск уровней\n" +
    "💎 `premium_ID` — выдать премиум\n" +
    "📢 `broadcast_ID_сообщение` — рассылка\n\n" +
    "🌐 `all` — вместо ID для всех пользователей";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("💰 Выдать монеты", "admin_coins")],
      [Markup.button.callback("💎 Выдать кристаллы", "admin_crystals")],
      [Markup.button.callback("🃏 Выдать карту", "admin_card")],
      [Markup.button.callback("📦 Выдать паки", "admin_packs")],
      [Markup.button.callback("🎁 Сезонный пак", "admin_season")],
      [Markup.button.callback("🎖️ Пропуск уровней", "admin_battlepass")],
      [Markup.button.callback("💎 Премиум пропуска", "admin_premium")],
      [Markup.button.callback("🃏 Все карты", "admin_all_cards")],
      [Markup.button.callback("🏪 Косметика", "admin_cosmetics")],
      [Markup.button.callback("📢 Рассылка", "admin_broadcast")],
      [Markup.button.callback("🗑️ Очистить БД", "admin_clear_db")],
      [Markup.button.callback("🔙 Главное меню", "back")],
    ])
  });
}

module.exports = (bot) => {
  
  bot.command("admin", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) { await ctx.reply("⛔ Доступ запрещён!"); return; }
    await ctx.reply("👑 Добро пожаловать в админ-панель!");
    await showAdminMenu(ctx);
  });

  bot.action(/open_pack_(.+)_(.+)/, async (ctx) => { await openPackByButton(ctx); });
  bot.action(/open_all_packs_(.+)_(.+)/, async (ctx) => { await openMultiplePacks(ctx); });
  bot.action(/open_seasonal_(.+)/, async (ctx) => { await openSeasonalPackByButton(ctx); });
  bot.action("inventory", async (ctx) => { await ctx.answerCbQuery(); await showInventory(ctx); });
  bot.action("admin_panel", async (ctx) => { await ctx.answerCbQuery(); await showAdminMenu(ctx); });

  bot.action("admin_cosmetics", async (ctx) => {
    await ctx.answerCbQuery();
    await showCosmeticsManagement(ctx);
  });

  bot.action("admin_cosmetics_jerseys", async (ctx) => {
    await ctx.answerCbQuery();
    await showJerseysManagement(ctx);
  });

  bot.action("admin_cosmetics_arenas", async (ctx) => {
    await ctx.answerCbQuery();
    await showArenasManagement(ctx);
  });

  bot.action("admin_cosmetics_jerseys_list", async (ctx) => {
    await ctx.answerCbQuery();
    await showJerseysList(ctx);
  });

  bot.action("admin_cosmetics_arenas_list", async (ctx) => {
    await ctx.answerCbQuery();
    await showArenasList(ctx);
  });

  bot.action("admin_coins", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💰 *Выдать монеты*\n\n📋 *Формат:* `coins_ID_СУММА`\n\n📌 *Примеры:*\n`coins_123456789_500` — пользователю 500 монет\n`coins_all_100` — всем по 100 монет",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_crystals", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💎 *Выдать кристаллы*\n\n📋 *Формат:* `crystals_ID_СУММА`\n\n📌 *Примеры:*\n`crystals_123456789_50` — пользователю 50 кристаллов\n`crystals_all_10` — всем по 10 кристаллов",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_card", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🃏 *Выдать карту*\n\n📋 *Формат:* `card_ID_Название_карты`\n\n📌 *Пример:* `card_123456789_Александр_Овечкин`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_packs", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📦 *Выдать паки*\n\n📋 *Формат:* `pack_ID_тип_количество`\n\n📌 *Типы:* basic, premium, legendary\n\n📌 *Пример:* `pack_123456789_basic_3`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_season", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎁 *Сезонный пак*\n\n📋 *Формат:* `seasonal_ID_количество`\n\n📌 *Пример:* `seasonal_123456789_3`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_battlepass", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎖️ *Пропуск уровней боевого пропуска*\n\n📋 *Формат:* `skip_ID_уровней`\n\n📌 *Примеры:*\n`skip_123456789_5` — пользователю 5 уровней\n`skip_all_10` — всем 10 уровней\n`skip_all_30` — всем 30 уровней",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_premium", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💎 *Выдать премиум боевого пропуска*\n\n📋 *Формат:* `premium_ID`\n\n📌 *Примеры:*\n`premium_123456789` — пользователю премиум\n`premium_all` — всем премиум",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_all_cards", async (ctx) => {
    await ctx.answerCbQuery();
    await showAllCards(ctx);
  });

  bot.action("admin_broadcast", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📢 *Рассылка*\n\n📋 *Формат:* `broadcast_ID_сообщение`\n\n📌 *Пример:* `broadcast_all_Привет_всем!`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_clear_db", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply("⚠️ *Очистить БД?*\n\nЭто удалит ВСЕХ пользователей!\nДействие необратимо!", {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ ДА, УДАЛИТЬ", "admin_confirm_clear")],
        [Markup.button.callback("❌ НЕТ, ОТМЕНА", "admin_panel")],
      ])
    });
  });

  bot.action("admin_confirm_clear", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.editMessageText("✅ База данных очищена!");
    await ctx.reply("✅ Готово!");
  });

  // ============================================
  // ОБРАБОТКА ТЕКСТОВЫХ КОМАНД
  // ============================================
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    const text = ctx.text.trim();
    const parts = text.split("_");
    
    // ============================================
    // 1. МОНЕТЫ: coins_ID_СУММА
    // ============================================
    if (text.startsWith("coins_")) {
      if (parts.length === 3) {
        const target = parts[1];
        const amount = parseInt(parts[2]);
        if (!isNaN(amount) && amount > 0) {
          const users = getUsers();
          if (target === "all") {
            const ids = Object.keys(users);
            ids.forEach(id => { users[id].coins = (users[id].coins || 0) + amount; });
            saveUsers(users);
            for (const id of ids) await sendCoinsNotification(ctx, id, amount);
            await ctx.reply("✅ *Результат:* Выдано " + amount + "⭐ всем " + ids.length + " пользователям!");
            return;
          } else if (users[target]) {
            users[target].coins = (users[target].coins || 0) + amount;
            saveUsers(users);
            await sendCoinsNotification(ctx, target, amount);
            await ctx.reply("✅ *Результат:* Выдано " + amount + "⭐ пользователю `" + target + "`!", { parse_mode: "Markdown" });
            return;
          } else {
            await ctx.reply("❌ Пользователь `" + target + "` не найден!", { parse_mode: "Markdown" });
            return;
          }
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `coins_ID_СУММА`");
      return;
    }
    
    // ============================================
    // 2. КРИСТАЛЛЫ: crystals_ID_СУММА
    // ============================================
    if (text.startsWith("crystals_")) {
      if (parts.length === 3) {
        const target = parts[1];
        const amount = parseInt(parts[2]);
        if (!isNaN(amount) && amount > 0) {
          const users = getUsers();
          if (target === "all") {
            const ids = Object.keys(users);
            ids.forEach(id => { users[id].crystals = (users[id].crystals || 0) + amount; });
            saveUsers(users);
            for (const id of ids) await sendCrystalsNotification(ctx, id, amount);
            await ctx.reply("✅ *Результат:* Выдано " + amount + "💎 всем " + ids.length + " пользователям!");
            return;
          } else if (users[target]) {
            users[target].crystals = (users[target].crystals || 0) + amount;
            saveUsers(users);
            await sendCrystalsNotification(ctx, target, amount);
            await ctx.reply("✅ *Результат:* Выдано " + amount + "💎 пользователю `" + target + "`!", { parse_mode: "Markdown" });
            return;
          } else {
            await ctx.reply("❌ Пользователь `" + target + "` не найден!", { parse_mode: "Markdown" });
            return;
          }
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `crystals_ID_СУММА`");
      return;
    }
    
    // ============================================
    // 3. КАРТА: card_ID_Название
    // ============================================
    if (text.startsWith("card_")) {
      if (parts.length >= 3) {
        const target = parts[1];
        const cardName = parts.slice(2).join(" ");
        const users = getUsers();
        const targets = target === "all" ? Object.keys(users) : [target];
        const { PLAYERS } = require('../data/players');
        const card = PLAYERS.find(p => p.name.toLowerCase().includes(cardName.toLowerCase()));
        if (!card) { await ctx.reply("❌ Карта не найдена!"); return; }
        let successCount = 0;
        for (const id of targets) {
          if (!users[id]) continue;
          const cardWithId = { ...card, id: Date.now().toString() + Math.random().toString(36).substr(2, 6), count: 1 };
          const existing = users[id].cards.find(c => c.name === card.name && c.position === card.position);
          if (existing) existing.count = (existing.count || 1) + 1;
          else users[id].cards.push(cardWithId);
          successCount++;
        }
        saveUsers(users);
        const emoji = getRarityEmoji(card.rarity);
        await ctx.reply("✅ *Результат:* Выдана карта " + emoji + " " + card.name + " (" + card.rarity + ") " + (target === "all" ? "всем " + successCount + " пользователям!" : "пользователю `" + target + "`!"), { parse_mode: "Markdown" });
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `card_ID_Название_карты`");
      return;
    }
    
    // ============================================
    // 4. ПАКИ: pack_ID_тип_количество
    // ============================================
    if (text.startsWith("pack_")) {
      if (parts.length === 4) {
        const target = parts[1];
        const packType = parts[2];
        const count = parseInt(parts[3]);
        if (!["basic", "premium", "legendary"].includes(packType)) {
          await ctx.reply("❌ Неправильный тип пака! Доступны: basic, premium, legendary");
          return;
        }
        if (isNaN(count) || count < 1 || count > 10) {
          await ctx.reply("❌ Количество должно быть от 1 до 10!");
          return;
        }
        const users = getUsers();
        const targets = target === "all" ? Object.keys(users) : [target];
        let successCount = 0;
        for (const id of targets) {
          if (!users[id]) continue;
          if (!users[id].packs) users[id].packs = {};
          if (!users[id].packs[packType]) users[id].packs[packType] = [];
          for (let i = 0; i < count; i++) users[id].packs[packType].push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + "_" + i });
          await sendPackNotification(ctx, id, packType, count);
          successCount++;
        }
        saveUsers(users);
        const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный" };
        await ctx.reply("✅ *Результат:* " + packNames[packType] + " пак выдан " + successCount + " пользователям по " + count + " шт!");
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `pack_ID_тип_количество`");
      return;
    }
    
    // ============================================
    // 5. СЕЗОННЫЙ ПАК: seasonal_ID_количество
    // ============================================
    if (text.startsWith("seasonal_")) {
      if (parts.length === 3) {
        const target = parts[1];
        const count = parseInt(parts[2]);
        if (isNaN(count) || count < 1 || count > 10) {
          await ctx.reply("❌ Количество должно быть от 1 до 10!");
          return;
        }
        const users = getUsers();
        const targets = target === "all" ? Object.keys(users) : [target];
        let successCount = 0;
        for (const id of targets) {
          if (!users[id]) continue;
          if (!users[id].seasonal_packs) users[id].seasonal_packs = [];
          for (let i = 0; i < count; i++) {
            const card = { name: "Сезонная карта", overall: 85, rarity: "Легендарная", position: "C" };
            users[id].seasonal_packs.push({ name: card.name, overall: card.overall, rarity: card.rarity, position: card.position, id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + "_" + i });
          }
          await sendSeasonalPackNotification(ctx, id, count);
          successCount++;
        }
        saveUsers(users);
        await ctx.reply("✅ *Результат:* Сезонный пак выдан " + successCount + " пользователям по " + count + " шт!");
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `seasonal_ID_количество`");
      return;
    }
    
    // ============================================
    // 6. ПРОПУСК УРОВНЕЙ: skip_ID_уровней
    // ============================================
    if (text.startsWith("skip_")) {
      if (parts.length === 3) {
        const target = parts[1];
        const levels = parseInt(parts[2]);
        if (isNaN(levels) || levels < 1 || levels > 30) {
          await ctx.reply("❌ Количество уровней должно быть от 1 до 30!");
          return;
        }
        const users = getUsers();
        if (target === "all") {
          const ids = Object.keys(users);
          let count = 0;
          let levelsInfo = [];
          for (const id of ids) {
            if (!users[id]) continue;
            const currentXp = users[id].battlepass_xp || 0;
            const oldLevel = Math.floor(currentXp / 20);
            users[id].battlepass_xp = currentXp + (levels * 20);
            const newLevel = Math.floor(users[id].battlepass_xp / 20);
            if (newLevel > oldLevel) {
              const { autoClaimRewards } = require('./battlepass');
              const isPremium = users[id].battlepass_premium || 0;
              await autoClaimRewards(users[id], newLevel, isPremium);
            }
            levelsInfo.push({ id, oldLevel, newLevel });
            count++;
          }
          saveUsers(users);
          
          let report = `✅ *Результат:* Пропущено ${levels} уровней для всех ${count} пользователей!\n\n📊 *Детали:*\n`;
          levelsInfo.forEach(info => {
            report += `👤 ${info.id}: ${info.oldLevel} → ${info.newLevel} уровень\n`;
          });
          await ctx.reply(report, { parse_mode: "Markdown" });
          return;
        } else if (users[target]) {
          const currentXp = users[target].battlepass_xp || 0;
          const oldLevel = Math.floor(currentXp / 20);
          users[target].battlepass_xp = currentXp + (levels * 20);
          const newLevel = Math.floor(users[target].battlepass_xp / 20);
          if (newLevel > oldLevel) {
            const { autoClaimRewards } = require('./battlepass');
            const isPremium = users[target].battlepass_premium || 0;
            await autoClaimRewards(users[target], newLevel, isPremium);
          }
          saveUsers(users);
          await ctx.reply("✅ *Результат:* Пропущено " + levels + " уровней для пользователя `" + target + "`!\n📊 " + oldLevel + " → " + newLevel + " уровень", { parse_mode: "Markdown" });
          return;
        } else {
          await ctx.reply("❌ Пользователь `" + target + "` не найден!", { parse_mode: "Markdown" });
          return;
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `skip_ID_уровней`");
      return;
    }
    
    // ============================================
    // 7. ПРЕМИУМ: premium_ID
    // ============================================
    if (text.startsWith("premium_")) {
      if (parts.length === 2) {
        const target = parts[1];
        const users = getUsers();
        if (target === "all") {
          const ids = Object.keys(users);
          let count = 0;
          let premiumList = [];
          for (const id of ids) {
            if (!users[id]) continue;
            users[id].battlepass_premium = 1;
            const xp = users[id].battlepass_xp || 0;
            const { getLevelByXP, autoClaimRewards } = require('./battlepass');
            const { level } = getLevelByXP(xp);
            await autoClaimRewards(users[id], level, true);
            await sendPremiumNotification(ctx, id);
            premiumList.push(id);
            count++;
          }
          saveUsers(users);
          
          let report = `✅ *Результат:* Премиум выдан всем ${count} пользователям!\n\n📊 *Список:*\n`;
          premiumList.forEach(id => {
            report += `👤 ${id}\n`;
          });
          await ctx.reply(report, { parse_mode: "Markdown" });
          return;
        } else if (users[target]) {
          users[target].battlepass_premium = 1;
          const xp = users[target].battlepass_xp || 0;
          const { getLevelByXP, autoClaimRewards } = require('./battlepass');
          const { level } = getLevelByXP(xp);
          await autoClaimRewards(users[target], level, true);
          await sendPremiumNotification(ctx, target);
          saveUsers(users);
          await ctx.reply("✅ *Результат:* Премиум выдан пользователю `" + target + "`!", { parse_mode: "Markdown" });
          return;
        } else {
          await ctx.reply("❌ Пользователь `" + target + "` не найден!", { parse_mode: "Markdown" });
          return;
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `premium_ID`");
      return;
    }
    
    // ============================================
    // 8. РАССЫЛКА: broadcast_ID_сообщение
    // ============================================
    if (text.startsWith("broadcast_")) {
      if (parts.length >= 3) {
        const target = parts[1];
        const message = parts.slice(2).join(" ");
        const users = getUsers();
        if (target === "all") {
          let sent = 0;
          for (const [id] of Object.entries(users)) {
            try {
              await ctx.telegram.sendMessage(Number(id), "📢 *РАССЫЛКА*\n\n" + message, { parse_mode: "Markdown" });
              sent++;
            } catch (e) {}
            await new Promise(r => setTimeout(r, 100));
          }
          await ctx.reply("✅ *Результат:* Рассылка отправлена " + sent + " пользователям!");
          return;
        } else if (users[target]) {
          try {
            await ctx.telegram.sendMessage(Number(target), "📢 *РАССЫЛКА*\n\n" + message, { parse_mode: "Markdown" });
            await ctx.reply("✅ *Результат:* Сообщение отправлено пользователю `" + target + "`!", { parse_mode: "Markdown" });
            return;
          } catch (e) {
            await ctx.reply("❌ Не удалось отправить сообщение пользователю `" + target + "`", { parse_mode: "Markdown" });
            return;
          }
        } else {
          await ctx.reply("❌ Пользователь `" + target + "` не найден!", { parse_mode: "Markdown" });
          return;
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `broadcast_ID_сообщение`");
      return;
    }
    
    // ============================================
    // 9. УПРАВЛЕНИЕ МАГАЗИНОМ КОСМЕТИКИ
    // ============================================
    if (text.startsWith("shop_add_form ")) {
      const id = text.replace("shop_add_form ", "").trim();
      const item = getJerseyById(id);
      if (!item) { await ctx.reply("❌ Форма с ID `" + id + "` не найдена!"); return; }
      if (item.active !== false) { await ctx.reply("❌ Форма `" + item.name + "` уже активна в магазине!"); return; }
      toggleJerseyActive(id);
      await ctx.reply("✅ Форма `" + item.name + "` добавлена в магазин!\n📌 Теперь она будет появляться в ротации.");
      return;
    }
    
    if (text.startsWith("shop_remove_form ")) {
      const id = text.replace("shop_remove_form ", "").trim();
      const item = getJerseyById(id);
      if (!item) { await ctx.reply("❌ Форма с ID `" + id + "` не найдена!"); return; }
      if (item.active === false) { await ctx.reply("❌ Форма `" + item.name + "` уже неактивна в магазине!"); return; }
      toggleJerseyActive(id);
      await ctx.reply("✅ Форма `" + item.name + "` убрана из магазина!");
      return;
    }
    
    if (text.startsWith("shop_add_arena ")) {
      const id = text.replace("shop_add_arena ", "").trim();
      const item = getArenaById(id);
      if (!item) { await ctx.reply("❌ Арена с ID `" + id + "` не найдена!"); return; }
      if (item.active !== false) { await ctx.reply("❌ Арена `" + item.name + "` уже активна в магазине!"); return; }
      toggleArenaActive(id);
      await ctx.reply("✅ Арена `" + item.name + "` добавлена в магазин!\n📌 Теперь она будет появляться в ротации.");
      return;
    }
    
    if (text.startsWith("shop_remove_arena ")) {
      const id = text.replace("shop_remove_arena ", "").trim();
      const item = getArenaById(id);
      if (!item) { await ctx.reply("❌ Арена с ID `" + id + "` не найдена!"); return; }
      if (item.active === false) { await ctx.reply("❌ Арена `" + item.name + "` уже неактивна в магазине!"); return; }
      toggleArenaActive(id);
      await ctx.reply("✅ Арена `" + item.name + "` убрана из магазина!");
      return;
    }
    
    if (text === "shop_list") {
      let text2 = "📋 *Все предметы косметики*\n\n";
      text2 += "🎽 *Формы:*\n";
      ALL_JERSEYS.forEach(j => {
        text2 += (j.active !== false ? "✅" : "❌") + " `" + j.id + "` — " + j.name + " (" + j.rarity + ")\n";
      });
      text2 += "\n🏟️ *Арены:*\n";
      ALL_ARENAS.forEach(a => {
        text2 += (a.active !== false ? "✅" : "❌") + " `" + a.id + "` — " + a.name + " (" + a.rarity + ")\n";
      });
      await ctx.reply(text2, { parse_mode: "Markdown" });
      return;
    }
    
    // ============================================
    // Если ничего не подошло
    // ============================================
    await ctx.reply("❌ Неизвестная команда!\n\n📋 *Доступные команды:*\n" +
      "`coins_ID_СУММА` — монеты\n" +
      "`crystals_ID_СУММА` — кристаллы\n" +
      "`card_ID_Название` — карта\n" +
      "`pack_ID_тип_количество` — паки\n" +
      "`seasonal_ID_количество` — сезонные паки\n" +
      "`skip_ID_уровней` — пропуск уровней\n" +
      "`premium_ID` — выдать премиум\n" +
      "`broadcast_ID_сообщение` — рассылка\n" +
      "`shop_add_form ID` — добавить форму\n" +
      "`shop_remove_form ID` — убрать форму\n" +
      "`shop_add_arena ID` — добавить арену\n" +
      "`shop_remove_arena ID` — убрать арену\n" +
      "`shop_list` — список всех предметов\n\n" +
      "💡 Вместо ID можно использовать `all` для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

};
