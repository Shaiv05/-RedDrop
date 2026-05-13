const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Hospital = require("../models/Hospital");
const { buildHospitalIdentityQuery } = require("../utils/hospitalIdentity");
const { ensureHospitalDashboardData } = require("../services/hospitalDashboardBootstrap");

const signToken = (hospitalId) =>
  jwt.sign({ id: hospitalId, role: "hospital" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const registerHospitalAuth = async (req, res) => {
  const {
    name,
    phone,
    email,
    location,
    licenseNumber,
    password,
  } = req.body;

  if (
    !name ||
    !phone ||
    !email ||
    !location ||
    !licenseNumber ||
    !password
  ) {
    return res.status(400).json({
      message: "name, phone, email, location, licenseNumber and password are required",
    });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedLicense = licenseNumber.trim();

  const existingHospital = await Hospital.findOne({
    $or: [{ email: normalizedEmail }, { licenseNumber: normalizedLicense }],
  }).select("+password");
  const sameIdentityHospital = await Hospital.findOne(
    buildHospitalIdentityQuery({ name, location })
  ).select("+password");

  const matchedHospital = existingHospital || sameIdentityHospital;

  if (
    existingHospital &&
    (existingHospital.email !== normalizedEmail ||
      existingHospital.licenseNumber !== normalizedLicense)
  ) {
    return res.status(409).json({
      message: "Email or license number is already associated with another hospital",
    });
  }

  if (
    !existingHospital &&
    sameIdentityHospital &&
    sameIdentityHospital.password &&
    (sameIdentityHospital.email !== normalizedEmail ||
      sameIdentityHospital.licenseNumber !== normalizedLicense)
  ) {
    return res.status(409).json({
      message: "Hospital already exists for this name and location",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let hospital = matchedHospital;
  if (hospital) {
    if (hospital.password) {
      return res.status(409).json({ message: "Hospital account already exists" });
    }

    hospital.name = name.trim();
    hospital.phone = phone.trim();
    hospital.email = normalizedEmail;
    hospital.location = location.trim();
    hospital.licenseNumber = normalizedLicense;
    hospital.password = hashedPassword;
    await hospital.save();
  } else {
    hospital = await Hospital.create({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      location: location.trim(),
      licenseNumber: normalizedLicense,
      password: hashedPassword,
      user: null,
    });
  }

  await ensureHospitalDashboardData(hospital._id);

  return res.status(201).json({
    message: "Hospital account created successfully",
    hospital: {
      id: hospital._id,
      name: hospital.name,
      email: hospital.email,
      phone: hospital.phone,
      location: hospital.location,
      licenseNumber: hospital.licenseNumber,
    },
  });
};

const loginHospitalAuth = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hospital = await Hospital.findOne({ email: normalizedEmail }).select(
    "+password"
  );

  if (!hospital || !hospital.password) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, hospital.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(hospital._id);
  await ensureHospitalDashboardData(hospital._id);

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: hospital._id,
      name: hospital.name,
      email: hospital.email,
      role: "hospital",
    },
  });
};

module.exports = {
  registerHospitalAuth,
  loginHospitalAuth,
};
