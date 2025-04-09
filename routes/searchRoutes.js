const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

// Route để tìm kiếm tổng hợp
router.get('/', globalSearch);

module.exports = router;