const db = require('../config/db');

// Series
const getSeries = async (req, res, next) => {
  try {
    const { featured, category, language, search } = req.query;

    let q = 'SELECT DISTINCT s.* FROM series s';
    const joins = [];
    const wheres = ["(s.status != 'archived' OR s.status IS NULL)"];
    const vals = [];
    let count = 0;

    if (category) {
      joins.push('JOIN series_categories sc ON s.id = sc.series_id');
      joins.push('JOIN categories c ON sc.category_id = c.id');
      count++;
      wheres.push(`c.slug = $${count}`);
      vals.push(category);
    }

    if (featured === 'true') {
      count++;
      wheres.push(`s.featured = $${count}`);
      vals.push(true);
    }

    if (language) {
      count++;
      wheres.push(`s.language = $${count}`);
      vals.push(language);
    }

    if (search) {
      count++;
      wheres.push(`s.title ILIKE $${count}`);
      vals.push(`%${search}%`);
    }

    const finalQuery = `${q} ${joins.join(' ')} WHERE ${wheres.join(' AND ')} ORDER BY s.created_at DESC`;
    const result = await db.query(finalQuery, vals);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getSeriesById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM series WHERE id = $1 AND (status != 'archived' OR status IS NULL)", [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Series not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getEpisodesBySeriesId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT * FROM episodes WHERE series_id = $1 AND (status != 'archived' OR status IS NULL) ORDER BY season_number ASC, episode_number ASC", 
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Categories
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM categories WHERE active = true OR active IS NULL ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

const getSeriesByCategory = async (req, res, next) => {
  try {
    const { id } = req.params; // category id
    const result = await db.query(`
      SELECT s.* FROM series s
      JOIN series_categories sc ON s.id = sc.series_id
      WHERE sc.category_id = $1 AND (s.status != 'archived' OR s.status IS NULL)
      ORDER BY s.created_at DESC
    `, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Banners
const getBanners = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM banners 
      WHERE (active = true OR active IS NULL)
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Episodes
const getEpisodeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM episodes WHERE id = $1 AND (status != 'archived' OR status IS NULL)", [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Episode not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Notifications (Public broadcast)
const getNotifications = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT n.*, COALESCE(n.message, n.body) as message, COALESCE(n.body, n.message) as body
      FROM notifications n
      WHERE n.user_id IS NULL
        AND (n.status = 'sent' OR n.status IS NULL)
      ORDER BY COALESCE(n.sent_at, n.created_at) DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Push Token Registration
const registerPushToken = async (req, res, next) => {
  try {
    const { token, platform, user_id } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await db.query(`
      INSERT INTO push_tokens (user_id, token, platform, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (token) 
      DO UPDATE SET user_id = COALESCE($1, push_tokens.user_id), platform = COALESCE($3, push_tokens.platform), updated_at = NOW()
    `, [user_id || null, token, platform || 'ios']);

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('[PushToken] Registration error:', error);
    next(error);
  }
};

module.exports = {
  getSeries,
  getSeriesById,
  getEpisodesBySeriesId,
  getCategories,
  getSeriesByCategory,
  getBanners,
  getEpisodeById,
  getNotifications,
  registerPushToken
};
