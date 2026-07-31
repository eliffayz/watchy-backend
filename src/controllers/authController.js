const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res, next) => {
  try {
    const { email, password, username, phone, age, gender, notifications_enabled, avatar_url } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO users (email, password_hash, username, phone, age, gender, notifications_enabled, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, username, role, avatar_url`,
      [email, password_hash, username, phone, age ? parseInt(age) : null, gender || null, notifications_enabled !== undefined ? Boolean(notifications_enabled) : true, avatar_url || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND account_status = $2', [email, 'active']);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userProfile = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url };
    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    next(error);
  }
};

const oauthLogin = async (req, res, next) => {
  try {
    const { provider, token: oauthToken, email, fullName } = req.body;

    if (!provider || (!oauthToken && !email)) {
      return res.status(400).json({ success: false, message: 'Provider and token/email are required' });
    }

    // Decode the token if email is not provided directly (Apple/Google provide email in JWT)
    let userEmail = email;
    if (!userEmail && oauthToken) {
      const decoded = jwt.decode(oauthToken);
      if (decoded && decoded.email) {
        userEmail = decoded.email;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid OAuth token' });
      }
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Email could not be extracted from OAuth' });
    }

    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND account_status = $2', [userEmail, 'active']);
    let user;

    if (result.rows.length === 0) {
      // Create new user for OAuth
      const insertResult = await db.query(
        `INSERT INTO users (email, password_hash, full_name, notifications_enabled) 
         VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, avatar_url`,
        [userEmail, 'OAUTH_USER_NO_PASSWORD', fullName || null, true]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      // Optional: update full_name if it was null
      if (!user.full_name && fullName) {
        await db.query('UPDATE users SET full_name = $1 WHERE id = $2', [fullName, user.id]);
        user.full_name = fullName;
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const userProfile = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url };
    res.status(200).json({ success: true, data: { user: userProfile, token } });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, oauthLogin };
