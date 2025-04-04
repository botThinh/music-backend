

// Lưu trữ token trong bộ nhớ (dùng cho test)
const tokenStorage = {};

// Lưu token cho user
const storeToken = (userId, token) => {
    tokenStorage[userId] = token;
};

// Lấy token theo userId
const getToken = (userId) => {
    return tokenStorage[userId] || null;
};

// Xóa token
const removeToken = (userId) => {
    delete tokenStorage[userId];
};

module.exports = { storeToken, getToken, removeToken };