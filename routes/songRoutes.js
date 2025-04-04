const express = require('express');
const router = express.Router();
const { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs } = require('../controllers/songController');
const auth = require('../middleware/auth');
const { upload } = require('../utils/storage'); // Sử dụng module storage

// API routes
router.get('/', getSongs);
router.get('/:id', getSong);
router.post('/', auth, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), addSong);
router.put('/:id', auth, upload.fields([{ name: 'file' }, { name: 'thumbnail' }]), updateSong);
router.delete('/:id', auth, deleteSong);
router.get('/search', searchSongs);

module.exports = router;