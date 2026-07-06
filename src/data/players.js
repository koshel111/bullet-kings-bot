// ============================================
// src/data/players.js - ДАННЫЕ ИГРОКОВ
// ============================================

const PLAYERS = [
  { name: 'Овечкин', overall: 91, rarity: 'Легендарный', position: 'LW' },
  { name: 'Макдэвид', overall: 90, rarity: 'Легендарный', position: 'C' },
  { name: 'Кросби', overall: 88, rarity: 'Эпический', position: 'C' },
  { name: 'Кучеров', overall: 87, rarity: 'Эпический', position: 'RW' },
  { name: 'Панарин', overall: 85, rarity: 'Элитный', position: 'LW' },
  { name: 'Малкин', overall: 84, rarity: 'Элитный', position: 'C' },
  { name: 'Василевский', overall: 83, rarity: 'Элитный', position: 'G' },
  { name: 'Сорокин', overall: 82, rarity: 'Редкий', position: 'G' },
  { name: 'Бобровский', overall: 81, rarity: 'Редкий', position: 'G' },
  { name: 'Кузнецов', overall: 80, rarity: 'Редкий', position: 'C' },
];

const STARTING_CARDS = [
  { name: 'Овечкин', overall: 91, rarity: 'Легендарный', position: 'LW' },
  { name: 'Макдэвид', overall: 90, rarity: 'Легендарный', position: 'C' },
  { name: 'Кросби', overall: 88, rarity: 'Эпический', position: 'C' },
  { name: 'Кучеров', overall: 87, rarity: 'Эпический', position: 'RW' },
  { name: 'Панарин', overall: 85, rarity: 'Элитный', position: 'LW' },
];

function getRandomCard(rarity) {
  const filtered = PLAYERS.filter(p => p.rarity === rarity);
  return filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
}

function getRandomPack(count) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    const rarities = ['Обычный', 'Редкий', 'Элитный', 'Эпический', 'Легендарный'];
    const weights = [45, 30, 18, 6, 1];
    let total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    let selected = rarities[0];
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) { selected = rarities[j]; break; }
    }
    cards.push(getRandomCard(selected));
  }
  return cards;
}

module.exports = { PLAYERS, STARTING_CARDS, getRandomCard, getRandomPack };
