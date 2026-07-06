// ============================================
// src/handlers/shop.js - МАГАЗИН
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRandomPack } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
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
      '*Выбери пак:*',
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
    
    const packs = {
      basic: { name: 'Базовый', price: 100, currency: 'coins', count: 3 },
      premium: { name: 'Премиум', price: 500, currency: 'coins', count: 5 },
      legendary: { name: 'Легендарный', price: 50, currency: 'crystals', count: 1 },
    };
    
    const pack = packs[packType];
    if (!pack) {
      await ctx.editMessageText('❌ Пак не найден!');
      return;
    }
    
    const balance = pack.currency === 'coins' ? data.coins : data.crystals;
    const currencyName = pack.currency === 'coins' ? 'монет' : 'кристаллов';
    
    if (balance < pack.price) {
      await ctx.editMessageText('❌ *Недостаточно ' + currencyName + '!*\n\nНужно: ' + pack.price + '\nУ тебя: ' + balance, { parse_mode: 'Markdown' });
      return;
    }
    
    if (pack.currency === 'coins') {
      data.coins -= pack.price;
    } else {
      data.crystals -= pack.price;
    }
    
    const newCards = getRandomPack(pack.count);
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
      'Получено карт: ' + pack.count + '\n\n' +
      '📋 *Твои карты:*\n' + cardsText,
      { parse_mode: 'Markdown' }
    );
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });
};
