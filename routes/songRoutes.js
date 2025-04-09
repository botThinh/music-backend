const express = require('express');
const router = express.Router();
const { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs } = require('../controllers/songController');
const auth = require('../middleware/auth');
const ownerOrAdmin = require('../middleware/ownerOrAdmin');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getSongs);
router.get('/:id', getSong);
router.post('/', auth, upload.fields([{ name: 'url' }, { name: 'thumbnail' }]), addSong);
router.put('/:id', auth, ownerOrAdmin, upload.fields([{ name: 'url' }, { name: 'thumbnail' }]), updateSong);
router.delete('/:id', auth, ownerOrAdmin, deleteSong);
router.get('/search', searchSongs);

module.exports = router;