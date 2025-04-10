const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Album = require('../models/Album');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../utils/storage');

// Get all artists with pagination
const getArtists = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const q = req.query.q; // Query parameter for searching by name

        if (page < 1 || limit < 1) {
            return res.status(400).json({ message: 'Page and limit must be positive numbers' });
        }

        const skip = (page - 1) * limit;

        // Build search conditions
        const searchConditions = {};

        // Add name search if query parameter exists
        if (q) {
            searchConditions.name = { $regex: q, $options: 'i' };
        }

        const artists = await Artist.find(searchConditions)
            .skip(skip)
            .limit(limit)
            .lean();

        // Count total artists matching the search conditions
        const totalArtists = await Artist.countDocuments(searchConditions);

        res.json({
            artists,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalArtists / limit),
                totalArtists,
                limit,
            },
        });
    } catch (error) {
        console.error('Error in getArtists:', error);
        res.status(500).json({ message: error.message });
    }
};

const getArtist = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const albums = await Album.find({ artist: artist._id });
        const songs = await Song.find({ artists: artist._id })
            .populate('album')
            .populate('artists', 'name');

        res.json({ artist, albums, songs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addArtist = async (req, res) => {
    try {
        const { name, bio } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log("Received file:", req.file);

        const imageUrl = await uploadToCloudinary(req.file.buffer, 'image');

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        let artist = await Artist.findOne({ name });
        if (artist) {
            return res.status(400).json({ message: 'Artist already exists' });
        }

        artist = new Artist({ name, bio, image: imageUrl });
        await artist.save();

        res.json({ artist });
    } catch (error) {
        console.error("Add Artist Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateArtist = async (req, res) => {
    const { name, bio } = req.body;

    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        if (name) artist.name = name;
        if (bio) artist.bio = bio;

        if (req.file) {
            console.log("Received file:", req.file);

            if (artist.image) {
                try {
                    const urlParts = artist.image.split('/');
                    const fileName = urlParts.pop().split('.')[0];
                    const folder = 'music-app/thumbnails';
                    const publicId = `${folder}/${fileName}`;
                    await cloudinary.uploader.destroy(publicId);
                } catch (deleteError) {
                    console.error("Error deleting old image:", deleteError);
                }
            }

            const imageUrl = await uploadToCloudinary(req.file.buffer, 'image');
            artist.image = imageUrl;
        }

        await artist.save();
        res.json(artist);
    } catch (error) {
        console.error("Update Artist Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteArtist = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        const songs = await Song.find({ artists: artist._id });
        const albums = await Album.find({ artist: artist._id });
        if (songs.length > 0 || albums.length > 0) {
            return res.status(400).json({ message: 'Cannot delete artist with associated songs or albums' });
        }

        if (artist.image) {
            try {
                const urlParts = artist.image.split('/');
                const fileName = urlParts.pop().split('.')[0];
                const publicId = `music-app/thumbnails/${fileName}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.error("Error deleting image:", deleteError);
            }
        }

        await Artist.deleteOne({ _id: artist._id });
        res.json({ message: 'Artist deleted' });
    } catch (error) {
        console.error("Delete Artist Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getArtists, getArtist, addArtist, updateArtist, deleteArtist };