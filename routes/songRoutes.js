const express = require('express');
const router = express.Router();
const { getSongs, getSong, addSong, searchSongs } = require('../controllers/songController');
const auth = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.get('/', getSongs);
router.get('/:id', getSong);
router.post('/', auth, upload.single('file'), addSong);
router.get('/search', searchSongs);

module.exports = router;