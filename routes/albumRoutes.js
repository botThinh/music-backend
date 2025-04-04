const express = require('express');
const router = express.Router();
const { getAlbums, getAlbum, addAlbum, updateAlbum, deleteAlbum } = require('../controllers/albumController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getAlbums); // Ai cũng xem được
router.get('/:id', getAlbum); // Ai cũng xem được
router.post('/', auth, admin, upload.single('cover'), addAlbum); // Chỉ Admin
router.put('/:id', auth, admin, upload.single('cover'), updateAlbum); // Chỉ Admin
router.delete('/:id', auth, admin, deleteAlbum); // Chỉ Admin

module.exports = router;