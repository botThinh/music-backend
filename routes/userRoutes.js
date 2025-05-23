const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateAvatar, getUsers, deleteUser, updateUserRole, logout } = require('../controllers/userController');
const { saveSongPlay, recommendSongs, getRecentlyPlayed } = require('../controllers/userHistoryController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../utils/storage');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth, logout);
router.get('/profile', auth, getProfile);
router.post('/avatar', auth, upload.single('avatar'), updateAvatar);
router.get('/', auth, admin, getUsers);
router.delete('/:id', auth, admin, deleteUser);
router.put('/:id/role', auth, admin, updateUserRole);

router.post('/play-song', auth, saveSongPlay);
router.get('/recommend-songs', auth, recommendSongs);
router.get('/recently-played', auth, getRecentlyPlayed);

module.exports = router;