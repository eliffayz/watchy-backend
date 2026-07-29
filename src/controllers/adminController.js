const db = require('../config/db');

// Helper to log admin actions
const logAdminAction = async (adminId, action, entityType, entityId, details) => {
  try {
    await db.query(
      'INSERT INTO admin_logs (admin_user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, action, entityType, entityId, details]
    );
  } catch (err) {
    console.error('Failed to log admin action', err);
  }
};

const slugify = require('../utils/slugify');

const generateUniqueSlug = async (baseString, excludeId = null) => {
  let baseSlug = slugify(baseString);
  let isUnique = false;
  let counter = 0;
  let currentSlug = baseSlug;

  while (!isUnique) {
    let query = 'SELECT id FROM series WHERE slug = $1';
    let params = [currentSlug];
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      isUnique = true;
    } else {
      counter++;
      currentSlug = `${baseSlug}-${counter}`;
    }
  }
  return currentSlug;
};

// --- REPORTS ---
const getReportsOverview = async (req, res, next) => {
  try {
    const totalContent = await db.query('SELECT COUNT(*) FROM series');
    const publishedSeries = await db.query("SELECT COUNT(*) FROM series WHERE status = 'published'");
    const draftSeries = await db.query("SELECT COUNT(*) FROM series WHERE status = 'draft'");
    const totalEpisodes = await db.query('SELECT COUNT(*) FROM episodes');
    const activeUsers = await db.query("SELECT COUNT(*) FROM users WHERE account_status = 'active'");
    const proUsers = await db.query("SELECT COUNT(*) FROM subscriptions WHERE plan = 'pro' AND status = 'active'");
    const recentSeries = await db.query('SELECT * FROM series ORDER BY created_at DESC LIMIT 10');

    res.json({
      success: true,
      data: {
        totalContent: parseInt(totalContent.rows[0].count),
        publishedSeries: parseInt(publishedSeries.rows[0].count),
        draftSeries: parseInt(draftSeries.rows[0].count),
        totalEpisodes: parseInt(totalEpisodes.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        proUsers: parseInt(proUsers.rows[0].count),
        recentSeries: recentSeries.rows
      }
    });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- SETTINGS ---
const getSettings = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM app_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    // Fallback defaults
    if (settings.free_episode_limit === undefined) settings.free_episode_limit = 4;
    if (settings.default_video_quality === undefined) settings.default_video_quality = '1080p';
    if (settings.maintenance_mode === undefined) settings.maintenance_mode = false;
    if (settings.app_version === undefined) settings.app_version = '1.0.0';

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const keys = ['free_episode_limit', 'default_video_quality', 'maintenance_mode', 'app_version'];
    
    for (const key of keys) {
      if (req.body[key] !== undefined) {
        await db.query(
          `INSERT INTO app_settings (key, value, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, JSON.stringify(req.body[key])]
        );
      }
    }
    
    await logAdminAction(req.user.id, 'UPDATE', 'settings', null, req.body);
    
    const result = await db.query('SELECT * FROM app_settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings, message: 'Settings updated' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- DASHBOARD ---
const getDashboardStats = async (req, res, next) => {
  try {
    const totalSeries = await db.query('SELECT COUNT(*) FROM series');
    const publishedSeries = await db.query("SELECT COUNT(*) FROM series WHERE status = 'published'");
    const draftSeries = await db.query("SELECT COUNT(*) FROM series WHERE status = 'draft'");
    const totalEpisodes = await db.query('SELECT COUNT(*) FROM episodes');
    const totalBanners = await db.query('SELECT COUNT(*) FROM banners');
    const totalUsers = await db.query('SELECT COUNT(*) FROM users');
    const proSubscribers = await db.query("SELECT COUNT(*) FROM subscriptions WHERE plan = 'pro' AND status = 'active'");
    
    const recentSeries = await db.query('SELECT * FROM series ORDER BY created_at DESC LIMIT 5');
    const recentUsers = await db.query('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    // Fetch recent episodes
    const recentEpisodes = await db.query(`
      SELECT e.*, s.title as series_title 
      FROM episodes e 
      JOIN series s ON e.series_id = s.id 
      ORDER BY e.created_at DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalSeries: parseInt(totalSeries.rows[0].count),
        publishedSeries: parseInt(publishedSeries.rows[0].count),
        draftSeries: parseInt(draftSeries.rows[0].count),
        totalEpisodes: parseInt(totalEpisodes.rows[0].count),
        totalBanners: parseInt(totalBanners.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        proSubscribers: parseInt(proSubscribers.rows[0].count),
        recentSeries: recentSeries.rows,
        recentUsers: recentUsers.rows,
        recentEpisodes: recentEpisodes.rows
      }
    });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- SERIES ---
const getSeries = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT s.*, 
        COALESCE(
          (SELECT json_agg(category_id) FROM series_categories WHERE series_id = s.id), 
          '[]'::json
        ) as category_ids
      FROM series s ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getSeriesById = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT s.*, 
        COALESCE(
          (SELECT json_agg(category_id) FROM series_categories WHERE series_id = s.id), 
          '[]'::json
        ) as category_ids
      FROM series s WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Series not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const createSeries = async (req, res, next) => {
  try {
    let { title, slug, description, short_description, poster_url, banner_url, trailer_url, language, country, release_year, age_rating, status, featured, premium, free_episode_count, seasons_count, category_ids } = req.body;
    
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    
    const finalSlug = await generateUniqueSlug(slug || title);

    const result = await db.query(
      `INSERT INTO series (title, slug, description, short_description, poster_url, banner_url, trailer_url, language, country, release_year, age_rating, status, featured, premium, free_episode_count, seasons_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [title, finalSlug, description, short_description, poster_url, banner_url, trailer_url, language, country, release_year, age_rating, status || 'draft', featured || false, premium || false, free_episode_count || 4, seasons_count || 1]
    );

    const newSeries = result.rows[0];

    // Attach categories
    if (category_ids && Array.isArray(category_ids)) {
      for (const catId of category_ids) {
        if (catId) {
          await db.query('INSERT INTO series_categories (series_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newSeries.id, catId]);
        }
      }
    }
    
    // Append category_ids for response
    newSeries.category_ids = category_ids || [];

    await logAdminAction(req.user.id, 'CREATE', 'series', newSeries.id, { title });
    
    res.status(201).json({ success: true, data: newSeries });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateSeries = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { title, slug, description, short_description, poster_url, banner_url, trailer_url, language, country, release_year, age_rating, status, featured, premium, free_episode_count, seasons_count, category_ids } = req.body;
    
    let finalSlug = slug ? await generateUniqueSlug(slug, id) : null;

    const result = await db.query(
      `UPDATE series SET 
       title = COALESCE($1, title), slug = COALESCE($2, slug), description = COALESCE($3, description), short_description = COALESCE($4, short_description),
       poster_url = COALESCE($5, poster_url), banner_url = COALESCE($6, banner_url), trailer_url = COALESCE($7, trailer_url), language = COALESCE($8, language),
       country = COALESCE($9, country), release_year = COALESCE($10, release_year), age_rating = COALESCE($11, age_rating), status = COALESCE($12, status),
       featured = COALESCE($13, featured), premium = COALESCE($14, premium), free_episode_count = COALESCE($15, free_episode_count), seasons_count = COALESCE($16, seasons_count),
       updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [title, finalSlug, description, short_description, poster_url, banner_url, trailer_url, language, country, release_year, age_rating, status, featured, premium, free_episode_count, seasons_count, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    const updatedSeries = result.rows[0];

    // Update categories
    if (category_ids !== undefined && Array.isArray(category_ids)) {
      await db.query('DELETE FROM series_categories WHERE series_id = $1', [id]);
      for (const catId of category_ids) {
        if (catId) {
          await db.query('INSERT INTO series_categories (series_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, catId]);
        }
      }
      updatedSeries.category_ids = category_ids;
    } else {
      const catRes = await db.query('SELECT json_agg(category_id) as category_ids FROM series_categories WHERE series_id = $1', [id]);
      updatedSeries.category_ids = catRes.rows[0].category_ids || [];
    }

    await logAdminAction(req.user.id, 'UPDATE', 'series', id, { title: updatedSeries.title });
    res.json({ success: true, data: updatedSeries });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const deleteSeries = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM series WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'DELETE', 'series', id, { title: result.rows[0].title });
    res.json({ success: true, message: 'Series deleted' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- EPISODES ---
const getEpisodes = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT e.*, s.title as series_title 
      FROM episodes e 
      JOIN series s ON e.series_id = s.id 
      ORDER BY e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getEpisodeById = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM episodes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Episode not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const createEpisode = async (req, res, next) => {
  try {
    const { series_id, season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at } = req.body;
    
    if (!series_id || !title || episode_number === undefined) {
      return res.status(400).json({ success: false, message: 'series_id, title and episode_number are required' });
    }

    if (!video_url) {
      return res.status(400).json({ success: false, message: 'Video URL boş olamaz. Lütfen geçerli bir video bağlantısı sağlayın.' });
    }

    // check unique season_number, episode_number per series
    const uniqueCheck = await db.query('SELECT id FROM episodes WHERE series_id = $1 AND season_number = $2 AND episode_number = $3', [series_id, season_number || 1, episode_number]);
    if (uniqueCheck.rows.length > 0) return res.status(409).json({ success: false, message: 'This episode number already exists for the season.' });

    const result = await db.query(
      `INSERT INTO episodes (series_id, season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [series_id, season_number || 1, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status || 'draft', premium || false, published_at]
    );

    const newEp = result.rows[0];
    await logAdminAction(req.user.id, 'CREATE', 'episode', newEp.id, { title });
    
    res.status(201).json({ success: true, data: newEp });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'This episode already exists' });
    }
    next(error);
  }
};

const updateEpisode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at } = req.body;
    
    const result = await db.query(
      `UPDATE episodes SET 
       season_number = COALESCE($1, season_number), episode_number = COALESCE($2, episode_number), title = COALESCE($3, title), 
       description = COALESCE($4, description), thumbnail_url = COALESCE($5, thumbnail_url), video_url = COALESCE($6, video_url), 
       duration_seconds = COALESCE($7, duration_seconds), status = COALESCE($8, status), premium = COALESCE($9, premium), 
       published_at = COALESCE($10, published_at), updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [season_number, episode_number, title, description, thumbnail_url, video_url, duration_seconds, status, premium, published_at, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'UPDATE', 'episode', id, { title });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'This episode already exists' });
    }
    next(error);
  }
};

const deleteEpisode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM episodes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'DELETE', 'episode', id, { title: result.rows[0].title });
    res.json({ success: true, message: 'Episode deleted' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- BANNERS ---
const getBanners = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT b.*, s.title as series_title 
      FROM banners b 
      LEFT JOIN series s ON b.series_id = s.id 
      ORDER BY b.sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, image_url, series_id, button_text, sort_order, active, starts_at, ends_at } = req.body;
    
    if (!image_url) return res.status(400).json({ success: false, message: 'image_url is required' });

    const result = await db.query(
      `INSERT INTO banners (title, subtitle, image_url, series_id, button_text, sort_order, active, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, subtitle, image_url, series_id || null, button_text, sort_order || 0, active ?? true, starts_at, ends_at]
    );

    const newBanner = result.rows[0];
    await logAdminAction(req.user.id, 'CREATE', 'banner', newBanner.id, { title });
    
    res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, series_id, button_text, sort_order, active, starts_at, ends_at } = req.body;
    
    const result = await db.query(
      `UPDATE banners SET 
       title = COALESCE($1, title), subtitle = COALESCE($2, subtitle), image_url = COALESCE($3, image_url), 
       series_id = $4, button_text = COALESCE($5, button_text), sort_order = COALESCE($6, sort_order),
       active = COALESCE($7, active), starts_at = COALESCE($8, starts_at), ends_at = COALESCE($9, ends_at),
       updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [title, subtitle, image_url, series_id || null, button_text, sort_order, active, starts_at, ends_at, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'UPDATE', 'banner', id, { title });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM banners WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'DELETE', 'banner', id, { title: result.rows[0].title });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- USERS ---
const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.phone, u.username, u.age, u.gender, u.avatar_url, u.role, u.account_status, u.created_at,
      (CASE WHEN EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active') THEN 'active' ELSE 'inactive' END) as subscription_status
      FROM users u ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.phone, u.username, u.age, u.gender, u.avatar_url, u.role, u.account_status, u.created_at, u.updated_at, u.selected_genres,
      (CASE WHEN EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active') THEN 'active' ELSE 'inactive' END) as subscription_status,
      COALESCE((SELECT json_agg(s.*) FROM subscriptions s WHERE s.user_id = u.id), '[]'::json) as subscriptions
      FROM users u WHERE u.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, phone, username, role, account_status } = req.body;
    
    const result = await db.query(
      `UPDATE users SET 
       email = COALESCE($1, email), phone = COALESCE($2, phone), username = COALESCE($3, username), 
       role = COALESCE($4, role), account_status = COALESCE($5, account_status), updated_at = NOW()
       WHERE id = $6 RETURNING id, email, phone, username, avatar_url, role, account_status, updated_at`,
      [email, phone, username, role, account_status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'UPDATE', 'user', id, { email: result.rows[0].email });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateUserSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, durationMonths } = req.body;
    
    if (plan === 'free') {
      // Set any active subscription to cancelled
      await db.query(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'`, [id]);
    } else {
      // Upsert a PRO subscription
      await db.query(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE user_id = $1 AND status = 'active'`, [id]);
      
      await db.query(`
        INSERT INTO subscriptions (user_id, plan, billing_period, status, provider, started_at, expires_at)
        VALUES ($1, $2, $3, 'active', 'manual', NOW(), NOW() + interval '1 month' * $4)
      `, [id, plan, durationMonths === 12 ? 'yearly' : 'monthly', durationMonths]);
    }
    
    await logAdminAction(req.user.id, 'UPDATE', 'subscription', id, { plan });
    res.json({ success: true, message: 'Subscription updated successfully' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the URL that can be used to access the file
    const fileUrl = `${process.env.VITE_API_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, data: { url: fileUrl } });
  } catch (error) {
    console.error('File upload error:', error);
    next(error);
  }
};

// --- SUBSCRIPTIONS ---
const getSubscriptions = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT s.*, u.email as user_email, u.username as user_username 
      FROM subscriptions s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const getSubscriptionById = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM subscriptions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, billing_period, status, provider, provider_reference, started_at, expires_at, cancelled_at } = req.body;
    
    const result = await db.query(
      `UPDATE subscriptions SET 
       plan = COALESCE($1, plan), billing_period = COALESCE($2, billing_period), status = COALESCE($3, status), 
       provider = COALESCE($4, provider), provider_reference = COALESCE($5, provider_reference), 
       started_at = COALESCE($6, started_at), expires_at = COALESCE($7, expires_at), cancelled_at = COALESCE($8, cancelled_at),
       updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [plan, billing_period, status, provider, provider_reference, started_at, expires_at, cancelled_at, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'UPDATE', 'subscription', id, { plan: result.rows[0].plan });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

// --- NOTIFICATIONS ---
const getNotifications = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT n.*, u.email as user_email 
      FROM notifications n 
      LEFT JOIN users u ON n.user_id = u.id 
      ORDER BY n.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const { user_id, title, message, type, target_url } = req.body;
    
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required' });

    const result = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, target_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id || null, title, message, type || 'general', target_url || null]
    );

    const newNotif = result.rows[0];
    await logAdminAction(req.user.id, 'CREATE', 'notification', newNotif.id, { title });
    
    res.status(201).json({ success: true, data: newNotif });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    await logAdminAction(req.user.id, 'DELETE', 'notification', id, { title: result.rows[0].title });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    console.error(error.stack);
    next(error);
  }
};

module.exports = {
  getReportsOverview,
  getSettings, updateSettings,
  getDashboardStats,
  getSeries, getSeriesById, createSeries, updateSeries, deleteSeries,
  getEpisodes, getEpisodeById, createEpisode, updateEpisode, deleteEpisode,
  getBanners, createBanner, updateBanner, deleteBanner,
  getUsers, getUserById, updateUser,
  getSubscriptions, getSubscriptionById, updateSubscription,
  getNotifications,
  createNotification,
  deleteNotification,
  updateUserSubscription,
  uploadFile
};
