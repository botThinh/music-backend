const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
    // Lấy token từ cookie, x-auth-token hoặc Authorization chuẩn Bearer
    let token = req.cookies['auth-token'] || req.header('x-auth-token');
    if (!token && req.header('authorization')) {
        const authHeader = req.header('authorization');
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7); // Bỏ 'Bearer '
        }
    }

    console.log('Token from cookie:', req.cookies['auth-token']); // Debug
    console.log('Token from x-auth-token:', req.header('x-auth-token')); // Debug
    console.log('Token from Authorization:', req.header('authorization')); // Debug

    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        console.log('Decoded user:', req.user); // Debug
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;