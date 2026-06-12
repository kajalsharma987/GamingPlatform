const jwt = require("jsonwebtoken");
const { normalizeRole } = require("../utils/roles");

const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";

module.exports = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token.trim(), jwtSecret);
    req.user = { ...decoded, role: normalizeRole(decoded.role) };
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
