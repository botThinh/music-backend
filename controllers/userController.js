const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../utils/storage');

const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ username, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log(`Token stored for user ${user.id}`);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set token vào cookie
        res.cookie('auth-token', token, {
            httpOnly: true, // Cookie không thể truy cập qua JavaScript
            secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS nếu ở môi trường production
            maxAge: 3600000, // 1 giờ (phù hợp với thời gian hết hạn của token)
        });

        // Trả về thông tin người dùng và token
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name, // Nếu có thêm thông tin name
                avatar: user.avatar, // Nếu có avatar
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Thêm API logout để xóa cookie
const logout = async (req, res) => {
    res.clearCookie('auth-token');
    res.json({ message: 'Logged out' });
};

// Các hàm khác giữ nguyên
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAvatar = async (req, res) => {
    try {
        // Kiểm tra nếu không có file được upload
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log("Received file:", req.file); // Debug xem có nhận được file không

        // Upload file từ buffer (nếu bạn dùng memoryStorage) hoặc path (nếu diskStorage)
        const avatarUrl = await uploadToCloudinary(req.file.buffer, 'image');

        // Tìm user theo ID
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cập nhật avatar
        user.avatar = avatarUrl;
        await user.save();

        res.json({ avatar: avatarUrl });
    } catch (error) {
        console.error("Update Avatar Error:", error);
        res.status(500).json({ message: error.message });
    }
};


const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Không cho phép user tự xóa chính mình
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        // Nếu user có avatar, xóa ảnh trên Cloudinary
        if (user.avatar) {
            const avatarPublicId = user.avatar.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`music-app/thumbnails/${avatarPublicId}`);
        }

        // Xóa user khỏi database
        await User.deleteOne({ _id: user._id });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ message: error.message });
    }
};


const updateUserRole = async (req, res) => {
    const { role } = req.body;

    try {
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }

        user.role = role;
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, logout, getProfile, updateAvatar, getUsers, deleteUser, updateUserRole };