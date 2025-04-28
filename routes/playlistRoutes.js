const express = require('express');
const router = express.Router();
const { getPlaylists, getPlaylist, createPlaylist, addSongToPlaylist, deletePlaylist, updatePlaylist, removeSongFromPlaylist } = require('../controllers/playlistController');
const auth = require('../middleware/auth');
const ownerOrAdmin = require('../middleware/ownerOrAdmin');

// API routes
router.get('/', auth, getPlaylists); // User chỉ xem playlist của mình
router.get('/:id', auth, ownerOrAdmin, getPlaylist); // User chỉ xem playlist của mình
router.post('/', auth, createPlaylist); // User có thể tạo playlist
router.post('/:id/songs', auth, ownerOrAdmin, addSongToPlaylist); // User chỉ thêm bài hát vào playlist của mình
router.delete('/:id', auth, ownerOrAdmin, deletePlaylist); // User xóa playlist của mình
router.put('/:id', auth, ownerOrAdmin, updatePlaylist); // User cập nhật tên/mô tả playlist của mình
router.delete('/:id/songs/:songId', auth, ownerOrAdmin, removeSongFromPlaylist); // User xóa bài hát khỏi playlist của mình

module.exports = router;