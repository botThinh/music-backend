const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    bio: { type: String },
    image: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Artist', artistSchema);