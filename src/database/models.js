// ============================================
// src/database/models.js - СХЕМЫ ДЛЯ MONGODB
// ============================================

const mongoose = require('mongoose');

// СХЕМА КАРТЫ
const CardSchema = new mongoose.Schema({
  name: String,
  overall: Number,
  rarity: String,
  position: String,
  id: { type: String, unique: true },
  count: { type: Number, default: 1 },
  isCrafted: { type: Boolean, default: false },
  craftedFrom: String
});

// СХЕМА ПОЛЬЗОВАТЕЛЯ
const UserSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  name: { type: String, default: '' },
  username: { type: String, default: '' },
  
  coins: { type: Number, default: 100 },
  crystals: { type: Number, default: 10 },
  dust: { type: Number, default: 0 },
  
  rating: { type: Number, default: 0 },
  league: { type: String, default: 'Бронза' },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  
  cards: { type: [CardSchema], default: [] },
  team: { type: [CardSchema], default: [] },
  teamReady: { type: Boolean, default: false },
  
  jerseys: { type: Array, default: [] },
  arenas: { type: Array, default: [] },
  
  battlepass_xp: { type: Number, default: 0 },
  battlepass_premium: { type: Number, default: 0 },
  claimed_rewards: { type: [String], default: [] },
  
  packs: { type: Map, default: {} },
  seasonal_packs: { type: Array, default: [] },
  
  lastBonus: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

module.exports = { User };