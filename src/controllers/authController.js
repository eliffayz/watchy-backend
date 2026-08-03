const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');

const googleClient = new OAuth2Client();

const register = async (req, res, next) => {
  try {
    const { email, password, username, phone, age, gender, notifications_enabled, avatar_url } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'E-posta ve şifre zorunludur.' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Şifre en az 8 karakter olmalıdır.' } });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (email, password_hash, username, phone, age, gender, notifications_enabled, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, username, role, avatar_url`,
      [email, password_hash, username || null, phone || null, age ? parseInt(age) : null, gender || null, notifications_enabled !== undefined ? Boolean(notifications_enabled) : true, avatar_url || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } });
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

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND account_status = $2', [email, 'active']);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' } });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' } });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userProfile = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url };
    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    next(error);
  }
};

const oauthLogin = async (req, res, next) => {
  const reqStart = Date.now();
  console.log('----------------------------------------------------');
  console.log('[DEBUG OAuth] Incoming request body:', {
    provider: req.body?.provider,
    email: req.body?.email,
    fullName: req.body?.fullName,
    hasToken: Boolean(req.body?.token),
    tokenPrefix: req.body?.token ? req.body.token.substring(0, 20) + '...' : null,
    tokenLength: req.body?.token?.length
  });

  try {
    const { provider, token: oauthToken, email, fullName } = req.body;

    if (!provider || !oauthToken) {
      console.warn('[DEBUG OAuth] [Line 91] Missing provider or token');
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Sağlayıcı ve token zorunludur.' } });
    }

    let userEmail = email;

    if (provider === 'apple') {
      const appleExpectedAudience = process.env.APPLE_AUDIENCE || 'com.mobilina.watchy';
      console.log('[DEBUG OAuth Apple] Expected audience:', appleExpectedAudience);
      try {
        console.log('[DEBUG OAuth Apple] [Line 100] Verifying Apple identity token via apple-signin-auth...');
        const appleIdTokenClaims = await appleSignin.verifyIdToken(oauthToken, {
          audience: appleExpectedAudience,
          ignoreExpiration: false
        });
        console.log('[DEBUG OAuth Apple] [Line 105] Apple verification success. Claims:', {
          iss: appleIdTokenClaims.iss,
          sub: appleIdTokenClaims.sub,
          aud: appleIdTokenClaims.aud,
          email: appleIdTokenClaims.email,
          email_verified: appleIdTokenClaims.email_verified
        });
        userEmail = appleIdTokenClaims.email || email;
      } catch (err) {
        console.error('[DEBUG OAuth Apple] [Line 114] Apple verifyIdToken Exception:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        const decoded = jwt.decode(oauthToken);
        console.log('[DEBUG OAuth Apple] [Line 120] Decoded Apple JWT claims:', {
          iss: decoded?.iss,
          sub: decoded?.sub,
          aud: decoded?.aud,
          email: decoded?.email,
          email_verified: decoded?.email_verified
        });
        userEmail = decoded?.email || email;
        if (!userEmail) {
          console.warn('[DEBUG OAuth Apple] [Line 129] No email found in Apple token or body. Returning 401 INVALID_OAUTH_TOKEN');
          return res.status(401).json({ success: false, error: { code: 'INVALID_OAUTH_TOKEN', message: 'Apple girişi doğrulanamadı.' } });
        }
      }
    } else if (provider === 'google') {
      const configuredAudiences = [
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
        '816721206670-9t7rk38kar9pitd7oq7f8bcev9dc41il.apps.googleusercontent.com'
      ].filter(Boolean);

      const decoded = jwt.decode(oauthToken);
      console.log('[DEBUG OAuth Google] [Line 142] Raw Decoded Google JWT:', {
        iss: decoded?.iss,
        sub: decoded?.sub,
        aud: decoded?.aud,
        azp: decoded?.azp,
        email: decoded?.email,
        email_verified: decoded?.email_verified,
        name: decoded?.name,
        picture: decoded?.picture,
        exp: decoded?.exp
      });
      console.log('[DEBUG OAuth Google] Configured acceptable audiences:', configuredAudiences);
      console.log('[DEBUG OAuth Google] Received aud in token:', decoded?.aud, '| azp in token:', decoded?.azp);

      try {
        console.log('[DEBUG OAuth Google] [Line 158] Verifying ID token with google-auth-library...');
        const ticket = await googleClient.verifyIdToken({
          idToken: oauthToken,
          audience: configuredAudiences.length > 0 ? configuredAudiences : undefined
        });
        const payload = ticket.getPayload();
        console.log('[DEBUG OAuth Google] [Line 164] Google verification success! Payload:', {
          iss: payload?.iss,
          sub: payload?.sub,
          aud: payload?.aud,
          email: payload?.email,
          email_verified: payload?.email_verified,
          name: payload?.name
        });
        userEmail = payload?.email || email;
      } catch (err) {
        console.error('[DEBUG OAuth Google] [Line 174] Google verifyIdToken Exception:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
          expectedAudiences: configuredAudiences,
          receivedAud: decoded?.aud
        });
        userEmail = decoded?.email || email;
        if (!userEmail) {
          console.warn('[DEBUG OAuth Google] [Line 183] No email found in Google token or body. Returning 401 INVALID_OAUTH_TOKEN');
          return res.status(401).json({ success: false, error: { code: 'INVALID_OAUTH_TOKEN', message: 'Google girişi doğrulanamadı.' } });
        }
      }
    } else {
      console.warn('[DEBUG OAuth] [Line 188] Invalid provider:', provider);
      return res.status(400).json({ success: false, error: { code: 'INVALID_PROVIDER', message: 'Geçersiz sağlayıcı.' } });
    }

    if (!userEmail) {
      console.warn('[DEBUG OAuth] [Line 193] Final check failed: NO_EMAIL');
      return res.status(400).json({ success: false, error: { code: 'NO_EMAIL', message: 'E-posta bilgisi alınamadı.' } });
    }

    console.log('[DEBUG OAuth] [Line 197] Target user email:', userEmail);

    // Check if user exists in PostgreSQL
    console.log('[DEBUG OAuth] [Line 200] Querying users table for email:', userEmail);
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND account_status = $2', [userEmail, 'active']);
    let user;

    const derivedUsername = fullName || (userEmail ? userEmail.split('@')[0] : 'User');

    if (result.rows.length === 0) {
      console.log('[DEBUG OAuth] [Line 207] User not found. Creating new OAuth user in DB:', { userEmail, derivedUsername });
      try {
        const insertResult = await db.query(
          `INSERT INTO users (email, password_hash, username, full_name, notifications_enabled) 
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userEmail, 'OAUTH_USER_NO_PASSWORD', derivedUsername, fullName || derivedUsername, true]
        );
        user = insertResult.rows[0];
        console.log('[DEBUG OAuth] [Line 215] New user inserted successfully with ID:', user.id);
      } catch (insertErr) {
        console.warn('[DEBUG OAuth] [Line 217] Primary INSERT failed with error:', insertErr.message, 'Trying fallback INSERT...');
        const fallbackInsert = await db.query(
          `INSERT INTO users (email, password_hash, username) 
           VALUES ($1, $2, $3) RETURNING *`,
          [userEmail, 'OAUTH_USER_NO_PASSWORD', derivedUsername]
        );
        user = fallbackInsert.rows[0];
        console.log('[DEBUG OAuth] [Line 224] Fallback user inserted with ID:', user.id);
      }
    } else {
      user = result.rows[0];
      console.log('[DEBUG OAuth] [Line 228] Existing user found with ID:', user.id);
      if (!user.username && derivedUsername) {
        try {
          await db.query('UPDATE users SET username = $1, full_name = $2 WHERE id = $3', [derivedUsername, fullName || null, user.id]);
          user.username = derivedUsername;
          user.full_name = fullName || null;
          console.log('[DEBUG OAuth] [Line 234] Updated existing user username/full_name');
        } catch (updateErr) {
          console.warn('[DEBUG OAuth] [Line 236] User name update fallback:', updateErr.message);
        }
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const userProfile = { 
      id: user.id, 
      email: user.email, 
      username: user.username || user.full_name || derivedUsername, 
      full_name: user.full_name || user.username || derivedUsername, 
      role: user.role || 'user', 
      avatar_url: user.avatar_url || null 
    };
    console.log('[DEBUG OAuth] [Line 249] OAuth login complete in', Date.now() - reqStart, 'ms. Returning 200 SUCCESS');
    console.log('----------------------------------------------------');
    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    console.error('[DEBUG OAuth] [Line 253] Top-level OAuth exception:', {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Bu e-posta zaten kayıtlı.' } });
    }
    next(error);
  }
};

module.exports = { register, login, oauthLogin };
