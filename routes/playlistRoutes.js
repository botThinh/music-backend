const express = require('express');
const router = express.Router();
const { getPlaylists, getPlaylist, createPlaylist, addSongToPlaylist } = require('../controllers/playlistController');
const auth = require('../middleware/auth');
const ownerOrAdmin = require('../middleware/ownerOrAdmin');

// API routes
router.get('/', auth, getPlaylists); // User chỉ xem playlist của mình
router.get('/:id', auth, ownerOrAdmin, getPlaylist); // User chỉ xem playlist của mình
router.post('/', auth, createPlaylist); // User có thể tạo playlist
router.post('/:id/songs', auth, ownerOrAdmin, addSongToPlaylist); // User chỉ thêm bài hát vào playlist của mình

module.exports = router;