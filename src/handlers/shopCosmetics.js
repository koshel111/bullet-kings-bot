// ============================================
// src/handlers/shopCosmetics.js - МАГАЗИН КОСМЕТИКИ
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
    const rotation = getRotation();
    const timeLeft = getTimeUntilNextJerseyRotation();
    
    let text = "🛒 *Купить косметику*\n\n";
    text += "🎽 *Формы*\n";
    text += "🔄 Обновление через: " + timeLeft + "\n\n";
    
    const buttons = [];
    
    rotation.jerseys.forEach((jersey) => {
      const color = getRarityColor(jersey.rarity);
      const priceText = jersey.priceCoins ? jersey.priceCoins + "⭐" : jersey.priceCrystals + "💎";
      text += color + " " + jersey.name + " — " + jersey.rarity + "\n";
      text += "   " + priceText + "\n\n";
      buttons.push([Markup.button.callback(
        jersey.emoji + " " + jersey.name + " (" + priceText + ")",
        "buy_jersey_" + jersey.id
      )]);
    });
    
    text += "\n🏟️ *Арены*\n";
    const timeLeftArena = getTimeUntilNextArenaRotation();
    text += "🔄 Обновление через: " + timeLeftArena + "\n\n";
    
    rotation.arenas.forEach((arena) => {
      const color = getRarityColor(arena.rarity);
      const priceText = arena.priceCoins ? arena.priceCoins + "⭐" : arena.priceCrystals + "💎";
      text += color + " " + arena.name + " — " + arena.rarity + "\n";
      text += "   " + priceText + "\n\n";
      buttons.push([Markup.button.callback(
        arena.emoji + " " + arena.name + " (" + priceText + ")",
        "buy_arena_" + arena.id
      )]);
    });
    
    buttons.push([
      Markup.button.callback("🔄 Обновить", "cosmetics_shop"),
      Markup.button.callback("🔙 Назад", "cosmetics_menu"),
    ]);
    
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
        if (typeof jersey === 'string') {
          const fullJersey = getJerseyById(jersey);
          if (fullJersey) text += "  • " + fullJersey.emoji + " " + fullJersey.name + " (" + fullJersey.rarity + ")\n";
        } else {
          text += "  • " + jersey.emoji + " " + jersey.name + " (" + jersey.rarity + ")\n";
        }
      });
      hasItems = true;
      text += "\n";
    }
    
    if (data.arenas && data.arenas.length > 0) {
      text += "🏟️ *Арены:*\n";
      data.arenas.forEach((arena) => {
        if (typeof arena === 'string') {
          const fullArena = getArenaById(arena);
          if (fullArena) text += "  • " + fullArena.emoji + " " + fullArena.name + " (" + fullArena.rarity + ")\n";
        } else {
          text += "  • " + arena.emoji + " " + arena.name + " (" + arena.rarity + ")\n";
        }
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

async function buyJersey(ctx, jerseyId) {
  try {
    await ctx.answerCbQuery();
    console.log("🔵 Покупка формы: " + jerseyId);
    
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    if (!data) {
      await ctx.editMessageText("❌ Ошибка! Попробуй /start");
      return;
    }
    
    const jersey = getJerseyById(jerseyId);
    if (!jersey) {
      await ctx.editMessageText("❌ Форма не найдена! Попробуй обновить.");
      return;
    }
    
    if (data.jerseys && data.jerseys.some(j => j.id === jerseyId || j === jerseyId)) {
      await ctx.editMessageText("❌ *У тебя уже есть эта форма!*\n\n" + jersey.emoji + " " + jersey.name, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
      });
      return;
    }
    
    if (jersey.priceCoins) {
      if ((data.coins || 0) < jersey.priceCoins) {
        await ctx.editMessageText("❌ *Недостаточно монет!*\n\nНужно: " + jersey.priceCoins + "⭐\nУ тебя: " + (data.coins || 0) + "⭐", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
        });
        return;
      }
      data.coins -= jersey.priceCoins;
    } else if (jersey.priceCrystals) {
      if ((data.crystals || 0) < jersey.priceCrystals) {
        await ctx.editMessageText("❌ *Недостаточно кристаллов!*\n\nНужно: " + jersey.priceCrystals + "💎\nУ тебя: " + (data.crystals || 0) + "💎", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
        });
        return;
      }
      data.crystals -= jersey.priceCrystals;
    }
    
    if (!data.jerseys) data.jerseys = [];
    data.jerseys.push({ id: jersey.id, name: jersey.name, rarity: jersey.rarity, emoji: jersey.emoji });
    saveUsers(users);
    
    let text = "✅ *Форма куплена!*\n\n" + jersey.emoji + " " + jersey.name + "\nРедкость: " + jersey.rarity + "\nЛига: " + jersey.league + "\n\n";
    if (jersey.photo) {
      await ctx.replyWithPhoto(jersey.photo, { caption: "📸 " + jersey.name, parse_mode: "Markdown" });
      text += "📸 Фото формы отправлено выше!\n\n";
    }
    text += "💡 Теперь ты можешь использовать эту форму в матчах!";
    
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Ещё формы", "cosmetics_shop")],
        [Markup.button.callback("🔙 Назад", "cosmetics_menu")],
      ])
    });
  } catch (error) {
    console.error("❌ Ошибка покупки формы:", error);
    await ctx.editMessageText("❌ Произошла ошибка! Попробуй позже.");
  }
}

