const db = require('../config/db');
const slugify = require('../utils/slugify');

class CategoryService {
  async getPublicCategories() {
    const result = await db.query('SELECT * FROM categories WHERE active = true ORDER BY sort_order ASC, name ASC');
    return result.rows;
  }

  async getCategoryById(id) {
    const result = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getSeriesByCategory(categoryId) {
    const result = await db.query(`
      SELECT s.* FROM series s
      JOIN series_categories sc ON s.id = sc.series_id
      WHERE sc.category_id = $1 AND s.status = $2
    `, [categoryId, 'published']);
    return result.rows;
  }

  async getAllAdminCategories() {
    const result = await db.query('SELECT * FROM categories ORDER BY created_at DESC');
    return result.rows;
  }

  async checkUnique(name, slug, excludeId = null) {
    let query = 'SELECT id FROM categories WHERE (name = $1 OR slug = $2)';
    let params = [name, slug];
    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }
    const result = await db.query(query, params);
    return result.rows.length > 0;
  }

  async logAdminAction(adminId, action, entityId, details) {
    if (!adminId) return;
    try {
      await db.query(
        'INSERT INTO admin_logs (admin_user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [adminId, action, 'category', entityId, details]
      );
    } catch (err) {
      console.error('Failed to log admin action', err);
    }
  }

  async createCategory(data, adminId) {
    const { name, description, image_url, active, sort_order } = data;
    let { slug } = data;

    if (!slug) slug = slugify(name);
    else slug = slugify(slug);

    const isDuplicate = await this.checkUnique(name, slug);
    if (isDuplicate) throw new Error('Category with this name or slug already exists');

    const result = await db.query(
      `INSERT INTO categories (name, slug, description, image_url, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, slug, description, image_url, active ?? true, sort_order || 0]
    );

    const newCat = result.rows[0];
    await this.logAdminAction(adminId, 'CREATE', newCat.id, { name: newCat.name, slug: newCat.slug });
    return newCat;
  }

  async updateCategory(id, data, adminId) {
    const currentResult = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) throw new Error('NOT_FOUND');
    const current = currentResult.rows[0];

    const name = data.name !== undefined ? data.name : current.name;
    let slug = data.slug !== undefined ? data.slug : current.slug;
    
    // If name is updated but slug isn't explicitly provided, auto-update slug? User didn't specify. Let's just use provided or current slug.
    if (data.slug) slug = slugify(data.slug);

    const isDuplicate = await this.checkUnique(name, slug, id);
    if (isDuplicate) throw new Error('Category with this name or slug already exists');

    const description = data.description !== undefined ? data.description : current.description;
    const image_url = data.image_url !== undefined ? data.image_url : current.image_url;
    const active = data.active !== undefined ? data.active : current.active;
    const sort_order = data.sort_order !== undefined ? data.sort_order : current.sort_order;

    const result = await db.query(
      `UPDATE categories SET 
       name = $1, slug = $2, description = $3, image_url = $4, active = $5, sort_order = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, slug, description, image_url, active, sort_order, id]
    );

    const updatedCat = result.rows[0];
    await this.logAdminAction(adminId, 'UPDATE', updatedCat.id, { name: updatedCat.name });
    return updatedCat;
  }

  async deleteCategory(id, adminId) {
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) throw new Error('NOT_FOUND');
    
    await this.logAdminAction(adminId, 'DELETE', id, { name: result.rows[0].name });
    return result.rows[0];
  }
}

module.exports = new CategoryService();
