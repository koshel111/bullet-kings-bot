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
  ALL_JERSEYS,
  ALL_ARENAS,
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
  
  return `${minutes}м ${seconds}с`;
}

function getTimeUntilNextArenaRotation() {
  const now = Date.now();
  const nextUpdate = rotationCache.lastUpdate + ARENA_ROTATION;
  const diff = nextUpdate - now;
  
  if (diff <= 0) return "Обновление...";
  
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${minutes}м ${seconds}с`;
}

async function showCosmeticsMenu(ctx) {
  await ctx.editMessageText(
    "💄 *Косметика*\n\n" +
    "Выбери категорию:\n\n" +
    "🎽 Формы — скины для твоих игроков (обновление 20 мин)\n" +
    "🏟️ Арены — оформление матчей (обновление 1 час)",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🎽 Формы", "cosmetics_jerseys")],
        [Markup.button.callback("🏟️ Арены", "cosmetics_arenas")],
        [Markup.button.callback("🔙 Назад", "shop")],
      ])
    }
  );
}

async function showJerseys(ctx) {
  const rotation = getRotation();
  const timeLeft = getTimeUntilNextJerseyRotation();
  
  let text = "🎽 *Формы*\n";
  text += `🔄 Обновление через: ${timeLeft}\n\n`;
  
  const buttons = [];
  
  rotation.jerseys.forEach((jersey) => {
    const color = getRarityColor(jersey.rarity);
    const priceText = jersey.priceCoins ? `${jersey.priceCoins}⭐` : `${jersey.priceCrystals}💎`;
    
    text += `${color} ${jersey.name} — ${jersey.rarity}\n`;
    text += `   ${priceText}\n\n`;
    
    buttons.push([Markup.button.callback(
      `${jersey.emoji} ${jersey.name} (${priceText})`,
      `buy_jersey_${jersey.id}`
    )]);
  });
  
  buttons.push([
    Markup.button.callback("🔄 Обновить", "cosmetics_jerseys"),
    Markup.button.callback("🔙 Назад", "cosmetics_menu"),
  ]);
  
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons)
  });
}

async function showArenas(ctx) {
  const rotation = getRotation();
  const timeLeft = getTimeUntilNextArenaRotation();
  
  let text = "🏟️ *Арены*\n";
  text += `🔄 Обновление через: ${timeLeft}\n\n`;
  
  const buttons = [];
  
  rotation.arenas.forEach((arena) => {
    const color = getRarityColor(arena.rarity);
    const priceText = arena.priceCoins ? `${arena.priceCoins}⭐` : `${arena.priceCrystals}💎`;
    
    text += `${color} ${arena.name} — ${arena.rarity}\n`;
    text += `   ${priceText}\n\n`;
    
    buttons.push([Markup.button.callback(
      `${arena.emoji} ${arena.name} (${priceText})`,
      `buy_arena_${arena.id}`
    )]);
  });
  
  buttons.push([
    Markup.button.callback("🔄 Обновить", "cosmetics_arenas"),
    Markup.button.callback("🔙 Назад", "cosmetics_menu"),
  ]);
  
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(buttons)
  });
}

async function buyJersey(ctx, jerseyId) {
  const user = ctx.from;
  const users = getUsers();
  const data = users[user.id];
  
  const jersey = getJerseyById(jerseyId);
  if (!jersey) {
    await ctx.editMessageText("❌ Форма не найдена!");
    return;
  }
  
  if (data.jerseys && data.jerseys.includes(jerseyId)) {
    await ctx.editMessageText(
      "❌ *У тебя уже есть эта форма!*\n\n" +
      `${jersey.emoji} ${jersey.name}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_jerseys")]])
      }
    );
    return;
  }
  
  if (jersey.priceCoins) {
    if ((data.coins || 0) < jersey.priceCoins) {
      await ctx.editMessageText(
        `❌ *Недостаточно монет!*\n\nНужно: ${jersey.priceCoins}⭐\nУ тебя: ${data.coins || 0}⭐`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_jerseys")]])
        }
      );
      return;
    }
    data.coins -= jersey.priceCoins;
  } else if (jersey.priceCrystals) {
    if ((data.crystals || 0) < jersey.priceCrystals) {
      await ctx.editMessageText(
        `❌ *Недостаточно кристаллов!*\n\nНужно: ${jersey.priceCrystals}💎\nУ тебя: ${data.crystals || 0}💎`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_jerseys")]])
        }
      );
      return;
    }
    data.crystals -= jersey.priceCrystals;
  }
  
  if (!data.jerseys) data.jerseys = [];
  data.jerseys.push(jerseyId);
  
  saveUsers(users);
  
  let text = `✅ *Форма куплена!*\n\n${jersey.emoji} ${jersey.name}\nРедкость: ${jersey.rarity}\nЛига: ${jersey.league}`;
  if (jersey.photo) {
    text += `\n\n📸 [📷 Фото формы](${jersey.photo})`;
  }
  text += `\n\n💡 Теперь ты можешь использовать эту форму в матчах!`;
  
  await ctx.editMessageText(
    text,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🎽 Ещё формы", "cosmetics_jerseys")],
        [Markup.button.callback("🔙 Назад", "cosmetics_menu")],
      ])
    }
  );
}