async function buyArena(ctx, arenaId) {
  try {
    await ctx.answerCbQuery();
    console.log("🟢 Покупка арены: " + arenaId);
    
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    if (!data) {
      await ctx.editMessageText("❌ Ошибка! Попробуй /start");
      return;
    }
    
    const arena = getArenaById(arenaId);
    if (!arena) {
      await ctx.editMessageText("❌ Арена не найдена! Попробуй обновить.");
      return;
    }
    
    if (data.arenas && data.arenas.some(a => a.id === arenaId || a === arenaId)) {
      await ctx.editMessageText("❌ *У тебя уже есть эта арена!*\n\n" + arena.emoji + " " + arena.name, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
      });
      return;
    }
    
    if (arena.priceCoins) {
      if ((data.coins || 0) < arena.priceCoins) {
        await ctx.editMessageText("❌ *Недостаточно монет!*\n\nНужно: " + arena.priceCoins + "⭐\nУ тебя: " + (data.coins || 0) + "⭐", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
        });
        return;
      }
      data.coins -= arena.priceCoins;
    } else if (arena.priceCrystals) {
      if ((data.crystals || 0) < arena.priceCrystals) {
        await ctx.editMessageText("❌ *Недостаточно кристаллов!*\n\nНужно: " + arena.priceCrystals + "💎\nУ тебя: " + (data.crystals || 0) + "💎", {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_shop")]])
        });
        return;
      }
      data.crystals -= arena.priceCrystals;
    }
    
    if (!data.arenas) data.arenas = [];
    data.arenas.push({ id: arena.id, name: arena.name, rarity: arena.rarity, emoji: arena.emoji });
    saveUsers(users);
    
    await ctx.editMessageText("✅ *Арена куплена!*\n\n" + arena.emoji + " " + arena.name + "\nРедкость: " + arena.rarity + "\nЛига: " + arena.league + "\n\n💡 Теперь ты можешь играть на этой арене!", {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏟️ Ещё арены", "cosmetics_shop")],
        [Markup.button.callback("🔙 Назад", "cosmetics_menu")],
      ])
    });
  } catch (error) {
    console.error("❌ Ошибка покупки арены:", error);
    await ctx.editMessageText("❌ Произошла ошибка! Попробуй позже.");
  }
}

module.exports = (bot) => {
  bot.action("cosmetics_menu", async (ctx) => { await showCosmeticsMenu(ctx); });
  bot.action("cosmetics_shop", async (ctx) => { await showCosmeticsShop(ctx); });
  bot.action("cosmetics_inventory", async (ctx) => { await showCosmeticsInventory(ctx); });
  bot.action(/buy_jersey_(.+)/, async (ctx) => { await buyJersey(ctx, ctx.match[1]); });
  bot.action(/buy_arena_(.+)/, async (ctx) => { await buyArena(ctx, ctx.match[1]); });
};
