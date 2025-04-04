const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    duration: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Song', songSchema);