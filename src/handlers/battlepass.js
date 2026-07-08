// ============================================
// src/handlers/battlepass.js - БОЕВОЙ ПРОПУСК
// ============================================

const { Markup } = require('telegraf');
const { getUser, updateUser, getBattlepass, createBattlepass, updateBattlepass, addCard, addCosmetic } = require('../database/db');
const { getLevelByXP, getLevelData, XP_PER_LEVEL, BATTLEPASS_LEVELS } = require('../data/battlepass');
const { getRandomCard } = require('../data/players');

module.exports = (bot) => {

  // ============================================
  // КНОПКА "БОЕВОЙ ПРОПУСК" В ГЛАВНОМ МЕНЮ
  // ============================================
  bot.action('menu_battlepass', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    
    let bp = await getBattlepass(user.id);
    if (!bp) {
      await createBattlepass(user.id);
      bp = await getBattlepass(user.id);
    }
    
    const dbUser = await getUser(user.id);
    const levelInfo = getLevelByXP(bp.xp);
    const currentLevel = levelInfo.level;
    const progress = (bp.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
    
    const levelData = getLevelData(currentLevel);
    const nextLevelData = getLevelData(currentLevel + 1);
    const claimed = bp.claimed_rewards ? JSON.parse(bp.claimed_rewards) : [];
    
    let text = '🎖️ *Боевой пропуск*\n\n';
    text += '📊 Уровень: ' + currentLevel + '/30\n';
    
    // Прогресс-бар
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    text += '📈 ' + '▓'.repeat(filled) + '░'.repeat(empty) + ' ' + Math.round(progress) + '%\n';
    text += '📊 XP: ' + (bp.xp % XP_PER_LEVEL) + '/' + XP_PER_LEVEL + '\n\n';
    
    if (bp.is_premium) {
      text += '💎 *ПРЕМИУМ АКТИВЕН!*\n\n';
    } else {
      text += '🔒 *Купи премиум за 100💎*\n';
      text += 'Чтобы получать дополнительные награды!\n\n';
    }
    
    if (levelData) {
      const isClaimed = claimed.includes(currentLevel);
      text += '🎁 *Уровень ' + currentLevel + ':* ' + (isClaimed ? '✅ ПОЛУЧЕНО' : '⏳ ДОСТУПНО') + '\n';
      text += '🆓 Бесплатно: ' + levelData.free + '\n';
      if (bp.is_premium) {
        text += '💎 Премиум: ' + levelData.premium + '\n';
      }
    }
    
    if (nextLevelData) {
      text += '\n📋 *Следующий уровень (' + (currentLevel + 1) + '):*\n';
      text += '🆓 Бесплатно: ' + nextLevelData.free + '\n';
      if (bp.is_premium) {
        text += '💎 Премиум: ' + nextLevelData.premium + '\n';
      }
    }
    
    const keyboard = [];
    if (!bp.is_premium) {
      keyboard.push([Markup.button.callback('💎 Купить премиум (100💎)', 'bp_buy_premium')]);
    }
    keyboard.push([Markup.button.callback('🎁 Получить награды', 'bp_claim')]);
    keyboard.push([Markup.button.callback('🔙 Назад', 'back_to_menu')]);
    
    await ctx.editMessageText(
      text,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
      }
    );
  });

  // ============================================
  // ПОКУПКА ПРЕМИУМ
  // ============================================
  bot.action('bp_buy_premium', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const dbUser = await getUser(user.id);
    const bp = await getBattlepass(user.id);
    
    if (bp.is_premium) {
      await ctx.editMessageText('✅ У тебя уже есть премиум!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_battlepass')]])
      });
      return;
    }
    
    if (dbUser.crystals < 100) {
      await ctx.editMessageText(
        '❌ *Недостаточно кристаллов!*\n\nНужно: 100💎\nУ тебя: ' + dbUser.crystals + '💎',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_battlepass')]])
        }
      );
      return;
    }
    
    await updateUser(user.id, { crystals: dbUser.crystals - 100 });
    await updateBattlepass(user.id, { is_premium: 1 });
    
    // Выдаём все пропущенные премиум награды
    const levelInfo = getLevelByXP(bp.xp);
    const currentLevel = levelInfo.level;
    const claimed = bp.claimed_rewards ? JSON.parse(bp.claimed_rewards) : [];
    
    for (let i = 1; i <= currentLevel; i++) {
      if (!claimed.includes(i)) {
        await claimReward(user.id, i, true);
        claimed.push(i);
      }
    }
    await updateBattlepass(user.id, { claimed_rewards: JSON.stringify(claimed) });
    
    await ctx.editMessageText(
      '🎉 *Ты купил премиум боевой пропуск!*\n\n✅ Все пропущенные премиум награды выданы! 💎',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_battlepass')]])
      }
    );
  });

  // ============================================
  // ПОЛУЧЕНИЕ НАГРАД
  // ============================================
  bot.action('bp_claim', async (ctx) => {
    await ctx.answerCbQuery();
    const user = ctx.from;
    const bp = await getBattlepass(user.id);
    const dbUser = await getUser(user.id);
    
    if (!bp) {
      await ctx.editMessageText('❌ Ошибка! Попробуй позже.');
      return;
    }
    
    const levelInfo = getLevelByXP(bp.xp);
    const currentLevel = levelInfo.level;
    const claimed = bp.claimed_rewards ? JSON.parse(bp.claimed_rewards) : [];
    
    if (claimed.includes(currentLevel)) {
      await ctx.editMessageText(
        '⚠️ *Награды за уровень ' + currentLevel + ' уже получены!*',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_battlepass')]])
        }
      );
      return;
    }
    
    await claimReward(user.id, currentLevel, bp.is_premium === 1);
    claimed.push(currentLevel);
    await updateBattlepass(user.id, { claimed_rewards: JSON.stringify(claimed) });
    
    await ctx.editMessageText(
      '🎁 *Награды получены!*\n\nПродолжай играть, чтобы открыть новые уровни! 🚀',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_battlepass')]])
      }
    );
  });

  // ============================================
  // ДОБАВЛЕНИЕ XP (ВЫЗЫВАЕТСЯ ПОСЛЕ МАТЧЕЙ)
  // ============================================
  async function addBattlepassXP(userId, xpAmount) {
    const bp = await getBattlepass(userId);
    if (!bp) {
      await createBattlepass(userId);
      return addBattlepassXP(userId, xpAmount);
    }
    
    const oldLevel = getLevelByXP(bp.xp).level;
    const newXp = bp.xp + xpAmount;
    await updateBattlepass(userId, { xp: newXp });
    
    const newLevel = getLevelByXP(newXp).level;
    
    if (newLevel > oldLevel) {
      const claimed = bp.claimed_rewards ? JSON.parse(bp.claimed_rewards) : [];
      for (let i = oldLevel + 1; i <= newLevel; i++) {
        if (!claimed.includes(i)) {
          await claimReward(userId, i, bp.is_premium === 1);
          claimed.push(i);
        }
      }
      await updateBattlepass(userId, { claimed_rewards: JSON.stringify(claimed) });
    }
  }

  // ============================================
  // ВЫДАЧА НАГРАДЫ ЗА УРОВЕНЬ
  // ============================================
  async function claimReward(userId, level, isPremium) {
    const levelData = getLevelData(level);
    if (!levelData) return;
    
    const dbUser = await getUser(userId);
    let rewards = [];
    
    const freeReward = parseReward(levelData.free);
    if (freeReward) {
      await applyReward(userId, dbUser, freeReward);
      rewards.push('🆓 ' + levelData.free);
    }
    
    if (isPremium) {
      const premiumReward = parseReward(levelData.premium);
      if (premiumReward) {
        await applyReward(userId, dbUser, premiumReward);
        rewards.push('💎 ' + levelData.premium);
      }
    }
  }

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================
  function parseReward(rewardText) {
    const reward = { coins: 0, crystals: 0, pack: null, cosmetic: null, card: null };
    
    const coinsMatch = rewardText.match(/(\d+)\s*монет/);
    if (coinsMatch) reward.coins = parseInt(coinsMatch[1]);
    
    const crystalsMatch = rewardText.match(/(\d+)\s*кристаллов/);
    if (crystalsMatch) reward.crystals = parseInt(crystalsMatch[1]);
    
    if (rewardText.includes('Базовый пак')) reward.pack = 'basic';
    if (rewardText.includes('Премиум пак')) reward.pack = 'premium';
    if (rewardText.includes('Легендарный пак')) reward.pack = 'legendary';
    if (rewardText.includes('Сезонный пак')) reward.pack = 'seasonal';
    
    const cardMatch = rewardText.match(/Легендарная карта \((\d+)-(\d+)\)/);
    if (cardMatch) {
      reward.card = { min: parseInt(cardMatch[1]), max: parseInt(cardMatch[2]) };
    }
    
    if (rewardText.includes('форма')) {
      reward.cosmetic = { type: 'form', name: rewardText };
    }
    if (rewardText.includes('арена')) {
      reward.cosmetic = { type: 'arena', name: rewardText };
    }
    
    return reward;
  }

  async function applyReward(userId, dbUser, reward) {
    const { addCard } = require('../database/db');
    const { getRandomCard } = require('../data/players');
    const { addCosmetic } = require('../database/db');
    
    if (reward.coins > 0) {
      await updateUser(userId, { coins: (dbUser.coins || 0) + reward.coins });
    }
    if (reward.crystals > 0) {
      await updateUser(userId, { crystals: (dbUser.crystals || 0) + reward.crystals });
    }
    if (reward.pack) {
      const packTypes = {
        basic: { cards: 1, rarity: 'Обычный' },
        premium: { cards: 1, rarity: 'Редкий' },
        legendary: { cards: 1, rarity: 'Легендарный' },
        seasonal: { cards: 1, rarity: 'Легендарный' },
      };
      const pack = packTypes[reward.pack];
      if (pack) {
        for (let i = 0; i < pack.cards; i++) {
          const player = getRandomCard(pack.rarity);
          await addCard(userId, {
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
        }
      }
    }
    if (reward.card) {
      const player = getRandomCard('Легендарный');
      const overall = reward.card.min + Math.floor(Math.random() * (reward.card.max - reward.card.min + 1));
      await addCard(userId, {
        player_name: player.name,
        rarity: 'Легендарный',
        overall: overall,
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
    }
    if (reward.cosmetic) {
      await addCosmetic(userId, reward.cosmetic.type, reward.cosmetic.name, 'Редкая');
    }
  }

  module.exports.addBattlepassXP = addBattlepassXP;
};
