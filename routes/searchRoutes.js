const express = require('express');
const router = express.Router();
const { globalSearch, globalSearchAll } = require('../controllers/searchController');

// Route để tìm kiếm tổng hợp có phân trang
router.get('/', globalSearch);

// Route để tìm kiếm tổng hợp không phân trang
router.get('/all', globalSearchAll);

module.exports = router;