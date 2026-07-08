// ============================================
// src/handlers/profile.js - СЫ
// ============================================

const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { getRarityEmoji } = require('../data/players');

const DB_PATH = path.join(__dirname, '../../data/database.json');

function getUsers() {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// ============================================
//  ССТ
// ============================================
async function showEditTeam(ctx) {
  const userId = ctx.from.id;
  
  const users = getUsers();
  const data = users[userId];
  const allCards = data.cards || [];
  const currentTeam = data.team || [];
  
  const teamForwards = currentTeam.filter(p => p.position !== 'G');
  const teamGoalie = currentTeam.find(p => p.position === 'G');
  
  let text = '📋 *ТЕКУЩИЙ СОСТАВ*\n\n';
  
  text += '🏒 *Нападающие (слоты 1-5):*\n';
  for (let i = 0; i < 5; i++) {
    const player = teamForwards[i] || null;
    if (player) {
      const emoji = getRarityEmoji(player.rarity);
      text += `${i+1}. [${player.overall}] ${emoji} | ${player.name} (${player.rarity})\n`;
    } else {
      text += `${i+1}. [0] | Игрок не добавлен\n`;
    }
  }
  
text += '\n🧤 *Вратарь (слот 6):*\n';
if (teamGoalie) {
  const emoji = getRarityEmoji(teamGoalie.rarity);
  text += `6. [${teamGoalie.overall}] ${emoji} | ${teamGoalie.name} (${teamGoalie.rarity})\n`;
} else {
  text += `6. [0] | Игрок не добавлен\n`;
}
  text += '\n📊 *Статистика коллекции:*\n';
  text += '📚 сего карт: ' + allCards.length + '\n';
  text += '🏒 олевых: ' + forwardsInCollection.length + '\n';
  text += '🧤 ратарей: ' + goaliesInCollection.length + '\n';
  
  text += '\n📊 *ажми на номер слота, чтобы заполнить или заменить игрока:*';
  
  const buttons = [
    [Markup.button.callback('1️⃣ Слот 1', 'slot_0')],
    [Markup.button.callback('2️⃣ Слот 2', 'slot_1')],
    [Markup.button.callback('3️⃣ Слот 3', 'slot_2')],
    [Markup.button.callback('4️⃣ Слот 4', 'slot_3')],
    [Markup.button.callback('5️⃣ Слот 5', 'slot_4')],
    [Markup.button.callback('6️⃣ ратарь', 'slot_goalie')],
    [Markup.button.callback('🗑️ чистить состав', 'clear_team')],
    [Markup.button.callback('🔙 азад', 'team')],
  ];
  
  await ctx.editMessageText(
    text,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

module.exports = (bot) => {
  
  bot.action('bonus', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    const bonus = Math.floor(Math.random() * 50) + 10;
    data.coins += bonus;
    saveUsers(users);
    await ctx.editMessageText('🎁 *онус получен!*\n\n⭐ +' + bonus + ' монет', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 азад', 'back')]])
    });
  });

  bot.action('team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    const forwards = allCards.filter(c => c.position !== 'G');
    const goalies = allCards.filter(c => c.position === 'G');
    const teamForwards = currentTeam.filter(p => p.position !== 'G');
    const teamGoalie = currentTeam.find(p => p.position === 'G');
    
    let text = '👥 *Твоя команда*\n\n';
    text += '📋 *Текущий состав:*\n\n';
    
    if (teamForwards.length === 0 && !teamGoalie) {
      text += ' тебя пока нет игроков в команде!\n';
    } else {
      text += '🏒 *олевые игроки:*\n';
      teamForwards.forEach((p, i) => {
        const emoji = getRarityEmoji(p.rarity);
        text += (i+1) + '. ' + emoji + ' ' + p.name + ' - ' + p.rarity + ' (' + p.overall + ' OVR)\n';
      });
      
      if (teamGoalie) {
        const emoji = getRarityEmoji(teamGoalie.rarity);
        text += '\n🧤 *ратарь:*\n';
        text += '  ' + emoji + ' ' + teamGoalie.name + ' - ' + teamGoalie.rarity + ' (' + teamGoalie.overall + ' OVR)\n';
      }
    }
    
    text += '\n📊 *сего карт:* ' + allCards.length + '\n';
    text += '🏒 олевых: ' + forwards.length + '\n';
    text += '🧤 ратарей: ' + goalies.length + '\n\n';
    text += '*ыбери действие:*';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Собрать состав', 'edit_team')],
          [Markup.button.callback('🔙 азад', 'back')],
        ])
      }
    );
  });

  bot.action('edit_team', async (ctx) => {
    await ctx.answerCbQuery();
    await showEditTeam(ctx);
  });

  bot.action('clear_team', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    data.team = [];
    saveUsers(users);
    await ctx.answerCbQuery('🗑️ Состав очищен');
    await showEditTeam(ctx);
  });

  // ============================================
  // Ы СТ - С!
  // ============================================
  bot.action(/slot_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const slotType = ctx.match[1];
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    const currentTeam = data.team || [];
    
    let filteredCards = [];
    let slotName = '';
    
    if (slotType === 'goalie') {
      // 🔥 С Т  
      filteredCards = allCards.filter(c => c.position === 'G');
      slotName = 'вратаря';
    } else {
      // 🔥 С Ы  
      const slotIndex = parseInt(slotType);
      filteredCards = allCards.filter(c => c.position !== 'G');
      slotName = слот ;
    }
    
    // 🔥  ТЬ ТХ, Т   Т Т СТ
    if (slotType === 'goalie') {
      const currentGoalie = currentTeam.find(p => p.position === 'G');
      if (currentGoalie) {
        filteredCards = filteredCards.filter(c => c.id !== currentGoalie.id);
      }
    } else {
      const slotIndex = parseInt(slotType);
      const teamForwards = currentTeam.filter(p => p.position !== 'G');
      const currentSlotPlayer = teamForwards[slotIndex] || null;
      
      // бираем только тех, кто уже в этом слоте
      if (currentSlotPlayer) {
        filteredCards = filteredCards.filter(c => c.id !== currentSlotPlayer.id);
      }
    }
    
    // 🔥 СТ
    if (filteredCards.length === 0) {
      let text = '❌ *ет доступных игроков для ' + slotName + '!*\n\n';
      text += '📊 *роверь коллекцию:*\n';
      
      if (slotType === 'goalie') {
        const allGoalies = allCards.filter(c => c.position === 'G');
        text += '🧤 ратарей в коллекции: ' + allGoalies.length + '\n';
        if (allGoalies.length === 0) {
          text += '\n💡 * тебя нет вратарей!*\n';
          text += 'ткрой паки в магазине 🛒\n';
        } else {
          const currentGoalie = currentTeam.find(p => p.position === 'G');
          if (currentGoalie) {
            text += '\n✅ ратарь уже в составе: ' + currentGoalie.name + '\n';
            text += '💡 тобы заменить вратаря, сначала убери его из состава (очисти состав).\n';
          }
          text += '\n📋 се вратари:\n';
          allGoalies.forEach(p => {
            text +=   •  ( OVR)\n;
          });
        }
      } else {
        const allForwards = allCards.filter(c => c.position !== 'G');
        text += '🏒 олевых в коллекции: ' + allForwards.length + '\n';
        if (allForwards.length === 0) {
          text += '\n💡 * тебя нет полевых игроков!*\n';
          text += 'ткрой паки в магазине 🛒\n';
        } else {
          text += '\n📋 се полевые игроки:\n';
          allForwards.forEach(p => {
            text +=   •  ( OVR)\n;
          });
        }
      }
      
      await ctx.editMessageText(
        text,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛒  магазин', 'shop')],
            [Markup.button.callback('🗑️ чистить состав', 'clear_team')],
            [Markup.button.callback('🔙  составу', 'edit_team')]
          ])
        }
      );
      return;
    }
    
    // 🔥 Ы СТЫХ 
    let text = 📋 *ыбери игрока для :*\n\n;
    text += сего доступно: \n\n;
    
    const buttons = [];
    filteredCards.forEach((player, index) => {
      const emoji = getRarityEmoji(player.rarity);
      const posEmoji = player.position === 'G' ? '🧤' : '🏒';
      text += ${index + 1}.    -  ( OVR)\n;
      buttons.push([Markup.button.callback(
        ${index + 1}, 
        select_player__
      )]);
    });
    
    text += '\n📊 *ажми на номер карты, чтобы добавить в состав:*';
    buttons.push([Markup.button.callback('🔙  составу', 'edit_team')]);
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  });

  // ============================================
  // Ы 
  // ============================================
  bot.action(/select_player_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const slotType = ctx.match[1];
    const playerIndex = parseInt(ctx.match[2]);
    const userId = ctx.from.id;
    const users = getUsers();
    const data = users[userId];
    const allCards = data.cards || [];
    
    let player;
    let isGoalie = false;
    
    if (slotType === 'goalie') {
      const goalies = allCards.filter(c => c.position === 'G');
      player = goalies[playerIndex];
      isGoalie = true;
    } else {
      const forwards = allCards.filter(c => c.position !== 'G');
      player = forwards[playerIndex];
    }
    
    if (!player) {
      await ctx.editMessageText('❌ грок не найден!');
      return;
    }
    
    // бираем игрока из всех слотов
    data.team = data.team.filter(p => p.id !== player.id);
    
    // обавляем в нужный слот
    if (isGoalie) {
      data.team.push({ ...player, count: 1 });
    } else {
      const slotIndex = parseInt(slotType);
      const teamForwards = data.team.filter(p => p.position !== 'G');
      
      if (slotIndex < teamForwards.length) {
        data.team[slotIndex] = { ...player, count: 1 };
      } else {
        data.team.push({ ...player, count: 1 });
      }
    }
    
    saveUsers(users);
    await ctx.answerCbQuery(✅  добавлен в состав!);
    await showEditTeam(ctx);
  });

  // ============================================
  // Я
  // ============================================
  bot.action('collection', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    let text = '📚 *Твоя коллекция:*\n\n';
    if (data.cards.length === 0) {
      text += ' тебя пока нет карточек!';
    } else {
      data.cards.forEach((c) => {
        const emoji = getRarityEmoji(c.rarity);
        const position = c.position === 'G' ? '🧤' : '🏒';
        text += emoji + ' ' + position + ' ' + c.name + ' - ' + c.rarity + ' (' + c.overall + ' OVR)\n';
      });
      text += '\n📊 сего карт: ' + data.cards.length;
    }
    
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 азад', 'back')]])
    });
  });

  // ============================================
  // Ь
  // ============================================
  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const users = getUsers();
    const data = users[user.id];
    
    const rarityCount = {};
    data.cards.forEach(c => {
      rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + 1;
    });
    
    let rarityText = '';
    const rarities = ['бычный', 'едкий', 'литный', 'пический', 'егендарный', 'кона'];
    rarities.forEach(r => {
      if (rarityCount[r]) {
        const emoji = getRarityEmoji(r);
        rarityText += emoji + ' ' + r + ': ' + rarityCount[r] + '\n';
      }
    });
    
    const forwards = data.team.filter(p => p.position !== 'G').length;
    const goalie = data.team.find(p => p.position === 'G');
    
    await ctx.editMessageText(
      '👤 *рофиль*\n\n' +
      'мя: ' + user.first_name + '\n' +
      'ID: ' + user.id + '\n\n' +
      '📊 *Статистика:*\n' +
      '🏆 ейтинг: ' + (data.rating || 0) + '\n' +
      '🥇 ига: ' + (data.league || 'ронза') + '\n' +
      '✅ обед: ' + (data.wins || 0) + '\n' +
      '❌ оражений: ' + (data.losses || 0) + '\n' +
      '⚖️ ичьих: ' + (data.draws || 0) + '\n' +
      '⭐ онет: ' + (data.coins || 0) + '\n' +
      '💎 ристаллов: ' + (data.crystals || 0) + '\n' +
      '📚 арт: ' + data.cards.length + '\n' +
      '📊 атчей: ' + (data.matches || 0) + '\n' +
      '👥  команде: ' + forwards + ' полевых, ' + (goalie ? '1 вратарь' : '0 вратарей') + '\n\n' +
      '📋 *арты по редкостям:*\n' + (rarityText || 'ет карт'),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 азад', 'back')]])
      }
    );
  });
};
