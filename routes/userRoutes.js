const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateAvatar } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload } = require('../utils/storage'); // Sử dụng module storage

router.post('/register', register);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.post('/avatar', auth, upload.single('avatar'), updateAvatar); // API upload ảnh đại diện

module.exports = router;