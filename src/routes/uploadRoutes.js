const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// Allow public uploads for signup, or require auth. For signup, it usually needs to be public.
// We'll keep it public but rate limited in production.
router.post('/', uploadController.upload.single('image'), uploadController.uploadImage);

module.exports = router;
