const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = (req, _res, next) => {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role || "user" };
  } catch {
    // Keep endpoint public even when a bad token is sent.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
