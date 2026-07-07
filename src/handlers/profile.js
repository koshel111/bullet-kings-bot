// ============================================
// src/handlers/profile.js - ПРОФИЛЬ (С ЭМОДЗИ РЕДКОСТИ)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const bonus = Math.floor(Math.random() * 50) + 10;
    data.coins += bonus;
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    await ctx.editMessageText('🎁 *Бонус получен!*\n\n⭐ +' + bonus + ' монет', { parse_mode: 'Markdown' });
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });

  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '👥 *Твоя команда:*\n\n';
    if (data.team.length === 0) {
      text += 'У тебя пока нет игроков в команде!';
    } else {
      data.team.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        text += (i+1) + '. ' + emoji + ' ' + p.name + ' - ' + p.rarity + ' (' + p.overall + ' OVR)\n';
      });
    }
    
    await ctx.editMessageText(text, { parse_mode: 'Markdown' });
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });

  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '📚 *Твоя коллекция:*\n\n';
    if (data.cards.length === 0) {
      text += 'У тебя пока нет карточек!';
    } else {
      data.cards.forEach((c) => {
        const emoji = getRarityEmoji(c.rarity);
        text += emoji + ' ' + c.name + ' - ' + c.rarity + ' (' + c.overall + ' OVR) x' + (c.count || 1) + '\n';
      });
      text += '\nВсего карт: ' + data.cards.length;
    }
    
    await ctx.editMessageText(text, { parse_mode: 'Markdown' });
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    // Подсчёт карт по редкостям
    const rarityCount = {};
    data.cards.forEach(c => {
      rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + (c.count || 1);
    });
    
    let rarityText = '';
    const rarities = ['Обычный', 'Редкий', 'Элитный', 'Эпический', 'Легендарный', 'Икона'];
    rarities.forEach(r => {
      if (rarityCount[r]) {
        const emoji = getRarityEmoji(r);
        rarityText += emoji + ' ' + r + ': ' + rarityCount[r] + '\n';
      }
    });
    
    await ctx.editMessageText(
      '👤 *Профиль*\n\n' +
      'Имя: ' + user.first_name + '\n' +
      'ID: ' + user.id + '\n\n' +
      '📊 *Статистика:*\n' +
      '🏆 Рейтинг: ' + data.rating + '\n' +
      '🥇 Лига: ' + data.league + '\n' +
      '✅ Побед: ' + data.wins + '\n' +
      '❌ Поражений: ' + data.losses + '\n' +
      '⚖️ Ничьих: ' + data.draws + '\n' +
      '⭐ Монет: ' + data.coins + '\n' +
      '💎 Кристаллов: ' + data.crystals + '\n' +
      '📚 Карт: ' + data.cards.length + '\n' +
      '📊 Матчей: ' + data.matches + '\n\n' +
      '📋 *Карты по редкостям:*\n' + rarityText,
      { parse_mode: 'Markdown' }
    );
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });
};
