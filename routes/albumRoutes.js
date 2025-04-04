const express = require('express');
const router = express.Router();
const { getAlbums, getAlbum, addAlbum, updateAlbum, deleteAlbum } = require('../controllers/albumController');
const auth = require('../middleware/auth');
const { upload } = require('../utils/storage');


router.get('/', getAlbums);
router.get('/:id', getAlbum);
router.post('/', auth, upload.single('cover'), addAlbum);
router.put('/:id', auth, upload.single('cover'), updateAlbum);
router.delete('/:id', auth, deleteAlbum);

module.exports = router;