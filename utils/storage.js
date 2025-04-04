const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Cấu hình multer để lưu file vào bộ nhớ thay vì ổ cứng
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Hàm upload file trực tiếp từ bộ nhớ lên Cloudinary
const uploadToCloudinary = async (fileBuffer, fileType) => {
    try {
        const resourceType = fileType === 'image' ? 'image' : 'video';
        const folder = fileType === 'image' ? 'music-app/thumbnails' : 'music-app/songs';

        // Upload file lên Cloudinary bằng buffer
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: folder,
                    transformation: fileType === 'image' ? [{ crop: 'fit' }, { quality: 'auto' }] : undefined,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            stream.end(fileBuffer);
        });

        return result.secure_url;
    } catch (error) {
        throw new Error(`Failed to upload ${fileType}: ${error.message}`);
    }
};

module.exports = { upload, uploadToCloudinary };
