const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    releaseDate: { type: Date },
    cover: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Thêm index để tối ưu hiệu suất
albumSchema.index({ title: 'text' }); // Index cho tìm kiếm full-text trên title (nếu cần trong tương lai)
albumSchema.index({ artist: 1 }); // Index cho lọc theo artist
albumSchema.index({ releaseDate: -1 }); // Index cho sắp xếp theo ngày phát hành (giảm dần)
albumSchema.index({ createdAt: -1 }); // Index cho sắp xếp theo thời gian tạo (giảm dần)

module.exports = mongoose.model('Album', albumSchema);