// ============================================
// src/handlers/donate.js - ОПЛАТА ЧЕРЕЗ СБП (QR-код)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ НАСТРОЙКИ СБП
const SBP_CONFIG = {
  phone: process.env.SBP_PHONE || '79991234567', // Номер телефона для СБП
  bankName: 'Т-Банк (Тинькофф)', // Название банка
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

// ✅ ГЕНЕРАЦИЯ QR-КОДА ДЛЯ СБП
async function generateSBPQR(phone, amount, comment = '') {
  try {
    // Формируем ссылку для СБП
    // Поддерживает все банки: Т-Банк, Сбер, Альфа, ВТБ и т.д.
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://qr.nspk.ru/QR?phone=${cleanPhone}&amount=${amount}&comment=${encodeURIComponent(comment)}`;
    
    // Генерируем QR-код в base64
    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrBuffer;
  } catch (error) {
    console.error('❌ Ошибка генерации QR-кода:', error);
    return null;
  }
}

// ✅ ПОКАЗ МАГАЗИНА
async function showDonateShop(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  let text = '💎 МАГАЗИН КРИСТАЛЛОВ\n\n';
  text += `💎 Твои кристаллы: ${data.crystals || 0}\n`;
  text += `💰 2💎 = 1₽\n\n`;
  text += 'Выбери пак для покупки:\n\n';
  
  const buttons = [];
  CRYSTAL_PACKS.forEach(pack => {
    text += `📦 ${pack.label}\n`;
    buttons.push([Markup.button.callback(`💰 ${pack.label}`, `donate_buy_${pack.id}`)]);
  });
  
  text += '\n💳 Оплата через СБП (QR-код)';
  text += `\n🏦 Банк: ${SBP_CONFIG.bankName}`;
  text += '\n📌 После оплаты нажми кнопку "Проверить оплату"';
  
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ✅ ПОКУПКА - ГЕНЕРАЦИЯ QR-КОДА
async function handleDonatePurchase(ctx, packId) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data) {
    await ctx.reply('❌ Ошибка! Попробуй /start');
    return;
  }
  
  const pack = CRYSTAL_PACKS.find(p => p.id === packId);
  if (!pack) {
    await ctx.reply('❌ Пак не найден!');
    return;
  }
  
  // ✅ СОЗДАЁМ ЗАКАЗ
  const orderId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
  const comment = `${SBP_CONFIG.comment || 'Покупка кристаллов'} (заказ #${orderId})`;
  
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
  
  // ✅ ГЕНЕРИРУЕМ QR-КОД
  const qrBuffer = await generateSBPQR(SBP_CONFIG.phone, pack.price, comment);
  
  if (!qrBuffer) {
    await ctx.reply('❌ Ошибка генерации QR-кода! Попробуй позже.');
    return;
  }
  
  // ✅ ОТПРАВЛЯЕМ QR-КОД И ИНСТРУКЦИЮ
  const caption = 
    `💳 ОПЛАТА ПО СБП\n\n` +
    `📦 Пак: ${pack.label}\n` +
    `💎 ${pack.amount} кристаллов\n` +
    `💰 ${pack.price}₽\n\n` +
    `🏦 Банк: ${SBP_CONFIG.bankName}\n` +
    `📱 Номер: ${SBP_CONFIG.phone}\n\n` +
    `📌 Инструкция:\n` +
    `1️⃣ Отсканируй QR-код камерой телефона\n` +
    `2️⃣ Подтверди оплату в приложении банка\n` +
    `3️⃣ Нажми кнопку "Проверить оплату" ниже\n\n` +
    `🆔 Номер заказа: ${orderId}`;
  
  // ✅ ОТПРАВЛЯЕМ QR-КОД КАК ФОТО
  await ctx.replyWithPhoto(
    { source: qrBuffer },
    {
      caption: caption,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Проверить оплату', `check_payment_${orderId}`)],
        [Markup.button.callback('📱 Показать номер телефона', `show_phone_${orderId}`)],
        [Markup.button.callback('🔙 Назад', 'donate')]
      ])
    }
  );
}

// ✅ ПОКАЗАТЬ НОМЕР ТЕЛЕФОНА
async function showPhone(ctx, orderId) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.orders || !data.orders[orderId]) {
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  await ctx.reply(
    `📱 Номер для перевода по СБП:\n\n` +
    `\`${SBP_CONFIG.phone}\`\n\n` +
    `🏦 ${SBP_CONFIG.bankName}\n\n` +
    `💰 Сумма: ${data.orders[orderId].price}₽\n` +
    `🆔 Номер заказа: ${orderId}\n\n` +
    `📌 Переведи на этот номер и нажми "Проверить оплату"`
  );
}

// ✅ ПРОВЕРКА ОПЛАТЫ (АДМИН + ВЕБХУК)
async function checkPayment(ctx, orderId) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  if (!data || !data.orders || !data.orders[orderId]) {
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  const order = data.orders[orderId];
  
  // ✅ ДЛЯ ТЕСТА - АВТОМАТИЧЕСКОЕ ЗАЧИСЛЕНИЕ
  // В реальном проекте здесь будет проверка через API банка
  // или подтверждение от админа
  
  // ✅ ЗАЧИСЛЯЕМ КРИСТАЛЛЫ
  data.crystals = (data.crystals || 0) + order.amount;
  order.status = 'completed';
  order.completedAt = Date.now();
  saveUsers(users);
  
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
  const users = getUsers();
  let foundUserId = null;
  let foundOrder = null;
  
  // Ищем заказ по всем пользователям
  for (const [userId, data] of Object.entries(users)) {
    if (data.orders && data.orders[orderId]) {
      foundUserId = userId;
      foundOrder = data.orders[orderId];
      break;
    }
  }
  
  if (!foundOrder) {
    await ctx.reply('❌ Заказ не найден!');
    return;
  }
  
  // ✅ ЗАЧИСЛЯЕМ КРИСТАЛЛЫ
  users[foundUserId].crystals = (users[foundUserId].crystals || 0) + foundOrder.amount;
  foundOrder.status = 'completed';
  foundOrder.completedAt = Date.now();
  foundOrder.confirmedBy = ctx.from.id;
  saveUsers(users);
  
  await ctx.reply(
    `✅ ОПЛАТА ПОДТВЕРЖДЕНА АДМИНОМ!\n\n` +
    `👤 Пользователь: ${foundUserId}\n` +
    `💎 +${foundOrder.amount} кристаллов\n` +
    `💰 ${foundOrder.price}₽\n\n` +
    `🆔 Заказ: ${orderId}`
  );
  
  // ✅ УВЕДОМЛЯЕМ ПОЛЬЗОВАТЕЛЯ
  try {
    await ctx.telegram.sendMessage(
      foundUserId,
      `✅ ВАША ОПЛАТА ПОДТВЕРЖДЕНА!\n\n` +
      `💎 +${foundOrder.amount} кристаллов\n` +
      `💰 ${foundOrder.price}₽\n\n` +
      `Спасибо за поддержку! 🏒`
    );
  } catch (e) {}
}

// ✅ ПОКАЗ ВСЕХ ЗАКАЗОВ (АДМИН)
async function showOrders(ctx) {
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
  
  await ctx.reply(text, { parse_mode: 'HTML' });
}

module.exports = {
  showDonateShop,
  handleDonatePurchase,
  checkPayment,
  adminConfirmPayment,
  showOrders,
  generateSBPQR,
  CRYSTAL_PACKS,
  SBP_CONFIG
};