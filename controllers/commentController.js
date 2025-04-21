const Comment = require('../models/Comment');
const Song = require('../models/Song');
const Album = require('../models/Album');

// Thêm bình luận cho bài hát hoặc album
exports.addComment = async (req, res) => {
    try {
        const { songId, albumId, content } = req.body;
        if (!content || (!songId && !albumId)) {
            return res.status(400).json({ message: 'Thiếu thông tin.' });
        }
        const comment = new Comment({
            user: req.user.id,
            song: songId,
            album: albumId,
            content
        });
        await comment.save();
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error in addComment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy bình luận cho bài hát hoặc album
exports.getComments = async (req, res) => {
    try {
        const { songId, albumId } = req.query;
        if (!songId && !albumId) {
            return res.status(400).json({ message: 'Thiếu thông tin.' });
        }
        const filter = songId ? { song: songId } : { album: albumId };
        const comments = await Comment.find(filter).populate('user', 'username');
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error in getComments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