async function buyArena(ctx, arenaId) {
  const user = ctx.from;
  const users = getUsers();
  const data = users[user.id];
  
  const arena = getArenaById(arenaId);
  if (!arena) {
    await ctx.editMessageText("❌ Арена не найдена!");
    return;
  }
  
  if (data.arenas && data.arenas.includes(arenaId)) {
    await ctx.editMessageText(
      "❌ *У тебя уже есть эта арена!*\n\n" +
      `${arena.emoji} ${arena.name}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_arenas")]])
      }
    );
    return;
  }
  
  if (arena.priceCoins) {
    if ((data.coins || 0) < arena.priceCoins) {
      await ctx.editMessageText(
        `❌ *Недостаточно монет!*\n\nНужно: ${arena.priceCoins}⭐\nУ тебя: ${data.coins || 0}⭐`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_arenas")]])
        }
      );
      return;
    }
    data.coins -= arena.priceCoins;
  } else if (arena.priceCrystals) {
    if ((data.crystals || 0) < arena.priceCrystals) {
      await ctx.editMessageText(
        `❌ *Недостаточно кристаллов!*\n\nНужно: ${arena.priceCrystals}💎\nУ тебя: ${data.crystals || 0}💎`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Назад", "cosmetics_arenas")]])
        }
      );
      return;
    }
    data.crystals -= arena.priceCrystals;
  }
  
  if (!data.arenas) data.arenas = [];
  data.arenas.push(arenaId);
  
  saveUsers(users);
  
  await ctx.editMessageText(
    `✅ *Арена куплена!*\n\n${arena.emoji} ${arena.name}\nРедкость: ${arena.rarity}\nЛига: ${arena.league}\n\n💡 Теперь ты можешь играть на этой арене!`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏟️ Ещё арены", "cosmetics_arenas")],
        [Markup.button.callback("🔙 Назад", "cosmetics_menu")],
      ])
    }
  );
}

module.exports = (bot) => {
  bot.action("cosmetics_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await showCosmeticsMenu(ctx);
  });

  bot.action("cosmetics_jerseys", async (ctx) => {
    await ctx.answerCbQuery();
    await showJerseys(ctx);
  });

  bot.action("cosmetics_arenas", async (ctx) => {
    await ctx.answerCbQuery();
    await showArenas(ctx);
  });

  bot.action(/buy_jersey_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await buyJersey(ctx, ctx.match[1]);
  });

  bot.action(/buy_arena_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    await buyArena(ctx, ctx.match[1]);
  });
};