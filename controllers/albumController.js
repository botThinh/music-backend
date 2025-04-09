const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Song = require('../models/Song');
const { uploadToCloudinary } = require('../utils/storage');
const cloudinary = require('../config/cloudinary');

// Get all albums with pagination
const getAlbums = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (page < 1 || limit < 1) {
            return res.status(400).json({ message: 'Page and limit must be positive numbers' });
        }

        const skip = (page - 1) * limit;

        const albums = await Album.find()
            .populate('artist', 'name')
            .skip(skip)
            .limit(limit)
            .lean();

        const totalAlbums = await Album.countDocuments();

        res.json({
            albums,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalAlbums / limit),
                totalAlbums,
                limit,
            },
        });
    } catch (error) {
        console.error('Error in getAlbums:', error);
        res.status(500).json({ message: error.message });
    }
};

const getAlbum = async (req, res) => {
    try {
        const album = await Album.findById(req.params.id).populate('artist', 'name');
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const songs = await Song.find({ album: album._id })
            .populate('artists', 'name')
            .populate('uploadedBy', 'username');
        res.json({ album, songs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addAlbum = async (req, res) => {
    const { title, artist, releaseDate } = req.body;

    try {
        if (!title || !artist) {
            return res.status(400).json({ message: 'Title and artist are required' });
        }

        const artistExists = await Artist.findById(artist);
        if (!artistExists) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        let coverUrl = '';
        if (req.file) {
            console.log("Received file:", req.file);
            coverUrl = await uploadToCloudinary(req.file.buffer || req.file.path, 'image');
        }

        const album = new Album({
            title,
            artist: artistExists._id,
            releaseDate: releaseDate ? new Date(releaseDate) : undefined,
            cover: coverUrl,
        });
        await album.save();

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
        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        if (title) album.title = title;
        if (artist) {
            const artistExists = await Artist.findById(artist);
            if (!artistExists) {
                return res.status(404).json({ message: 'Artist not found' });
            }
            album.artist = artist;
        }
        if (releaseDate) album.releaseDate = new Date(releaseDate);

        if (req.file) {
            console.log("Received file:", req.file);

            if (album.cover) {
                try {
                    const urlParts = album.cover.split('/');
                    const fileName = urlParts.pop().split('.')[0];
                    const publicId = `music-app/thumbnails/${fileName}`;
                    console.log("Public ID to delete:", publicId);
                    const destroyResult = await cloudinary.uploader.destroy(publicId);
                    console.log("Destroy result:", destroyResult);
                } catch (deleteError) {
                    console.error("Error deleting old cover:", deleteError);
                }
            }

            const coverUrl = await uploadToCloudinary(req.file.buffer || req.file.path, 'image');
            album.cover = coverUrl;
        }

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

        const songs = await Song.find({ album: album._id });
        if (songs.length > 0) {
            return res.status(400).json({ message: 'Cannot delete album with associated songs' });
        }

        if (album.cover) {
            const coverPublicId = album.cover.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${coverPublicId}`);
        }

        await Album.deleteOne({ _id: album._id });

        res.json({ message: 'Album deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAlbums, getAlbum, addAlbum, updateAlbum, deleteAlbum };