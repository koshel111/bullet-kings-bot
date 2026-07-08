const { Markup } = require('telegraf');

module.exports = (bot) => {
  
  bot.action('cosmetics_menu', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Меню косметики');
    await ctx.editMessageText('💄 *Косметика*', {
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
    await ctx.editMessageText('🎽 *Формы*', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('ЦСКА (100⭐)', 'cosm_buy_csk')],
        [Markup.button.callback('Спартак (100⭐)', 'cosm_buy_spartak')],
        [Markup.button.callback('🔙 Назад', 'cosmetics_menu')],
      ])
    });
  });

  bot.action(/cosm_buy_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    console.log(`🔴 НАЖАТА КНОПКА: cosm_buy_${id}`);
    await ctx.editMessageText(`✅ Ты купил: ${id}`);
  });

};
