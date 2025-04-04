const ownerOrAdmin = (req, res, next) => {
    // Middleware này sẽ được dùng sau middleware `auth`, nên req.user đã có
    const userId = req.user.id;
    const role = req.user.role;

    // Tìm tài nguyên (bài hát, playlist, v.v.) để kiểm tra chủ sở hữu
    // Tài nguyên cần có trường `uploadedBy` hoặc `user` để so sánh
    const resourceId = req.params.id; // ID của tài nguyên (bài hát, playlist, v.v.)

    // Tạm thời lưu vào req để controller sử dụng
    req.resourceId = resourceId;
    req.userId = userId;

    // Nếu là Admin, cho phép tiếp tục
    if (role === 'admin') {
        return next();
    }

    // Nếu không phải Admin, kiểm tra quyền sở hữu trong controller
    // Middleware này chỉ chuẩn bị dữ liệu, logic kiểm tra sẽ được thực hiện trong controller
    next();
};

module.exports = ownerOrAdmin;