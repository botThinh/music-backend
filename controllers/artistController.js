const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Album = require('../models/Album');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../utils/storage');

const getArtists = async (req, res) => {
    try {
        const artists = await Artist.find();
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getArtist = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        // Lấy danh sách album của nghệ sĩ
        const albums = await Album.find({ artist: artist._id });
        // Lấy danh sách bài hát của nghệ sĩ
        const songs = await Song.find({ artist: artist._id }).populate('album');

        res.json({ artist, albums, songs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addArtist = async (req, res) => {
    try {
        const { name, bio } = req.body;

        // Kiểm tra nếu không có file được upload (tùy chọn, giống updateAvatar)
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log("Received file:", req.file); // Debug giống updateAvatar

        // Upload file từ buffer lên Cloudinary
        const imageUrl = await uploadToCloudinary(req.file.buffer, 'image');

        // Kiểm tra dữ liệu đầu vào
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Kiểm tra nghệ sĩ đã tồn tại chưa (khác với updateAvatar)
        let artist = await Artist.findOne({ name });
        if (artist) {
            return res.status(400).json({ message: 'Artist already exists' });
        }

        // Tạo artist mới (tương tự cập nhật user trong updateAvatar)
        artist = new Artist({ name, bio, image: imageUrl });
        await artist.save();

        res.json({ artist }); // Trả về giống kiểu updateAvatar
    } catch (error) {
        console.error("Add Artist Error:", error); // Log giống updateAvatar
        res.status(500).json({ message: error.message });
    }
};

const updateArtist = async (req, res) => {
    const { name, bio } = req.body;

    try {
        // Tìm artist theo ID
        const artist = await Artist.findById(req.params.id);
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        // Cập nhật thông tin cơ bản
        if (name) artist.name = name;
        if (bio) artist.bio = bio;

        // Nếu có ảnh mới
        if (req.file) {
            console.log("Received file:", req.file); // Debug file nhận được

            // Xóa ảnh cũ trên Cloudinary nếu có
            if (artist.image) {
                try {
                    // Lấy public_id chính xác từ URL (loại bỏ domain và extension)
                    const urlParts = artist.image.split('/');
                    const fileName = urlParts.pop().split('.')[0];
                    const folder = 'music-app/thumbnails';
                    const publicId = `${folder}/${fileName}`;
                    await cloudinary.uploader.destroy(publicId);
                } catch (deleteError) {
                    console.error("Error deleting old image:", deleteError);
                    // Có thể chọn tiếp tục dù xóa thất bại
                }
            }

            // Upload ảnh mới từ buffer
            try {
                const imageUrl = await uploadToCloudinary(req.file.buffer, 'image');
                artist.image = imageUrl;
            } catch (uploadError) {
                console.error("Upload error:", uploadError);
                return res.status(500).json({
                    message: 'Error uploading image',
                    error: uploadError.message
                });
            }
        }

        // Lưu thay đổi
        await artist.save();
        res.json(artist);
    } catch (error) {
        console.error("Update Artist Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteArtist = async (req, res) => {
    try {
        // Tìm artist theo ID
        const artist = await Artist.findById(req.params.id);
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found' });
        }

        // Kiểm tra xem nghệ sĩ có bài hát hoặc album không
        const songs = await Song.find({ artist: artist._id });
        const albums = await Album.find({ artist: artist._id });
        if (songs.length > 0 || albums.length > 0) {
            return res.status(400).json({ message: 'Cannot delete artist with associated songs or albums' });
        }

        // Xóa ảnh trên Cloudinary nếu có
        if (artist.image) {
            try {
                const urlParts = artist.image.split('/');
                const fileName = urlParts.pop().split('.')[0];
                const publicId = `music-app/thumbnails/${fileName}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.error("Error deleting image:", deleteError);
                // Có thể chọn tiếp tục dù xóa ảnh thất bại
            }
        }

        // Xóa artist (sử dụng deleteOne thay cho remove)
        await Artist.deleteOne({ _id: artist._id });
        // Hoặc dùng: await artist.deleteOne();

        res.json({ message: 'Artist deleted' });
    } catch (error) {
        console.error("Delete Artist Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getArtists, getArtist, addArtist, updateArtist, deleteArtist };