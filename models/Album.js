const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    releaseDate: { type: Date },
    cover: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Album', albumSchema);