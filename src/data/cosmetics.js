// ============================================
// src/data/cosmetics.js - ВСЯ КОСМЕТИКА
// ============================================

// ============================================
// ВСЕ ФОРМЫ (38 ШТУК) С ССЫЛКАМИ НА ФОТО
// ============================================
const ALL_JERSEYS = [
  // КХЛ Обычные (4)
  { id: "csk", name: "ЦСКА", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/2" },
  { id: "ska", name: "СКА", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/3" },
  { id: "spartak", name: "Спартак", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/4" },
  { id: "dinamo_m", name: "Динамо М", league: "КХЛ", rarity: "Обычная", priceCoins: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/6" },

  // КХЛ Редкие (3)
  { id: "metallurg", name: "Металлург Мг", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "🔴", photo: "https://i.ibb.co/1d2R3j4K/metallurg-forma-front.png" },
  { id: "traktor", name: "Трактор", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/7" },
  { id: "salavat", name: "Салават Юлаев", league: "КХЛ", rarity: "Редкая", priceCoins: 200, emoji: "🟢", photo: "https://i.ibb.co/ZfJ4Tym/salavat-front.png" },

  // КХЛ Элитные (4)
  { id: "severstal", name: "Северсталь", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/8" },
  { id: "torpedo", name: "Торпедо", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/10" },
  { id: "sochi", name: "Сочи", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/9" },
  { id: "vityaz", name: "Витязь", league: "КХЛ", rarity: "Элитная", priceCoins: 350, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/11" },

  // КХЛ Эпические (7)
  { id: "avangard", name: "Авангард", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/12" },
  { id: "neftekhimik", name: "Нефтехимик", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/13" },
  { id: "kunlun", name: "Куньлунь Ред Стар", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/14" },
  { id: "barys", name: "Барыс", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/16" },
  { id: "dinamo_minsk", name: "Динамо Минск", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/5" },
  { id: "shanghai", name: "Шанхайские Драконы", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/17" },
  { id: "sibir", name: "Сибирь", league: "КХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/15" },

  // КХЛ Иконы (2)
  { id: "ak_bars", name: "Ак Барс", league: "КХЛ", rarity: "Икона", priceCrystals: 150, emoji: "🟢", photo: "https://t.me/bullet_kings_forms/18" },
  { id: "lokomotiv", name: "Локомотив", league: "КХЛ", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/19" },

  // НХЛ Эпические (2)
  { id: "washington", name: "Вашингтон", league: "НХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/20" },
  { id: "pittsburgh", name: "Питтсбург", league: "НХЛ", rarity: "Эпическая", priceCrystals: 25, emoji: "⚫", photo: "https://t.me/bullet_kings_forms/21" },

  // НХЛ Легендарные (5)
  { id: "tampa", name: "Тампа-Бэй", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/22" },
  { id: "ny_rangers", name: "НЙ Рейнджерс", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/29" },
  { id: "edmonton", name: "Эдмонтон", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🟠", photo: "https://t.me/bullet_kings_forms/24" },
  { id: "colorado", name: "Колорадо", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/25" },
  { id: "carolina", name: "Каролина", league: "НХЛ", rarity: "Легендарная", priceCrystals: 50, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/26" },

  // НХЛ Иконы (10)
  { id: "philadelphia", name: "Филадельфия", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟠", photo: "https://t.me/bullet_kings_forms/30" },
  { id: "ottawa", name: "Оттава", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/27" },
  { id: "st_louis", name: "Сент-Луис", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/28" },
  { id: "ny_islanders", name: "НЙ Айлендерс", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/23" },
  { id: "florida", name: "Флорида", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/31" },
  { id: "dallas", name: "Даллас", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟢", photo: "https://t.me/bullet_kings_forms/32" },
  { id: "nashville", name: "Нэшвилл", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟡", photo: "https://t.me/bullet_kings_forms/33" },
  { id: "vegas", name: "Вегас", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🟡", photo: "https://t.me/bullet_kings_forms/34" },
  { id: "calgary", name: "Калгари", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/35" },
  { id: "san_jose", name: "Сан-Хосе", league: "НХЛ", rarity: "Икона", priceCrystals: 100, emoji: "🔵", photo: "https://t.me/bullet_kings_forms/36" },

  // Легенды (2)
  { id: "ussr", name: "СССР", league: "Легенды", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/37" },
  { id: "canada", name: "Канада", league: "Легенды", rarity: "Икона", priceCrystals: 150, emoji: "🔴", photo: "https://t.me/bullet_kings_forms/38" },
];

// ============================================
// ВСЕ АРЕНЫ (29 ШТУК) - ЦЕНЫ УВЕЛИЧЕНЫ В 5 РАЗ!
// ============================================
const ALL_ARENAS = [
  // НХЛ Обычные (5) - было 150⭐ → 750⭐
  { id: "msg", name: "Мэдисон Сквер Гарден", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "bell", name: "Белл Центр", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "scotiabank", name: "Скотиабанк Арена", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "united", name: "Юнайтед Центр", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "crypto", name: "Крипто-ком Арена", league: "НХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },

  // НХЛ Редкие (5) - было 250⭐ → 1250⭐
  { id: "ppg", name: "PPG Пэйнтс Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "amalie", name: "Амали Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "bridgestone", name: "Бриджстоун Арена", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "rogers", name: "Роджерс Плейс", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "scottrade", name: "Скоттрейд Центр", league: "НХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },

  // НХЛ Эпические (3) - было 40💎 → 200💎
  { id: "tmobile", name: "Ти-Мобайл Арена", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "little_caesars", name: "Литтл Сизарс Арена", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "wells_fargo", name: "Уэллс Фарго Центр", league: "НХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },

  // КХЛ Обычные (5) - было 150⭐ → 750⭐
  { id: "mytischi", name: "Арена Мытищи", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "csk_arena", name: "ЦСКА Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "platinum", name: "Платинум Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "tatneft", name: "Татнефть Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },
  { id: "ufa", name: "Уфа-Арена", league: "КХЛ", rarity: "Обычная", priceCoins: 750, emoji: "🏟️" },

  // КХЛ Редкие (4) - было 250⭐ → 1250⭐
  { id: "ice_palace", name: "Ледовый Дворец", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "megasport", name: "Мегаспорт", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "traktor_arena", name: "Арена-Трактор", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },
  { id: "minsk_arena", name: "Минск-Арена", league: "КХЛ", rarity: "Редкая", priceCoins: 1250, emoji: "🏟️" },

  // КХЛ Эпические (3) - было 40💎 → 200💎
  { id: "lada", name: "Лада-Арена", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "sokolniki", name: "Сокольники", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "vtb", name: "ВТБ Арена", league: "КХЛ", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },

  // Исторические Эпические (4) - было 40💎 → 200💎
  { id: "ska_arena_spb", name: "СКА Арена (СПб)", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "maple_leaf_gardens", name: "Мэпл Лиф Гарденс", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "montreal_forum", name: "Монреальский Форум", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },
  { id: "spartak_historical", name: "СК «Спартак»", league: "Историческая", rarity: "Эпическая", priceCrystals: 200, emoji: "🏟️" },

  // Икона (1) - было 150💎 → 750💎
  { id: "tatneft_icon", name: "Татнефть Арена", league: "Икона", rarity: "Икона", priceCrystals: 750, emoji: "🏟️" },
];

// ============================================
// ШАНСЫ ВЫПАДЕНИЯ
// ============================================
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

function getRotationJerseys() {
  const weighted = [];
  ALL_JERSEYS.forEach(j => {
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
    const random = ALL_JERSEYS[Math.floor(Math.random() * ALL_JERSEYS.length)];
    if (!used.has(random.id)) {
      used.add(random.id);
      selected.push(random);
    }
  }
  
  return selected;
}

function getRotationArenas() {
  const weighted = [];
  ALL_ARENAS.forEach(a => {
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
    const random = ALL_ARENAS[Math.floor(Math.random() * ALL_ARENAS.length)];
    if (!used.has(random.id)) {
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
  getRotationJerseys,
  getRotationArenas,
};
