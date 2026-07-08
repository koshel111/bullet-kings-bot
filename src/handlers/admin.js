// ============================================
// src/handlers/admin.js - ПОЛНАЯ АДМИН-ПАНЕЛЬ
// ============================================

const { Markup } = require('telegraf');
const { 
  getUser, 
  getAllUsers, 
  updateUser, 
  addCard, 
  getUserCards,
  banUser, 
  unbanUser, 
  isUserBanned,
  getBattlepass,
  updateBattlepass,
  getMatchHistory,
  getActiveTournament,
  addTournamentParticipant,
  addCosmetic
} = require('../database/db');
const { getRandomCard } = require('../data/players');
const { getAllLevels, getLevelData } = require('../data/battlepass');

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(Number);

// ============================================
// ПРОВЕРКА АДМИНА
// ============================================
function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// ============================================
// ГЛАВНОЕ МЕНЮ АДМИН-ПАНЕЛИ
// ============================================
module.exports = (bot) => {
  
  bot.action('admin_panel', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) {
      await ctx.answerCbQuery('⛔ У вас нет доступа!');
      return;
    }
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '👑 *Админ-панель*\n\n' +
      'Выберите действие:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👥 Игроки', 'admin_players')],
          [Markup.button.callback('🎁 Выдать награду', 'admin_reward')],
          [Markup.button.callback('🃏 Управление картами', 'admin_cards')],
          [Markup.button.callback('🔨 Бан/Разбан', 'admin_ban')],
          [Markup.button.callback('📊 Статистика', 'admin_stats')],
          [Markup.button.callback('🎖️ Боевой пропуск', 'admin_battlepass')],
          [Markup.button.callback('🏆 Турниры', 'admin_tournament')],
          [Markup.button.callback('💰 Экономика', 'admin_economy')],
          [Markup.button.callback('🔙 Назад', 'back_to_menu')],
        ])
      }
    );
  });

  // ============================================
  // 1. ИГРОКИ
  // ============================================
  bot.action('admin_players', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    const users = getAllUsers();
    let text = '👥 *Список игроков:*\n\n';
    
    users.slice(0, 20).forEach((u, i) => {
      const status = u.is_banned ? '🚫' : '✅';
      text += (i+1) + '. ' + status + ' ' + (u.first_name || u.username || 'Аноним') + 
              ' — Рейтинг: ' + u.rating + ' | Лига: ' + u.league + '\n';
    });
    
    text += '\nВсего: ' + users.length + ' игроков';
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔍 Поиск игрока', 'admin_search_player')],
          [Markup.button.callback('🔙 Назад', 'admin_panel')],
        ])
      }
    );
  });

  // ============================================
  // 2. ВЫДАЧА НАГРАД
  // ============================================
  bot.action('admin_reward', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🎁 *Выдача награды*\n\n' +
      'Введите команду в чат:\n\n' +
      '/givecoins <user_id> <amount> — выдать монеты\n' +
      '/givecrystals <user_id> <amount> — выдать кристаллы\n' +
      '/givecard <user_id> <rarity> — выдать карту\n' +
      '/givepass <user_id> — выдать боевой пропуск\n\n' +
      'Пример:\n' +
      '/givecoins 123456789 1000',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  // ============================================
  // КОМАНДЫ ВЫДАЧИ
  // ============================================
  bot.command('givecoins', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
      await ctx.reply('❌ Использование: /givecoins <user_id> <amount>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const amount = parseInt(args[2]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    updateUser(userId, { coins: dbUser.coins + amount });
    await ctx.reply('✅ Выдано ' + amount + ' монет пользователю ' + (dbUser.first_name || dbUser.username));
  });

  bot.command('givecrystals', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
      await ctx.reply('❌ Использование: /givecrystals <user_id> <amount>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const amount = parseInt(args[2]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    updateUser(userId, { crystals: dbUser.crystals + amount });
    await ctx.reply('✅ Выдано ' + amount + ' кристаллов пользователю ' + (dbUser.first_name || dbUser.username));
  });

  bot.command('givecard', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
      await ctx.reply('❌ Использование: /givecard <user_id> <rarity>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const rarity = args[2] || 'Легендарный';
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    const player = getRandomCard(rarity);
    addCard(userId, {
      player_name: player.name,
      rarity: player.rarity,
      overall: player.overall,
      position: player.position,
      league: player.league,
      ability: player.ability,
      accuracy: player.accuracy || 0,
      power: player.power || 0,
      dribbling: player.dribbling || 0,
      speed: player.speed || 0,
      composure: player.composure || 0,
      skating: player.skating || 0,
      count: 1,
    });
    
    await ctx.reply('✅ Добавлена карта ' + player.name + ' (' + player.rarity + ') пользователю ' + (dbUser.first_name || dbUser.username));
  });

  bot.command('givepass', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /givepass <user_id>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    const bp = getBattlepass(userId);
    if (bp) {
      updateBattlepass(userId, { is_premium: 1 });
    }
    
    await ctx.reply('✅ Боевой пропуск выдан пользователю ' + (dbUser.first_name || dbUser.username));
  });

  // ============================================
  // 3. УПРАВЛЕНИЕ КАРТАМИ
  // ============================================
  bot.action('admin_cards', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🃏 *Управление картами*\n\n' +
      'Команды:\n\n' +
      '/givecard <user_id> <rarity> — добавить карту\n' +
      '/showcards <user_id> — показать карты игрока\n' +
      '/removecard <user_id> <card_id> — удалить карту\n\n' +
      'Доступные редкости:\n' +
      'Обычный, Редкий, Элитный, Эпический, Легендарный, Икона',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.command('showcards', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /showcards <user_id>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const cards = getUserCards(userId);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    let text = '🃏 *Карты игрока ' + (dbUser.first_name || dbUser.username) + '*\n\n';
    if (cards.length === 0) {
      text += 'У игрока нет карт';
    } else {
      cards.forEach((c, i) => {
        text += (i+1) + '. ' + c.player_name + ' — ' + c.rarity + ' (' + c.overall + ' OVR) x' + c.count + '\n';
      });
      text += '\nВсего: ' + cards.length + ' карт';
    }
    
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  // ============================================
  // 4. БАН/РАЗБАН
  // ============================================
  bot.action('admin_ban', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🔨 *Управление банами*\n\n' +
      'Команды:\n\n' +
      '/ban <user_id> — забанить игрока\n' +
      '/unban <user_id> — разбанить игрока\n' +
      '/checkban <user_id> — проверить статус',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.command('ban', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /ban <user_id>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    banUser(userId);
    await ctx.reply('🚫 Пользователь ' + (dbUser.first_name || dbUser.username) + ' забанен');
  });

  bot.command('unban', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /unban <user_id>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    unbanUser(userId);
    await ctx.reply('✅ Пользователь ' + (dbUser.first_name || dbUser.username) + ' разбанен');
  });

  bot.command('checkban', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /checkban <user_id>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const dbUser = getUser(userId);
    const banned = isUserBanned(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    await ctx.reply('👤 ' + (dbUser.first_name || dbUser.username) + '\nСтатус: ' + (banned ? '🚫 ЗАБАНЕН' : '✅ АКТИВЕН'));
  });

  // ============================================
  // 5. СТАТИСТИКА
  // ============================================
  bot.action('admin_stats', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    const users = getAllUsers();
    const totalUsers = users.length;
    const totalCoins = users.reduce((sum, u) => sum + u.coins, 0);
    const totalCrystals = users.reduce((sum, u) => sum + u.crystals, 0);
    const totalRating = users.reduce((sum, u) => sum + u.rating, 0);
    const avgRating = totalUsers > 0 ? Math.round(totalRating / totalUsers) : 0;
    const totalWins = users.reduce((sum, u) => sum + u.wins, 0);
    const totalMatches = users.reduce((sum, u) => sum + u.matches_played, 0);
    
    await ctx.editMessageText(
      '📊 *Общая статистика:*\n\n' +
      '👥 Игроков: ' + totalUsers + '\n' +
      '⭐ Монет всего: ' + totalCoins + '\n' +
      '💎 Кристаллов всего: ' + totalCrystals + '\n' +
      '🏆 Средний рейтинг: ' + avgRating + '\n' +
      '✅ Всего побед: ' + totalWins + '\n' +
      '📊 Всего матчей: ' + totalMatches + '\n' +
      '🏅 Топ-лига: ' + (users.length > 0 ? users[0].league : 'Нет') + '\n' +
      '🚫 Забанено: ' + users.filter(u => u.is_banned).length,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  // ============================================
  // 6. БОЕВОЙ ПРОПУСК (АДМИН)
  // ============================================
  bot.action('admin_battlepass', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🎖️ *Управление боевым пропуском*\n\n' +
      'Команды:\n\n' +
      '/setpasslevel <user_id> <level> — установить уровень\n' +
      '/addpassxp <user_id> <xp> — добавить XP\n' +
      '/givepass <user_id> — выдать премиум\n\n' +
      'Текущие уровни: 1-30\n' +
      'XP за уровень: 20',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  bot.command('setpasslevel', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
      await ctx.reply('❌ Использование: /setpasslevel <user_id> <level>');
      return;
    }
    
    const userId = parseInt(args[1]);
    const level = parseInt(args[2]);
    const dbUser = getUser(userId);
    
    if (!dbUser) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }
    
    if (level < 1 || level > 30) {
      await ctx.reply('❌ Уровень должен быть от 1 до 30');
      return;
    }
    
    const bp = getBattlepass(userId);
    if (bp) {
      const xp = level * 20;
      updateBattlepass(userId, { level: level, xp: xp });
    }
    
    await ctx.reply('✅ Уровень ' + level + ' установлен для ' + (dbUser.first_name || dbUser.username));
  });

  // ============================================
  // 7. ТУРНИРЫ (АДМИН)
  // ============================================
  bot.action('admin_tournament', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🏆 *Управление турнирами*\n\n' +
      'Команды:\n\n' +
      '/createtournament <name> <type> — создать турнир\n' +
      '/starttournament <id> — начать турнир\n' +
      '/stoptournament <id> — завершить турнир\n\n' +
      'Типы турниров: 16, 32, 64, 128',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  // ============================================
  // 8. ЭКОНОМИКА (АДМИН)
  // ============================================
  bot.action('admin_economy', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '💰 *Управление экономикой*\n\n' +
      'Команды:\n\n' +
      '/setprice <item> <price> — изменить цену\n' +
      '/addcoins <user_id> <amount> — добавить монеты\n' +
      '/addcrystals <user_id> <amount> — добавить кристаллы\n\n' +
      'Доступные товары:\n' +
      '• basic_pack — Базовый пак\n' +
      '• premium_pack — Премиум пак\n' +
      '• legendary_pack — Легендарный пак',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_panel')]])
      }
    );
  });

  // ============================================
  // ПОИСК ИГРОКА
  // ============================================
  bot.action('admin_search_player', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🔍 *Поиск игрока*\n\n' +
      'Введите команду:\n' +
      '/searchplayer <username или id>',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'admin_players')]])
      }
    );
  });

  bot.command('searchplayer', async (ctx) => {
    const user = ctx.from;
    if (!isAdmin(user.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      await ctx.reply('❌ Использование: /searchplayer <username или id>');
      return;
    }
    
    const query = args[1];
    const users = getAllUsers();
    const found = users.filter(u => 
      (u.username && u.username.includes(query)) || 
      (u.first_name && u.first_name.includes(query)) ||
      u.id.toString() === query
    );
    
    if (found.length === 0) {
      await ctx.reply('❌ Игрок не найден');
      return;
    }
    
    let text = '🔍 *Результаты поиска:*\n\n';
    found.forEach((u, i) => {
      const status = u.is_banned ? '🚫' : '✅';
      text += (i+1) + '. ' + status + ' ' + (u.first_name || u.username || 'Аноним') + 
              ' — ID: ' + u.id + '\n';
      text += '   Рейтинг: ' + u.rating + ' | Лига: ' + u.league + '\n';
      text += '   Монет: ' + u.coins + ' | Кристаллов: ' + u.crystals + '\n\n';
    });
    
    await ctx.reply(text, { parse_mode: 'Markdown' });
  });
};
