// ============================================
// src/handlers/donate.js - ДОНАТ И МАГАЗИН
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

// ✅ ЦЕНЫ НА КРИСТАЛЛЫ (2 кристалла = 1 рубль)
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

// ✅ ПОКАЗ МАГАЗИНА КРИСТАЛЛОВ
async function showDonateShop(ctx) {
  const userId = ctx.from.id;
  const users = getUsers();
  const data = users[userId];
  
  let text = '💎 *МАГАЗИН КРИСТАЛЛОВ*\n\n';
  text += `💎 Твои кристаллы: ${data.crystals || 0}\n`;
  text += `💰 2💎 = 1₽\n\n`;
  text += '*Выбери пак:*\n\n';
  
  const buttons = [];
  CRYSTAL_PACKS.forEach(pack => {
    text += `📦 ${pack.label}\n`;
    buttons.push([Markup.button.callback(`💰 ${pack.label}`, `donate_${pack.id}`)]);
  });
  
  text += '\n📌 *Как купить:*\n';
  text += '1. Выбери пак\n';
  text += '2. Оплати через СБП\n';
  text += '3. Кристаллы зачислятся автоматически\n\n';
  text += '💳 *Реквизиты для оплаты:*\n';
  text += 'По номеру телефона: +7 (999) 123-45-67\n';
  text += 'Или по ссылке: https://www.tinkoff.ru/...\n\n';
  text += '📩 После оплаты отправь скриншот @Koshelev_11';
  
  buttons.push([Markup.button.callback('🔙 Назад', 'back')]);
  
  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

// ✅ ОБРАБОТКА ПОКУПКИ (ТОЛЬКО ДЛЯ АДМИНА)
async function handleDonatePurchase(ctx, packId) {
  const userId = ctx.from.id;
  const users = getUsers();
  
  // Проверяем, является ли пользователь админом (для автозачисления)
  // В реальности здесь будет проверка оплаты через админа
  const pack = CRYSTAL_PACKS.find(p => p.id === packId);
  if (!pack) {
    await ctx.reply('❌ Пак не найден!');
    return;
  }
  
  await ctx.reply(
    `💎 *Заказ принят!*\n\n` +
    `📦 Пак: ${pack.label}\n` +
    `💎 ${pack.amount} кристаллов\n` +
    `💰 ${pack.price}₽\n\n` +
    `📩 Оплати по реквизитам и отправь скриншот @Koshelev_11\n\n` +
    `⏳ После подтверждения кристаллы будут зачислены`,
    { parse_mode: 'Markdown' }
  );
}

// ✅ АДМИНСКАЯ КОМАНДА ДЛЯ ЗАЧИСЛЕНИЯ КРИСТАЛЛОВ
async function adminAddCrystals(ctx, userId, amount) {
  const users = getUsers();
  if (!users[userId]) {
    await ctx.reply('❌ Пользователь не найден!');
    return;
  }
  
  users[userId].crystals = (users[userId].crystals || 0) + amount;
  saveUsers(users);
  
  // Уведомляем пользователя
  try {
    await ctx.telegram.sendMessage(
      userId,
      `💎 *Кристаллы зачислены!*\n\n` +
      `➕ +${amount}💎\n` +
      `💰 Спасибо за поддержку! 🏒`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
  
  await ctx.reply(`✅ Зачислено ${amount}💎 пользователю ${userId}`);
}

module.exports = {
  showDonateShop,
  handleDonatePurchase,
  adminAddCrystals,
  CRYSTAL_PACKS
};