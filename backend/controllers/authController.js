const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Hospital = require("../models/Hospital");

const signToken = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  const token = signToken(user._id, "user");

  return res.status(201).json({
    message: "User registered successfully",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: "user",
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user._id, "user");

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};

const me = async (req, res) => {
  if (req.user.role === "hospital") {
    const hospital = await Hospital.findById(req.user.id).select("-password");
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    return res.json({
      user: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        role: "hospital",
      },
    });
  }

  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: "user",
    },
  });
};

module.exports = {
  register,
  login,
  me,
};
