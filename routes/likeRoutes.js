const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { like, unlike, getLikedSongs } = require('../controllers/likeController');

router.post('/like', auth, like);
router.post('/unlike', auth, unlike);
router.get('/songs', auth, getLikedSongs);

module.exports = router;
