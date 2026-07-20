// ============================================
// src/handlers/donate.js - С ЛОГАМИ ДЛЯ ОТЛАДКИ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ НАСТРОЙКИ СБП
const SBP_CONFIG = {
  phone: process.env.SBP_PHONE || '79991234567',
  bankName: 'Т-Банк (Тинькофф)',
};

// ✅ ЦЕНЫ НА КРИСТАЛЛЫ
const CRYSTAL_PACKS = [
  { id: 'crystal_10', amount: 10, price: 5, label: '10💎 = 5₽' },
  { id: 'crystal_25', amount: 25, price: 12.5, label: '25💎 = 12.5₽' },
  { id: 'crystal_50', amount: 50, price: 25, label: '50💎 = 25₽' },
  { id: 'crystal_100', amount: 100, price: 50, label: '100💎 = 50₽' },
  { id: 'crystal_250', amount: 250, price: 125, label: '250💎 = 125₽' },
  { id: 'crystal_500', amount: 500, price: 250, label: '500💎 = 250₽' },
  { id: 'crystal_1000', amount: 1000, price: 500, label: '1000💎 = 500₽' }
];

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// ✅ ПОКАЗ МАГАЗИНА
async function showDonateShop(ctx) {
  console.log('🛒 [donate] showDonateShop вызвана');
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    console.log('❌ [donate] Пользователь не найден:', userId);
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  console.log('✅ [donate] Пользователь найден:', userId, 'Кристаллов:', data.crystals);
  
  let text = '💎 МАГАЗИН КРИСТАЛЛОВ\n\n';
  text += `💎 Твои кристаллы: ${data.crystals || 0}\n`;
  text += `💰 2💎 = 1₽\n\n`;
  text += 'Выбери пак для покупки:\n\n';
  
  const buttons = [];
  CRYSTAL_PACKS.forEach(pack => {
    text += `📦 ${pack.label}\n`;
    buttons.push([Markup.button.callback(`💰 ${pack.label}`, `donate_buy_${pack.id}`)]);
  });
  
  text += '\n💳 Оплата через СБП';
  text += `\n🏦 Банк: ${SBP_CONFIG.bankName}`;
  text += `\n📱 Номер: ${SBP_CONFIG.phone}`;
  text += '\n📌 После оплаты нажми кнопку "Проверить оплату"';
  
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  console.log('✅ [donate] Магазин показан, кнопок:', buttons.length);
  
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ✅ ПОКУПКА
async function handleDonatePurchase(ctx, packId) {
  console.log('🛒 [donate] handleDonatePurchase вызвана');
  console.log('📦 [donate] packId:', packId);
  
  const userId = ctx.from.id;
  console.log('👤 [donate] userId:', userId);
  
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    console.log('❌ [donate] Пользователь не найден:', userId);
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  console.log('✅ [donate] Пользователь найден');
  
  // ✅ ПОИСК ПАКА С ЛОГАМИ
  console.log('🔍 [donate] Ищем пак с ID:', packId);
  console.log('📋 [donate] Доступные паки:', CRYSTAL_PACKS.map(p => p.id).join(', '));
  
  const pack = CRYSTAL_PACKS.find(p => p.id === packId);
  
  if (!pack) {
    console.log('❌ [donate] Пак НЕ НАЙДЕН! ID:', packId);
    console.log('📋 [donate] Проверь ID пака. Должен быть одним из:', CRYSTAL_PACKS.map(p => p.id).join(', '));
    await ctx.reply(`❌ Пак не найден! ID: ${packId}\n\nДоступные паки:\n${CRYSTAL_PACKS.map(p => `• ${p.id} - ${p.label}`).join('\n')}`);
    return;
  }
  
  console.log('✅ [donate] Пак найден:', pack.id, pack.label);
  
  // ✅ СОЗДАЁМ ЗАКАЗ
  const orderId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  console.log('📦 [donate] Создан заказ:', orderId);
  
  if (!data.orders) data.orders = {};
  data.orders[orderId] = {
    packId: pack.id,
    amount: pack.amount,
    price: pack.price,
    userId: userId,
    created: Date.now(),
    status: 'pending'
  };
  saveUsers(users);
  console.log('✅ [donate] Заказ сохранён:', orderId);
  
  // ✅ ПОКАЗЫВАЕМ РЕКВИЗИТЫ
  const text = 
    `💳 ОПЛАТА ПО СБП\n\n` +
    `📦 Пак: ${pack.label}\n` +
    `💎 ${pack.amount} кристаллов\n` +
    `💰 ${pack.price}₽\n\n` +
    `📱 Номер для перевода:\n` +
    `<b>${SBP_CONFIG.phone}</b>\n\n` +
    `🏦 ${SBP_CONFIG.bankName}\n\n` +
    `📌 ИНСТРУКЦИЯ:\n` +
    `1️⃣ Открой приложение банка\n` +
    `2️⃣ Переведи ${pack.price}₽ на номер ${SBP_CONFIG.phone}\n` +
    `3️⃣ В комментарии укажи: ${orderId}\n` +
    `4️⃣ Нажми кнопку "Проверить оплату"\n\n` +
    `🆔 Номер заказа: <b>${orderId}</b>`;
  
  console.log('✅ [donate] Отправляем реквизиты для заказа:', orderId);
  
  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Проверить оплату', `check_payment_${orderId}`)],
      [Markup.button.callback('📱 Скопировать номер', `copy_phone_${orderId}`)],
      [Markup.button.callback('🔙 Назад', 'donate')]
    ])
  });
}

