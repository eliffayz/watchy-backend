const express = require('express');
const cors = require('cors');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version and deployment diagnostics endpoint
app.get('/api/version', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const db = require('./config/db');
    const r = await db.query('SELECT NOW() as now');
    dbStatus = r.rows.length > 0 ? 'connected' : 'error';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.status(200).json({
    service: 'watchy-backend',
    version: '1.0.1',
    commit: 'DEBUG_DIAGNOSTIC_BUILD',
    timestamp: new Date().toISOString(),
    env: {
      has_JWT_SECRET: Boolean(process.env.JWT_SECRET),
      has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
      has_GOOGLE_IOS_CLIENT_ID: Boolean(process.env.GOOGLE_IOS_CLIENT_ID),
      GOOGLE_IOS_CLIENT_ID_VALUE: process.env.GOOGLE_IOS_CLIENT_ID || '816721206670-9t7rk38kar9pitd7oq7f8bcev9dc41il.apps.googleusercontent.com',
      has_GOOGLE_WEB_CLIENT_ID: Boolean(process.env.GOOGLE_WEB_CLIENT_ID),
      APPLE_AUDIENCE: process.env.APPLE_AUDIENCE || 'com.mobilina.watchy'
    },
    db: dbStatus
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
  console.error(err.stack);
  
  // Return standard JSON error format
  res.status(500).json({ 
    success: false, 
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Sunucu tarafında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
    }
  });
});

module.exports = app;
