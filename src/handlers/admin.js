// ============================================
// src/handlers/admin.js - РАСШИРЕННЫЙ
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
  
  if (filtered.length === 0) {
    return PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  }
  
  return filtered[Math.floor(Math.random() * filtered.length)];
}

async function sendPackNotification(ctx, userId, packType, count = 1) {
  try {
    const packNames = {
      basic: "Базовый",
      premium: "Премиум",
      legendary: "Легендарный",
      seasonal: "Сезонный"
    };
    
    const text = count > 1 
      ? `📦 *Вам выдан ${packNames[packType]} пак (x${count})!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`
      : `📦 *Вам выдан ${packNames[packType]} пак!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`;
    
    await ctx.telegram.sendMessage(Number(userId), text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`📦 Открыть ${packNames[packType]} пак`, `open_pack_${packType}_${userId}`)]
      ])
    });
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message);
  }
}

async function sendSeasonalPackNotification(ctx, userId, count = 1) {
  try {
    const text = count > 1 
      ? `🎁 *Вам выдан СЕЗОННЫЙ ПАК (x${count})!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`
      : `🎁 *Вам выдан СЕЗОННЫЙ ПАК!*\n\n👑 Выдал: администратор\n\n🔥 Нажми кнопку, чтобы открыть пак!`;
    
    await ctx.telegram.sendMessage(Number(userId), text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🎁 Открыть сезонный пак", "open_seasonal_" + userId)]
      ])
    });
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message);
  }
}

async function sendCoinsNotification(ctx, userId, amount) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "💰 *Вам выдали монеты!*\n\n" +
      "👑 Выдал: администратор\n" +
      "⭐ Количество: " + amount + " монет\n\n" +
      "💡 Монеты уже добавлены на счёт!",
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message);
  }
}

async function sendCrystalsNotification(ctx, userId, amount) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "💎 *Вам выдали кристаллы!*\n\n" +
      "👑 Выдал: администратор\n" +
      "💎 Количество: " + amount + " кристаллов\n\n" +
      "💡 Кристаллы уже добавлены на счёт!",
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message);
  }
}

async function openPackByButton(ctx) {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.editMessageText("❌ Ошибка! Попробуй /start");
    return;
  }
  
  // Парсим callback: open_pack_TYPE_USERID
  const parts = ctx.match[1].split('_');
  const packType = parts[0];
  
  if (!data.packs || !data.packs[packType] || data.packs[packType].length === 0) {
    await ctx.editMessageText("❌ У тебя нет таких паков!");
    return;
  }
  
  // Берём первый пак из очереди
  const packData = data.packs[packType][0];
  data.packs[packType].shift();
  
  // Если паков больше нет, удаляем ключ
  if (data.packs[packType].length === 0) {
    delete data.packs[packType];
  }
  
  // Открываем пак
  const card = openPack(packType);
  
  const cardWithId = {
    name: card.name,
    overall: card.overall || 85,
    rarity: card.rarity || "Обычный",
    position: card.position || "C",
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    count: 1
  };
  
  const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
  } else {
    data.cards.push(cardWithId);
  }
  
  saveUsers(users);
  
  const emoji = getRarityEmoji(cardWithId.rarity);
  const packNames = {
    basic: "Базовый",
    premium: "Премиум",
    legendary: "Легендарный",
    seasonal: "Сезонный"
  };
  
  // Проверяем, остались ли ещё паки
  const remaining = data.packs?.[packType]?.length || 0;
  let text = `🎉 *${packNames[packType]} пак открыт!*\n\n` +
    "📦 *Ты получил:*\n" +
    "  • " + emoji + " " + cardWithId.name + " (" + cardWithId.rarity + ")\n\n" +
    "💡 Карта добавлена в коллекцию!";
  
  if (remaining > 0) {
    text += `\n\n📦 Осталось паков: ${remaining}`;
  }
  
  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function openSeasonalPackByButton(ctx) {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.editMessageText("❌ Ошибка! Попробуй /start");
    return;
  }
  
  if (!data.seasonal_packs || data.seasonal_packs.length === 0) {
    await ctx.editMessageText("❌ У тебя нет сезонных паков!");
    return;
  }
  
  const cardData = data.seasonal_packs[0];
  data.seasonal_packs.shift();
  
  const cardWithId = {
    name: cardData.name,
    overall: cardData.overall || 85,
    rarity: cardData.rarity || "Легендарная",
    position: cardData.position || "C",
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    count: 1
  };
  
  const existing = data.cards.find(c => c.name === cardWithId.name && c.position === cardWithId.position);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
  } else {
    data.cards.push(cardWithId);
  }
  
  saveUsers(users);
  
  const emoji = getRarityEmoji(cardWithId.rarity);
  
  const remaining = data.seasonal_packs?.length || 0;
  let text = "🎉 *СЕЗОННЫЙ ПАК ОТКРЫТ!*\n\n" +
    "📦 *Ты получил:*\n" +
    "  • " + emoji + " " + cardWithId.name + " (" + cardWithId.rarity + ")\n\n" +
    "💡 Карта добавлена в коллекцию!";
  
  if (remaining > 0) {
    text += `\n\n📦 Осталось неоткрытых паков: ${remaining}`;
  }
  
  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function showInventory(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply("❌ Ошибка! Попробуй /start");
    return;
  }
  
  let text = "📦 *ИНВЕНТАРЬ*\n\n";
  let hasPacks = false;
  const buttons = [];
  
  // Проверяем обычные паки
  const packNames = {
    basic: "Базовый",
    premium: "Премиум",
    legendary: "Легендарный"
  };
  
  for (const [type, name] of Object.entries(packNames)) {
    if (data.packs && data.packs[type] && data.packs[type].length > 0) {
      const count = data.packs[type].length;
      text += `📦 ${name} пак: ${count} шт.\n`;
      buttons.push([Markup.button.callback(`📦 Открыть ${name} (${count})`, `open_pack_${type}_${userId}`)]);
      hasPacks = true;
    }
  }
  
  // Проверяем сезонные паки
  if (data.seasonal_packs && data.seasonal_packs.length > 0) {
    const count = data.seasonal_packs.length;
    text += `🎁 Сезонный пак: ${count} шт.\n`;
    buttons.push([Markup.button.callback(`🎁 Открыть сезонный (${count})`, `open_seasonal_${userId}`)]);
    hasPacks = true;
  }
  
  if (!hasPacks) {
    text += "❌ У тебя нет паков!\n\n💡 Паки можно получить:\n" +
      "• За победы в матчах\n" +
      "• Через боевой пропуск\n" +
      "• От администратора";
  }
  
  buttons.push([Markup.button.callback("🔙 Назад", "back")]);
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons)
  });
}

