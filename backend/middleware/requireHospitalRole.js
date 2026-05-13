const requireHospitalRole = (req, res, next) => {
  if (!req.user || req.user.role !== "hospital") {
    return res.status(403).json({ message: "Hospital access required" });
  }
  return next();
};

module.exports = requireHospitalRole;
