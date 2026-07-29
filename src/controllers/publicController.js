const db = require('../config/db');

// Series
const getSeries = async (req, res, next) => {
  try {
    const { featured, category, language, search } = req.query;
    let query = 'SELECT s.* FROM series s WHERE s.status = $1';
    let params = ['published'];
    let paramCount = 1;

    if (featured === 'true') {
      paramCount++;
      query += ` AND s.featured = $${paramCount}`;
      params.push(true);
    }

    if (language) {
      paramCount++;
      query += ` AND s.language = $${paramCount}`;
      params.push(language);
    }

    if (search) {
      paramCount++;
      query += ` AND s.title ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    if (category) {
      // join with series_categories and categories
      query = `SELECT s.* FROM series s 
               JOIN series_categories sc ON s.id = sc.series_id 
               JOIN categories c ON sc.category_id = c.id 
               WHERE s.status = $1 AND c.slug = $2`;
      params = ['published', category];
      paramCount = 2;
      // We'd have to re-apply the other filters if category is present, 
      // but for simplicity, let's just do a clean builder
    }

    // A better query builder logic:
    let q = 'SELECT DISTINCT s.* FROM series s';
    const joins = [];
    const wheres = ['s.status = $1'];
    const vals = ['published'];
    let count = 1;

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
    const result = await db.query('SELECT * FROM series WHERE id = $1 AND status = $2', [id, 'published']);
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
      'SELECT * FROM episodes WHERE series_id = $1 AND status = $2 ORDER BY season_number ASC, episode_number ASC', 
      [id, 'published']
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Categories
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM categories WHERE active = true ORDER BY sort_order ASC');
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
      WHERE sc.category_id = $1 AND s.status = $2
    `, [id, 'published']);
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
      WHERE active = true 
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
    const result = await db.query('SELECT * FROM episodes WHERE id = $1 AND status = $2', [id, 'published']);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Episode not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
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
  getEpisodeById
};
