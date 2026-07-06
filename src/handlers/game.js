// ============================================
// src/handlers/game.js - ИГРА
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

module.exports = (bot) => {
  
  bot.action('play', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🎮 *Выбери режим:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Против ИИ', 'play_ai')],
          [Markup.button.callback('⚔️ PvP', 'play_pvp')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('play_ai', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const isGoal = Math.random() > 0.4;
    const aiGoal = Math.random() > 0.5;
    
    let resultText = '🎯 *Результат:*\n\n';
    resultText += 'Твой бросок: ' + (isGoal ? '⚡ ГОЛ! 🎉' : '😤 СЭЙВ!') + '\n';
    resultText += 'ИИ: ' + (aiGoal ? '⚡ ГОЛ! 😱' : '😤 СЭЙВ!') + '\n\n';
    
    if (isGoal && !aiGoal) {
      resultText += '🏆 *ТЫ ПОБЕДИЛ!* +20⭐';
      data.wins++;
      data.coins += 20;
      data.rating += 25;
    } else if (!isGoal && aiGoal) {
      resultText += '💀 *ТЫ ПРОИГРАЛ...*';
      data.losses++;
      data.rating -= 10;
    } else {
      resultText += '⚖️ *НИЧЬЯ!*';
      data.draws++;
    }
    
    data.matches++;
    data.league = data.rating >= 2000 ? 'Легенда' :
                  data.rating >= 1800 ? 'Мастер' :
                  data.rating >= 1600 ? 'Алмаз' :
                  data.rating >= 1400 ? 'Платина' :
                  data.rating >= 1200 ? 'Золото' :
                  data.rating >= 1000 ? 'Серебро' : 'Бронза';
    
    saveUsers(users);
    
    await ctx.editMessageText(resultText, { parse_mode: 'Markdown' });
    await ctx.reply('🔙 Назад', Markup.inlineKeyboard([Markup.button.callback('🔙 Назад', 'back')]));
  });

  bot.action('play_pvp', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⚔️ *PvP режим*\n\n' +
      'Идёт поиск соперника... ⏳\n' +
      'Ожидание: до 20 секунд\n\n' +
      '⚠️ PvP в разработке!\n' +
      'Пока играй против ИИ 🤖',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });
};
