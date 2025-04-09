const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    bio: { type: String },
    image: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Thêm index để tối ưu hiệu suất
artistSchema.index({ name: 'text' }); // Index cho tìm kiếm full-text trên name
artistSchema.index({ createdAt: -1 }); // Index cho sắp xếp theo thời gian tạo (giảm dần)

module.exports = mongoose.model('Artist', artistSchema);