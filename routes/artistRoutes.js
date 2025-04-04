const express = require('express');
const router = express.Router();
const { getArtists, getArtist, addArtist, updateArtist, deleteArtist } = require('../controllers/artistController');
const auth = require('../middleware/auth');
const { upload } = require('../utils/storage');

// API routes
router.get('/', getArtists);
router.get('/:id', getArtist);
router.post('/', auth, upload.single('image'), addArtist);
router.put('/:id', auth, upload.single('image'), updateArtist);
router.delete('/:id', auth, deleteArtist);

module.exports = router;