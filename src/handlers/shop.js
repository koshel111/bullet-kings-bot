// ============================================
// src/handlers/shop.js - МАГАЗИН
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomPack } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const PACKS_PATH = path.join(__dirname, '../../data/packs.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function getPacks() {
  if (!fs.existsSync(PACKS_PATH)) {
    const defaultPacks = {
      packs: [
        { id: 'basic', name: 'Базовый', price: 100, currency: 'coins', cards: 3, description: '3 карты' },
        { id: 'premium', name: 'Премиум', price: 500, currency: 'coins', cards: 5, description: '5 карт' },
        { id: 'legendary', name: 'Легендарный', price: 50, currency: 'crystals', cards: 1, description: '1 карта' },
      ]
    };
    fs.writeFileSync(PACKS_PATH, JSON.stringify(defaultPacks, null, 2));
    return defaultPacks.packs;
  }
  const data = JSON.parse(fs.readFileSync(PACKS_PATH));
  return data.packs || [];
}

module.exports = (bot) => {
  
  bot.action('shop', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const packs = getPacks();
    
    let text = '🛒 *Магазин*\n\n' +
      '⭐ Монет: ' + data.coins + '\n' +
      '💎 Кристаллов: ' + data.crystals + '\n\n' +
      '*Выбери пак:*\n';
    
    const buttons = [];
    
    packs.forEach((pack) => {
      const emoji = pack.currency === 'coins' ? '⭐' : '💎';
      text += '\n📦 *' + pack.name + '* — ' + pack.price + ' ' + emoji + '\n';
      text += '   ' + pack.description + ' (' + pack.cards + ' карт)\n';
      buttons.push([Markup.button.callback('📦 ' + pack.name + ' (' + pack.price + emoji + ')', 'buy_' + pack.id)]);
    });
    
    buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  bot.action(/buy_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const packId = ctx.match[1];
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const packs = getPacks();
    
    const pack = packs.find(p => p.id === packId);
    if (!pack) {
      await ctx.editMessageText('❌ Пак не найден!');
      return;
    }
    
    const balance = pack.currency === 'coins' ? data.coins : data.crystals;
    const currencyName = pack.currency === 'coins' ? 'монет' : 'кристаллов';
    
    if (balance < pack.price) {
      await ctx.editMessageText('❌ *Недостаточно ' + currencyName + '!*\n\nНужно: ' + pack.price + '\nУ тебя: ' + balance, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'shop')]])
      });
      return;
    }
    
    if (pack.currency === 'coins') {
      data.coins -= pack.price;
    } else {
      data.crystals -= pack.price;
    }
    
    const newCards = getRandomPack(pack.cards);
    newCards.forEach(card => {
      const existing = data.cards.find(c => c.name === card.name);
      if (existing) {
        existing.count = (existing.count || 1) + 1;
      } else {
        data.cards.push({ ...card, count: 1 });
      }
    });
    
    saveUsers(users);
    
    let cardsText = '';
    newCards.forEach((c, i) => {
      cardsText += (i+1) + '. ' + c.name + ' - ' + c.rarity + ' (' + c.overall + ' OVR)\n';
    });
    
    await ctx.editMessageText(
      '🎉 *' + pack.name + ' пак открыт!*\n\n' +
      'Получено карт: ' + pack.cards + '\n\n' +
      '📋 *Твои карты:*\n' + cardsText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 В магазин', 'shop')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });
};
