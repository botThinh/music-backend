const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true, // Loại bỏ khoảng trắng thừa ở đầu và cuối
        },
        artists: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Artist',
                required: true,
            },
        ], // Thay artist bằng artists để hỗ trợ nhiều nghệ sĩ
        album: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Album',
        },
        url: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            validate: {
                validator: (value) => value > 0,
                message: 'Duration must be a positive number',
            },
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        genres: [
            {
                type: String,
                trim: true,
            },
        ], // Thể loại bài hát (pop, rock, jazz, v.v.)
        playCount: {
            type: Number,
            default: 0, // Lượt nghe, mặc định là 0
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ], // Danh sách người dùng đã thích bài hát
        lyrics: {
            type: String,
            default: '', // Lời bài hát, mặc định là chuỗi rỗng
        },
        releaseYear: {
            type: Number,
            validate: {
                validator: (value) => value >= 1900 && value <= new Date().getFullYear(), // Năm phát hành từ 1900 đến năm hiện tại
                message: 'Release year must be between 1900 and the current year',
            },
        },
        status: {
            type: String,
            enum: ['public', 'private', 'pending'], // Trạng thái bài hát
            default: 'pending', // Mặc định là pending (chờ duyệt)
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ], // Tag để hỗ trợ tìm kiếm và gợi ý
        language: {
            type: String,
            enum: ['English', 'Vietnamese', 'Korean', 'Japanese', 'Other'], // Ngôn ngữ bài hát
            default: 'English',
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

// Thêm index để tối ưu hiệu suất tìm kiếm
songSchema.index({ title: 'text' }); // Index cho tìm kiếm full-text trên title
songSchema.index({ genres: 1 }); // Index cho lọc theo thể loại
songSchema.index({ releaseYear: 1 }); // Index cho lọc theo năm phát hành
songSchema.index({ status: 1 }); // Index cho lọc theo trạng thái
songSchema.index({ playCount: -1 }); // Index cho sắp xếp theo lượt nghe (giảm dần)

module.exports = mongoose.model('Song', songSchema);