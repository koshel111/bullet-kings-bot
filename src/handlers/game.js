// ============================================
// src/handlers/game.js - ИГРА (С ВАРИАНТАМИ БРОСКА)
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: РАСЧЁТ БРОСКА
// ============================================
function calculateShot(playerAction, goalieAction, difficulty = 1) {
  // Шанс гола в зависимости от действия
  const actionBonus = {
    'left': { 'jumpRight': 0.8, 'stand': 0.5 },
    'right': { 'jumpLeft': 0.8, 'stand': 0.5 },
    'top': { 'stand': 0.3, 'jumpRight': 0.5, 'jumpLeft': 0.5 },
    'fivehole': { 'stand': 0.8, 'coverLow': 0.2 },
    'deke': { 'jumpLeft': 0.6, 'jumpRight': 0.6, 'aggressive': 1.2 },
    'wrist': { 'glove': 0.7, 'stand': 0.4 },
    'slap': { 'pads': 0.4, 'glove': 0.6 },
  };

  const multiplier = actionBonus[playerAction]?.[goalieAction] || 0.5;
  const randomFactor = 0.75 + Math.random() * 0.5;
  const difficultyBonus = 1 + (difficulty - 1) * 0.15;
  
  let probability = multiplier / (0.5 + 0.1) * randomFactor / difficultyBonus;
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  return {
    isGoal: Math.random() < probability,
    probability: Math.round(probability * 100)
  };
}

function getAIAction() {
  const actions = ['jumpLeft', 'jumpRight', 'stand', 'coverLow', 'glove', 'aggressive'];
  return actions[Math.floor(Math.random() * actions.length)];
}

function getAIShot() {
  const actions = ['left', 'right', 'top', 'fivehole', 'deke', 'wrist', 'slap'];
  return actions[Math.floor(Math.random() * actions.length)];
}

module.exports = (bot) => {
  
  bot.action('play', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🎮 *Выбери режим:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Против ИИ', 'play_ai')],
          [Markup.button.callback('⚔️ PvP', 'play_pvp')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('play_ai', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🤖 *Выбери сложность ИИ:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🟢 Новичок', 'ai_novice')],
          [Markup.button.callback('🟡 Любитель', 'ai_amateur')],
          [Markup.button.callback('🟠 Профессионал', 'ai_pro')],
          [Markup.button.callback('🔴 Легенда', 'ai_legend')],
          [Markup.button.callback('🔙 Назад', 'play')],
        ])
      }
    );
  });

  bot.action(/ai_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const difficulty = ctx.match[1];
    const difficultyNames = { novice: 'Новичок', amateur: 'Любитель', pro: 'Профессионал', legend: 'Легенда' };
    
    await ctx.editMessageText(
      '🤖 *Матч против ИИ (' + difficultyNames[difficulty] + ')*\n\n' +
      '*Выбери действие:*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Влево', 'shot_left')],
          [Markup.button.callback('➡️ Вправо', 'shot_right')],
          [Markup.button.callback('⬆️ Верхний', 'shot_top')],
          [Markup.button.callback('⬇️ Между щитков', 'shot_fivehole')],
          [Markup.button.callback('🔄 Финт', 'shot_deke')],
          [Markup.button.callback('✋ Кистевой', 'shot_wrist')],
          [Markup.button.callback('💥 Щелчок', 'shot_slap')],
          [Markup.button.callback('🔙 Назад', 'play_ai')],
        ])
      }
    );
  });

  bot.action(/shot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const playerAction = ctx.match[1];
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    // Действие вратаря (ИИ)
    const goalieAction = getAIAction();
    const difficulty = 1; // Простая сложность для теста
    
    // Расчёт броска
    const result = calculateShot(playerAction, goalieAction, difficulty);
    
    // Названия действий
    const actionNames = {
      left: '⬅️ Влево',
      right: '➡️ Вправо',
      top: '⬆️ Верхний',
      fivehole: '⬇️ Между щитков',
      deke: '🔄 Финт',
      wrist: '✋ Кистевой',
      slap: '💥 Щелчок'
    };
    
    const goalieNames = {
      jumpLeft: '⬅️ Прыжок влево',
      jumpRight: '➡️ Прыжок вправо',
      stand: '🧍 Стоять',
      coverLow: '⬇️ Закрыть низ',
      glove: '🧤 Ловушка',
      aggressive: '💪 Агрессивный'
    };
    
    // Обновление статистики
    if (result.isGoal) {
      data.wins++;
      data.coins += 20;
      data.rating += 25;
    } else {
      data.losses++;
      data.rating -= 10;
    }
    data.matches++;
    data.league = data.rating >= 2000 ? 'Легенда' :
                  data.rating >= 1800 ? 'Мастер' :
                  data.rating >= 1600 ? 'Алмаз' :
                  data.rating >= 1400 ? 'Платина' :
                  data.rating >= 1200 ? 'Золото' :
                  data.rating >= 1000 ? 'Серебро' : 'Бронза';
    
    saveUsers(users);
    
    let resultText = '🎯 *Твой бросок:* ' + actionNames[playerAction] + '\n';
    resultText += '🧤 *Вратарь:* ' + goalieNames[goalieAction] + '\n\n';
    resultText += (result.isGoal ? '⚡ *ГОЛ!* 🎉' : '😤 *СЭЙВ!*') + '\n\n';
    resultText += '📊 *Счёт:*\n';
    resultText += '🏆 Рейтинг: ' + data.rating + '\n';
    resultText += '🥇 Лига: ' + data.league + '\n';
    resultText += '⭐ Монет: ' + data.coins + '\n';
    resultText += '✅ Побед: ' + data.wins + '\n';
    resultText += '❌ Поражений: ' + data.losses;
    
    await ctx.editMessageText(
      resultText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Сыграть ещё', 'play_ai')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  bot.action('play_pvp', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⚔️ *PvP режим*\n\n' +
      'Идёт поиск соперника... ⏳\n' +
      'Ожидание: до 20 секунд\n\n' +
      '⚠️ PvP в разработке!\n' +
      'Пока играй против ИИ 🤖',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🤖 Играть с ИИ', 'play_ai')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });
};
