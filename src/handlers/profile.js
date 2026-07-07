// ============================================
// src/handlers/profile.js - С ВЫБОРОМ СОСТАВА
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');  // ✅ БЕРЁМ ИЗ players.js

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const bonus = Math.floor(Math.random() * 50) + 10;
    data.coins += bonus;
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    await ctx.editMessageText('🎁 *Бонус получен!*\n\n⭐ +' + bonus + ' монет', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    });
  });

  // ============================================
  // КОМАНДА — ОТОБРАЖЕНИЕ + ВЫБОР СОСТАВА
  // ============================================
  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    const forwards = allCards.filter(c => c.position !== 'G');
    const goalies = allCards.filter(c => c.position === 'G');
    const teamForwards = currentTeam.filter(p => p.position !== 'G');
    const teamGoalie = currentTeam.find(p => p.position === 'G');
    
    let text = '👥 *Твоя команда*\n\n';
    
    text += '📋 *Текущий состав:*\n';
    if (teamForwards.length === 0 && !teamGoalie) {
      text += 'У тебя пока нет игроков в команде!\n';
    } else {
      text += '🏒 *Полевые игроки:*\n';
      teamForwards.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        text += (i+1) + '. ' + emoji + ' ' + p.name + ' - ' + p.rarity + ' (' + p.overall + ' OVR)\n';
      });
      
      if (teamGoalie) {
        const emoji = getRarityEmoji(teamGoalie.rarity);
        text += '\n🧤 *Вратарь:*\n';
        text += '  ' + emoji + ' ' + teamGoalie.name + ' - ' + teamGoalie.rarity + ' (' + teamGoalie.overall + ' OVR)\n';
      }
    }
    
    text += '\n📊 *Всего карт:* ' + allCards.length + '\n';
    text += '🏒 Полевых: ' + forwards.length + '\n';
    text += '🧤 Вратарей: ' + goalies.length + '\n\n';
    text += '*Выбери действие:*';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Собрать состав на матч', 'edit_team')],
          [Markup.button.callback('🔙 Назад', 'back')],
        ])
      }
    );
  });

  // ============================================
  // РЕДАКТИРОВАНИЕ СОСТАВА
  // ============================================
  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    const forwards = allCards.filter(c => c.position !== 'G');
    const goalies = allCards.filter(c => c.position === 'G');
    const teamForwards = currentTeam.filter(p => p.position !== 'G');
    const teamGoalie = currentTeam.find(p => p.position === 'G');
    
    let text = '🧑‍🏫 *Выбери состав на матч!*\n\n';
    text += '📋 *Выбери 5 полевых игроков:*\n';
    text += '✅ — уже в составе, ➕ — добавить\n\n';
    
    const buttons = [];
    
    forwards.forEach((player, index) => {
      const emoji = getRarityEmoji(player.rarity);
      const isSelected = teamForwards.some(p => p.id === player.id);
      const label = (isSelected ? '✅' : '➕') + ' ' + emoji + ' ' + player.name + ' (' + player.overall + ' OVR)';
      buttons.push([Markup.button.callback(label, 'select_forward_' + index)]);
    });
    
    buttons.push([Markup.button.callback('───────────', 'separator')]);
    goalies.forEach((player, index) => {
      const emoji = getRarityEmoji(player.rarity);
      const isSelected = teamGoalie && teamGoalie.id === player.id;
      const label = (isSelected ? '✅' : '🧤') + ' ' + emoji + ' ' + player.name + ' (' + player.overall + ' OVR)';
      buttons.push([Markup.button.callback(label, 'select_goalie_' + index)]);
    });
    
    buttons.push([Markup.button.callback('✅ Готово! Сохранить состав', 'save_team')]);
    buttons.push([Markup.button.callback('🔙 Назад', 'team')]);
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  });

  // ============================================
  // ВЫБОР ПОЛЕВОГО ИГРОКА
  // ============================================
  bot.action(/select_forward_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const index = parseInt(ctx.match[1]);
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const allCards = data.cards || [];
    const forwards = allCards.filter(c => c.position !== 'G');
    const player = forwards[index];
    
    if (!player) {
      await ctx.editMessageText('❌ Игрок не найден!');
      return;
    }
    
    const isInTeam = data.team.some(p => p.id === player.id);
    const forwardsCount = data.team.filter(p => p.position !== 'G').length;
    
    if (isInTeam) {
      data.team = data.team.filter(p => p.id !== player.id);
    } else {
      if (forwardsCount >= 5) {
        await ctx.editMessageText('❌ В команде уже 5 полевых игроков!');
        return;
      }
      data.team.push({ ...player, count: 1 });
    }
    
    saveUsers(users);
    await bot.action('edit_team')(ctx);
  });

  // ============================================
  // ВЫБОР ВРАТАРЯ
  // ============================================
  bot.action(/select_goalie_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const index = parseInt(ctx.match[1]);
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const allCards = data.cards || [];
    const goalies = allCards.filter(c => c.position === 'G');
    const player = goalies[index];
    
    if (!player) {
      await ctx.editMessageText('❌ Вратарь не найден!');
      return;
    }
    
    data.team = data.team.filter(p => p.position !== 'G');
    data.team.push({ ...player, count: 1 });
    
    saveUsers(users);
    await bot.action('edit_team')(ctx);
  });

  // ============================================
  // СОХРАНЕНИЕ СОСТАВА
  // ============================================
  bot.action('save_team', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const team = data.team || [];
    
    const forwards = team.filter(p => p.position !== 'G');
    const goalie = team.find(p => p.position === 'G');
    
    if (forwards.length !== 5) {
      await ctx.editMessageText('❌ Нужно выбрать ровно 5 полевых игроков!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Вернуться к выбору', 'edit_team')],
          [Markup.button.callback('🔙 Назад', 'team')],
        ])
      });
      return;
    }
    
    if (!goalie) {
      await ctx.editMessageText('❌ Нужно выбрать вратаря!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Вернуться к выбору', 'edit_team')],
          [Markup.button.callback('🔙 Назад', 'team')],
        ])
      });
      return;
    }
    
    await ctx.editMessageText(
      '✅ *Состав сохранён!*\n\n' +
      '🏒 *Полевые игроки:*\n' +
      forwards.map((p, i) => (i+1) + '. ' + getRarityEmoji(p.rarity) + ' ' + p.name + ' (' + p.overall + ' OVR)').join('\n') +
      '\n\n🧤 *Вратарь:*\n' +
      '  ' + getRarityEmoji(goalie.rarity) + ' ' + goalie.name + ' (' + goalie.overall + ' OVR)',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Назад', 'team')],
        ])
      }
    );
  });

  // ============================================
  // КОЛЛЕКЦИЯ
  // ============================================
  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '📚 *Твоя коллекция:*\n\n';
    if (data.cards.length === 0) {
      text += 'У тебя пока нет карточек!';
    } else {
      data.cards.forEach((c) => {
        const emoji = getRarityEmoji(c.rarity);
        const position = c.position === 'G' ? '🧤' : '🏒';
        text += emoji + ' ' + position + ' ' + c.name + ' - ' + c.rarity + ' (' + c.overall + ' OVR) x' + (c.count || 1) + '\n';
      });
      text += '\nВсего карт: ' + data.cards.length;
    }
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
    });
  });

  // ============================================
  // ПРОФИЛЬ
  // ============================================
  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const rarityCount = {};
    data.cards.forEach(c => {
      rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + (c.count || 1);
    });
    
    let rarityText = '';
    const rarities = ['Обычный', 'Редкий', 'Элитный', 'Эпический', 'Легендарный', 'Икона'];
    rarities.forEach(r => {
      if (rarityCount[r]) {
        const emoji = getRarityEmoji(r);
        rarityText += emoji + ' ' + r + ': ' + rarityCount[r] + '\n';
      }
    });
    
    const forwards = data.team.filter(p => p.position !== 'G').length;
    const goalie = data.team.find(p => p.position === 'G');
    
    await ctx.editMessageText(
      '👤 *Профиль*\n\n' +
      'Имя: ' + user.first_name + '\n' +
      'ID: ' + user.id + '\n\n' +
      '📊 *Статистика:*\n' +
      '🏆 Рейтинг: ' + data.rating + '\n' +
      '🥇 Лига: ' + data.league + '\n' +
      '✅ Побед: ' + data.wins + '\n' +
      '❌ Поражений: ' + data.losses + '\n' +
      '⚖️ Ничьих: ' + data.draws + '\n' +
      '⭐ Монет: ' + data.coins + '\n' +
      '💎 Кристаллов: ' + data.crystals + '\n' +
      '📚 Карт: ' + data.cards.length + '\n' +
      '📊 Матчей: ' + data.matches + '\n' +
      '👥 В команде: ' + forwards + ' полевых, ' + (goalie ? '1 вратарь' : '0 вратарей') + '\n\n' +
      '📋 *Карты по редкостям:*\n' + rarityText,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'back')]])
      }
    );
  });
};
