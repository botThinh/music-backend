const Song = require('../models/Song');

const getSongs = async (req, res) => {
    try {
        const songs = await Song.find().populate('uploadedBy', 'username');
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id).populate('uploadedBy', 'username');
        if (!song) return res.status(404).json({ message: 'Song not found' });
        res.json(song);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addSong = async (req, res) => {
    const { title, artist, duration } = req.body;
    const url = req.file ? `/uploads/${req.file.filename}` : req.body.url;
    try {
        const song = new Song({
            title,
            artist,
            url,
            duration,
            uploadedBy: req.user.id,
        });
        await song.save();
        res.status(201).json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const searchSongs = async (req, res) => {
    const { q } = req.query;
    try {
        const songs = await Song.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { artist: { $regex: q, $options: 'i' } },
            ],
        });
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSong, addSong, searchSongs };