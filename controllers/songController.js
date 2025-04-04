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
        if (!req.files || !req.files.file || !req.files.thumbnail) {
            return res.status(400).json({ message: 'Both MP3 file and thumbnail are required' });
        }

        const artistExists = await Artist.findById(artist);
        if (!artistExists) return res.status(404).json({ message: 'Artist not found' });

        let albumExists = null;
        if (album) {
            albumExists = await Album.findById(album);
            if (!albumExists) return res.status(404).json({ message: 'Album not found' });
            if (albumExists.artist.toString() !== artist) {
                return res.status(400).json({ message: 'Album does not belong to this artist' });
            }
        }

        const mp3Url = await uploadToCloudinary(req.files.file[0].path, 'mp3');
        const thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].path, 'image');

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

        // Kiểm tra quyền sở hữu (middleware ownerOrAdmin đã cho phép Admin tiếp tục)
        if (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this song' });
        }

        if (title) song.title = title;
        if (duration) song.duration = duration;

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

        if (req.files && req.files.file) {
            const oldMp3PublicId = song.url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/songs/${oldMp3PublicId}`, { resource_type: 'video' });
            const mp3Url = await uploadToCloudinary(req.files.file[0].path, 'mp3');
            song.url = mp3Url;
        }

        if (req.files && req.files.thumbnail) {
            const oldThumbnailPublicId = song.thumbnail.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${oldThumbnailPublicId}`);
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

        // Kiểm tra quyền sở hữu (middleware ownerOrAdmin đã cho phép Admin tiếp tục)
        if (req.user.role !== 'admin' && song.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this song' });
        }

        const mp3PublicId = song.url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`music-app/songs/${mp3PublicId}`, { resource_type: 'video' });

        const thumbnailPublicId = song.thumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`music-app/thumbnails/${thumbnailPublicId}`);

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

        const artists = await Artist.find({
            name: { $regex: q, $options: 'i' },
        });
        const artistSongs = await Song.find({
            artist: { $in: artists.map(artist => artist._id) },
        })
            .populate('artist', 'name')
            .populate('album', 'title');

        const albums = await Album.find({
            title: { $regex: q, $options: 'i' },
        });
        const albumSongs = await Song.find({
            album: { $in: albums.map(album => album._id) },
        })
            .populate('artist', 'name')
            .populate('album', 'title');

        const allSongs = [...songs, ...artistSongs, ...albumSongs];
        const uniqueSongs = Array.from(new Set(allSongs.map(song => song._id.toString())))
            .map(id => allSongs.find(song => song._id.toString() === id));

        res.json(uniqueSongs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSong, addSong, updateSong, deleteSong, searchSongs };