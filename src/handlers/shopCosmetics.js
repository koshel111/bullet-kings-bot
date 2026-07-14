// ============================================
// src/handlers/shopCosmetics.js - ИСПРАВЛЕННЫЙ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');
const { 
  getRotationJerseys, 
  getRotationArenas,
  getRarityColor,
  getJerseyById,
  getArenaById,
} = require('../data/cosmetics');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ ХРАНИМ ID ПОЛЬЗОВАТЕЛЕЙ, КОТОРЫЕ В МЕНЮ КОСМЕТИКИ
const usersInCosmeticsShop = new Set();

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

let rotationCache = {
  jerseys: [],
  arenas: [],
  lastUpdate: 0,
};

const JERSEY_ROTATION = 20 * 60 * 1000;
const ARENA_ROTATION = 60 * 60 * 1000;

function getRotation() {
  const now = Date.now();
  if (now - rotationCache.lastUpdate > JERSEY_ROTATION || rotationCache.jerseys.length === 0) {
    rotationCache.jerseys = getRotationJerseys();
  }
  if (now - rotationCache.lastUpdate > ARENA_ROTATION || rotationCache.arenas.length === 0) {
    rotationCache.arenas = getRotationArenas();
    rotationCache.lastUpdate = now;
  }
  return rotationCache;
}

function getTimeUntilNextJerseyRotation() {
  const now = Date.now();
  const nextUpdate = rotationCache.lastUpdate + JERSEY_ROTATION;
  const diff = nextUpdate - now;
  if (diff <= 0) return "Обновление...";
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return minutes + "м " + seconds + "с";
}

function getTimeUntilNextArenaRotation() {
  const now = Date.now();
  const nextUpdate = rotationCache.lastUpdate + ARENA_ROTATION;
  const diff = nextUpdate - now;
  if (diff <= 0) return "Обновление...";
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return minutes + "м " + seconds + "с";
}

async function showCosmeticsMenu(ctx) {
  try {
    await ctx.answerCbQuery();
    console.log('✅ Косметика открыта');
    
    // ✅ ДОБАВЛЯЕМ ПОЛЬЗОВАТЕЛЯ В СПИСОК
    usersInCosmeticsShop.add(ctx.from.id);
    console.log('👤 Пользователь в меню косметики:', ctx.from.id);
    
    const text = 
      "🎨 *Косметика*\n\n" +
      "Выбери действие:\n\n" +
      "🛒 Купить косметику — формы и арены\n" +
      "📦 Моя косметика — купленные формы и арены";
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Купить косметику", "cosmetics_shop")],
        [Markup.button.callback("📦 Моя косметика", "cosmetics_inventory")],
        [Markup.button.callback("🔙 Назад", "back")],
      ])
    });
  } catch (error) {
    console.error('❌ Ошибка showCosmeticsMenu:', error);
    await ctx.reply('❌ Произошла ошибка! Попробуй позже.');
  }
}

async function showCosmeticsShop(ctx) {
  try {
    await ctx.answerCbQuery();
    
    // ✅ ДОБАВЛЯЕМ ПОЛЬЗОВАТЕЛЯ В СПИСОК (если ещё не в меню)
    usersInCosmeticsShop.add(ctx.from.id);
    
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const rotation = getRotation();
    
    const items = [];
    let index = 1;
    
    rotation.jerseys.forEach((item) => {
      const isOwned = data.jerseys && data.jerseys.some(j => j.id === item.id || j === item.id);
      items.push({
        id: item.id,
        type: 'jersey',
        name: item.name,
        emoji: item.emoji,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        priceCrystals: item.priceCrystals,
        league: item.league,
        photo: item.photo,
        number: index++,
        isOwned: isOwned
      });
    });
    
    rotation.arenas.forEach((item) => {
      const isOwned = data.arenas && data.arenas.some(a => a.id === item.id || a === item.id);
      items.push({
        id: item.id,
        type: 'arena',
        name: item.name,
        emoji: item.emoji,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        priceCrystals: item.priceCrystals,
        league: item.league,
        number: index++,
        isOwned: isOwned
      });
    });
    
    const timeLeft = getTimeUntilNextJerseyRotation();
    const timeLeftArena = getTimeUntilNextArenaRotation();
    
    let text = "🛒 *Купить косметику*\n\n";
    text += "🎽 *Формы (1-5)* — обновление через: " + timeLeft + "\n";
    text += "🏟️ *Арены (6-10)* — обновление через: " + timeLeftArena + "\n\n";
    text += "📋 *Чтобы купить, отправь команду:*\n";
    text += "`buy_номер` — например `buy_1` или `buy_6`\n\n";
    
    items.forEach((item) => {
      const color = getRarityColor(item.rarity);
      const priceText = item.priceCoins ? item.priceCoins + "⭐" : item.priceCrystals + "💎";
      const ownedText = item.isOwned ? " ✅ УЖЕ КУПЛЕНО" : "";
      text += `${item.number}. ${color} ${item.emoji} ${item.name} — ${item.rarity}${ownedText}\n`;
      text += `   ${priceText}\n\n`;
    });
    
    const buttons = [
      [Markup.button.callback("🔄 Обновить", "cosmetics_shop")],
      [Markup.button.callback("🔙 Назад", "cosmetics_menu")],
    ];
    
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('❌ Ошибка showCosmeticsShop:', error);
    await ctx.reply('❌ Произошла ошибка!');
  }
}

