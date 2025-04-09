// 📄 server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const songRoutes = require('./routes/songRoutes');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const artistRoutes = require('./routes/artistRoutes');
const albumRoutes = require('./routes/albumRoutes');
const searchRoutes = require('./routes/searchRoutes');
const path = require('path');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http'); // ✅

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Nếu cần test homepage
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Static files (chỉ dùng được nếu không cần upload runtime)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/search', searchRoutes);

module.exports = app;
module.exports.handler = serverless(app);
