const Song = require('../models/Song');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const { uploadToCloudinary } = require('../utils/storage');
const cloudinary = require('../config/cloudinary');

// Utility function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.split('.')[0];
};

// Get all songs with pagination
const getSongs = async (req, res) => {
    try {
        // Extract pagination parameters from query
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 songs per page
        const skip = (page - 1) * limit;

        // Fetch songs with pagination
        const songs = await Song.find()
            .populate('artist', 'name')
            .populate('album', 'title')
            .populate('uploadedBy', 'username')
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination metadata
        const totalSongs = await Song.countDocuments();

        // Prepare response with pagination metadata
        res.json({
            songs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalSongs / limit),
                totalSongs,
                limit,
            },
        });
    } catch (error) {
        console.error('Error in getSongs:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get a single song by ID
const getSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id)
            .populate('artist', 'name')
            .populate('album', 'title')
            .populate('uploadedBy', 'username')
            .lean();
        if (!song) return res.status(404).json({ message: 'Song not found' });
        res.json(song);
    } catch (error) {
        console.error('Error in getSong:', error);
        res.status(500).json({ message: error.message });
    }
};

// Add a new song
const addSong = async (req, res) => {
    const { title, artist, album, duration } = req.body || {};

    try {
        // Check if files are present
        if (!req.files || !req.files.url || !req.files.thumbnail) {
            return res.status(400).json({ message: 'Both MP3 file and thumbnail are required' });
        }

        // Log the files to debug
        console.log('Uploaded files:', req.files);

        // Validate MP3 file buffer
        const mp3File = req.files.url[0];
        if (!mp3File.buffer || mp3File.buffer.length === 0) {
            return res.status(400).json({ message: 'MP3 file is empty' });
        }

        // Validate thumbnail file buffer
        const thumbnailFile = req.files.thumbnail[0];
        if (!thumbnailFile.buffer || thumbnailFile.buffer.length === 0) {
            return res.status(400).json({ message: 'Thumbnail file is empty' });
        }

        // Validate artist
        const artistExists = await Artist.findById(artist);
        if (!artistExists) return res.status(404).json({ message: 'Artist not found' });

        // Validate album if provided
        let albumExists = null;
        if (album) {
            albumExists = await Album.findById(album);
            if (!albumExists) return res.status(404).json({ message: 'Album not found' });
            if (albumExists.artist.toString() !== artist) {
                return res.status(400).json({ message: 'Album does not belong to this artist' });
            }
        }

        // Upload MP3 and thumbnail to Cloudinary using the buffer
        const mp3Url = await uploadToCloudinary(mp3File.buffer, 'mp3');
        const thumbnailUrl = await uploadToCloudinary(thumbnailFile.buffer, 'image');

        // Create new song
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
        console.error('Error in addSong:', error);
        res.status(400).json({ message: error.message });
    }
};

// Update an existing song
const updateSong = async (req, res) => {
    const { title, artist, album, duration } = req.body || {};

    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });

        if (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this song' });
        }

        if (title) song.title = title;

        if (duration) {
            const durationNum = parseInt(duration, 10);
            if (isNaN(durationNum) || durationNum <= 0) {
                return res.status(400).json({ message: 'Duration must be a positive number' });
            }
            song.duration = durationNum;
        }

        if (artist) {
            const artistExists = await Artist.findById(artist);
            if (!artistExists) return res.status(404).json({ message: 'Artist not found' });
            song.artist = artist;
        }

        if (album) {
            const albumExists = await Album.findById(album);
            if (!albumExists) return res.status(404).json({ message: 'Album not found' });
            if (albumExists.artist.toString() !== (artist || song.artist).toString()) {
                return res.status(400).json({ message: 'Album does not belong to this artist' });
            }
            song.album = album;
        } else if (album === null) {
            song.album = null;
        }

        if (req.files && req.files.url) {
            const mp3File = req.files.url[0];
            if (!mp3File.buffer || mp3File.buffer.length === 0) {
                return res.status(400).json({ message: 'MP3 file is empty' });
            }

            const oldMp3PublicId = getPublicIdFromUrl(song.url);
            try {
                await cloudinary.uploader.destroy(`music-app/songs/${oldMp3PublicId}`, { resource_type: 'video' });
            } catch (error) {
                console.error('Failed to delete old MP3 from Cloudinary:', error);
            }

            const mp3Url = await uploadToCloudinary(mp3File.buffer, 'mp3');
            song.url = mp3Url;
        }

        if (req.files && req.files.thumbnail) {
            const thumbnailFile = req.files.thumbnail[0];
            if (!thumbnailFile.buffer || thumbnailFile.buffer.length === 0) {
                return res.status(400).json({ message: 'Thumbnail file is empty' });
            }

            const oldThumbnailPublicId = getPublicIdFromUrl(song.thumbnail);
            try {
                await cloudinary.uploader.destroy(`music-app/thumbnails/${oldThumbnailPublicId}`);
            } catch (error) {
                console.error('Failed to delete old thumbnail from Cloudinary:', error);
            }

            const thumbnailUrl = await uploadToCloudinary(thumbnailFile.buffer, 'image');
            song.thumbnail = thumbnailUrl;
        }

        await song.save();

        const populatedSong = await Song.findById(song._id)
            .populate('artist', 'name')
            .populate('album', 'title')
            .populate('uploadedBy', 'username')
            .lean();

        res.json(populatedSong);
    } catch (error) {
        console.error('Error in updateSong:', error);
        res.status(400).json({ message: error.message });
    }
};

