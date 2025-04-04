const express = require('express');
const router = express.Router();
const { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs } = require('../controllers/songController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const ownerOrAdmin = require('../middleware/ownerOrAdmin');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getSongs); // Không cần auth, ai cũng xem được
router.get('/:id', getSong); // Không cần auth, ai cũng xem được
router.post('/', auth, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), addSong); // User có thể thêm bài hát
router.put('/:id', auth, ownerOrAdmin, updateSong); // User chỉ chỉnh sửa bài hát của mình, Admin chỉnh sửa tất cả
router.delete('/:id', auth, ownerOrAdmin, deleteSong); // User chỉ xóa bài hát của mình, Admin xóa tất cả
router.get('/search', searchSongs); // Không cần auth, ai cũng tìm kiếm được

module.exports = router;