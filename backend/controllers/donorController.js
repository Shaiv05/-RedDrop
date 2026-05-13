const Donor = require("../models/Donor");
const User = require("../models/User");

const normalizeField = (value = "") =>
  String(value)
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const donorDisplayKey = (donor) =>
  [
    normalizeField(donor.name),
    donor.bloodGroup,
    normalizeField(donor.location),
    donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString().slice(0, 10) : "",
  ].join("|");

const registerDonor = async (req, res) => {
  const { name, phone, email, bloodGroup, location, lastDonationDate } = req.body;

  if (!name || !phone || !email || !bloodGroup || !location) {
    return res.status(400).json({
      message: "name, phone, email, bloodGroup and location are required",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingDonor = await Donor.findOne({ email: normalizedEmail });
  if (existingDonor) {
    return res.status(409).json({ message: "A donor with this email already exists" });
  }

  let parsedLastDonationDate = null;
  if (lastDonationDate) {
    const parsedDate = new Date(lastDonationDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "lastDonationDate must be a valid date" });
    }

    if (parsedDate > new Date()) {
      return res.status(400).json({ message: "lastDonationDate cannot be in the future" });
    }

    parsedLastDonationDate = parsedDate;
  }

  const donor = await Donor.create({
    name: name.trim(),
    phone: phone.trim(),
    email: normalizedEmail,
    bloodGroup,
    location: location.trim(),
    isAvailable: true,
    lastDonationDate: parsedLastDonationDate,
    user: req.user?.id || null,
  });

  return res.status(201).json({ message: "Donor registered successfully", donor });
};

const listDonors = async (req, res) => {
  const { bloodGroup, search, available } = req.query;

  const filter = {};
  const andFilters = [];

  if (req.user?.role === "user") {
    const authUser = await User.findById(req.user.id).select("email");
    if (authUser?.email) {
      andFilters.push({ $or: [{ user: req.user.id }, { email: authUser.email.toLowerCase() }] });
    } else {
      filter.user = req.user.id;
    }
  }

  if (bloodGroup) {
    filter.bloodGroup = bloodGroup;
  }

  if (available !== undefined) {
    filter.isAvailable = String(available).toLowerCase() === "true";
  }

  if (search) {
    andFilters.push({ $or: [
      { name: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ]});
  }

  if (andFilters.length > 0) {
    filter.$and = andFilters;
  }

  const donors = await Donor.find(filter).sort({ createdAt: -1 }).lean();
  const seen = new Set();
  const uniqueDonors = donors.filter((donor) => {
    const key = donorDisplayKey(donor);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return res.json({ count: uniqueDonors.length, donors: uniqueDonors });
};

const setDonorAvailability = async (req, res) => {
  const { donorId } = req.params;
  const { isAvailable } = req.body;

  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({ message: "isAvailable must be boolean" });
  }

  const donor = await Donor.findByIdAndUpdate(
    donorId,
    { isAvailable },
    { new: true }
  );

  if (!donor) {
    return res.status(404).json({ message: "Donor not found" });
  }

  return res.json({ message: "Donor availability updated", donor });
};

module.exports = {
  registerDonor,
  listDonors,
  setDonorAvailability,
};
