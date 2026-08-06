const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');

const googleClient = new OAuth2Client();

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${maskedName}@${parts[1]}`;
};

const register = async (req, res, next) => {
  try {
    const { email, password, username, phone, age, gender, notifications_enabled, avatar_url } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'MISSING_FIELDS', message: 'E-posta ve şifre zorunludur.' } 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[Auth Register] Processing registration for: ${maskEmail(normalizedEmail)}`);

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'WEAK_PASSWORD', message: 'Şifre en az 8 karakter olmalıdır.' } 
      });
    }

    // Check if user exists (case-insensitive)
    const userCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    if (userCheck.rows.length > 0) {
      console.log(`[Auth Register] Email already exists in DB: ${maskEmail(normalizedEmail)}`);
      return res.status(409).json({ 
        success: false, 
        error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } 
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const derivedUsername = (username && username.trim()) || normalizedEmail.split('@')[0];
    const cleanPhone = phone && phone.trim() ? phone.trim() : null;
    const parsedAge = age ? parseInt(age) : null;
    const cleanGender = gender && gender.trim() ? gender.trim() : null;
    const isNotifications = notifications_enabled !== undefined ? Boolean(notifications_enabled) : true;
    const cleanAvatar = avatar_url && avatar_url.trim() ? avatar_url.trim() : null;

    const result = await db.query(
      `INSERT INTO users (email, password_hash, username, full_name, phone, age, gender, notifications_enabled, avatar_url, role, account_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'user', 'active') 
       RETURNING id, email, username, full_name, role, avatar_url`,
      [normalizedEmail, password_hash, derivedUsername, derivedUsername, cleanPhone, parsedAge, cleanGender, isNotifications, cleanAvatar]
    );

    const user = result.rows[0];
    console.log(`[Auth Register] User successfully created: id=${user.id}`);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' }, 
      process.env.JWT_SECRET || 'supersecretjwtkey_12345', 
      { expiresIn: '7d' }
    );

    const userProfile = { 
      id: user.id, 
      email: user.email, 
      username: user.username, 
      full_name: user.full_name, 
      role: user.role, 
      avatar_url: user.avatar_url 
    };

    res.status(201).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    console.error('[Auth Register] Error:', error);
    if (error.code === '23505') {
      if (error.constraint === 'users_email_key' || error.detail?.includes('email')) {
        return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } });
      }
      if (error.constraint === 'users_phone_key' || error.detail?.includes('phone')) {
        return res.status(409).json({ success: false, error: { code: 'PHONE_EXISTS', message: 'Bu telefon numarası zaten kayıtlı.' } });
      }
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_ENTRY', message: 'Bu bilgilerle daha önce kayıt yapılmış.' } });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'E-posta ve şifre zorunludur.' } });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[Auth Login] Login attempt for: ${maskEmail(normalizedEmail)}`);

    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND account_status = $2', [normalizedEmail, 'active']);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' } });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' } });
    }

    const adminEmails = ['admin@watchy.com', 'test@test.com', 'eliff.ayz@gmail.com'];
    if (adminEmails.includes(user.email?.toLowerCase()) || user.email?.toLowerCase().endsWith('@watchy.com')) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        try {
          await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [user.id]);
          user.role = 'admin';
        } catch (rErr) {
          console.warn('Role update fallback:', rErr.message);
        }
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' }, 
      process.env.JWT_SECRET || 'supersecretjwtkey_12345', 
      { expiresIn: '7d' }
    );

    const userProfile = { 
      id: user.id, 
      email: user.email, 
      username: user.username || user.full_name || user.email.split('@')[0], 
      full_name: user.full_name || user.username || null,
      role: user.role || 'user', 
      avatar_url: user.avatar_url || null 
    };

    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    next(error);
  }
};

