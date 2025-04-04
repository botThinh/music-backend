const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateAvatar, getUsers, deleteUser, updateUserRole } = require('../controllers/userController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const ownerOrAdmin = require('../middleware/ownerOrAdmin');
const { upload } = require('../utils/storage');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', auth, getProfile);
router.post('/avatar', auth, upload.single('avatar'), updateAvatar);
router.get('/', auth, admin, getUsers);
router.delete('/:id', auth, admin, deleteUser);
router.put('/:id/role', auth, admin, updateUserRole);

module.exports = router;