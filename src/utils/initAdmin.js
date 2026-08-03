const bcrypt = require('bcrypt');
const db = require('../config/db');

const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@watchy.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Upsert admin user
    const result = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (result.rows.length === 0) {
      await db.query(
        `INSERT INTO users (email, password_hash, username, full_name, role, account_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminEmail, passwordHash, 'admin', 'Super Admin', 'admin', 'active']
      );
      console.log(`✅ Admin hesabı oluşturuldu: ${adminEmail}`);
    } else {
      await db.query(
        `UPDATE users SET password_hash = $1, role = 'admin', account_status = 'active' WHERE email = $2`,
        [passwordHash, adminEmail]
      );
      console.log(`✅ Admin hesabı güncellendi/yetkilendirildi: ${adminEmail}`);
    }
  } catch (error) {
    console.error('⚠️ Admin hesap kontrolü sırasında hata oluştu:', error.message || error.code);
  }
};

module.exports = initAdmin;
