// ============================================
// src/database/migrate.js - ПЕРЕНОС ДАННЫХ
// ============================================

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('./mongoose');
const { User } = require('./models');

const DB_PATH = path.join(__dirname, '../../data/database.json');

async function migrate() {
  console.log('🔄 Начинаем миграцию данных из JSON в MongoDB...');
  
  // Подключаемся к MongoDB
  try {
    await connectDB();
    console.log('✅ Подключено к MongoDB');
  } catch (error) {
    console.error('❌ Не удалось подключиться к MongoDB:', error.message);
    process.exit(1);
  }
  
  // Проверяем наличие JSON файла
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Файл database.json не найден!');
    process.exit(0);
  }
  
  const jsonData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const users = jsonData.users || {};
  const userCount = Object.keys(users).length;
  
  console.log(`📊 Найдено ${userCount} пользователей в JSON`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const [userId, userData] of Object.entries(users)) {
    try {
      const userIdNum = parseInt(userId);
      const existing = await User.findOne({ userId: userIdNum });
      
      const userDoc = {
        userId: userIdNum,
        name: userData.name || userData.firstName || '',
        username: userData.username || '',
        coins: userData.coins || 100,
        crystals: userData.crystals || 10,
        dust: userData.dust || 0,
        rating: userData.rating || 0,
        league: userData.league || 'Бронза',
        wins: userData.wins || 0,
        losses: userData.losses || 0,
        draws: userData.draws || 0,
        matches: userData.matches || 0,
        cards: userData.cards || [],
        team: userData.team || [],
        teamReady: userData.teamReady || false,
        jerseys: userData.jerseys || [],
        arenas: userData.arenas || [],
        battlepass_xp: userData.battlepass_xp || 0,
        battlepass_premium: userData.battlepass_premium || 0,
        claimed_rewards: userData.claimed_rewards || [],
        packs: userData.packs || {},
        seasonal_packs: userData.seasonal_packs || [],
        lastBonus: userData.lastBonus ? new Date(userData.lastBonus) : null,
        registeredAt: userData.registeredAt ? new Date(userData.registeredAt) : new Date()
      };
      
      if (existing) {
        await User.updateOne({ userId: userIdNum }, userDoc);
        updated++;
        console.log(`🔄 Обновлён пользователь ${userId}`);
      } else {
        const newUser = new User(userDoc);
        await newUser.save();
        created++;
        console.log(`✅ Создан пользователь ${userId}`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Ошибка при обработке пользователя ${userId}:`, error.message);
    }
  }
  
  console.log(`\n📊 РЕЗУЛЬТАТ: Создано: ${created}, Обновлено: ${updated}, Ошибок: ${errors}`);
  process.exit(0);
}

migrate();