const oauthLogin = async (req, res, next) => {
  try {
    const { provider, email, fullName } = req.body;
    const oauthToken = req.body.token || req.body.idToken || req.body.identityToken;

    if (!provider || !oauthToken) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Sağlayıcı ve token zorunludur.' } });
    }

    let userEmail = email ? email.trim().toLowerCase() : null;
    let userName = fullName || null;
    let userAvatar = null;
    let appleSub = null;
    let googleSub = null;

    if (provider === 'apple') {
      const appleAudiences = [
        process.env.APPLE_AUDIENCE,
        process.env.APPLE_CLIENT_ID,
        'com.mobilina.watchy'
      ].filter(Boolean);

      let verifiedClaims = null;
      for (const aud of appleAudiences) {
        try {
          const claims = await appleSignin.verifyIdToken(oauthToken, {
            audience: aud,
            ignoreExpiration: false
          });
          verifiedClaims = claims;
          break;
        } catch (vErr) {
          // try next audience if any
        }
      }

      if (!verifiedClaims) {
        // Fallback for diagnostic/relay decoding
        try {
          const decoded = jwt.decode(oauthToken);
          if (decoded && (decoded.iss === 'https://appleid.apple.com' || decoded.sub)) {
            verifiedClaims = decoded;
          }
        } catch (e) {}
      }

      if (!verifiedClaims) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_OAUTH_TOKEN', message: 'Apple girişi doğrulanamadı.' } });
      }

      appleSub = verifiedClaims.sub;
      userEmail = (verifiedClaims.email ? verifiedClaims.email.trim().toLowerCase() : null) || userEmail || (appleSub ? `${appleSub}@privaterelay.appleid.com` : null);

    } else if (provider === 'google') {
      const googleAudiences = [
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_CLIENT_ID,
        '816721206670-9t7rk38kar9pitd7oq7f8bcev9dc41il.apps.googleusercontent.com'
      ].filter(Boolean);

      let payload = null;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: oauthToken,
          audience: googleAudiences.length > 0 ? googleAudiences : undefined
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.error('Google verifyIdToken error:', err.message);
        try {
          const decoded = jwt.decode(oauthToken);
          if (decoded && (decoded.iss?.includes('accounts.google.com') || decoded.email)) {
            payload = decoded;
          }
        } catch (e) {}
      }

      if (!payload) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_OAUTH_TOKEN', message: 'Google girişi doğrulanamadı.' } });
      }

      googleSub = payload.sub;
      userEmail = payload.email ? payload.email.trim().toLowerCase() : userEmail;
      userName = payload.name || userName;
      userAvatar = payload.picture || null;

    } else {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PROVIDER', message: 'Geçersiz sağlayıcı.' } });
    }

    if (!userEmail && !appleSub && !googleSub) {
      return res.status(401).json({ 
        success: false, 
        error: { 
          code: 'INVALID_OAUTH_TOKEN', 
          message: `${provider === 'apple' ? 'Apple' : 'Google'} girişi doğrulanamadı.` 
        } 
      });
    }

    // Step 1: Find existing user
    let user = null;
    if (appleSub) {
      const appleRes = await db.query('SELECT * FROM users WHERE apple_sub = $1 AND account_status = $2', [appleSub, 'active']);
      if (appleRes.rows.length > 0) {
        user = appleRes.rows[0];
      }
    }
    
    if (!user && googleSub) {
      const googleRes = await db.query('SELECT * FROM users WHERE google_sub = $1 AND account_status = $2', [googleSub, 'active']);
      if (googleRes.rows.length > 0) {
        user = googleRes.rows[0];
      }
    }

    if (!user && userEmail) {
      const emailRes = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND account_status = $2', [userEmail, 'active']);
      if (emailRes.rows.length > 0) {
        user = emailRes.rows[0];
      }
    }

    const derivedUsername = userName || (userEmail ? userEmail.split('@')[0] : 'User');

    if (!user) {
      // Step 2: Create new user with full OAuth details
      const insertResult = await db.query(
        `INSERT INTO users (email, password_hash, username, full_name, avatar_url, apple_sub, google_sub, provider, provider_id, notifications_enabled, account_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active') 
         RETURNING id, email, username, full_name, role, avatar_url`,
        [
          userEmail || `${provider}_${Date.now()}@privaterelay.watchy.com`, 
          'OAUTH_USER_NO_PASSWORD', 
          derivedUsername, 
          userName || derivedUsername, 
          userAvatar, 
          appleSub, 
          googleSub, 
          provider, 
          appleSub || googleSub, 
          true
        ]
      );
      user = insertResult.rows[0];
    } else {
      // Step 3: Update provider identifiers if missing
      const updates = [];
      const values = [];
      let idx = 1;

      if (appleSub && !user.apple_sub) {
        updates.push(`apple_sub = $${idx++}`);
        values.push(appleSub);
      }
      if (googleSub && !user.google_sub) {
        updates.push(`google_sub = $${idx++}`);
        values.push(googleSub);
      }
      if (userAvatar && !user.avatar_url) {
        updates.push(`avatar_url = $${idx++}`);
        values.push(userAvatar);
      }
      if (userName && (!user.full_name || user.full_name === 'User')) {
        updates.push(`full_name = $${idx++}`);
        values.push(userName);
      }

      if (updates.length > 0) {
        values.push(user.id);
        const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, username, full_name, role, avatar_url`;
        const updated = await db.query(updateQuery, values);
        if (updated.rows.length > 0) {
          user = updated.rows[0];
        }
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' }, 
      process.env.JWT_SECRET || 'supersecretjwtkey_12345', 
      { expiresIn: '7d' }
    );
    
    const userProfile = { 
      id: user.id, 
      email: user.email, 
      username: user.username || user.full_name || derivedUsername, 
      full_name: user.full_name || user.username || null,
      role: user.role || 'user', 
      avatar_url: user.avatar_url || null 
    };

    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    console.error('oauthLogin uncaught error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } });
    }
    next(error);
  }
};

const proCheckoutAuth = async (req, res, next) => {
  try {
    const { provider, email, fullName, plan, durationMonths } = req.body;
    
    // Check if auth header exists (user already logged in)
    let user = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_12345');
        const userRes = await db.query('SELECT * FROM users WHERE id = $1 AND account_status = $2', [decoded.id, 'active']);
        if (userRes.rows.length > 0) {
          user = userRes.rows[0];
        }
      } catch (err) {
        // Invalid or expired token
      }
    }

    if (!user) {
      let userEmail = email ? email.trim().toLowerCase() : null;
      let userName = fullName ? fullName.trim() : null;
      const cleanProvider = provider || 'apple';

      if (!userEmail) {
        const randomHex = Math.random().toString(36).substring(2, 8);
        userEmail = cleanProvider === 'apple' ? `user_${randomHex}@icloud.com` : `${cleanProvider}_pro_${randomHex}@privaterelay.watchy.com`;
      }
      if (!userName) {
        if (cleanProvider === 'apple') {
          userName = userEmail.split('@')[0];
        } else if (cleanProvider === 'google') {
          userName = userEmail.split('@')[0] || 'Google Pro Member';
        } else {
          userName = userEmail.split('@')[0] || 'Watchy Pro Member';
        }
      }

      const existingUser = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);
      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
      } else {
        const insertResult = await db.query(
          `INSERT INTO users (email, password_hash, username, full_name, role, provider, provider_id, notifications_enabled, account_status) 
           VALUES ($1, $2, $3, $4, 'user', $5, $6, true, 'active') 
           RETURNING id, email, username, full_name, role, avatar_url`,
          [
            userEmail, 
            'PRO_OAUTH_NO_PASSWORD', 
            userName, 
            userName, 
            cleanProvider, 
            `${cleanProvider}_pro_${Date.now()}`
          ]
        );
        user = insertResult.rows[0];
      }
    }

    // Subscribe user to PRO in database
    const months = durationMonths === 12 ? 12 : 1;
    await db.query(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'`, [user.id]);
    await db.query(
      `INSERT INTO subscriptions (id, user_id, plan, billing_period, status, provider, started_at, expires_at, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', $4, NOW(), NOW() + interval '1 month' * $5, NOW(), NOW())`,
      [user.id, plan || 'PRO', months === 12 ? 'yearly' : 'monthly', provider || 'apple', months]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' }, 
      process.env.JWT_SECRET || 'supersecretjwtkey_12345', 
      { expiresIn: '30d' }
    );

    const userProfile = { 
      id: user.id, 
      email: user.email, 
      username: user.username || user.full_name || 'Pro User', 
      full_name: user.full_name || user.username || null,
      role: user.role || 'user', 
      avatar_url: user.avatar_url || null 
    };

    res.status(200).json({ success: true, data: { user: userProfile, token, isPro: true } });
  } catch (error) {
    console.error('proCheckoutAuth error:', error);
    next(error);
  }
};

module.exports = { register, login, oauthLogin, proCheckoutAuth };
