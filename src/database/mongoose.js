const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// ✅ ЯВНО УКАЗЫВАЕМ ПУТЬ К .ENV
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI не найден в .env!');
  console.log('📁 Текущая папка:', __dirname);
  console.log('📁 Путь к .env:', path.join(__dirname, '../../.env'));
  process.exit(1);
}

console.log('✅ MONGODB_URI найден');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log('✅ Уже подключены к MongoDB');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Подключено к MongoDB Atlas!');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
    throw error;
  }
}

module.exports = { connectDB };