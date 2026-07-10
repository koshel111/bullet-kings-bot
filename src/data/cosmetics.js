// ============================================
// src/data/cosmetics.js - ВСЯ КОСМЕТИКА
// ============================================

// ============================================
// ВСЕ ФОРМЫ (38 ШТУК)
// ============================================
const ALL_JERSEYS = [
  { id: "csk", name: "ЦСКА", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/2", active: true },
  { id: "ska", name: "СКА", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/3", active: true },
  { id: "spartak", name: "Спартак", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/4", active: true },
  { id: "dinamo_m", name: "Динамо М", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/6", active: true },
  { id: "metallurg", name: "Металлург Мг", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "🔴", photo: "https://i.ibb.co/1d2R3j4K/metallurg-forma-front.png", active: true },
  { id: "traktor", name: "Трактор", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/7", active: true },
  { id: "salavat", name: "Салават Юлаев", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "🟢", photo: "https://i.ibb.co/ZfJ4Tym/salavat-front.png", active: true },
  { id: "severstal", name: "Северсталь", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/8", active: true },
  { id: "torpedo", name: "Торпедо", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/10", active: true },
  { id: "sochi", name: "Сочи", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/9", active: true },
  { id: "vityaz", name: "Витязь", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/11", active: true },
  { id: "avangard", name: "Авангард", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/12", active: true },
  { id: "neftekhimik", name: "Нефтехимик", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/13", active: true },
  { id: "kunlun", name: "Куньлунь Ред Стар", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/14", active: true },
  { id: "barys", name: "Барыс", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/16", active: true },
  { id: "dinamo_minsk", name: "Динамо Минск", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/5", active: true },
  { id: "shanghai", name: "Шанхайские Драконы", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/17", active: true },
  { id: "sibir", name: "Сибирь", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/15", active: true },
  { id: "ak_bars", name: "Ак Барс", league: "КХЛ", rarity: "Икона", priceCrystals: 150, emoji: "🟢", photo: "https://t.me/bullet_kings_forms/18", active: true },
  { id: "lokomotiv", name: "Локомотив", league: "КХЛ", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/19", active: true },
  { id: "washington", name: "Вашингтон", league: "НХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/20", active: true },
  { id: "pittsburgh", name: "Питтсбург", league: "НХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/21", active: true },
  { id: "tampa", name: "Тампа-Бэй", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/22", active: true },
  { id: "ny_rangers", name: "НЙ Рейнджерс", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/29", active: true },
  { id: "edmonton", name: "Эдмонтон", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🟠", photo: "https://t.me/bullet_kings_forms/24", active: true },
  { id: "colorado", name: "Колорадо", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/25", active: true },
  { id: "carolina", name: "Каролина", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/26", active: true },
  { id: "philadelphia", name: "Филадельфия", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟠", photo: "https://t.me/bullet_kings_forms/30", active: true },
  { id: "ottawa", name: "Оттава", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/27", active: true },
  { id: "st_louis", name: "Сент-Луис", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/28", active: true },
  { id: "ny_islanders", name: "НЙ Айлендерс", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/23", active: true },
  { id: "florida", name: "Флорида", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/31", active: true },
  { id: "dallas", name: "Даллас", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟢", photo: "https://t.me/bullet_kings_forms/32", active: true },
  { id: "nashville", name: "Нэшвилл", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟡", photo: "https://t.me/bullet_kings_forms/33", active: true },
  { id: "vegas", name: "Вегас", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟡", photo: "https://t.me/bullet_kings_forms/34", active: true },
  { id: "calgary", name: "Калгари", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/35", active: true },
  { id: "san_jose", name: "Сан-Хосе", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/36", active: true },
  { id: "ussr", name: "СССР", league: "Легенды", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/37", active: true },
  { id: "canada", name: "Канада", league: "Легенды", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/38", active: true },
];

// ============================================
// ВСЕ АРЕНЫ (29 ШТУК)
// ============================================
const ALL_ARENAS = [
  { id: "msg", name: "Мэдисон Сквер Гарден", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "bell", name: "Белл Центр", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "scotiabank", name: "Скотиабанк Арена", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "united", name: "Юнайтед Центр", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "crypto", name: "Крипто-ком Арена", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "ppg", name: "PPG Пэйнтс Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "amalie", name: "Амали Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "bridgestone", name: "Бриджстоун Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "rogers", name: "Роджерс Плейс", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "scottrade", name: "Скоттрейд Центр", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "tmobile", name: "Ти-Мобайл Арена", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "little_caesars", name: "Литтл Сизарс Арена", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "wells_fargo", name: "Уэллс Фарго Центр", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "mytischi", name: "Арена Мытищи", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "csk_arena", name: "ЦСКА Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "platinum", name: "Платинум Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "tatneft", name: "Татнефть Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "ufa", name: "Уфа-Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️", active: true },
  { id: "ice_palace", name: "Ледовый Дворец", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "megasport", name: "Мегаспорт", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "traktor_arena", name: "Арена-Трактор", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "minsk_arena", name: "Минск-Арена", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️", active: true },
  { id: "lada", name: "Лада-Арена", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "sokolniki", name: "Сокольники", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "vtb", name: "ВТБ Арена", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "ska_arena_spb", name: "СКА Арена (СПб)", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "maple_leaf_gardens", name: "Мэпл Лиф Гарденс", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "montreal_forum", name: "Монреальский Форум", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "spartak_historical", name: "СК «Спартак»", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️", active: true },
  { id: "tatneft_icon", name: "Татнефть Арена", league: "Икона", rarity: "Икона", priceCrystals: 750, emoji: "🏟️", active: true },
];

const RARITY_WEIGHTS = {
  "Обычная": 40,
  "Редкая": 30,
  "Элитная": 20,
  "Эпическая": 7,
  "Легендарная": 2.5,
  "Икона": 0.5,
};

function getRarityWeight(rarity) {
  return RARITY_WEIGHTS[rarity] || 0;
}

function getRarityColor(rarity) {
  const colors = {
    "Обычная": "⬜",
    "Редкая": "🟩",
    "Элитная": "🔵",
    "Эпическая": "🟣",
    "Легендарная": "⭐",
    "Икона": "🔥",
  };
  return colors[rarity] || "⬜";
}

function getJerseyById(id) {
  return ALL_JERSEYS.find(j => j.id === id);
}

function getArenaById(id) {
  return ALL_ARENAS.find(a => a.id === id);
}

function getActiveJerseys() {
  return ALL_JERSEYS.filter(j => j.active !== false);
}

function getActiveArenas() {
  return ALL_ARENAS.filter(a => a.active !== false);
}

function toggleJerseyActive(id) {
  const jersey = getJerseyById(id);
  if (jersey) {
    jersey.active = jersey.active === false ? true : false;
    return jersey;
  }
  return null;
}

function toggleArenaActive(id) {
  const arena = getArenaById(id);
  if (arena) {
    arena.active = arena.active === false ? true : false;
    return arena;
  }
  return null;
}

function getShopStats() {
  const totalJerseys = ALL_JERSEYS.length;
  const activeJerseys = getActiveJerseys().length;
  const totalArenas = ALL_ARENAS.length;
  const activeArenas = getActiveArenas().length;
  return { totalJerseys, activeJerseys, totalArenas, activeArenas };
}

function getRotationJerseys() {
  const active = getActiveJerseys();
  const weighted = [];
  active.forEach(j => {
    const weight = getRarityWeight(j.rarity);
    for (let i = 0; i < weight; i++) {
      weighted.push(j);
    }
  });
  
  const selected = [];
  const used = new Set();
  for (let i = 0; i < 5 && i < weighted.length; i++) {
    let item;
    let attempts = 0;
    do {
      item = weighted[Math.floor(Math.random() * weighted.length)];
      attempts++;
    } while (used.has(item.id) && attempts < 100);
    if (!used.has(item.id)) {
      used.add(item.id);
      selected.push(item);
    }
  }
  
  while (selected.length < 5) {
    const random = active[Math.floor(Math.random() * active.length)];
    if (random && !used.has(random.id)) {
      used.add(random.id);
      selected.push(random);
    }
  }
  
  return selected;
}

function getRotationArenas() {
  const active = getActiveArenas();
  const weighted = [];
  active.forEach(a => {
    const weight = getRarityWeight(a.rarity);
    for (let i = 0; i < weight; i++) {
      weighted.push(a);
    }
  });
  
  const selected = [];
  const used = new Set();
  for (let i = 0; i < 5 && i < weighted.length; i++) {
    let item;
    let attempts = 0;
    do {
      item = weighted[Math.floor(Math.random() * weighted.length)];
      attempts++;
    } while (used.has(item.id) && attempts < 100);
    if (!used.has(item.id)) {
      used.add(item.id);
      selected.push(item);
    }
  }
  
  while (selected.length < 5) {
    const random = active[Math.floor(Math.random() * active.length)];
    if (random && !used.has(random.id)) {
      used.add(random.id);
      selected.push(random);
    }
  }
  
  return selected;
}

module.exports = {
  ALL_JERSEYS,
  ALL_ARENAS,
  RARITY_WEIGHTS,
  getRarityWeight,
  getRarityColor,
  getJerseyById,
  getArenaById,
  getActiveJerseys,
  getActiveArenas,
  toggleJerseyActive,
  toggleArenaActive,
  getShopStats,
  getRotationJerseys,
  getRotationArenas,
};