async function showCosmeticsInventory(ctx) {
  try {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    
    if (!data) {
      await ctx.reply("❌ Ошибка! Попробуй /start");
      return;
    }
    
    let text = "📦 *Моя косметика*\n\n";
    let hasItems = false;
    
    if (data.jerseys && data.jerseys.length > 0) {
      text += "🎽 *Формы:*\n";
      data.jerseys.forEach((jersey) => {
        const name = jersey.name || "Неизвестно";
        const rarity = jersey.rarity || "Обычная";
        const emoji = jersey.emoji || "🎽";
        text += "  • " + emoji + " " + name + " (" + rarity + ")\n";
      });
      hasItems = true;
      text += "\n";
    }
    
    if (data.arenas && data.arenas.length > 0) {
      text += "🏟️ *Арены:*\n";
      data.arenas.forEach((arena) => {
        const name = arena.name || "Неизвестно";
        const rarity = arena.rarity || "Обычная";
        const emoji = arena.emoji || "🏟️";
        text += "  • " + emoji + " " + name + " (" + rarity + ")\n";
      });
      hasItems = true;
      text += "\n";
    }
    
    if (!hasItems) {
      text += "❌ У тебя пока нет косметики!\n";
      text += "💡 Купи формы и арены в разделе 🛒 Купить косметику";
    }
    
    const buttons = [
      [Markup.button.callback("🔙 Назад", "cosmetics_menu")]
    ];
    
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('❌ Ошибка showCosmeticsInventory:', error);
    await ctx.reply('❌ Произошла ошибка!');
  }
}

// ✅ ОБРАБОТЧИК КОМАНДЫ buy_номер — ТОЛЬКО ЕСЛИ ПОЛЬЗОВАТЕЛЬ В МЕНЮ
async function handleBuyCommand(ctx) {
  const userId = ctx.from.id;
  
  // ✅ ПРОВЕРЯЕМ, ЧТО ПОЛЬЗОВАТЕЛЬ В МЕНЮ КОСМЕТИКИ
  if (!usersInCosmeticsShop.has(userId)) {
    await ctx.reply("❌ Эта команда работает только в меню 🎨 Косметика!\n\n💡 Открой раздел косметики через главное меню.");
    return;
  }
  
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply("❌ Ошибка! Попробуй /start");
    return;
  }
  
  const text = ctx.message.text.trim();
  const parts = text.split("_");
  
  if (parts.length !== 2) {
    await ctx.reply("❌ Используй: `buy_номер` — например `buy_1` или `buy_6`", { parse_mode: "Markdown" });
    return;
  }
  
  const number = parseInt(parts[1]);
  if (isNaN(number) || number < 1 || number > 10) {
    await ctx.reply("❌ Номер должен быть от 1 до 10!");
    return;
  }
  
  await buyItemByNumberCommand(ctx, number);
}

