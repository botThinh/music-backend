const Song = require('../models/Song');
const { uploadToCloudinary } = require('../utils/storage'); // Sử dụng module storage

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

    try {
        // Kiểm tra file MP3 và ảnh
        if (!req.files || !req.files.file || !req.files.thumbnail) {
            return res.status(400).json({ message: 'Both MP3 file and thumbnail are required' });
        }

        // Upload file MP3 và ảnh lên Cloudinary
        const mp3Url = await uploadToCloudinary(req.files.file[0].path, 'mp3');
        const thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].path, 'image');

        // Tạo bài hát mới
        const song = new Song({
            title,
            artist,
            url: mp3Url,
            thumbnail: thumbnailUrl,
            duration,
            uploadedBy: req.user.id,
        });

        await song.save();
        res.status(201).json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateSong = async (req, res) => {
    const { title, artist, duration } = req.body;

    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });
        if (song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this song' });
        }

        // Cập nhật thông tin cơ bản
        if (title) song.title = title;
        if (artist) song.artist = artist;
        if (duration) song.duration = duration;

        // Nếu có file MP3 mới
        if (req.files && req.files.file) {
            // Xóa file MP3 cũ trên Cloudinary
            const oldMp3PublicId = song.url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/songs/${oldMp3PublicId}`, { resource_type: 'video' });

            // Upload file MP3 mới
            const mp3Url = await uploadToCloudinary(req.files.file[0].path, 'mp3');
            song.url = mp3Url;
        }

        // Nếu có ảnh mới
        if (req.files && req.files.thumbnail) {
            // Xóa ảnh cũ trên Cloudinary
            const oldThumbnailPublicId = song.thumbnail.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${oldThumbnailPublicId}`);

            // Upload ảnh mới
            const thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].path, 'image');
            song.thumbnail = thumbnailUrl;
        }

        await song.save();
        res.json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });
        if (song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this song' });
        }

        // Xóa file MP3 trên Cloudinary
        const mp3PublicId = song.url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`music-app/songs/${mp3PublicId}`, { resource_type: 'video' });

        // Xóa ảnh trên Cloudinary
        const thumbnailPublicId = song.thumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`music-app/thumbnails/${thumbnailPublicId}`);

        // Xóa bài hát khỏi database
        await song.remove();
        res.json({ message: 'Song deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

module.exports = { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs };