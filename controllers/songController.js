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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        if (page < 1 || limit < 1) {
            return res.status(400).json({ message: 'Page and limit must be positive numbers' });
        }

        const skip = (page - 1) * limit;

        // Fetch songs with pagination, populate artists (not artist), album, and uploadedBy
        const songs = await Song.find({ status: 'public' }) // Chỉ lấy bài hát công khai
            .populate('artists', 'name') // Populate mảng artists
            .populate('album', 'title')
            .populate('uploadedBy', 'username')
            .skip(skip)
            .limit(limit)
            .lean();

        const totalSongs = await Song.countDocuments({ status: 'public' });

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
            .populate('artists', 'name') // Populate mảng artists
            .populate('album', 'title')
            .populate('uploadedBy', 'username')
            .lean();
        if (!song) return res.status(404).json({ message: 'Song not found' });

        // Kiểm tra trạng thái bài hát
        if (song.status !== 'public' && (!req.user || (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id))) {
            return res.status(403).json({ message: 'Not authorized to view this song' });
        }

        res.json(song);
    } catch (error) {
        console.error('Error in getSong:', error);
        res.status(500).json({ message: error.message });
    }
};

// Add a new song
const addSong = async (req, res) => {
    const { title, artists, album, duration, genres, releaseYear, tags, language, lyrics } = req.body || {};

    try {
        // Validate required fields
        if (!title || !artists || !duration) {
            return res.status(400).json({ message: 'Title, artists, and duration are required' });
        }

        // Validate files
        if (!req.files || !req.files.url || !req.files.thumbnail) {
            return res.status(400).json({ message: 'Both MP3 file and thumbnail are required' });
        }

        const mp3File = req.files.url[0];
        const thumbnailFile = req.files.thumbnail[0];

        if (!mp3File.buffer || mp3File.buffer.length === 0) {
            return res.status(400).json({ message: 'MP3 file is empty' });
        }

        if (!thumbnailFile.buffer || thumbnailFile.buffer.length === 0) {
            return res.status(400).json({ message: 'Thumbnail file is empty' });
        }

        // Validate artists (now an array)
        let artistsArray;
        try {
            artistsArray = typeof artists === 'string' ? JSON.parse(artists) : artists;
            if (!Array.isArray(artistsArray) || artistsArray.length === 0) {
                return res.status(400).json({ message: 'Artists must be a non-empty array' });
            }
        } catch (error) {
            return res.status(400).json({ message: 'Invalid artists format' });
        }

        const artistDocs = await Artist.find({ _id: { $in: artistsArray } });
        if (artistDocs.length !== artistsArray.length) {
            return res.status(404).json({ message: 'One or more artists not found' });
        }

        // Validate album if provided
        let albumDoc = null;
        if (album) {
            albumDoc = await Album.findById(album);
            if (!albumDoc) return res.status(404).json({ message: 'Album not found' });
            // Check if album belongs to one of the artists
            if (!albumDoc.artist || !artistsArray.includes(albumDoc.artist.toString())) {
                return res.status(400).json({ message: 'Album does not belong to any of the specified artists' });
            }
        }

        // Upload files to Cloudinary
        const [mp3Url, thumbnailUrl] = await Promise.all([
            uploadToCloudinary(mp3File.buffer, 'mp3'),
            uploadToCloudinary(thumbnailFile.buffer, 'image', {
                width: 300,
                height: 300,
                crop: 'fit',
                quality: 'auto',
            }),
        ]);

        // Create new song with new fields
        const song = new Song({
            title,
            artists: artistsArray, // Lưu mảng artists
            album: album || null,
            url: mp3Url,
            thumbnail: thumbnailUrl,
            duration: parseInt(duration, 10),
            uploadedBy: req.user.id,
            genres: genres ? (typeof genres === 'string' ? JSON.parse(genres) : genres) : [],
            releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            language: language || 'English',
            lyrics: lyrics || '',
            status: req.user.role === 'admin' ? 'public' : 'pending', // Admin có thể công khai ngay, user thường thì chờ duyệt
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
    const { title, artists, album, duration, genres, releaseYear, tags, language, lyrics, status } = req.body || {};

    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ message: 'Song not found' });

        // Kiểm tra quyền chỉnh sửa
        if (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this song' });
        }

        // Cập nhật các trường cơ bản
        if (title) song.title = title;

        if (duration) {
            const durationNum = parseInt(duration, 10);
            if (isNaN(durationNum) || durationNum <= 0) {
                return res.status(400).json({ message: 'Duration must be a positive number' });
            }
            song.duration = durationNum;
        }

        // Cập nhật artists (mảng)
        if (artists) {
            let artistsArray;
            try {
                artistsArray = typeof artists === 'string' ? JSON.parse(artists) : artists;
                if (!Array.isArray(artistsArray) || artistsArray.length === 0) {
                    return res.status(400).json({ message: 'Artists must be a non-empty array' });
                }
            } catch (error) {
                return res.status(400).json({ message: 'Invalid artists format' });
            }

            const artistDocs = await Artist.find({ _id: { $in: artistsArray } });
            if (artistDocs.length !== artistsArray.length) {
                return res.status(404).json({ message: 'One or more artists not found' });
            }
            song.artists = artistsArray;
        }

        // Cập nhật album
        if (album) {
            const albumDoc = await Album.findById(album);
            if (!albumDoc) return res.status(404).json({ message: 'Album not found' });
            const currentArtists = artists ? artistsArray : song.artists;
            if (albumDoc.artist.toString() !== currentArtists[0]) { // Kiểm tra với artist đầu tiên (có thể mở rộng logic nếu cần)
                return res.status(400).json({ message: 'Album does not belong to any of the specified artists' });
            }
            song.album = album;
        } else if (album === null) {
            song.album = null;
        }

        // Cập nhật các trường mới
        if (genres) {
            song.genres = typeof genres === 'string' ? JSON.parse(genres) : genres;
        }
        if (releaseYear) {
            song.releaseYear = parseInt(releaseYear, 10);
        }
        if (tags) {
            song.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        }
        if (language) {
            song.language = language;
        }
        if (lyrics) {
            song.lyrics = lyrics;
        }
        if (status && req.user.role === 'admin') { // Chỉ admin mới được thay đổi status
            song.status = status;
        }

        // Cập nhật file MP3 nếu có
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

        // Cập nhật thumbnail nếu có
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

        // Populate lại để trả về dữ liệu đầy đủ
        const populatedSong = await Song.findById(song._id)
            .populate('artists', 'name')
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
    const { q, page = 1, limit = 10, genre, language, tag } = req.query;

    if (!q && !genre && !language && !tag) {
        return res.status(400).json({ message: 'At least one search criterion (query, genre, language, or tag) is required' });
    }

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (pageNum < 1 || limitNum < 1) {
            return res.status(400).json({ message: 'Page and limit must be positive numbers' });
        }

        const skip = (pageNum - 1) * limitNum;

        // Xây dựng điều kiện tìm kiếm
        const matchConditions = [];
        if (q) {
            matchConditions.push({
                $or: [
                    { title: { $regex: q, $options: 'i' } },
                    { 'artist.name': { $regex: q, $options: 'i' } },
                    { 'album.title': { $regex: q, $options: 'i' } },
                    { tags: { $regex: q, $options: 'i' } },
                ],
            });
        }
        if (genre) {
            matchConditions.push({ genres: genre });
        }
        if (language) {
            matchConditions.push({ language: language });
        }
        if (tag) {
            matchConditions.push({ tags: tag });
        }

        // Chỉ lấy bài hát công khai
        matchConditions.push({ status: 'public' });

        const pipeline = [
            {
                $lookup: {
                    from: 'artists',
                    localField: 'artists', // Cập nhật để dùng artists
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
            { $unwind: { path: '$artist', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$uploadedBy', preserveNullAndEmptyArrays: true } },
            {
                $match: matchConditions.length > 0 ? { $and: matchConditions } : {},
            },
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
                    genres: 1,
                    playCount: 1,
                    likes: 1,
                    releaseYear: 1,
                    tags: 1,
                    language: 1,
                    lyrics: 1,
                },
            },
            { $skip: skip },
            { $limit: limitNum },
        ];

        const songs = await Song.aggregate(pipeline).exec();

        const countPipeline = [
            {
                $lookup: {
                    from: 'artists',
                    localField: 'artists',
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
                $match: matchConditions.length > 0 ? { $and: matchConditions } : {},
            },
            { $count: 'total' },
        ];

        const countResult = await Song.aggregate(countPipeline).exec();
        const totalSongs = countResult[0]?.total || 0;

        res.json({
            songs,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalSongs / limitNum),
                totalSongs,
                limit: limitNum,
            },
        });
    } catch (error) {
        console.error('Error in searchSongs:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs };