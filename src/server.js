const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const initAdmin = require('./utils/initAdmin');

const db = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  let dbReady = false;
  try {
    // Run migrations first
    const { execSync } = require('child_process');
    console.log('Running migrations...');
    execSync('node ' + path.join(__dirname, '../run_migrations.js'), { stdio: 'inherit' });
    
    // Check database connection first
    await db.query('SELECT 1');
    dbReady = true;
    console.log('✅ Veritabanı bağlantısı başarılı.');
    await initAdmin();
  } catch (error) {
    // Safe error logging
    console.error('❌ Veritabanı bağlantı hatası veya Migration hatası:', error.message || error.code);
    console.error('⚠️ Sunucu veritabanı olmadan başlatılıyor (Bazı özellikler çalışmayabilir).');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    if (!dbReady) {
      console.log('⚠️ DİKKAT: Veritabanı bağlantısı kurulamadığı için API istekleri hata verebilir.');
    }
  });
};

startServer();
