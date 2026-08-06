const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

const categoryController = require('../controllers/categoryController');

router.get('/series', publicController.getSeries);
router.get('/series/:id', publicController.getSeriesById);
router.get('/series/:id/episodes', publicController.getEpisodesBySeriesId);

router.get('/categories', categoryController.getPublicCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.get('/categories/:id/series', categoryController.getSeriesByCategory);

router.get('/banners', publicController.getBanners);
router.get('/episodes/:id', publicController.getEpisodeById);
router.get('/notifications', publicController.getNotifications);
router.post('/push-token', publicController.registerPushToken);

module.exports = router;
