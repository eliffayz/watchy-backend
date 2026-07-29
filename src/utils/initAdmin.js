const bcrypt = require('bcrypt');
const db = require('../config/db');

const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('ADMIN_EMAIL veya ADMIN_PASSWORD .env dosyasında bulunamadı. Admin oluşturma atlandı.');
      return;
    }

    // Check if user exists
    const result = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (result.rows.length === 0) {
      // User doesn't exist, create it
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, account_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminEmail, passwordHash, 'Super Admin', 'admin', 'active']
      );
      console.log(`İlk admin hesabı oluşturuldu: ${adminEmail}`);
    } else {
      console.log(`Admin hesabı zaten mevcut: ${adminEmail}`);
    }
  } catch (error) {
    console.error('⚠️ Admin hesap kontrolü sırasında hata oluştu:', error.message || error.code);
  }
};

module.exports = initAdmin;
