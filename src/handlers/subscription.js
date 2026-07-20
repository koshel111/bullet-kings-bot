// ============================================
// src/handlers/subscription.js - ИСПРАВЛЕННЫЙ
// ============================================

const { Markup } = require('telegraf');

const CHANNEL_ID = '@KOSH_ED'; // ID канала
const CHANNEL_LINK = 'https://t.me/KOSH_ED';

// ✅ ПРОВЕРКА ПОДПИСКИ С ОБРАБОТКОЙ ОШИБОК
async function checkSubscription(ctx) {
  const userId = ctx.from.id;
  
  try {
    // Проверяем, подписан ли пользователь
    const chatMember = await ctx.telegram.getChatMember(CHANNEL_ID, userId);
    
    const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);
    
    if (!isSubscribed) {
      // Если не подписан — отправляем сообщение с кнопкой
      await ctx.reply(
        `🔒 *Для использования бота необходимо подписаться на наш канал!*\n\n` +
        `📢 Канал: ${CHANNEL_LINK}\n\n` +
        `✅ Подпишись и нажми кнопку "Проверить"`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('📢 Подписаться', CHANNEL_LINK)],
            [Markup.button.callback('✅ Проверить подписку', 'check_subscription')]
          ])
        }
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки подписки:', error.message);
    
    // ✅ ЕСЛИ ОШИБКА — ПРОПУСКАЕМ ПРОВЕРКУ (для разработки)
    // ⚠️ В ПРОДАКШЕНЕ УБЕРИТЕ ЭТУ СТРОКУ!
    console.log('⚠️ Проверка подписки пропущена (режим разработки)');
    return true;
    
    // 🔒 РАСКОММЕНТИРУЙТЕ ДЛЯ ПРОДАКШЕНА:
    /*
    await ctx.reply(
      `🔒 *Для использования бота необходимо подписаться на наш канал!*\n\n` +
      `📢 Канал: ${CHANNEL_LINK}\n\n` +
      `⚠️ Бот не может проверить подписку.\n` +
      `Пожалуйста, подпишись и попробуй снова.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 Подписаться', CHANNEL_LINK)],
          [Markup.button.callback('✅ Проверить подписку', 'check_subscription')]
        ])
      }
    );
    return false;
    */
  }
}

// ✅ ОБРАБОТЧИК ПРОВЕРКИ ПОДПИСКИ
async function handleCheckSubscription(ctx) {
  await ctx.answerCbQuery();
  const isSubscribed = await checkSubscription(ctx);
  
  if (isSubscribed) {
    await ctx.reply('✅ *Подписка подтверждена!* Добро пожаловать в бота! 🏒', { parse_mode: 'Markdown' });
    // Показываем главное меню
    const { showMainMenu } = require('./start');
    await showMainMenu(ctx, ctx.bot);
  }
}

module.exports = {
  checkSubscription,
  handleCheckSubscription
};