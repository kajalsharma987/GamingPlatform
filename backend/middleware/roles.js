const { normalizeRole } = require("../utils/roles");

module.exports = (...roles) => (req, res, next) => {
  const allowed = roles.map(normalizeRole);
  if (!allowed.includes(normalizeRole(req.user?.role))) {
    return res.status(403).json({ message: "Role not allowed" });
  }
  next();
};
