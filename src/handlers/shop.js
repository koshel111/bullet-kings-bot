// ============================================
// src/handlers/shop.js - С ЗАДЕРЖКОЙ ПРИ ОТКРЫТИИ
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

// ✅ ФУНКЦИЯ ДЛЯ ЗАДЕРЖКИ
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PACKS = {
  basic: {
    name: 'Базовый',
    price: 100,
    currency: 'coins',
    cards: 1,
    description: '1 карта, шанс на редкую',
    emoji: '📦',
    weights: {
      'Обычный': 45,
      'Редкий': 30,
      'Элитный': 18,
      'Эпический': 6.9,
      'Легендарный': 0.1,
      'Икона': 0
    }
  },
  premium: {
    name: 'Премиум',
    price: 500,
    currency: 'coins',
    cards: 1,
    description: '1 карта, шанс на эпическую',
    emoji: '🎁',
    weights: {
      'Обычный': 0,
      'Редкий': 30,
      'Элитный': 35,
      'Эпический': 25,
      'Легендарный': 9,
      'Икона': 1
    }
  },
  legendary: {
    name: 'Легендарный',
    price: 50,
    currency: 'crystals',
    cards: 1,
    description: '1 карта, шанс на икону',
    emoji: '💎',
    weights: {
      'Обычный': 0,
      'Редкий': 0,
      'Элитный': 15,
      'Эпический': 35,
      'Легендарный': 40,
      'Икона': 10
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
    const cardWithId = {
      ...player,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      count: 1
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
      '🛒 *Магазин*\n\n' +
      '⭐ Монет: ' + data.coins + '\n' +
      '💎 Кристаллов: ' + data.crystals + '\n\n' +
      '*Выбери пак:*\n' +
      '📦 Базовый (100⭐) — 1 карта\n' +
      '🎁 Премиум (500⭐) — 1 карта\n' +
      '💎 Легендарный (50💎) — 1 карта',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📦 Базовый (100⭐)', 'buy_basic')],
          [Markup.button.callback('🎁 Премиум (500⭐)', 'buy_premium')],
          [Markup.button.callback('💎 Легендарный (50💎)', 'buy_legendary')],
          [Markup.button.callback('🔙 Назад', 'back')],
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
      await ctx.editMessageText('❌ Пак не найден!');
      return;
    }
    
    const balance = pack.currency === 'coins' ? data.coins : data.crystals;
    const currencyName = pack.currency === 'coins' ? 'монет' : 'кристаллов';
    
    if (balance < pack.price) {
      await ctx.editMessageText(
        '❌ *Недостаточно ' + currencyName + '!*\n\n' +
        'Нужно: ' + pack.price + '\n' +
        'У тебя: ' + balance,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'shop')]])
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
      await ctx.editMessageText('❌ Ошибка открытия пака!');
      return;
    }
    
    const card = cards[0];
    
    const existing = data.cards.find(c => c.name === card.name && c.position === card.position);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      data.cards.push({ ...card, count: 1 });
    }
    
    saveUsers(users);
    
    const emoji = getRarityEmoji(card.rarity);
    const positionEmoji = card.position === 'G' ? '🧤' : '🏒';
    const posName = card.position === 'G' ? 'Вратарь' : 'Полевой';
    
    // ✅ ОТПРАВЛЯЕМ 4 СООБЩЕНИЯ С ЗАДЕРЖКОЙ 3 СЕКУНДЫ
    await ctx.editMessageText(
      '🎉 *' + pack.emoji + ' ' + pack.name + ' пак открыт!*',
      { parse_mode: 'Markdown' }
    );
    
    await sleep(3000);
    
    await ctx.reply(
      '📋 *Позиция:* ' + posName,
      { parse_mode: 'Markdown' }
    );
    
    await sleep(3000);
    
    await ctx.reply(
      '🏆 *Редкость:* ' + card.rarity + ' ' + emoji,
      { parse_mode: 'Markdown' }
    );
    
    await sleep(3000);
    
    await ctx.reply(
      '📊 *Рейтинг:* ' + card.overall + ' OVR',
      { parse_mode: 'Markdown' }
    );
    
    await sleep(3000);
    
    // Финальное сообщение с полной информацией
    let finalText = 
      '🃏 *' + card.name + '*\n\n' +
      positionEmoji + ' ' + posName + '\n' +
      emoji + ' ' + card.rarity + '\n' +
      '📊 ' + card.overall + ' OVR\n\n' +
      '💡 Карта добавлена в коллекцию!\n' +
      '📊 Всего карт: ' + data.cards.length;
    
    await ctx.reply(finalText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Открыть ещё', 'buy_' + packType)],
        [Markup.button.callback('🔙 В магазин', 'shop')],
        [Markup.button.callback('👥 Перейти в команду', 'team')],
      ])
    });
  });
};