const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware for diagnostics
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${method} ${url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Simple health check and auto-schema endpoint
app.get('/api/health', async (req, res) => {
  const db = require('./config/db');
  let dbStatus = 'ok';
  let dbError = null;
  let schemaFix = 'not_run';
  try {
    await db.query('SELECT 1');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          body TEXT,
          type TEXT DEFAULT 'general',
          target_url TEXT,
          target TEXT,
          scheduled_at TIMESTAMPTZ,
          status TEXT DEFAULT 'sent',
          sent_at TIMESTAMPTZ DEFAULT NOW(),
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_url TEXT;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target TEXT;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

        CREATE TABLE IF NOT EXISTS push_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          platform TEXT DEFAULT 'ios',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      schemaFix = 'applied';
    } catch (eFix) {
      schemaFix = eFix.message;
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }
  res.status(200).json({
    status: 'ok',
    version: '5e6a752',
    timestamp: new Date().toISOString(),
    dbStatus,
    dbError,
    schemaFix
  });
});

const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', publicRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT ERROR]:', err.stack || err);
  
  // Return standard JSON error format
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Sunucu tarafında beklenmeyen bir hata oluştu.',
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Sunucu tarafında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    }
  });
});

module.exports = app;
