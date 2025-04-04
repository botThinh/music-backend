const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Cấu hình multer để lưu file tạm thời
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

// Hàm upload file lên Cloudinary
const uploadToCloudinary = async (filePath, type) => {
    try {
        // Xác định loại file và thư mục trên Cloudinary
        const resourceType = type === 'image' ? 'image' : 'video';
        const folder = type === 'image' ? 'music-app/thumbnails' : 'music-app/songs';

        // Upload file lên Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: resourceType,
            folder: folder,
            transformation: type === 'image' ? [{ width: 300, height: 300, crop: 'fit' }, { quality: 'auto' }] : undefined,
        });

        // Xóa file tạm
        fs.unlinkSync(filePath);

        return result.secure_url;
    } catch (error) {
        // Xóa file tạm nếu có lỗi
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw new Error(`Failed to upload ${type}: ${error.message}`);
    }
};

module.exports = { upload, uploadToCloudinary };