// Delete a song
const deleteSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });

        if (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this song' });
        }

        const mp3PublicId = getPublicIdFromUrl(song.url);
        await cloudinary.uploader.destroy(`music-app/songs/${mp3PublicId}`, { resource_type: 'video' });

        const thumbnailPublicId = getPublicIdFromUrl(song.thumbnail);
        await cloudinary.uploader.destroy(`music-app/thumbnails/${thumbnailPublicId}`);

        await song.deleteOne();
        res.json({ message: 'Song deleted' });
    } catch (error) {
        console.error('Error in deleteSong:', error);
        res.status(500).json({ message: error.message });
    }
};

// Search songs with pagination
const searchSongs = async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) return res.status(400).json({ message: 'Search query is required' });

    try {
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Use MongoDB aggregation to search across song title, artist name, and album title
        const pipeline = [
            // Lookup to join with Artist and Album collections
            {
                $lookup: {
                    from: 'artists',
                    localField: 'artist',
                    foreignField: '_id',
                    as: 'artist',
                },
            },
            {
                $lookup: {
                    from: 'albums',
                    localField: 'album',
                    foreignField: '_id',
                    as: 'album',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'uploadedBy',
                    foreignField: '_id',
                    as: 'uploadedBy',
                },
            },
            // Unwind the arrays created by lookup
            { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true } },
            // Match songs where title, artist name, or album title matches the query
            {
                $match: {
                    $or: [
                        { title: { $regex: q, $options: 'i' } },
                        { 'artist.name': { $regex: q, $options: 'i' } },
                        { 'album.title': { $regex: q, $options: 'i' } },
                    ],
                },
            },
            // Project only the fields we need
            {
                $project: {
                    title: 1,
                    url: 1,
                    thumbnail: 1,
                    duration: 1,
                    'artist.name': 1,
                    'album.title': 1,
                    'uploadedBy.username': 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            // Apply pagination
            { $skip: skip },
            { $limit: parseInt(limit) },
        ];

        const songs = await Song.aggregate(pipeline).exec();

        // Get total count for pagination metadata
        const countPipeline = [
            {
                $lookup: {
                    from: 'artists',
                    localField: 'artist',
                    foreignField: '_id',
                    as: 'artist',
                },
            },
            {
                $lookup: {
                    from: 'albums',
                    localField: 'album',
                    foreignField: '_id',
                    as: 'album',
                },
            },
            { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $or: [
                        { title: { $regex: q, $options: 'i' } },
                        { 'artist.name': { $regex: q, $options: 'i' } },
                        { 'album.title': { $regex: q, $options: 'i' } },
                    ],
                },
            },
            { $count: 'total' },
        ];

        const countResult = await Song.aggregate(countPipeline).exec();
        const totalSongs = countResult[0]?.total || 0;

        // Prepare response with pagination metadata
        res.json({
            songs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalSongs / limit),
                totalSongs,
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('Error in searchSongs:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs };