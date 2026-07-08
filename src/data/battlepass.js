// ============================================
// src/data/battlepass.js - 30 УРОВНЕЙ
// ============================================

const BATTLEPASS_LEVELS = [
  { level: 1, xp: 0, free: '20 монет', premium: '50 монет + 5 кристаллов' },
  { level: 2, xp: 20, free: '25 монет', premium: '60 монет' },
  { level: 3, xp: 40, free: 'Обычная форма (временная)', premium: 'Обычная форма (навсегда)' },
  { level: 4, xp: 60, free: '30 монет', premium: '70 монет + 5 кристаллов' },
  { level: 5, xp: 80, free: '5 кристаллов', premium: '10 кристаллов' },
  { level: 6, xp: 100, free: '35 монет', premium: '80 монет' },
  { level: 7, xp: 120, free: 'Базовый пак', premium: 'Премиум пак' },
  { level: 8, xp: 140, free: '40 монет', premium: '90 монет + 10 кристаллов' },
  { level: 9, xp: 160, free: '10 кристаллов', premium: 'Обычная арена (навсегда)' },
  { level: 10, xp: 180, free: '50 монет', premium: '100 монет + 15 кристаллов' },
  { level: 11, xp: 200, free: 'Редкая форма (временная)', premium: 'Редкая форма (навсегда)' },
  { level: 12, xp: 220, free: '60 монет', premium: '120 монет + 5 кристаллов' },
  { level: 13, xp: 240, free: '15 кристаллов', premium: '25 кристаллов' },
  { level: 14, xp: 260, free: '70 монет', premium: '140 монет' },
  { level: 15, xp: 280, free: 'Премиум пак', premium: 'Легендарный пак' },
  { level: 16, xp: 300, free: '80 монет', premium: '160 монет + 10 кристаллов' },
  { level: 17, xp: 320, free: 'Редкая арена (временная)', premium: 'Редкая арена (навсегда)' },
  { level: 18, xp: 340, free: '90 монет', premium: '180 монет + 15 кристаллов' },
  { level: 19, xp: 360, free: '20 кристаллов', premium: '30 кристаллов' },
  { level: 20, xp: 380, free: '100 монет', premium: '200 монет + 20 кристаллов' },
  { level: 21, xp: 400, free: 'Эпическая форма (временная)', premium: 'Эпическая форма (навсегда)' },
  { level: 22, xp: 420, free: '110 монет', premium: '220 монет + 10 кристаллов' },
  { level: 23, xp: 440, free: '25 кристаллов', premium: '35 кристаллов' },
  { level: 24, xp: 460, free: '120 монет', premium: '240 монет + 15 кристаллов' },
  { level: 25, xp: 480, free: 'Сезонный пак', premium: 'Сезонный пак + 50 кристаллов' },
  { level: 26, xp: 500, free: '130 монет', premium: '260 монет + 20 кристаллов' },
  { level: 27, xp: 520, free: 'Эпическая арена (временная)', premium: 'Эпическая арена (навсегда)' },
  { level: 28, xp: 540, free: '140 монет', premium: '280 монет + 25 кристаллов' },
  { level: 29, xp: 560, free: '30 кристаллов', premium: '40 кристаллов' },
  { level: 30, xp: 580, free: 'Легендарная карта (90-95)', premium: 'Легендарная карта (95-99)' },
];

const XP_PER_LEVEL = 20;

function getLevelByXP(xp) {
  let level = 0;
  let remainingXp = xp;
  while (remainingXp >= XP_PER_LEVEL && level < 30) {
    remainingXp -= XP_PER_LEVEL;
    level++;
  }
  return { level, remainingXp };
}

function getLevelData(level) {
  return BATTLEPASS_LEVELS.find(l => l.level === level) || null;
}

function getAllLevels() {
  return BATTLEPASS_LEVELS;
}

module.exports = {
  BATTLEPASS_LEVELS,
  XP_PER_LEVEL,
  getLevelByXP,
  getLevelData,
  getAllLevels,
};
