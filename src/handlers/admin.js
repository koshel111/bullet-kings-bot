// ============================================
// src/handlers/admin.js - ПОЛНАЯ ПЕРЕРАБОТКА V2
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

// ============================================
// ОТКРЫТЬ СЕЗОННЫЙ ПАК
// ============================================
function openSeasonalPack() {
  const weights = {
    "Обычный": 0,
    "Редкий": 0,
    "Элитный": 5,
    "Эпический": 10,
    "Легендарный": 50,
    "Икона": 35
  };
  
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  let selectedRarity = "Элитный";
  
  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      selectedRarity = rarity;
      break;
    }
  }
  
  const { PLAYERS } = require('../data/players');
  const filtered = PLAYERS.filter(p => p.rarity === selectedRarity);
  
  if (filtered.length === 0) {
    return PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  }
  
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ============================================
// ОТПРАВКА УВЕДОМЛЕНИЯ О СЕЗОННОМ ПАКЕ
// ============================================
async function sendSeasonalPackNotification(ctx, userId) {
  try {
    await ctx.telegram.sendMessage(Number(userId), 
      "🎁 *Вам выдан СЕЗОННЫЙ ПАК!*\n\n" +
      "👑 Выдал: администратор\n\n" +
      "🔥 Нажми кнопку, чтобы открыть пак!",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🎁 Открыть сезонный пак", "open_seasonal_" + userId)]
        ])
      }
    );
  } catch (e) {
    console.log("❌ Не удалось отправить уведомление " + userId + ":", e.message);
  }
}

// ============================================
// ОТПРАВКА УВЕДОМЛЕНИЯ О МОНЕТАХ
// ============================================
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

// ============================================
// ОТПРАВКА УВЕДОМЛЕНИЯ О КРИСТАЛЛАХ
// ============================================
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

// ============================================
// ОТКРЫТЬ СЕЗОННЫЙ ПАК ПО КНОПКЕ
// ============================================
async function openSeasonalPackByButton(ctx) {
  await ctx.answerCbQuery();
  
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.editMessageText("❌ Ошибка! Попробуй /start");
    return;
  }
  
  if (!data.seasonal_pack) {
    await ctx.editMessageText("❌ У тебя нет сезонных паков!");
    return;
  }
  
  const cardData = data.seasonal_pack;
  
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
  
  delete data.seasonal_pack;
  
  saveUsers(users);
  
  const emoji = getRarityEmoji(cardWithId.rarity);
  
  await ctx.editMessageText(
    "🎉 *СЕЗОННЫЙ ПАК ОТКРЫТ!*\n\n" +
    "📦 *Ты получил:*\n" +
    "  • " + emoji + " " + cardWithId.name + " (" + cardWithId.rarity + ")\n\n" +
    "💡 Карта добавлена в коллекцию!",
    { parse_mode: "Markdown" }
  );
}

