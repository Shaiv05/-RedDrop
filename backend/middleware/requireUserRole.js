const requireUserRole = (req, res, next) => {
  if (!req.user || req.user.role !== "user") {
    return res.status(403).json({ message: "User access required" });
  }

  return next();
};

module.exports = requireUserRole;