async function showAdminMenu(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.reply("⛔ Доступ запрещён!");
    return;
  }
  
  const users = getUsers();
  const totalUsers = Object.keys(users).length;
  let totalCards = 0;
  let totalMatches = 0;
  let totalCoins = 0;
  let totalCrystals = 0;
  
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
    "*Выбери действие:*";
  
  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("💰 Выдать монеты", "admin_coins")],
      [Markup.button.callback("💎 Выдать кристаллы", "admin_crystals")],
      [Markup.button.callback("📦 Выдать карту", "admin_card")],
      [Markup.button.callback("📦 Выдать паки", "admin_packs")],
      [Markup.button.callback("🎁 Сезонный пак", "admin_season")],
      [Markup.button.callback("📢 Рассылка", "admin_broadcast")],
      [Markup.button.callback("🗑️ Очистить БД", "admin_clear_db")],
      [Markup.button.callback("🔙 Главное меню", "back")],
    ])
  });
  
  await ctx.reply("📱 Используй кнопки под клавиатурой:", {
    reply_markup: {
      keyboard: [
        ["💰 Выдать монеты", "💎 Выдать кристаллы"],
        ["📦 Выдать карту", "📦 Выдать паки"],
        ["🎁 Сезонный пак", "📢 Рассылка"],
        ["🗑️ Очистить БД", "🔙 Главное меню"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

module.exports = (bot) => {
  
  bot.command("admin", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) {
      await ctx.reply("⛔ Доступ запрещён!");
      return;
    }
    await ctx.reply("👑 Добро пожаловать в админ-панель!");
    await showAdminMenu(ctx);
  });

  // ОТКРЫТЬ ПАК ПО КНОПКЕ
  bot.action(/open_pack_(.+)_(.+)/, async (ctx) => {
    await openPackByButton(ctx);
  });

  // ОТКРЫТЬ СЕЗОННЫЙ ПАК
  bot.action(/open_seasonal_(.+)/, async (ctx) => {
    await openSeasonalPackByButton(ctx);
  });

  // ИНВЕНТАРЬ
  bot.action("inventory", async (ctx) => {
    await ctx.answerCbQuery();
    await showInventory(ctx);
  });

  bot.action("admin_panel", async (ctx) => {
    await ctx.answerCbQuery();
    await showAdminMenu(ctx);
  });

  bot.action("admin_coins", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💰 *Выдать монеты*\n\nОтправь ID и сумму через пробел:\n`123456789 500`\nИли `all 100`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_crystals", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "💎 *Выдать кристаллы*\n\nОтправь ID и сумму через пробел:\n`123456789 50`\nИли `all 10`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_card", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📦 *Выдать карту*\n\nОтправь ID пользователя и название карты:\n`123456789 Александр Овечкин`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_packs", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📦 *Выдать паки*\n\nФормат: `ID тип количество`\n\nТипы: basic, premium, legendary\n\nПримеры:\n" +
      "`123456789 basic 3` — 3 базовых пака\n" +
      "`all premium 1` — всем по 1 премиум паку",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_season", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎁 *Сезонный пак*\n\nОтправь ID пользователя:\n`123456789`\nИли `all` для всех.\n\nМожно указать количество: `ID 3` — выдаст 3 пака",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_broadcast", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📢 *Рассылка*\n\nИспользуй команду:\n`/broadcast ID сообщение`\nИли `/broadcast all сообщение`",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_clear_db", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    await ctx.reply(
      "⚠️ *Очистить БД?*\n\nЭто удалит ВСЕХ пользователей!\nДействие необратимо!",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ ДА, УДАЛИТЬ", "admin_confirm_clear")],
          [Markup.button.callback("❌ НЕТ, ОТМЕНА", "admin_panel")],
        ])
      }
    );
  });

  bot.action("admin_confirm_clear", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.editMessageText("✅ База данных очищена!");
    await ctx.reply("✅ Готово!", { reply_markup: { remove_keyboard: true } });
  });

  // КНОПКИ ПОД КЛАВИАТУРОЙ
  bot.hears("💰 Выдать монеты", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "💰 *Выдать монеты*\n\nОтправь ID и сумму:\n`123456789 500`\nИли `all 100`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("💎 Выдать кристаллы", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "💎 *Выдать кристаллы*\n\nОтправь ID и сумму:\n`123456789 50`\nИли `all 10`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("📦 Выдать карту", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "📦 *Выдать карту*\n\nОтправь ID и название:\n`123456789 Александр Овечкин`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("📦 Выдать паки", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "📦 *Выдать паки*\n\nФормат: `ID тип количество`\n\nТипы: basic, premium, legendary\n\nПример: `123456789 basic 3`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("🎁 Сезонный пак", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "🎁 *Сезонный пак*\n\nОтправь ID пользователя:\n`123456789`\nИли `all`\n\nМожно указать количество: `ID 3`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("📢 Рассылка", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "📢 *Рассылка*\n\nИспользуй команду:\n`/broadcast ID сообщение`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("🗑️ Очистить БД", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.reply("✅ База данных очищена!");
  });

  bot.hears("🔙 Главное меню", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply("🔙 Возвращаюсь...", { reply_markup: { remove_keyboard: true } });
    
    const mainMenu = Markup.inlineKeyboard([
      [Markup.button.callback("🎮 Играть", "play")],
      [Markup.button.callback("👥 Команда", "team")],
      [Markup.button.callback("📚 Коллекция", "collection")],
      [Markup.button.callback("🛒 Магазин", "shop")],
      [Markup.button.callback("👤 Профиль", "profile")],
      [Markup.button.callback("🎖️ Пропуск", "battlepass")],
      [Markup.button.callback("📦 Инвентарь", "inventory")],
      [Markup.button.callback("📅 Бонус", "bonus")],
    ]);
    
    await ctx.reply("🏒 *Bullet Kings*\n\nГлавное меню:", {
      parse_mode: "Markdown",
      ...mainMenu
    });
  });

  // ОБРАБОТКА ТЕКСТА ДЛЯ АДМИНА
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    const text = ctx.text;
    const parts = text.split(" ");
    
    // Выдать монеты
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const users = getUsers();
      const target = parts[0];
      const amount = parseInt(parts[1]);
      
      if (target === "all") {
        const ids = Object.keys(users);
        ids.forEach(id => {
          users[id].coins = (users[id].coins || 0) + amount;
        });
        saveUsers(users);
        
        for (const id of ids) {
          await sendCoinsNotification(ctx, id, amount);
        }
        
        await ctx.reply("✅ Выдано " + amount + "⭐ всем " + ids.length + " пользователям!");
        return;
      }
      
      if (users[target]) {
        users[target].coins = (users[target].coins || 0) + amount;
        saveUsers(users);
        await sendCoinsNotification(ctx, target, amount);
        await ctx.reply("✅ Выдано " + amount + "⭐ пользователю " + target + "!");
        return;
      }
      
      await ctx.reply("❌ Пользователь " + target + " не найден!");
      return;
    }
    
    // Выдать паки
    if (parts.length === 3 && !isNaN(parts[0]) && ["basic", "premium", "legendary"].includes(parts[1]) && !isNaN(parts[2])) {
      const users = getUsers();
      const target = parts[0];
      const packType = parts[1];
      const count = parseInt(parts[2]);
      
      if (count < 1 || count > 10) {
        await ctx.reply("❌ Количество должно быть от 1 до 10!");
        return;
      }
      
      const targets = target === "all" ? Object.keys(users) : [target];
      let successCount = 0;
      
      for (const id of targets) {
        if (!users[id]) continue;
        
        if (!users[id].packs) users[id].packs = {};
        if (!users[id].packs[packType]) users[id].packs[packType] = [];
        
        for (let i = 0; i < count; i++) {
          users[id].packs[packType].push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + "_" + i });
        }
        
        await sendPackNotification(ctx, id, packType, count);
        successCount++;
      }
      
      saveUsers(users);
      
      const packNames = { basic: "Базовый", premium: "Премиум", legendary: "Легендарный" };
      await ctx.reply(
        "✅ *" + packNames[packType] + " пак выдан " + successCount + " пользователям!*\n\n" +
        "📦 Каждому выдано по " + count + " пак(ов)\n" +
        "📨 Каждому отправлено уведомление с кнопкой 'Открыть'",
        { parse_mode: "Markdown" }
      );
      
      await ctx.reply("✅ Готово!", { reply_markup: { remove_keyboard: true } });
      return;
    }
    
    // Сезонный пак
    if (parts.length >= 1 && (parts[0] === "all" || !isNaN(parts[0]))) {
      const users = getUsers();
      const target = parts[0];
      let count = 1;
      
      if (parts.length >= 2 && !isNaN(parts[1])) {
        count = parseInt(parts[1]);
        if (count < 1) count = 1;
        if (count > 10) count = 10;
      }
      
      const { PLAYERS } = require('../data/players');
      const rareCards = PLAYERS.filter(p => 
        p.rarity === "Эпический" || p.rarity === "Легендарный" || p.rarity === "Икона"
      );
      
      const targets = target === "all" ? Object.keys(users) : [target];
      let successCount = 0;
      
      for (const id of targets) {
        if (!users[id]) continue;
        
        if (!users[id].seasonal_packs) {
          users[id].seasonal_packs = [];
        }
        
        for (let i = 0; i < count; i++) {
          const card = rareCards[Math.floor(Math.random() * rareCards.length)];
          users[id].seasonal_packs.push({
            name: card.name,
            overall: card.overall,
            rarity: card.rarity,
            position: card.position,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + "_" + i
          });
        }
        
        await sendSeasonalPackNotification(ctx, id, count);
        successCount++;
      }
      
      saveUsers(users);
      
      await ctx.reply(
        "✅ *Сезонный пак выдан " + successCount + " пользователям!*\n\n" +
        "📦 Каждому выдано по " + count + " пак(ов)\n" +
        "📨 Каждому отправлено уведомление с кнопкой 'Открыть'",
        { parse_mode: "Markdown" }
      );
      
      await ctx.reply("✅ Готово!", { reply_markup: { remove_keyboard: true } });
      return;
    }
    
    // Выдать карту
    if (parts.length >= 2 && !isNaN(parts[0]) && parts[0] !== "all") {
      const users = getUsers();
      const target = parts[0];
      const cardName = parts.slice(1).join(" ");
      
      if (!users[target]) {
        await ctx.reply("❌ Пользователь " + target + " не найден!");
        return;
      }
      
      const { PLAYERS } = require('../data/players');
      const card = PLAYERS.find(p => p.name.toLowerCase().includes(cardName.toLowerCase()));
      
      if (!card) {
        await ctx.reply("❌ Карта не найдена!");
        return;
      }
      
      const cardWithId = {
        ...card,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        count: 1
      };
      
      const existing = users[target].cards.find(c => c.name === card.name && c.position === card.position);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
      } else {
        users[target].cards.push(cardWithId);
      }
      
      saveUsers(users);
      
      const emoji = getRarityEmoji(card.rarity);
      await ctx.reply("✅ Выдана карта " + emoji + " " + card.name + " (" + card.rarity + ") пользователю " + target + "!");
      return;
    }
    
    // Рассылка
    if (text.length > 10 && !text.startsWith("/")) {
      const users = getUsers();
      let sent = 0;
      for (const [id] of Object.entries(users)) {
        try {
          await ctx.telegram.sendMessage(Number(id), "📢 *РАССЫЛКА*\n\n" + text, { parse_mode: "Markdown" });
          sent++;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100));
      }
      await ctx.reply("✅ Рассылка отправлена " + sent + " пользователям!");
    }
  });

};
