// ============================================
// src/database/db.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// ============================================
// ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ
// ============================================
function initDatabase() {
  db.serialize(() => {
    // Таблица пользователей
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        coins INTEGER DEFAULT 100,
        crystals INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 1000,
        league TEXT DEFAULT 'Бронза',
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        matches INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        battlepass_level INTEGER DEFAULT 0,
        battlepass_premium INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица карточек
    db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_id TEXT,
        name TEXT,
        position TEXT,
        overall INTEGER,
        rarity TEXT,
        team TEXT,
        count INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Таблица команды
    db.run(`
      CREATE TABLE IF NOT EXISTS team (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_id TEXT,
        name TEXT,
        position TEXT,
        overall INTEGER,
        rarity TEXT,
        team TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Таблица матчей
    db.run(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        opponent TEXT,
        score TEXT,
        result TEXT,
        coins_earned INTEGER DEFAULT 0,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Таблица боевого пропуска
    db.run(`
      CREATE TABLE IF NOT EXISTS battlepass (
        user_id INTEGER PRIMARY KEY,
        level INTEGER DEFAULT 0,
        premium BOOLEAN DEFAULT 0,
        claimed TEXT DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ
// ============================================

async function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function createUser(userId, username, firstName) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, username, first_name) VALUES (?, ?, ?)',
      [userId, username || '', firstName || ''],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function getUserOrCreate(userId, username, firstName) {
  const user = await getUser(userId);
  if (!user) {
    await createUser(userId, username, firstName);
    return getUser(userId);
  }
  return user;
}

async function updateUserStats(userId, result, coinsEarned = 0) {
  const fields = {
    wins: 'wins = wins + 1',
    losses: 'losses = losses + 1',
    draws: 'draws = draws + 1'
  };
  
  const updateField = fields[result] || 'draws = draws + 1';
  
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET ${updateField}, matches = matches + 1, coins = coins + ?, xp = xp + 10 WHERE id = ?`,
      [coinsEarned, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function addCoins(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [amount, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function addCrystals(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET crystals = crystals + ? WHERE id = ?',
      [amount, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function removeCoins(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [amount, userId, amount],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function removeCrystals(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET crystals = crystals - ? WHERE id = ? AND crystals >= ?',
      [amount, userId, amount],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С КАРТОЧКАМИ
// ============================================

async function getUserCards(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM cards WHERE user_id = ?',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

async function addCard(userId, cardData) {
  return new Promise((resolve, reject) => {
    const { id: cardId, name, position, overall, rarity, team } = cardData;
    
    db.get(
      'SELECT * FROM cards WHERE user_id = ? AND card_id = ?',
      [userId, cardId],
      (err, row) => {
        if (err) reject(err);
        else if (row) {
          db.run(
            'UPDATE cards SET count = count + 1 WHERE user_id = ? AND card_id = ?',
            [userId, cardId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        } else {
          db.run(
            'INSERT INTO cards (user_id, card_id, name, position, overall, rarity, team) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, cardId, name, position, overall, rarity, team || ''],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        }
      }
    );
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С КОМАНДОЙ
// ============================================

async function getUserTeam(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM team WHERE user_id = ?',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

async function addToTeam(userId, player) {
  return new Promise((resolve, reject) => {
    const cardId = player.card_id || player.id;
    db.run(
      `INSERT INTO team (user_id, card_id, name, position, overall, rarity, team) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cardId, player.name, player.position, player.overall, player.rarity, player.team || ''],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function removeFromTeam(userId, cardId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM team WHERE user_id = ? AND card_id = ?',
      [userId, cardId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function clearTeam(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM team WHERE user_id = ?',
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function removeGoalie(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM team WHERE user_id = ? AND position = "G"',
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ МАТЧЕЙ
// ============================================

async function addMatch(userId, opponent, score, result, coinsEarned = 0) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO matches (user_id, opponent, score, result, coins_earned) VALUES (?, ?, ?, ?, ?)',
      [userId, opponent, score, result, coinsEarned],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function getMatchesHistory(userId, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM matches WHERE user_id = ? ORDER BY played_at DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// ============================================
// ФУНКЦИИ ДЛЯ БОЕВОГО ПРОПУСКА
// ============================================

async function getBattlepass(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM battlepass WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function initBattlepass(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO battlepass (user_id, level, premium, claimed) VALUES (?, 0, 0, "")',
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function updateBattlepassLevel(userId, level) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE battlepass SET level = ? WHERE user_id = ?',
      [level, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function claimBattlepassReward(userId, level, isPremium = false) {
  return new Promise((resolve, reject) => {
    const field = isPremium ? 'premium_claimed' : 'claimed';
    db.run(
      `UPDATE battlepass SET ${field} = ${field} || ? WHERE user_id = ?`,
      [level + ',', userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
  initDatabase,
  getUser,
  createUser,
  getUserOrCreate,
  updateUserStats,
  addCoins,
  addCrystals,
  removeCoins,
  removeCrystals,
  getUserCards,
  addCard,
  getUserTeam,
  addToTeam,
  removeFromTeam,
  clearTeam,
  removeGoalie,
  addMatch,
  getMatchesHistory,
  getBattlepass,
  initBattlepass,
  updateBattlepassLevel,
  claimBattlepassReward
};

initDatabase();
console.log('✅ База данных инициализирована');