// ✅ КОПИРОВАТЬ НОМЕР
async function copyPhone(ctx, orderId) {
  console.log('📱 [donate] copyPhone вызвана, orderId:', orderId);
  
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.orders || !data.orders[orderId]) {
    console.log('❌ [donate] Заказ не найден:', orderId);
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  console.log('✅ [donate] Заказ найден, показываем номер');
  
  await ctx.reply(
    `📱 Номер для перевода:\n\n` +
    `<code>${SBP_CONFIG.phone}</code>\n\n` +
    `💰 Сумма: ${data.orders[orderId].price}₽\n` +
    `🆔 Заказ: ${orderId}`,
    { parse_mode: 'HTML' }
  );
}

// ✅ ПРОВЕРКА ОПЛАТЫ
async function checkPayment(ctx, orderId) {
  console.log('✅ [donate] checkPayment вызвана, orderId:', orderId);
  
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.orders || !data.orders[orderId]) {
    console.log('❌ [donate] Заказ не найден:', orderId);
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  const order = data.orders[orderId];
  console.log('📦 [donate] Заказ найден:', order);
  
  // ✅ ДЛЯ ТЕСТА - АВТОМАТИЧЕСКОЕ ЗАЧИСЛЕНИЕ
  data.crystals = (data.crystals || 0) + order.amount;
  order.status = 'completed';
  order.completedAt = Date.now();
  saveUsers(users);
  
  console.log('✅ [donate] Кристаллы зачислены! +' + order.amount + ', всего:', data.crystals);
  
  await ctx.reply(
    `✅ ОПЛАТА ПОДТВЕРЖДЕНА!\n\n` +
    `💎 +${order.amount} кристаллов\n` +
    `💰 ${order.price}₽\n\n` +
    `💎 Теперь у тебя: ${data.crystals} кристаллов\n\n` +
    `Спасибо за поддержку! 🏒`
  );
}

// ✅ АДМИНСКОЕ ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
async function adminConfirmPayment(ctx, orderId) {
  console.log('👑 [donate] adminConfirmPayment вызвана, orderId:', orderId);
  
  const users = getUsers();
  let foundUserId = null;
  let foundOrder = null;
  
  for (const [userId, data] of Object.entries(users)) {
    if (data.orders && data.orders[orderId]) {
      foundUserId = userId;
      foundOrder = data.orders[orderId];
      break;
    }
  }
  
  if (!foundOrder) {
    console.log('❌ [donate] Заказ не найден:', orderId);
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  console.log('✅ [donate] Заказ найден, пользователь:', foundUserId);
  
  users[foundUserId].crystals = (users[foundUserId].crystals || 0) + foundOrder.amount;
  foundOrder.status = 'completed';
  foundOrder.completedAt = Date.now();
  foundOrder.confirmedBy = ctx.from.id;
  saveUsers(users);
  
  console.log('✅ [donate] Кристаллы зачислены админом! +' + foundOrder.amount);
  
  await ctx.reply(
    `✅ ОПЛАТА ПОДТВЕРЖДЕНА АДМИНОМ!\n\n` +
    `👤 Пользователь: ${foundUserId}\n` +
    `💎 +${foundOrder.amount} кристаллов\n` +
    `💰 ${foundOrder.price}₽\n\n` +
    `🆔 Заказ: ${orderId}`
  );
  
  try {
    await ctx.telegram.sendMessage(
      foundUserId,
      `✅ ВАША ОПЛАТА ПОДТВЕРЖДЕНА!\n\n` +
      `💎 +${foundOrder.amount} кристаллов\n` +
      `💰 ${foundOrder.price}₽\n\n` +
      `Спасибо за поддержку! 🏒`
    );
    console.log('✅ [donate] Уведомление отправлено пользователю');
  } catch (e) {
    console.log('❌ [donate] Не удалось отправить уведомление:', e.message);
  }
}

// ✅ ПОКАЗ ВСЕХ ЗАКАЗОВ (АДМИН)
async function showOrders(ctx) {
  console.log('📋 [donate] showOrders вызвана');
  
  const users = getUsers();
  let text = '📋 ВСЕ ЗАКАЗЫ\n\n';
  let hasOrders = false;
  
  for (const [userId, data] of Object.entries(users)) {
    if (data.orders) {
      for (const [orderId, order] of Object.entries(data.orders)) {
        hasOrders = true;
        const status = order.status === 'completed' ? '✅' : '⏳';
        text += `${status} Заказ #${orderId}\n`;
        text += `  👤 ${userId}\n`;
        text += `  💎 ${order.amount} кристаллов\n`;
        text += `  💰 ${order.price}₽\n`;
        text += `  📅 ${new Date(order.created).toLocaleString()}\n`;
        if (order.status === 'completed') {
          text += `  ✅ Оплачен: ${new Date(order.completedAt).toLocaleString()}\n`;
        }
        text += '\n';
      }
    }
  }
  
  if (!hasOrders) {
    text += '❌ Нет заказов';
  }
  
  console.log('✅ [donate] Заказы показаны, всего:', hasOrders ? 'есть' : 'нет');
  
  await ctx.reply(text, { parse_mode: 'HTML' });
}

module.exports = {
  showDonateShop,
  handleDonatePurchase,
  checkPayment,
  adminConfirmPayment,
  showOrders,
  copyPhone,
  CRYSTAL_PACKS,
  SBP_CONFIG
};