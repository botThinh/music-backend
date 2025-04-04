const express = require('express');
const router = express.Router();
const { getArtists, getArtist, addArtist, updateArtist, deleteArtist } = require('../controllers/artistController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getArtists);
router.get('/:id', getArtist);
router.post('/', auth, admin, upload.single('image'), addArtist);
router.put('/:id', auth, admin, upload.single('image'), updateArtist);
router.delete('/:id', auth, admin, deleteArtist);

module.exports = router;