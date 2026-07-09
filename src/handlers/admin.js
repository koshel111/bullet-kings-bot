// ============================================
// src/handlers/admin.js - АДМИНКА
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomCard, getRarityEmoji } = require('../data/players');

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

async function giveBattlepassLevels(ctx, target, levels) {
  const users = getUsers();
  const targets = target === "all" ? Object.keys(users) : [target];
  let successCount = 0;
  for (const id of targets) {
    if (!users[id]) continue;
    const currentXp = users[id].battlepass_xp || 0;
    users[id].battlepass_xp = currentXp + (levels * 20);
    const oldLevel = Math.floor(currentXp / 20);
    const newLevel = Math.floor(users[id].battlepass_xp / 20);
    if (newLevel > oldLevel) {
      const { autoClaimRewards } = require('./battlepass');
      const isPremium = users[id].battlepass_premium || 0;
      await autoClaimRewards(users[id], newLevel, isPremium);
    }
    successCount++;
  }
  saveUsers(users);
  return successCount;
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
    "🎖️ `skip_ID_уровней` — пропуск уровней\n\n" +
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

  bot.action("admin_coins", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💰 *Выдать монеты*\n\n" +
      "📋 *Формат:* `coins_ID_СУММА`\n\n" +
      "📌 *Примеры:*\n" +
      "`coins_123456789_500` — пользователю 500 монет\n" +
      "`coins_all_100` — всем по 100 монет\n\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_crystals", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💎 *Выдать кристаллы*\n\n" +
      "📋 *Формат:* `crystals_ID_СУММА`\n\n" +
      "📌 *Примеры:*\n" +
      "`crystals_123456789_50` — пользователю 50 кристаллов\n" +
      "`crystals_all_10` — всем по 10 кристаллов\n\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_card", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🃏 *Выдать карту*\n\n" +
      "📋 *Формат:* `card_ID_Название_карты`\n\n" +
      "📌 *Примеры:*\n" +
      "`card_123456789_Александр_Овечкин` — пользователю карту\n" +
      "`card_all_Александр_Овечкин` — всем карту\n\n" +
      "💡 Используй `_` вместо пробелов в названии\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_packs", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📦 *Выдать паки*\n\n" +
      "📋 *Формат:* `pack_ID_тип_количество`\n\n" +
      "📌 *Типы паков:* basic, premium, legendary\n\n" +
      "📌 *Примеры:*\n" +
      "`pack_123456789_basic_3` — 3 базовых пака\n" +
      "`pack_all_premium_1` — всем по 1 премиум паку\n\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_season", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎁 *Сезонный пак*\n\n" +
      "📋 *Формат:* `seasonal_ID_количество`\n\n" +
      "📌 *Примеры:*\n" +
      "`seasonal_123456789_3` — пользователю 3 сезонных пака\n" +
      "`seasonal_all_1` — всем по 1 сезонному паку\n\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_battlepass", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎖️ *Пропуск уровней боевого пропуска*\n\n" +
      "📋 *Формат:* `skip_ID_уровней`\n\n" +
      "📌 *Примеры:*\n" +
      "`skip_123456789_5` — пользователю 5 уровней\n" +
      "`skip_all_10` — всем 10 уровней\n" +
      "`skip_all_30` — всем 30 уровней (максимум)\n\n" +
      "💡 Используй `all` вместо ID для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_broadcast", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📢 *Рассылка*\n\n" +
      "📋 *Формат:* `broadcast_ID_сообщение`\n\n" +
      "📌 *Примеры:*\n" +
      "`broadcast_all_Привет_всем!` — всем сообщение\n" +
      "`broadcast_123456789_Привет!` — конкретному пользователю\n\n" +
      "💡 Используй `_` вместо пробелов в сообщении",
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
  // ОБРАБОТКА КОМАНД
  // ============================================
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    const text = ctx.text.trim();
    
    // ============================================
    // 1. МОНЕТЫ: coins_ID_СУММА
    // ============================================
    if (text.startsWith("coins_")) {
      const parts = text.split("_");
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
            await ctx.reply("✅ Выдано " + amount + "⭐ всем " + ids.length + " пользователям!");
            return;
          } else if (users[target]) {
            users[target].coins = (users[target].coins || 0) + amount;
            saveUsers(users);
            await sendCoinsNotification(ctx, target, amount);
            await ctx.reply("✅ Выдано " + amount + "⭐ пользователю " + target + "!");
            return;
          } else {
            await ctx.reply("❌ Пользователь " + target + " не найден!");
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
      const parts = text.split("_");
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
            await ctx.reply("✅ Выдано " + amount + "💎 всем " + ids.length + " пользователям!");
            return;
          } else if (users[target]) {
            users[target].crystals = (users[target].crystals || 0) + amount;
            saveUsers(users);
            await sendCrystalsNotification(ctx, target, amount);
            await ctx.reply("✅ Выдано " + amount + "💎 пользователю " + target + "!");
            return;
          } else {
            await ctx.reply("❌ Пользователь " + target + " не найден!");
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
      const parts = text.split("_");
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
        await ctx.reply("✅ Выдана карта " + emoji + " " + card.name + " (" + card.rarity + ") " + (target === "all" ? "всем " + successCount + " пользователям!" : "пользователю " + target + "!"));
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `card_ID_Название_карты`");
      return;
    }
    
    // ============================================
    // 4. ПАКИ: pack_ID_тип_количество
    // ============================================
    if (text.startsWith("pack_")) {
      const parts = text.split("_");
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
        await ctx.reply("✅ *" + packNames[packType] + " пак выдан " + successCount + " пользователям!*", { parse_mode: "Markdown" });
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `pack_ID_тип_количество`");
      return;
    }
    
    // ============================================
    // 5. СЕЗОННЫЙ ПАК: seasonal_ID_количество
    // ============================================
    if (text.startsWith("seasonal_")) {
      const parts = text.split("_");
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
        await ctx.reply("✅ *Сезонный пак выдан " + successCount + " пользователям!*", { parse_mode: "Markdown" });
        return;
      }
      await ctx.reply("❌ Неправильный формат! Используй: `seasonal_ID_количество`");
      return;
    }
    
    // ============================================
    // 6. ПРОПУСК УРОВНЕЙ: skip_ID_уровней
    // ============================================
    if (text.startsWith("skip_")) {
      const parts = text.split("_");
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
          for (const id of ids) {
            if (!users[id]) continue;
            const currentXp = users[id].battlepass_xp || 0;
            users[id].battlepass_xp = currentXp + (levels * 20);
            const oldLevel = Math.floor(currentXp / 20);
            const newLevel = Math.floor(users[id].battlepass_xp / 20);
            if (newLevel > oldLevel) {
              const { autoClaimRewards } = require('./battlepass');
              const isPremium = users[id].battlepass_premium || 0;
              await autoClaimRewards(users[id], newLevel, isPremium);
            }
            count++;
          }
          saveUsers(users);
          await ctx.reply("✅ Пропущено " + levels + " уровней для всех " + count + " пользователей!");
          return;
        } else if (users[target]) {
          const currentXp = users[target].battlepass_xp || 0;
          users[target].battlepass_xp = currentXp + (levels * 20);
          const oldLevel = Math.floor(currentXp / 20);
          const newLevel = Math.floor(users[target].battlepass_xp / 20);
          if (newLevel > oldLevel) {
            const { autoClaimRewards } = require('./battlepass');
            const isPremium = users[target].battlepass_premium || 0;
            await autoClaimRewards(users[target], newLevel, isPremium);
          }
          saveUsers(users);
          await ctx.reply("✅ Пропущено " + levels + " уровней для пользователя " + target + "!");
          return;
        } else {
          await ctx.reply("❌ Пользователь " + target + " не найден!");
          return;
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `skip_ID_уровней`");
      return;
    }
    
    // ============================================
    // 7. РАССЫЛКА: broadcast_ID_сообщение
    // ============================================
    if (text.startsWith("broadcast_")) {
      const parts = text.split("_");
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
          await ctx.reply("✅ Рассылка отправлена " + sent + " пользователям!");
          return;
        } else if (users[target]) {
          try {
            await ctx.telegram.sendMessage(Number(target), "📢 *РАССЫЛКА*\n\n" + message, { parse_mode: "Markdown" });
            await ctx.reply("✅ Сообщение отправлено пользователю " + target + "!");
            return;
          } catch (e) {
            await ctx.reply("❌ Не удалось отправить сообщение пользователю " + target);
            return;
          }
        } else {
          await ctx.reply("❌ Пользователь " + target + " не найден!");
          return;
        }
      }
      await ctx.reply("❌ Неправильный формат! Используй: `broadcast_ID_сообщение`");
      return;
    }
    
    // Если ничего не подошло
    await ctx.reply("❌ Неизвестная команда!\n\n📋 *Доступные команды:*\n" +
      "`coins_ID_СУММА` — монеты\n" +
      "`crystals_ID_СУММА` — кристаллы\n" +
      "`card_ID_Название` — карта\n" +
      "`pack_ID_тип_количество` — паки\n" +
      "`seasonal_ID_количество` — сезонные паки\n" +
      "`skip_ID_уровней` — пропуск уровней\n" +
      "`broadcast_ID_сообщение` — рассылка\n\n" +
      "💡 Вместо ID можно использовать `all` для всех пользователей",
      { parse_mode: "Markdown" }
    );
  });

};