// ============================================
// ГЛАВНОЕ МЕНЮ АДМИНКИ
// ============================================
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
      [Markup.button.callback("🎁 Сезонный пак", "admin_season")],
      [Markup.button.callback("📢 Рассылка", "admin_broadcast")],
      [Markup.button.callback("🗑️ Очистить БД", "admin_clear_db")],
      [Markup.button.callback("🔙 Назад", "back")],
    ])
  });
  
  await ctx.reply("📱 Используй кнопки под клавиатурой:", {
    reply_markup: {
      keyboard: [
        ["💰 Выдать монеты", "💎 Выдать кристаллы"],
        ["📦 Выдать карту", "🎁 Сезонный пак"],
        ["📢 Рассылка", "🗑️ Очистить БД"],
        ["🔙 Назад"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

module.exports = (bot) => {
  
  // ============================================
  // ВХОД В АДМИНКУ
  // ============================================
  bot.command("admin", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) {
      await ctx.reply("⛔ Доступ запрещён!");
      return;
    }
    await ctx.reply("👑 Добро пожаловать в админ-панель!");
    await showAdminMenu(ctx);
  });

  // ============================================
  // ОТКРЫТЬ СЕЗОННЫЙ ПАК ПО КНОПКЕ
  // ============================================
  bot.action(/open_seasonal_(.+)/, async (ctx) => {
    await openSeasonalPackByButton(ctx);
  });

  // ============================================
  // ОБРАБОТЧИКИ КНОПОК
  // ============================================
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

  bot.action("admin_season", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "🎁 *Сезонный пак*\n\nОтправь ID пользователя:\n`123456789`\nИли `all` для всех.",
      { parse_mode: "Markdown" }
    );
  });

  bot.action("admin_broadcast", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "📢 *Рассылка*\n\nОтправь сообщение для рассылки всем пользователям.",
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

  // ============================================
  // КНОПКИ ПОД КЛАВИАТУРОЙ
  // ============================================
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

  bot.hears("🎁 Сезонный пак", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply(
      "🎁 *Сезонный пак*\n\nОтправь ID пользователя:\n`123456789`\nИли `all`",
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("📢 Рассылка", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply("📢 *Рассылка*\n\nОтправь сообщение.", { parse_mode: "Markdown" });
  });

  bot.hears("🗑️ Очистить БД", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    saveUsers({});
    await ctx.reply("✅ База данных очищена!");
  });

  bot.hears("🔙 Назад", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    await ctx.reply("🔙 Возвращаюсь...", { reply_markup: { remove_keyboard: true } });
    await showAdminMenu(ctx);
  });

  // ============================================
  // ОБРАБОТКА ТЕКСТА
  // ============================================
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;
    
    const text = ctx.text;
    const parts = text.split(" ");
    
    // ============================================
    // ВЫДАТЬ МОНЕТЫ
    // ============================================
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
    
    // ============================================
    // ВЫДАТЬ КРИСТАЛЛЫ
    // ============================================
    if (text.startsWith("crystals_") || text.startsWith("💎")) {
      // Формат: crystals_ID_СУММА или 💎 ID СУММА
      let target, amount;
      
      if (text.startsWith("crystals_")) {
        const parts2 = text.split("_");
        target = parts2[1];
        amount = parseInt(parts2[2]);
      } else {
        // 💎 ID СУММА
        const parts2 = text.split(" ");
        if (parts2.length === 3 && !isNaN(parts2[1]) && !isNaN(parts2[2])) {
          target = parts2[1];
          amount = parseInt(parts2[2]);
        } else {
          await ctx.reply("❌ Неправильный формат! Используй: `crystals_ID_СУММА` или `💎 ID СУММА`");
          return;
        }
      }
      
      if (!target || !amount) {
        await ctx.reply("❌ Неправильный формат! Используй: `crystals_ID_СУММА`");
        return;
      }
      
      const users = getUsers();
      
      if (target === "all") {
        const ids = Object.keys(users);
        ids.forEach(id => {
          users[id].crystals = (users[id].crystals || 0) + amount;
        });
        saveUsers(users);
        
        for (const id of ids) {
          await sendCrystalsNotification(ctx, id, amount);
        }
        
        await ctx.reply("✅ Выдано " + amount + "💎 всем " + ids.length + " пользователям!");
        return;
      }
      
      if (users[target]) {
        users[target].crystals = (users[target].crystals || 0) + amount;
        saveUsers(users);
        
        await sendCrystalsNotification(ctx, target, amount);
        
        await ctx.reply("✅ Выдано " + amount + "💎 пользователю " + target + "!");
        return;
      }
      
      await ctx.reply("❌ Пользователь " + target + " не найден!");
      return;
    }
    
    // ============================================
    // ВЫДАТЬ КАРТУ
    // ============================================
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
        await ctx.reply("❌ Карта не найдена! Проверь название.");
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
    
    // ============================================
    // СЕЗОННЫЙ ПАК
    // ============================================
    if (text === "all" || (!isNaN(text) && text.length > 5)) {
      const users = getUsers();
      const target = text;
      const { PLAYERS } = require("../data/players");
      const rareCards = PLAYERS.filter(p => p.rarity === "Эпический" || p.rarity === "Легендарный" || p.rarity === "Икона");
      
      const targets = target === "all" ? Object.keys(users) : [target];
      let successCount = 0;
      
      for (const id of targets) {
        if (!users[id]) continue;
        
        const card = rareCards[Math.floor(Math.random() * rareCards.length)];
        
        users[id].seasonal_pack = {
          name: card.name,
          overall: card.overall,
          rarity: card.rarity,
          position: card.position,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6)
        };
        
        await sendSeasonalPackNotification(ctx, id);
        successCount++;
      }
      
      saveUsers(users);
      
      await ctx.reply(
        "✅ *Сезонный пак выдан " + successCount + " пользователям!*\n\n" +
        "📨 Каждому отправлено уведомление с кнопкой 'Открыть'",
        { parse_mode: "Markdown" }
      );
      
      await ctx.reply("✅ Готово!", { reply_markup: { remove_keyboard: true } });
      return;
    }
    
    // ============================================
    // РАССЫЛКА
    // ============================================
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
