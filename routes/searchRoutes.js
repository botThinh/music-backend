const express = require('express');
const router = express.Router();
const {
    globalSearch,
    globalSearchAll,
    searchByTitle,
    searchByArtist,
    searchByLyrics,
    searchByGenre
} = require('../controllers/searchController');

// Global search with pagination
router.get('/', globalSearch);

// Global search without pagination
router.get('/all', globalSearchAll);

// Search by title
router.get('/title', searchByTitle);

// Search by artist
router.get('/artist', searchByArtist);

// Search by lyrics
router.get('/lyrics', searchByLyrics);

// Search by genre
router.get('/genre', searchByGenre);

module.exports = router;