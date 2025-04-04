const Album = require('../models/Album');
const Song = require('../models/Song');
const { uploadToCloudinary } = require('../utils/storage');

const getAlbums = async (req, res) => {
    try {
        const albums = await Album.find().populate('artist', 'name');
        res.json(albums);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAlbum = async (req, res) => {
    try {
        const album = await Album.findById(req.params.id).populate('artist', 'name');
        if (!album) return res.status(404).json({ message: 'Album not found' });

        // Lấy danh sách bài hát trong album
        const songs = await Song.find({ album: album._id }).populate('artist');
        res.json({ album, songs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addAlbum = async (req, res) => {
    const { title, artist, releaseDate } = req.body;

    try {
        // Kiểm tra nghệ sĩ có tồn tại không
        const artistExists = await Artist.findById(artist);
        if (!artistExists) return res.status(404).json({ message: 'Artist not found' });

        // Upload ảnh bìa nếu có
        let coverUrl = '';
        if (req.file) {
            coverUrl = await uploadToCloudinary(req.file.path, 'image');
        }

        // Tạo album mới
        const album = new Album({
            title,
            artist,
            releaseDate: releaseDate ? new Date(releaseDate) : undefined,
            cover: coverUrl,
        });
        await album.save();
        res.status(201).json(album);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateAlbum = async (req, res) => {
    const { title, artist, releaseDate } = req.body;

    try {
        const album = await Album.findById(req.params.id);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        // Cập nhật thông tin
        if (title) album.title = title;
        if (artist) {
            const artistExists = await Artist.findById(artist);
            if (!artistExists) return res.status(404).json({ message: 'Artist not found' });
            album.artist = artist;
        }
        if (releaseDate) album.releaseDate = new Date(releaseDate);

        // Nếu có ảnh bìa mới
        if (req.file) {
            // Xóa ảnh cũ trên Cloudinary
            if (album.cover) {
                const oldCoverPublicId = album.cover.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`music-app/thumbnails/${oldCoverPublicId}`);
            }
            // Upload ảnh mới
            const coverUrl = await uploadToCloudinary(req.file.path, 'image');
            album.cover = coverUrl;
        }

        await album.save();
        res.json(album);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteAlbum = async (req, res) => {
    try {
        const album = await Album.findById(req.params.id);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        // Kiểm tra xem album có bài hát không
        const songs = await Song.find({ album: album._id });
        if (songs.length > 0) {
            return res.status(400).json({ message: 'Cannot delete album with associated songs' });
        }

        // Xóa ảnh bìa trên Cloudinary nếu có
        if (album.cover) {
            const coverPublicId = album.cover.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${coverPublicId}`);
        }

        await album.remove();
        res.json({ message: 'Album deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAlbums, getAlbum, addAlbum, updateAlbum, deleteAlbum };