const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'editor']));

const categoryController = require('../controllers/categoryController');

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Reports
router.get('/reports/overview', adminController.getReportsOverview);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Series
router.get('/series', adminController.getSeries);
router.get('/series/:id', adminController.getSeriesById);
router.post('/series', adminController.createSeries);
router.put('/series/:id', adminController.updateSeries);
router.delete('/series/:id', adminController.deleteSeries);

// Episodes
router.get('/episodes', adminController.getEpisodes);
router.get('/episodes/:id', adminController.getEpisodeById);
router.post('/episodes', adminController.createEpisode);
router.put('/episodes/:id', adminController.updateEpisode);
router.delete('/episodes/:id', adminController.deleteEpisode);

// Categories
router.get('/categories', categoryController.getAdminCategories);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Banners
router.get('/banners', adminController.getBanners);
router.post('/banners', adminController.createBanner);
router.put('/banners/:id', adminController.updateBanner);
router.delete('/banners/:id', adminController.deleteBanner);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);

// Subscriptions
router.get('/subscriptions', adminController.getSubscriptions);
router.get('/subscriptions/:id', adminController.getSubscriptionById);
router.put('/subscriptions/:id', adminController.updateSubscription);

// Notifications
router.get('/notifications', adminController.getNotifications);
router.post('/notifications', adminController.createNotification);
router.delete('/notifications/:id', adminController.deleteNotification);

// User Subscriptions (Admin managed)
router.post('/users/:id/subscription', adminController.updateUserSubscription);

// File Upload (multer)
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), adminController.uploadFile);

module.exports = router;
