const categoryService = require('../services/categoryService');
const { validateCategory } = require('../validators/categoryValidator');

class CategoryController {
  
  // --- PUBLIC ---
  async getPublicCategories(req, res) {
    try {
      const data = await categoryService.getPublicCategories();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  async getCategoryById(req, res) {
    try {
      const data = await categoryService.getCategoryById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  async getSeriesByCategory(req, res) {
    try {
      const data = await categoryService.getSeriesByCategory(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  // --- ADMIN ---
  async getAdminCategories(req, res) {
    try {
      const data = await categoryService.getAllAdminCategories();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  async createCategory(req, res) {
    try {
      const validationError = validateCategory(req.body, false);
      if (validationError) return res.status(400).json({ success: false, message: validationError });

      const data = await categoryService.createCategory(req.body, req.user.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ success: false, message: 'Bu isim veya slug ile bir kategori zaten var' });
      }
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  async updateCategory(req, res) {
    try {
      const validationError = validateCategory(req.body, true);
      if (validationError) return res.status(400).json({ success: false, message: validationError });

      const data = await categoryService.updateCategory(req.params.id, req.body, req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
      if (error.message.includes('already exists')) return res.status(409).json({ success: false, message: 'Bu isim veya slug ile bir kategori zaten var' });
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }

  async deleteCategory(req, res) {
    try {
      await categoryService.deleteCategory(req.params.id, req.user.id);
      res.json({ success: true, message: 'Kategori başarıyla silindi' });
    } catch (error) {
      if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  }
}

module.exports = new CategoryController();
