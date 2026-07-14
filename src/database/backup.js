// ============================================
// src/database/backup.js - СИСТЕМА БЕКАПОВ
// ============================================

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const BACKUP_DIR = path.join(__dirname, '../../data/backups');

// Создаём папку для бекапов если её нет
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ✅ СОЗДАНИЕ БЕКАПА
function createBackup() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('⚠️ База данных не найдена, бекап не создан');
      return null;
    }
    
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `database_backup_${timestamp}.json`);
    
    fs.writeFileSync(backupFile, data);
    console.log(`✅ Бекап создан: ${backupFile}`);
    
    // Удаляем старые бекапы (оставляем последние 10)
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('database_backup_'))
      .sort();
    
    if (backups.length > 10) {
      const toDelete = backups.slice(0, backups.length - 10);
      toDelete.forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑️ Удалён старый бекап: ${f}`);
      });
    }
    
    return backupFile;
  } catch (error) {
    console.error('❌ Ошибка создания бекапа:', error);
    return null;
  }
}

// ✅ ВОССТАНОВЛЕНИЕ ИЗ БЕКАПА
function restoreFromBackup(backupFile = null) {
  try {
    let backupPath;
    
    if (backupFile) {
      backupPath = path.join(BACKUP_DIR, backupFile);
      if (!fs.existsSync(backupPath)) {
        console.log(`❌ Бекап не найден: ${backupFile}`);
        return false;
      }
    } else {
      // Берём последний бекап
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('database_backup_'))
        .sort();
      
      if (backups.length === 0) {
        console.log('❌ Нет доступных бекапов');
        return false;
      }
      
      backupPath = path.join(BACKUP_DIR, backups[backups.length - 1]);
    }
    
    const data = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(DB_PATH, data);
    console.log(`✅ База данных восстановлена из: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error);
    return false;
  }
}

// ✅ ПОЛУЧЕНИЕ СПИСКА БЕКАПОВ
function getBackupList() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('database_backup_'))
      .sort()
      .reverse();
    
    return backups.map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        date: stats.mtime.toLocaleString()
      };
    });
  } catch (error) {
    console.error('❌ Ошибка получения списка бекапов:', error);
    return [];
  }
}

module.exports = {
  createBackup,
  restoreFromBackup,
  getBackupList,
  BACKUP_DIR
};