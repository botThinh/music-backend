const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    history: [
        {
            song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
            count: { type: Number, default: 1 },
            lastPlayedAt: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('UserHistory', userHistorySchema);
