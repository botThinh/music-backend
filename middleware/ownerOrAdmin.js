const ownerOrAdmin = (req, res, next) => {
    const userId = req.user.id;
    const role = req.user.role;
    const resourceId = req.params.id;

    req.resourceId = resourceId;
    req.userId = userId;

    if (role === 'admin') {
        return next();
    }
    next();
};


module.exports = ownerOrAdmin;