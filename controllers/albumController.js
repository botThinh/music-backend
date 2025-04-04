const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Song = require('../models/Song');
const { uploadToCloudinary } = require('../utils/storage');
const cloudinary = require('../config/cloudinary');

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
        // Kiểm tra dữ liệu đầu vào
        if (!title || !artist) {
            return res.status(400).json({ message: 'Title and artist are required' });
        }

        // Kiểm tra nghệ sĩ có tồn tại không
        const artistExists = await Artist.findById(artist);
        if (!artistExists) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        // Upload ảnh bìa nếu có
        let coverUrl = '';
        if (req.file) {
            console.log("Received file:", req.file); // Debug
            // Dùng req.file.buffer nếu dùng memoryStorage
            coverUrl = await uploadToCloudinary(req.file.buffer || req.file.path, 'image');
        }

        // Tạo album mới
        const album = new Album({
            title,
            artist: artistExists._id, // ID của artist
            releaseDate: releaseDate ? new Date(releaseDate) : undefined,
            cover: coverUrl,
        });
        await album.save();

        // Cập nhật danh sách albums trong artist (nếu cần)
        artistExists.albums = artistExists.albums || [];
        artistExists.albums.push(album._id);
        await artistExists.save();

        res.status(201).json(album);
    } catch (error) {
        console.error("Add Album Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateAlbum = async (req, res) => {
    const { title, artist, releaseDate } = req.body;

    try {
        // Tìm album theo ID
        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Cập nhật thông tin
        if (title) album.title = title;
        if (artist) {
            const artistExists = await Artist.findById(artist);
            if (!artistExists) {
                return res.status(404).json({ message: 'Artist not found' });
            }
            album.artist = artist;
        }
        if (releaseDate) album.releaseDate = new Date(releaseDate);

        // Nếu có ảnh bìa mới
        if (req.file) {
            console.log("Received file:", req.file);

            // Xóa ảnh cũ trên Cloudinary nếu có
            if (album.cover) {
                try {
                    // Lấy public_id giống updateArtist/deleteArtist
                    const urlParts = album.cover.split('/');
                    const fileName = urlParts.pop().split('.')[0];
                    const publicId = `music-app/thumbnails/${fileName}`;
                    console.log("Public ID to delete:", publicId); // Debug

                    // Xóa ảnh trên Cloudinary
                    const destroyResult = await cloudinary.uploader.destroy(publicId);
                    console.log("Destroy result:", destroyResult); // Debug
                } catch (deleteError) {
                    console.error("Error deleting old cover:", deleteError);
                    // Tiếp tục dù xóa thất bại
                }
            }

            // Upload ảnh mới
            try {
                const coverUrl = await uploadToCloudinary(req.file.buffer || req.file.path, 'image');
                album.cover = coverUrl;
            } catch (uploadError) {
                console.error("Upload error:", uploadError);
                return res.status(500).json({
                    message: 'Error uploading cover',
                    error: uploadError.message
                });
            }
        }

        // Lưu thay đổi
        await album.save();
        res.json(album);
    } catch (error) {
        console.error("Update Album Error:", error);
        res.status(500).json({ message: error.message });
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

        // Sử dụng deleteOne để xóa album
        await Album.deleteOne({ _id: album._id });

        res.json({ message: 'Album deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = { getAlbums, getAlbum, addAlbum, updateAlbum, deleteAlbum };