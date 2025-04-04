const Playlist = require('../models/Playlist');

const getPlaylists = async (req, res) => {
    try {
        // Nếu là Admin, lấy tất cả playlist
        if (req.user.role === 'admin') {
            const playlists = await Playlist.find().populate('songs').populate('user', 'username');
            return res.json(playlists);
        }

        // Nếu là User, chỉ lấy playlist của mình
        const playlists = await Playlist.find({ user: req.user.id }).populate('songs');
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id).populate('songs');
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        // Kiểm tra quyền sở hữu (middleware ownerOrAdmin đã cho phép Admin tiếp tục)
        if (req.user.role !== 'admin' && playlist.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this playlist' });
        }

        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createPlaylist = async (req, res) => {
    const { name } = req.body;
    try {
        const playlist = new Playlist({ name, user: req.user.id });
        await playlist.save();
        res.status(201).json(playlist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const addSongToPlaylist = async (req, res) => {
    const { songId } = req.body;
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        // Kiểm tra quyền sở hữu (middleware ownerOrAdmin đã cho phép Admin tiếp tục)
        if (req.user.role !== 'admin' && playlist.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to modify this playlist' });
        }

        if (playlist.songs.includes(songId)) {
            return res.status(400).json({ message: 'Song already in playlist' });
        }
        playlist.songs.push(songId);
        await playlist.save();
        res.json(playlist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { getPlaylists, getPlaylist, createPlaylist, addSongToPlaylist };