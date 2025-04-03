const express = require('express');
const router = express.Router();
const { getPlaylists, getPlaylist, createPlaylist, addSongToPlaylist } = require('../controllers/playlistController');
const auth = require('../middleware/auth');

router.get('/', auth, getPlaylists);
router.get('/:id', auth, getPlaylist);
router.post('/', auth, createPlaylist);
router.post('/:id/songs', auth, addSongToPlaylist);

module.exports = router;