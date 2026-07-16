// ============================================
// src/database/mongoose.js - ПРОСТОЕ ПОДКЛЮЧЕНИЕ
// ============================================

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI не найден в .env!');
  process.exit(1);
}

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