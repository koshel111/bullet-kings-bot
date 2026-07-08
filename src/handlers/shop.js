// ============================================
// src/handlers/shop.js - СЫ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomCard, getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

const PACKS = {
  basic: {
    name: 'азовый',
    price: 100,
    currency: 'coins',
    cards: 1,
    description: '1 карта, шанс на редкую',
    emoji: '📦',
    weights: {
      'бычный': 45,
      'едкий': 30,
      'литный': 18,
      'пический': 6.9,
      'егендарный': 0.1,
      'кона': 0
    }
  },
  premium: {
    name: 'ремиум',
    price: 500,
    currency: 'coins',
    cards: 1,
    description: '1 карта, шанс на эпическую',
    emoji: '🎁',
    weights: {
      'бычный': 0,
      'едкий': 30,
      'литный': 35,
      'пический': 25,
      'егендарный': 9,
      'кона': 1
    }
  },
  legendary: {
    name: 'егендарный',
    price: 50,
    currency: 'crystals',
    cards: 1,
    description: '1 карта, шанс на икону',
    emoji: '💎',
    weights: {
      'бычный': 0,
      'едкий': 0,
      'литный': 15,
      'пический': 35,
      'егендарный': 40,
      'кона': 10
    }
  }
};

function weightedRandom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }
  return Object.keys(weights)[0];
}

function openPack(packType) {
  const pack = PACKS[packType];
  if (!pack) return null;
  
  const cards = [];
  for (let i = 0; i < pack.cards; i++) {
    const rarity = weightedRandom(pack.weights);
    const player = getRandomCard(rarity);
    // 🔥 Я ЬЫ ID Т
    const cardWithId = {
      ...player,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6)
    };
    cards.push(cardWithId);
  }
  return cards;
}

module.exports = (bot) => {
  
  bot.action('shop', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    await ctx.editMessageText(
      '🛒 *агазин*\n\n' +
      '⭐ онет: ' + data.coins + '\n' +
      '💎 ристаллов: ' + data.crystals + '\n\n' +
      '*ыбери пак:*\n' +
      '📦 азовый (100⭐) — 1 карта\n' +
      '🎁 ремиум (500⭐) — 1 карта\n' +
      '💎 егендарный (50💎) — 1 карта',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📦 азовый (100⭐)', 'buy_basic')],
          [Markup.button.callback('🎁 ремиум (500⭐)', 'buy_premium')],
          [Markup.button.callback('💎 егендарный (50💎)', 'buy_legendary')],
          [Markup.button.callback('🔙 азад', 'back')],
        ])
      }
    );
  });

  bot.action(/buy_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const packType = ctx.match[1];
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const pack = PACKS[packType];
    if (!pack) {
      await ctx.editMessageText('❌ ак не найден!');
      return;
    }
    
    const balance = pack.currency === 'coins' ? data.coins : data.crystals;
    const currencyName = pack.currency === 'coins' ? 'монет' : 'кристаллов';
    
    if (balance < pack.price) {
      await ctx.editMessageText(
        '❌ *едостаточно ' + currencyName + '!*\n\n' +
        'ужно: ' + pack.price + '\n' +
        ' тебя: ' + balance,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 азад', 'shop')]])
        }
      );
      return;
    }
    
    if (pack.currency === 'coins') {
      data.coins -= pack.price;
    } else {
      data.crystals -= pack.price;
    }
    
    const cards = openPack(packType);
    if (!cards || cards.length === 0) {
      await ctx.editMessageText('❌ шибка открытия пака!');
      return;
    }
    
    const card = cards[0];
    
    // 🔥 Я   С ID
    const existing = data.cards.find(c => c.name === card.name && c.position === card.position);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      data.cards.push({ ...card, count: 1 });
    }
    
    saveUsers(users);
    
    const emoji = getRarityEmoji(card.rarity);
    const positionEmoji = card.position === 'G' ? '🧤' : '🏒';
    
    let text = '🎉 *' + pack.emoji + ' ' + pack.name + ' пак открыт!*\n\n';
    text += '📋 *Твоя карта:*\n';
    text += emoji + ' ' + positionEmoji + ' ' + card.name + '\n';
    text += 'едкость: ' + card.rarity + '\n';
    text += 'ейтинг: ' + card.overall + ' OVR\n';
    text += 'озиция: ' + (card.position === 'G' ? 'ратарь' : 'олевой') + '\n\n';
    text += '📊 сего карт: ' + data.cards.length + '\n\n';
    text += '💡 *арта добавлена в коллекцию!*\n';
    text += 'тобы добавить её в состав — зайди в 👥 оманда и собери состав.\n\n';
    text += '🔍 *роверь слот вратаря если выпал вратарь!*';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 ткрыть ещё', 'buy_' + packType)],
          [Markup.button.callback('🔙  магазин', 'shop')],
          [Markup.button.callback('👥 ерейти в команду', 'team')],
        ])
      }
    );
  });
};
