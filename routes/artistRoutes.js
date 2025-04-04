const express = require('express');
const router = express.Router();
const { getArtists, getArtist, addArtist, updateArtist, deleteArtist } = require('../controllers/artistController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getArtists); // Ai cũng xem được
router.get('/:id', getArtist); // Ai cũng xem được
router.post('/', auth, admin, upload.single('image'), addArtist); // Chỉ Admin
router.put('/:id', auth, admin, upload.single('image'), updateArtist); // Chỉ Admin
router.delete('/:id', auth, admin, deleteArtist); // Chỉ Admin

module.exports = router;