async function buyItemByNumberCommand(ctx, number) {
  try {
    console.log("🔵 Покупка предмета #" + number + " (команда)");
    
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const rotation = getRotation();
    
    if (!data) {
      await ctx.reply("❌ Ошибка! Попробуй /start");
      return;
    }
    
    const items = [];
    rotation.jerseys.forEach((item) => {
      const isOwned = data.jerseys && data.jerseys.some(j => j.id === item.id || j === item.id);
      items.push({ ...item, type: 'jersey', isOwned: isOwned });
    });
    rotation.arenas.forEach((item) => {
      const isOwned = data.arenas && data.arenas.some(a => a.id === item.id || a === item.id);
      items.push({ ...item, type: 'arena', isOwned: isOwned });
    });
    
    const item = items[number - 1];
    if (!item) {
      await ctx.reply("❌ Предмет с номером " + number + " не найден!");
      return;
    }
    
    if (item.isOwned) {
      await ctx.reply(
        "✅ *У тебя уже есть этот предмет!*\n\n" +
        item.emoji + " " + item.name + "\n" +
        "Редкость: " + item.rarity + "\n\n" +
        "💡 Ты уже купил это!",
        { parse_mode: "Markdown" }
      );
      return;
    }
    
    if (item.priceCoins) {
      if ((data.coins || 0) < item.priceCoins) {
        await ctx.reply(
          "❌ *Недостаточно монет!*\n\n" +
          "Нужно: " + item.priceCoins + "⭐\n" +
          "У тебя: " + (data.coins || 0) + "⭐",
          { parse_mode: "Markdown" }
        );
        return;
      }
      data.coins -= item.priceCoins;
    } else if (item.priceCrystals) {
      if ((data.crystals || 0) < item.priceCrystals) {
        await ctx.reply(
          "❌ *Недостаточно кристаллов!*\n\n" +
          "Нужно: " + item.priceCrystals + "💎\n" +
          "У тебя: " + (data.crystals || 0) + "💎",
          { parse_mode: "Markdown" }
        );
        return;
      }
      data.crystals -= item.priceCrystals;
    }
    
    if (item.type === 'jersey') {
      if (!data.jerseys) data.jerseys = [];
      data.jerseys.push({ id: item.id, name: item.name, rarity: item.rarity, emoji: item.emoji });
    } else {
      if (!data.arenas) data.arenas = [];
      data.arenas.push({ id: item.id, name: item.name, rarity: item.rarity, emoji: item.emoji });
    }
    
    saveUsers(users);
    console.log("✅ Куплено: " + item.name);
    
    let text = "✅ *Куплено!*\n\n";
    text += item.emoji + " " + item.name + "\n";
    text += "Редкость: " + item.rarity + "\n";
    text += "Лига: " + item.league + "\n\n";
    
    if (item.photo && item.type === 'jersey') {
      await ctx.replyWithPhoto(item.photo, {
        caption: "📸 " + item.name,
        parse_mode: "Markdown"
      });
      text += "📸 Фото формы отправлено выше!\n\n";
    }
    
    text += "💡 Теперь предмет добавлен в твою коллекцию косметики!";
    
    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("❌ Ошибка покупки:", error);
    await ctx.reply("❌ Произошла ошибка! Попробуй позже.");
  }
}

// ✅ КОГДА ПОЛЬЗОВАТЕЛЬ ВЫХОДИТ ИЗ МЕНЮ — УДАЛЯЕМ ЕГО ИЗ СПИСКА
function removeUserFromCosmetics(userId) {
  usersInCosmeticsShop.delete(userId);
}

module.exports = (bot) => {
  bot.action("cosmetics_menu", async (ctx) => { 
    await showCosmeticsMenu(ctx); 
  });
  
  bot.action("cosmetics_shop", async (ctx) => { 
    await showCosmeticsShop(ctx); 
  });
  
  bot.action("cosmetics_inventory", async (ctx) => { 
    await showCosmeticsInventory(ctx); 
  });
  
  // ✅ ОБРАБОТКА КОМАНДЫ buy_номер
  bot.hears(/^buy_[1-9]$|^buy_10$/, async (ctx) => {
    await handleBuyCommand(ctx);
  });

  // ✅ КОГДА ПОЛЬЗОВАТЕЛЬ НАЖИМАЕТ НАЗАД — УДАЛЯЕМ ИЗ СПИСКА
  bot.action("back", async (ctx) => {
    removeUserFromCosmetics(ctx.from.id);
    // Дальше идёт обычная логика назад
    const { showMainMenu } = require('./start');
    await showMainMenu(ctx, bot);
  });
};