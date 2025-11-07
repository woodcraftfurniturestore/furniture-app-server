const { error } = require('../utils/responseHandler');

module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Unauthorized', 401);
    if (!allowedRoles.includes(req.user.role)) return error(res, 'Access denied', 403);
    next();
  };
};
