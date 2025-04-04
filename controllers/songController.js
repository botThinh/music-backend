const Song = require('../models/Song');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const { uploadToCloudinary } = require('../utils/storage');

const getSongs = async (req, res) => {
    try {
        const songs = await Song.find()
            .populate('artist', 'name')
            .populate('album', 'title')
            .populate('uploadedBy', 'username');
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id)
            .populate('artist', 'name')
            .populate('album', 'title')
            .populate('uploadedBy', 'username');
        if (!song) return res.status(404).json({ message: 'Song not found' });
        res.json(song);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addSong = async (req, res) => {
    const { title, artist, album, duration } = req.body;

    try {
        // Kiểm tra file MP3 và ảnh
        if (!req.files || !req.files.file || !req.files.thumbnail) {
            return res.status(400).json({ message: 'Both MP3 file and thumbnail are required' });
        }

        // Kiểm tra nghệ sĩ có tồn tại không
        const artistExists = await Artist.findById(artist);
        if (!artistExists) return res.status(404).json({ message: 'Artist not found' });

        // Kiểm tra album nếu có
        let albumExists = null;
        if (album) {
            albumExists = await Album.findById(album);
            if (!albumExists) return res.status(404).json({ message: 'Album not found' });
            // Kiểm tra album có thuộc nghệ sĩ không
            if (albumExists.artist.toString() !== artist) {
                return res.status(400).json({ message: 'Album does not belong to this artist' });
            }
        }

        // Upload file MP3 và ảnh lên Cloudinary
        const mp3Url = await uploadToCloudinary(req.files.file[0].path, 'mp3');
        const thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].path, 'image');

        // Tạo bài hát mới
        const song = new Song({
            title,
            artist,
            album: album || null,
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
    const { title, artist, album, duration } = req.body;

    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });
        if (song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this song' });
        }

        // Cập nhật thông tin cơ bản
        if (title) song.title = title;
        if (duration) song.duration = duration;

        // Cập nhật nghệ sĩ nếu có
        if (artist) {
            const artistExists = await Artist.findById(artist);
            if (!artistExists) return res.status(404).json({ message: 'Artist not found' });
            song.artist = artist;
        }

        // Cập nhật album nếu có
        if (album) {
            const albumExists = await Album.findById(album);
            if (!albumExists) return res.status(404).json({ message: 'Album not found' });
            // Kiểm tra album có thuộc nghệ sĩ không
            if (albumExists.artist.toString() !== (artist || song.artist).toString()) {
                return res.status(400).json({ message: 'Album does not belong to this artist' });
            }
            song.album = album;
        } else if (album === null) {
            song.album = null; // Xóa album nếu gửi album=null
        }

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
            ],
        })
            .populate('artist', 'name')
            .populate('album', 'title');

        // Tìm kiếm theo tên nghệ sĩ
        const artists = await Artist.find({
            name: { $regex: q, $options: 'i' },
        });
        const artistSongs = await Song.find({
            artist: { $in: artists.map(artist => artist._id) },
        })
            .populate('artist', 'name')
            .populate('album', 'title');

        // Tìm kiếm theo album
        const albums = await Album.find({
            title: { $regex: q, $options: 'i' },
        });
        const albumSongs = await Song.find({
            album: { $in: albums.map(album => album._id) },
        })
            .populate('artist', 'name')
            .populate('album', 'title');

        // Gộp kết quả và loại bỏ trùng lặp
        const allSongs = [...songs, ...artistSongs, ...albumSongs];
        const uniqueSongs = Array.from(new Set(allSongs.map(song => song._id.toString())))
            .map(id => allSongs.find(song => song._id.toString() === id));

        res.json(uniqueSongs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs };