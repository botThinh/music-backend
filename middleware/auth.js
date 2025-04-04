const jwt = require('jsonwebtoken');
const { getToken } = require('../utils/tokenStorage'); // Import getToken

const auth = (req, res, next) => {
    let token = req.header('x-auth-token');

    // Nếu không có token trong header, thử lấy từ tokenStorage (dành cho test)
    if (!token && req.query.userId) {
        token = getToken(req.query.userId);
    }

    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;