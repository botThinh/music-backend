const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const songRoutes = require('./routes/songRoutes');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const artistRoutes = require('./routes/artistRoutes');
const albumRoutes = require('./routes/albumRoutes');
const path = require('path');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Serve static files (nếu cần)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});