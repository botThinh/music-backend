const Like = require('../models/Like');

// Like a song or playlist
exports.like = async (req, res) => {
    try {
        const { songId, playlistId } = req.body;
        if (!songId && !playlistId) {
            return res.status(400).json({ message: 'songId or playlistId is required' });
        }
        const user = req.user.id;
        let like;
        if (songId) {
            like = await Like.findOneAndUpdate(
                { user, song: songId },
                { $set: { user, song: songId } },
                { upsert: true, new: true }
            );
        } else {
            like = await Like.findOneAndUpdate(
                { user, playlist: playlistId },
                { $set: { user, playlist: playlistId } },
                { upsert: true, new: true }
            );
        }
        res.status(200).json({ message: 'Liked', like });
    } catch (error) {
        console.error('Error in like:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Unlike a song or playlist
exports.getLikedSongs = async (req, res) => {
    try {
        const user = req.user.id;
        const likes = await Like.find({ user, song: { $exists: true, $ne: null } }).populate('song');
        const songs = likes.map(like => like.song);
        res.status(200).json(songs);
    } catch (error) {
        console.error('Error in getLikedSongs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.unlike = async (req, res) => {
    try {
        const { songId, playlistId } = req.body;
        if (!songId && !playlistId) {
            return res.status(400).json({ message: 'songId or playlistId is required' });
        }
        const user = req.user.id;
        let result;
        if (songId) {
            result = await Like.findOneAndDelete({ user, song: songId });
        } else {
            result = await Like.findOneAndDelete({ user, playlist: playlistId });
        }
        res.status(200).json({ message: 'Unliked', result });
    } catch (error) {
        console.error('Error in unlike:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
