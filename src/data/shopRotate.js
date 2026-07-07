// ============================================
// src/data/shopRotate.js - ОБНОВЛЁННЫЕ ЦЕНЫ НА АРЕНЫ
// ============================================

// ---------- ВСЕ ФОРМЫ (38) ----------
const ALL_FORMS = [
  // === КХЛ (ОБЫЧНЫЕ) ===
  { id: 'form_cska', name: 'ЦСКА', rarity: 'Обычная', price: 100, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/2' },
  { id: 'form_ska', name: 'СКА', rarity: 'Обычная', price: 100, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/3' },
  { id: 'form_spartak', name: 'Спартак', rarity: 'Обычная', price: 100, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/4' },
  { id: 'form_dynamo', name: 'Динамо М', rarity: 'Обычная', price: 100, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/6' },
  
  // === КХЛ (РЕДКИЕ) ===
  { id: 'form_metallurg', name: 'Металлург Мг', rarity: 'Редкая', price: 200, currency: 'coins', photo: 'https://i.ibb.co/1d2R3j4K/metallurg-forma-front.png' },
  { id: 'form_traktor', name: 'Трактор', rarity: 'Редкая', price: 200, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/7' },
  { id: 'form_salavat', name: 'Салават Юлаев', rarity: 'Редкая', price: 200, currency: 'coins', photo: 'https://i.ibb.co/ZfJ4Tym/salavat-front.png' },
  
  // === КХЛ (ЭЛИТНЫЕ) ===
  { id: 'form_severstal', name: 'Северсталь', rarity: 'Элитная', price: 350, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/8' },
  { id: 'form_torpedo', name: 'Торпедо', rarity: 'Элитная', price: 350, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/10' },
  { id: 'form_sochi', name: 'Сочи', rarity: 'Элитная', price: 350, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/9' },
  { id: 'form_vityaz', name: 'Витязь', rarity: 'Элитная', price: 350, currency: 'coins', photo: 'https://t.me/bullet_kings_forms/11' },
  
  // === КХЛ (ЭПИЧЕСКИЕ) ===
  { id: 'form_avangard', name: 'Авангард', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/12' },
  { id: 'form_neftekhimik', name: 'Нефтехимик', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/13' },
  { id: 'form_kunlun', name: 'Куньлунь Ред Стар', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/14' },
  { id: 'form_barys', name: 'Барыс', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/16' },
  { id: 'form_dynamo_minsk', name: 'Динамо Минск', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/5' },
  { id: 'form_shanghai', name: 'Шанхайские Драконы', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/17' },
  { id: 'form_sibir', name: 'Сибирь', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/15' },
  
  // === КХЛ (ИКОНЫ) ===
  { id: 'form_akbars', name: 'Ак Барс', rarity: 'Икона', price: 150, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/18' },
  { id: 'form_lokomotiv', name: 'Локомотив', rarity: 'Икона', price: 150, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/19' },
  
  // === НХЛ (ЭПИЧЕСКИЕ) ===
  { id: 'form_washington', name: 'Вашингтон', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/20' },
  { id: 'form_pittsburgh', name: 'Питтсбург', rarity: 'Эпическая', price: 25, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/21' },
  
  // === НХЛ (ЛЕГЕНДАРНЫЕ) ===
  { id: 'form_tampa', name: 'Тампа-Бэй', rarity: 'Легендарная', price: 50, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/22' },
  { id: 'form_nyrangers', name: 'НЙ Рейнджерс', rarity: 'Легендарная', price: 50, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/29' },
  { id: 'form_edmonton', name: 'Эдмонтон', rarity: 'Легендарная', price: 50, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/24' },
  { id: 'form_colorado', name: 'Колорадо', rarity: 'Легендарная', price: 50, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/25' },
  { id: 'form_carolina', name: 'Каролина', rarity: 'Легендарная', price: 50, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/26' },
  
  // === НХЛ (ИКОНЫ) ===
  { id: 'form_philadelphia', name: 'Филадельфия', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/30' },
  { id: 'form_ottawa', name: 'Оттава', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/27' },
  { id: 'form_stlouis', name: 'Сент-Луис', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/28' },
  { id: 'form_nyislanders', name: 'НЙ Айлендерс', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/23' },
  { id: 'form_florida', name: 'Флорида', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/31' },
  { id: 'form_dallas', name: 'Даллас', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/32' },
  { id: 'form_nashville', name: 'Нэшвилл', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/33' },
  { id: 'form_vegas', name: 'Вегас', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/34' },
  { id: 'form_calgary', name: 'Калгари', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/35' },
  { id: 'form_sanjose', name: 'Сан-Хосе', rarity: 'Икона', price: 100, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/36' },
  
  // === ЛЕГЕНДЫ ===
  { id: 'form_ussr', name: 'СССР', rarity: 'Икона', price: 150, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/37' },
  { id: 'form_canada', name: 'Канада', rarity: 'Икона', price: 150, currency: 'crystals', photo: 'https://t.me/bullet_kings_forms/38' },
];

// ---------- ВСЕ АРЕНЫ (НОВЫЕ ЦЕНЫ x5!) ----------
const ALL_ARENAS = [
  // === НХЛ (ОБЫЧНЫЕ) ===
  { id: 'arena_msg', name: 'Мэдисон Сквер Гарден', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_bell', name: 'Белл Центр', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_scotiabank', name: 'Скотиабанк Арена', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_united', name: 'Юнайтед Центр', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_crypto', name: 'Крипто-ком Арена', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_mytishchi', name: 'Арена Мытищи', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_cska_arena', name: 'ЦСКА Арена', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_platinum', name: 'Платинум Арена', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_ufa', name: 'Уфа-Арена', rarity: 'Обычная', price: 750, currency: 'coins', photo: 'https://t.me/...' },
  
  // === НХЛ (РЕДКИЕ) ===
  { id: 'arena_ppg', name: 'PPG Пэйнтс Арена', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_amalie', name: 'Амали Арена', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_bridgestone', name: 'Бриджстоун Арена', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_rogers', name: 'Роджерс Плейс', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_scottrade', name: 'Скоттрейд Центр', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_icepalace', name: 'Ледовый Дворец (СКА)', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_megasport', name: 'Мегаспорт', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_traktor', name: 'Арена-Трактор', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_minsk', name: 'Минск-Арена', rarity: 'Редкая', price: 1250, currency: 'coins', photo: 'https://t.me/...' },
  
  // === ЭЛИТНЫЕ ===
  { id: 'arena_tmobile', name: 'Ти-Мобайл Арена', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_littlecaesars', name: 'Литтл Сизарс Арена', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_wellsfargo', name: 'Уэллс Фарго Центр', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_lada', name: 'Лада-Арена', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_sokolniki', name: 'Сокольники', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  { id: 'arena_vtb', name: 'ВТБ Арена', rarity: 'Элитная', price: 1750, currency: 'coins', photo: 'https://t.me/...' },
  
  // === ЭПИЧЕСКИЕ ===
  { id: 'arena_skaspb', name: 'СКА Арена (СПб)', rarity: 'Эпическая', price: 200, currency: 'crystals', photo: 'https://t.me/...' },
  { id: 'arena_mapleleaf', name: 'Мэпл Лиф Гарденс', rarity: 'Эпическая', price: 200, currency: 'crystals', photo: 'https://t.me/...' },
  { id: 'arena_forum', name: 'Монреальский Форум', rarity: 'Эпическая', price: 200, currency: 'crystals', photo: 'https://t.me/...' },
  { id: 'arena_spartak_hist', name: 'СК «Спартак»', rarity: 'Эпическая', price: 200, currency: 'crystals', photo: 'https://t.me/...' },
  
  // === ИКОНА ===
  { id: 'arena_tatneft', name: 'Татнефть Арена', rarity: 'Икона', price: 750, currency: 'crystals', photo: 'https://t.me/...' },
];

// ---------- НАСТРОЙКИ РОТАЦИИ ----------
const RARITY_WEIGHTS = {
  'Обычная': 40,
  'Редкая': 30,
  'Элитная': 20,
  'Эпическая': 7,
  'Легендарная': 2.5,
  'Икона': 0.5,
};

const SHOP_SIZE = 5;
const ROTATION_INTERVAL = 20 * 60 * 1000;

function getRandomRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) return rarity;
  }
  return 'Обычная';
}

function getShopItems(type = 'forms') {
  const pool = type === 'forms' ? ALL_FORMS : ALL_ARENAS;
  const selected = [];
  const usedIds = new Set();

  for (let i = 0; i < SHOP_SIZE; i++) {
    let attempts = 0;
    let item = null;

    while (attempts < 20) {
      const rarity = getRandomRarity();
      const available = pool.filter(p =>
        p.rarity === rarity &&
        !usedIds.has(p.id) &&
        !selected.some(s => s.id === p.id)
      );
      if (available.length > 0) {
        item = available[Math.floor(Math.random() * available.length)];
        break;
      }
      attempts++;
    }

    if (!item) {
      const remaining = pool.filter(p =>
        !usedIds.has(p.id) &&
        !selected.some(s => s.id === p.id)
      );
      if (remaining.length > 0) {
        item = remaining[Math.floor(Math.random() * remaining.length)];
      }
    }

    if (item) {
      selected.push(item);
      usedIds.add(item.id);
    }
  }

  return selected;
}

function getTimeUntilRotation(lastUpdate) {
  if (!lastUpdate) return 'Сейчас!';
  const remaining = ROTATION_INTERVAL - (Date.now() - lastUpdate);
  if (remaining <= 0) return 'Обновляется...';
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return minutes + 'м ' + seconds + 'с';
}

module.exports = {
  ALL_FORMS,
  ALL_ARENAS,
  RARITY_WEIGHTS,
  SHOP_SIZE,
  ROTATION_INTERVAL,
  getRandomRarity,
  getShopItems,
  getTimeUntilRotation,
};
