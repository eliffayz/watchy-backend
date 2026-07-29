const db = require('../config/db');

const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.phone, u.username, u.gender, u.avatar_url, u.role, u.account_status, u.created_at, u.selected_genres, u.age, u.notifications_enabled,
       (CASE WHEN EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active') THEN 'active' ELSE 'inactive' END) as subscription_status
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { username, phone, email, avatar_url, age, gender } = req.body;
    
    const updates = [];
    const values = [];
    let queryIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${queryIndex++}`);
      values.push(username);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${queryIndex++}`);
      values.push(phone);
    }
    if (email !== undefined) {
      updates.push(`email = $${queryIndex++}`);
      values.push(email);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${queryIndex++}`);
      values.push(avatar_url);
    }
    if (age !== undefined) {
      updates.push(`age = $${queryIndex++}`);
      values.push(age ? parseInt(age) : null);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${queryIndex++}`);
      values.push(gender);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.user.id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${queryIndex} RETURNING id, email, phone, username, gender, age, avatar_url, role`,
      values
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT s.*, f.created_at as favorited_at 
      FROM favorites f
      JOIN series s ON f.series_id = s.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    if (!seriesId) {
      return res.status(400).json({ success: false, message: 'Series ID is required' });
    }
    
    // Check if it already exists to avoid conflict errors if ON CONFLICT DO NOTHING fails in some PG versions
    const check = await db.query('SELECT 1 FROM favorites WHERE user_id = $1 AND series_id = $2', [req.user.id, seriesId]);
    if (check.rows.length === 0) {
      await db.query(
        'INSERT INTO favorites (user_id, series_id) VALUES ($1, $2)',
        [req.user.id, seriesId]
      );
    }
    res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    console.error('addFavorite error:', error.message || error);
    res.status(500).json({ success: false, message: 'Failed to add favorite' });
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    if (!seriesId) {
      return res.status(400).json({ success: false, message: 'Series ID is required' });
    }
    await db.query(
      'DELETE FROM favorites WHERE user_id = $1 AND series_id = $2',
      [req.user.id, seriesId]
    );
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    console.error('removeFavorite error:', error.message || error);
    res.status(500).json({ success: false, message: 'Failed to remove favorite' });
  }
};

const getWatchHistory = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT wh.*, e.title as episode_title, s.title as series_title, s.id as series_id, s.poster_url as series_poster_url
      FROM watch_history wh
      JOIN episodes e ON wh.episode_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE wh.user_id = $1
      ORDER BY wh.last_watched_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateWatchHistory = async (req, res, next) => {
  try {
    const { episode_id, progress_seconds, completed } = req.body;
    
    // Check if episode exists
    const episodeCheck = await db.query('SELECT id FROM episodes WHERE id = $1', [episode_id]);
    if (episodeCheck.rows.length === 0) {
      return res.json({ success: false, message: 'Episode not found (could be a series ID)' });
    }

    await db.query(`
      INSERT INTO watch_history (user_id, episode_id, progress_seconds, completed, last_watched_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, episode_id)
      DO UPDATE SET 
        progress_seconds = EXCLUDED.progress_seconds,
        completed = EXCLUDED.completed,
        last_watched_at = NOW()
    `, [req.user.id, episode_id, progress_seconds || 0, completed || false]);
    
    res.json({ success: true, message: 'Watch history updated' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getUserNotifications = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT n.* FROM notifications n
      JOIN users u ON u.id = $1
      WHERE (n.user_id = $1 OR n.user_id IS NULL)
        AND n.created_at >= u.created_at
      ORDER BY n.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      UPDATE notifications SET read = true 
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) 
      RETURNING *
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { genres } = req.body;
    if (!Array.isArray(genres)) {
      return res.status(400).json({ success: false, message: 'genres must be an array' });
    }
    await db.query(
      'UPDATE users SET selected_genres = $1 WHERE id = $2',
      [JSON.stringify(genres), req.user.id]
    );
    res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const getRecommendedSeries = async (req, res, next) => {
  try {
    // get user genres
    const uRes = await db.query('SELECT selected_genres FROM users WHERE id = $1', [req.user.id]);
    const genres = uRes.rows[0]?.selected_genres || [];

    let result;
    if (genres && genres.length > 0) {
      // Find series that match these genres
      result = await db.query(`
        SELECT DISTINCT s.* 
        FROM series s
        JOIN series_categories sc ON s.id = sc.series_id
        JOIN categories c ON sc.category_id = c.id
        WHERE s.status = 'published' AND c.slug = ANY($1::text[])
        ORDER BY s.created_at DESC
        LIMIT 10
      `, [genres]);
    }

    // Fallback if no recommendations or no genres selected
    if (!result || result.rows.length === 0) {
      result = await db.query(`
        SELECT * FROM series 
        WHERE status = 'published' AND featured = true 
        ORDER BY created_at DESC LIMIT 10
      `);
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const subscribe = async (req, res, next) => {
  try {
    const { plan, durationMonths } = req.body;
    
    // Deactivate existing subscriptions
    await db.query(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'`, [req.user.id]);
    
    await db.query(
      `INSERT INTO subscriptions (id, user_id, plan, billing_period, status, provider, started_at, expires_at, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', 'manual', NOW(), NOW() + interval '1 month' * $4, NOW(), NOW())`,
      [req.user.id, plan || 'PRO', durationMonths === 12 ? 'yearly' : 'monthly', durationMonths || 1]
    );
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  getFavorites,
  addFavorite,
  removeFavorite,
  getWatchHistory,
  updateWatchHistory,
  getUserNotifications,
  markNotificationRead,
  updatePreferences,
  getRecommendedSeries,
  subscribe,
};
