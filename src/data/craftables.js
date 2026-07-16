// ============================================
// src/data/craftables.js - КАРТЫ ДЛЯ КРАФТА (СЕЗОН 1)
// ============================================

const CRAFTABLE_CARDS = [
  {
    id: 'ovechkin_season1',
    name: 'Александр Овечкин',
    league: 'НХЛ',
    overall: 99,
    rarity: 'Икона',
    position: 'LW',
    price: 500,
    emoji: '🔥',
    season: 1,
    description: 'Величайший снайпер в истории НХЛ'
  },
  {
    id: 'semionov_season1',
    name: 'Кирилл Семёнов',
    league: 'КХЛ',
    overall: 94,
    rarity: 'Легендарный',
    position: 'C',
    price: 200,
    emoji: '⭐',
    season: 1,
    description: 'Звезда КХЛ, мастер голевых передач'
  },
  {
    id: 'zaripov_season1',
    name: 'Данис Зарипов',
    league: 'Легенды',
    overall: 98,
    rarity: 'Икона',
    position: 'RW',
    price: 375,
    emoji: '🔥',
    season: 1,
    description: 'Легенда российского хоккея, 5-кратный обладатель Кубка Гагарина'
  },
  {
    id: 'barabanov_season1',
    name: 'Александр Барабанов',
    league: 'КХЛ',
    overall: 91,
    rarity: 'Легендарный',
    position: 'LW',
    price: 125,
    emoji: '⭐',
    season: 1,
    description: 'Один из лучших нападающих КХЛ'
  }
];

function getCraftableCards() {
  return CRAFTABLE_CARDS;
}

function getCraftableCardById(id) {
  return CRAFTABLE_CARDS.find(c => c.id === id);
}

module.exports = {
  CRAFTABLE_CARDS,
  getCraftableCards,
  getCraftableCardById
};