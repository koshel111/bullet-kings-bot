const { Markup } = require('telegraf');

module.exports = (bot) => {
  
  bot.action('cosmetics_menu', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Меню косметики');
    await ctx.editMessageText('💄 *Косметика*', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎽 Формы', 'test_jerseys')],
        [Markup.button.callback('🔙 Назад', 'shop')],
      ])
    });
  });

  bot.action('test_jerseys', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('✅ Формы открыты');
    await ctx.editMessageText('🎽 *Формы*', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('ЦСКА (100⭐)', 'test_buy_csk')],
        [Markup.button.callback('🔙 Назад', 'cosmetics_menu')],
      ])
    });
  });

  bot.action('test_buy_csk', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('🔴 НАЖАТА КНОПКА: test_buy_csk');
    await ctx.editMessageText('✅ Ты купил: csk (тест)');
  });

};
