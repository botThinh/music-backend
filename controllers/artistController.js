const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Album = require('../models/Album');
const { uploadToCloudinary } = require('../utils/storage');

const getArtists = async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getArtist = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        // Lấy danh sách album của nghệ sĩ
        const albums = await Album.find({ artist: artist._id });
        // Lấy danh sách bài hát của nghệ sĩ
        const songs = await Song.find({ artist: artist._id }).populate('album');

        res.json({ artist, albums, songs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addArtist = async (req, res) => {
    const { name, bio } = req.body;

    try {
        // Kiểm tra nghệ sĩ đã tồn tại chưa
        let artist = await Artist.findOne({ name });
        if (artist) return res.status(400).json({ message: 'Artist already exists' });

        // Upload ảnh nếu có
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.path, 'image');
        }

        // Tạo nghệ sĩ mới
        artist = new Artist({ name, bio, image: imageUrl });
        await artist.save();
        res.status(201).json(artist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateArtist = async (req, res) => {
    const { name, bio } = req.body;

    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        // Cập nhật thông tin
        if (name) artist.name = name;
        if (bio) artist.bio = bio;

        // Nếu có ảnh mới
        if (req.file) {
            // Xóa ảnh cũ trên Cloudinary
            if (artist.image) {
                const oldImagePublicId = artist.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`music-app/thumbnails/${oldImagePublicId}`);
            }
            // Upload ảnh mới
            const imageUrl = await uploadToCloudinary(req.file.path, 'image');
            artist.image = imageUrl;
        }

        await artist.save();
        res.json(artist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteArtist = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        // Kiểm tra xem nghệ sĩ có bài hát hoặc album không
        const songs = await Song.find({ artist: artist._id });
        const albums = await Album.find({ artist: artist._id });
        if (songs.length > 0 || albums.length > 0) {
            return res.status(400).json({ message: 'Cannot delete artist with associated songs or albums' });
        }

        // Xóa ảnh trên Cloudinary nếu có
        if (artist.image) {
            const imagePublicId = artist.image.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${imagePublicId}`);
        }

        await artist.remove();
        res.json({ message: 'Artist deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getArtists, getArtist, addArtist, updateArtist, deleteArtist };