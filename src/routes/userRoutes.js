const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', userController.getMe);
router.put('/', userController.updateMe);
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:seriesId', userController.addFavorite);
router.delete('/favorites/:seriesId', userController.removeFavorite);
router.get('/saved', userController.getSaved);
router.post('/saved', userController.addSaved);
router.delete('/saved/:id', userController.removeSaved);
router.get('/downloads', userController.getDownloads);
router.post('/downloads', userController.addDownload);
router.delete('/downloads/:id', userController.removeDownload);
router.get('/watch-history', userController.getWatchHistory);
router.post('/watch-history', userController.updateWatchHistory);
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);
router.put('/preferences', userController.updatePreferences);
router.get('/recommended', userController.getRecommendedSeries);
router.post('/subscription', userController.subscribe);

module.exports = router;
