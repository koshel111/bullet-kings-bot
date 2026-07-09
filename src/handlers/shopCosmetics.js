const { Markup } = require('telegraf');

module.exports = (bot) => {
  
  bot.action('cosmetics_menu', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Меню косметики');
    await ctx.deleteMessage();
    await ctx.reply('🏒 *Косметика*', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎽 Формы', 'cosm_jerseys')],
        [Markup.button.callback('🔙 Назад', 'shop')],
      ])
    });
  });

  bot.action('cosm_jerseys', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Формы открыты');
    await ctx.deleteMessage();
    await ctx.reply('🎽 *Формы*', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('ЦСКА (100⭐)', 'cosm_buy_csk')],
        [Markup.button.callback('🔙 Назад', 'cosmetics_menu')],
      ])
    });
  });

  bot.action('cosm_buy_csk', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('🔴 НАЖАТА КНОПКА: cosm_buy_csk');
    await ctx.deleteMessage();
    await ctx.reply('✅ Ты купил: ЦСКА (тест)');
  });

  bot.action(/cosm_buy_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    console.log(`🔴 НАЖАТА КНОПКА (regex): cosm_buy_${id}`);
    await ctx.deleteMessage();
    await ctx.reply(`✅ Ты купил: ${id} (regex)`);
  });

};

