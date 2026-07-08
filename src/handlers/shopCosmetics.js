// ============================================
// src/handlers/shopCosmetics.js - МИНИМАЛЬНАЯ ВЕРСИЯ
// ============================================

const { Markup } = require('telegraf');

module.exports = (bot) => {
  
  bot.action('cosmetics_menu', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Меню косметики открыто!');
    await ctx.editMessageText('💄 Косметика работает!');
  });

  bot.action(/buy_jersey_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    console.log(`🔴 НАЖАТА КНОПКА ФОРМЫ: ${ctx.match[1]}`);
    await ctx.editMessageText(`✅ Ты выбрал форму: ${ctx.match[1]}`);
  });

};