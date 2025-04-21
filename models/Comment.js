const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
