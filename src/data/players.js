// ============================================
// src/data/players.js - С ВРАТАРЁМ
// ============================================

const PLAYERS = [
  // ============================================
  // НХЛ (20 РУССКИХ ИГРОКОВ)
  // ============================================
  { name: 'Александр Овечкин', overall: 91, rarity: 'Легендарный', position: 'LW' },
  { name: 'Евгений Малкин', overall: 88, rarity: 'Эпический', position: 'C' },
  { name: 'Никита Кучеров', overall: 88, rarity: 'Эпический', position: 'RW' },
  { name: 'Артемий Панарин', overall: 86, rarity: 'Эпический', position: 'LW' },
  { name: 'Андрей Василевский', overall: 92, rarity: 'Легендарный', position: 'G' },
  { name: 'Илья Сорокин', overall: 87, rarity: 'Эпический', position: 'G' },
  { name: 'Сергей Бобровский', overall: 90, rarity: 'Легендарный', position: 'G' },
  { name: 'Евгений Кузнецов', overall: 83, rarity: 'Элитный', position: 'C' },
  { name: 'Дмитрий Орлов', overall: 82, rarity: 'Элитный', position: 'D' },
  { name: 'Иван Проворов', overall: 81, rarity: 'Элитный', position: 'D' },
  { name: 'Владимир Тарасенко', overall: 84, rarity: 'Элитный', position: 'RW' },
  { name: 'Павел Бучневич', overall: 82, rarity: 'Элитный', position: 'LW' },
  { name: 'Валерий Ничушкин', overall: 81, rarity: 'Элитный', position: 'RW' },
  { name: 'Михаил Сергачёв', overall: 83, rarity: 'Элитный', position: 'D' },
  { name: 'Александр Романов', overall: 80, rarity: 'Редкий', position: 'D' },
  { name: 'Егор Шарангович', overall: 80, rarity: 'Редкий', position: 'RW' },
  { name: 'Яков Тренин', overall: 78, rarity: 'Редкий', position: 'C' },
  { name: 'Григорий Денисенко', overall: 77, rarity: 'Редкий', position: 'LW' },
  { name: 'Руслан Исхаков', overall: 76, rarity: 'Редкий', position: 'C' },
  { name: 'Даниил Тарасов', overall: 78, rarity: 'Редкий', position: 'G' },

  // ============================================
  // КХЛ (70 ИГРОКОВ)
  // ============================================
  { name: 'Сергей Плотников', overall: 84, rarity: 'Элитный', position: 'LW' },
  { name: 'Антон Слепышев', overall: 82, rarity: 'Элитный', position: 'RW' },
  { name: 'Владислав Каменев', overall: 80, rarity: 'Редкий', position: 'C' },
  { name: 'Артём Швец-Роговой', overall: 79, rarity: 'Редкий', position: 'C' },
  { name: 'Данила Галузин', overall: 78, rarity: 'Редкий', position: 'C' },
  { name: 'Иван Телегин', overall: 77, rarity: 'Редкий', position: 'LW' },
  { name: 'Иван Федотов', overall: 83, rarity: 'Элитный', position: 'G' },
  { name: 'Александр Шарыченков', overall: 79, rarity: 'Редкий', position: 'G' },
  { name: 'Андрей Кузьменко', overall: 85, rarity: 'Элитный', position: 'RW' },
  { name: 'Марат Хайруллин', overall: 82, rarity: 'Элитный', position: 'LW' },
  { name: 'Иван Демидов', overall: 80, rarity: 'Редкий', position: 'C' },
  { name: 'Арсений Грицюк', overall: 80, rarity: 'Редкий', position: 'RW' },
  { name: 'Александр Волков', overall: 78, rarity: 'Редкий', position: 'LW' },
  { name: 'Илья Каблуков', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Никита Серебряков', overall: 84, rarity: 'Элитный', position: 'G' },
  { name: 'Дмитрий Николаев', overall: 78, rarity: 'Редкий', position: 'G' },
  { name: 'Максим Шалунов', overall: 81, rarity: 'Элитный', position: 'C' },
  { name: 'Иван Морозов', overall: 79, rarity: 'Редкий', position: 'C' },
  { name: 'Дмитрий Вишневский', overall: 78, rarity: 'Редкий', position: 'D' },
  { name: 'Андрей Локтионов', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Андрей Кареев', overall: 81, rarity: 'Элитный', position: 'G' },
  { name: 'Дмитрий Яшкин', overall: 80, rarity: 'Редкий', position: 'LW' },
  { name: 'Вячеслав Войнов', overall: 82, rarity: 'Элитный', position: 'D' },
  { name: 'Эрик О\'Делл', overall: 79, rarity: 'Редкий', position: 'C' },
  { name: 'Кирилл Готовец', overall: 78, rarity: 'Редкий', position: 'D' },
  { name: 'Илья Коновалов', overall: 82, rarity: 'Элитный', position: 'G' },
  { name: 'Вадим Шипачёв', overall: 86, rarity: 'Эпический', position: 'C' },
  { name: 'Кирилл Семёнов', overall: 79, rarity: 'Редкий', position: 'C' },
  { name: 'Егор Коршков', overall: 78, rarity: 'Редкий', position: 'RW' },
  { name: 'Михаил Глухов', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Тимур Билялов', overall: 82, rarity: 'Элитный', position: 'G' },
  { name: 'Дамир Жафяров', overall: 79, rarity: 'Редкий', position: 'LW' },
  { name: 'Кирилл Панюков', overall: 78, rarity: 'Редкий', position: 'RW' },
  { name: 'Илья Ковальчук', overall: 85, rarity: 'Элитный', position: 'LW' },
  { name: 'Денис Зернов', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Денис Костин', overall: 78, rarity: 'Редкий', position: 'G' },
  { name: 'Артур Каюмов', overall: 80, rarity: 'Редкий', position: 'C' },
  { name: 'Александр Полунин', overall: 77, rarity: 'Редкий', position: 'LW' },
  { name: 'Даниил Исаев', overall: 80, rarity: 'Редкий', position: 'G' },
  { name: 'Андрей Чибисов', overall: 78, rarity: 'Редкий', position: 'RW' },
  { name: 'Василий Кошечкин', overall: 82, rarity: 'Элитный', position: 'G' },
  { name: 'Антон Бурдасов', overall: 80, rarity: 'Редкий', position: 'RW' },
  { name: 'Алексей Бывальцев', overall: 78, rarity: 'Редкий', position: 'C' },
  { name: 'Никита Тертышный', overall: 77, rarity: 'Редкий', position: 'LW' },
  { name: 'Сергей Мыльников', overall: 78, rarity: 'Редкий', position: 'G' },
  { name: 'Саша Ткачёв', overall: 79, rarity: 'Редкий', position: 'LW' },
  { name: 'Владимир Жарков', overall: 78, rarity: 'Редкий', position: 'RW' },
  { name: 'Артём Пименов', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Андрей Василевский (мл)', overall: 76, rarity: 'Редкий', position: 'G' },
  { name: 'Даниил Ильин', overall: 78, rarity: 'Редкий', position: 'C' },
  { name: 'Кирилл Воробьёв', overall: 77, rarity: 'Редкий', position: 'D' },
  { name: 'Адам Гуска', overall: 76, rarity: 'Редкий', position: 'G' },
  { name: 'Игорь Гераськин', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Даниил Вовченко', overall: 76, rarity: 'Редкий', position: 'RW' },
  { name: 'Александр Самсонов', overall: 76, rarity: 'Редкий', position: 'G' },
  { name: 'Егор Бабенко', overall: 76, rarity: 'Редкий', position: 'C' },
  { name: 'Денис Венгрыжновский', overall: 75, rarity: 'Редкий', position: 'LW' },
  { name: 'Никита Трегубов', overall: 75, rarity: 'Редкий', position: 'G' },
  { name: 'Александр Дергачёв', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Илья Аркалов', overall: 76, rarity: 'Редкий', position: 'RW' },
  { name: 'Антон Тихомиров', overall: 75, rarity: 'Редкий', position: 'G' },
  { name: 'Павел Порядин', overall: 77, rarity: 'Редкий', position: 'RW' },
  { name: 'Эмиль Галимов', overall: 76, rarity: 'Редкий', position: 'LW' },
  { name: 'Филипп Долганов', overall: 76, rarity: 'Редкий', position: 'G' },
  { name: 'Спенсер Фу', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Брендон Йип', overall: 76, rarity: 'Редкий', position: 'LW' },
  { name: 'Томми Сон', overall: 75, rarity: 'Редкий', position: 'G' },
  { name: 'Алихан Асетов', overall: 78, rarity: 'Редкий', position: 'RW' },
  { name: 'Аркадий Шестаков', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Никита Бойко', overall: 76, rarity: 'Редкий', position: 'G' },

  // ============================================
  // ЛЕГЕНДЫ (16)
  // ============================================
  { name: 'Уэйн Гретцки', overall: 99, rarity: 'Икона', position: 'C' },
  { name: 'Марио Лемьё', overall: 97, rarity: 'Икона', position: 'C' },
  { name: 'Бобби Орр', overall: 96, rarity: 'Икона', position: 'D' },
  { name: 'Павел Буре', overall: 95, rarity: 'Икона', position: 'RW' },
  { name: 'Сергей Фёдоров', overall: 94, rarity: 'Легендарный', position: 'C' },
  { name: 'Валерий Харламов', overall: 96, rarity: 'Икона', position: 'LW' },
  { name: 'Игорь Ларионов', overall: 92, rarity: 'Легендарный', position: 'C' },
  { name: 'Вячеслав Фетисов', overall: 93, rarity: 'Легендарный', position: 'D' },
  { name: 'Алексей Яшин', overall: 90, rarity: 'Легендарный', position: 'C' },
  { name: 'Владислав Третьяк', overall: 94, rarity: 'Легендарный', position: 'G' },
  { name: 'Сергей Макаров', overall: 93, rarity: 'Легендарный', position: 'RW' },
  { name: 'Владимир Крутов', overall: 92, rarity: 'Легендарный', position: 'LW' },
  { name: 'Борис Михайлов', overall: 91, rarity: 'Легендарный', position: 'RW' },
  { name: 'Владимир Петров', overall: 91, rarity: 'Легендарный', position: 'C' },
  { name: 'Александр Мальцев', overall: 90, rarity: 'Легендарный', position: 'C' },
  { name: 'Николай Хабибулин', overall: 93, rarity: 'Легендарный', position: 'G' },

  // ============================================
  // МОЛОДЫЕ ТАЛАНТЫ (10)
  // ============================================
  { name: 'Коннор Бедард', overall: 82, rarity: 'Редкий', position: 'C' },
  { name: 'Адам Фантилли', overall: 80, rarity: 'Редкий', position: 'C' },
  { name: 'Мэттью Бенирс', overall: 79, rarity: 'Редкий', position: 'C' },
  { name: 'Логан Кули', overall: 78, rarity: 'Редкий', position: 'D' },
  { name: 'Кейден Гуч', overall: 77, rarity: 'Редкий', position: 'C' },
  { name: 'Шейн Райт', overall: 76, rarity: 'Редкий', position: 'C' },
  { name: 'Дэвид Йиричек', overall: 75, rarity: 'Редкий', position: 'D' },
  { name: 'Джейк Сандерсон', overall: 74, rarity: 'Редкий', position: 'D' },
  { name: 'Тайлер Эдмондс', overall: 73, rarity: 'Редкий', position: 'C' },
  { name: 'Бреннан Олтман', overall: 72, rarity: 'Редкий', position: 'C' },
];

// ============================================
// СТАРТОВЫЙ СОСТАВ (5 ПОЛЕВЫХ + 1 ВРАТАРЬ)
// ============================================
const STARTING_CARDS = [
  { name: 'Евгений Кузнецов', overall: 83, rarity: 'Элитный', position: 'C' },
  { name: 'Александр Романов', overall: 80, rarity: 'Редкий', position: 'D' },
  { name: 'Егор Шарангович', overall: 80, rarity: 'Редкий', position: 'RW' },
  { name: 'Яков Тренин', overall: 78, rarity: 'Редкий', position: 'C' },
  { name: 'Григорий Денисенко', overall: 77, rarity: 'Редкий', position: 'LW' },
  // ⚡ ВРАТАРЬ!
  { name: 'Даниил Тарасов', overall: 76, rarity: 'Редкий', position: 'G' },
];

// ============================================
// РЕДКОСТИ С ЭМОДЗИ
// ============================================
const RARITIES = [
  { name: 'Обычный', color: '#808080', emoji: '⬜' },
  { name: 'Редкий', color: '#4CAF50', emoji: '🟩' },
  { name: 'Элитный', color: '#2196F3', emoji: '🔵' },
  { name: 'Эпический', color: '#9C27B0', emoji: '🟣' },
  { name: 'Легендарный', color: '#FFD700', emoji: '⭐' },
  { name: 'Икона', color: '#FF1744', emoji: '🔥' },
];

// ============================================
// ФУНКЦИИ
// ============================================
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

function getRarityEmoji(rarityName) {
  const rarity = RARITIES.find(r => r.name === rarityName);
  return rarity ? rarity.emoji : '⬜';
}

function getAllRarities() {
  return RARITIES;
}

module.exports = { 
  PLAYERS, 
  STARTING_CARDS, 
  RARITIES, 
  getRandomCard, 
  getRandomPack, 
  getRarityEmoji,
  getAllRarities 
};
