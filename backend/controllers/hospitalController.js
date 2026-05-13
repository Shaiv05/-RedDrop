const Hospital = require("../models/Hospital");
const BloodRequest = require("../models/BloodRequest");
const EmergencyHospital = require("../models/EmergencyHospital");
const {
  buildHospitalIdentityQuery,
  getHospitalIdentityKey,
} = require("../utils/hospitalIdentity");

const registerHospital = async (req, res) => {
  const {
    name,
    phone,
    email,
    location,
    licenseNumber,
    bloodGroup,
    units,
    emergencyReason,
  } = req.body;

  if (
    !name ||
    !phone ||
    !email ||
    !location ||
    !licenseNumber ||
    !bloodGroup ||
    !units ||
    !emergencyReason
  ) {
    return res.status(400).json({
      message: "name, phone, email, location, licenseNumber, bloodGroup, units and emergencyReason are required",
    });
  }

  const unitsNumber = Number(units);
  if (!Number.isFinite(unitsNumber) || unitsNumber < 1) {
    return res.status(400).json({ message: "units must be a number greater than 0" });
  }

  const normalizedLicense = licenseNumber.trim();
  const normalizedEmail = email.toLowerCase().trim();

  let hospital = await Hospital.findOne({ licenseNumber: normalizedLicense });
  if (!hospital) {
    hospital = await Hospital.findOne(buildHospitalIdentityQuery({ name, location }));
  }

  if (hospital) {
    hospital.name = name.trim();
    hospital.phone = phone.trim();
    hospital.email = normalizedEmail;
    hospital.location = location.trim();
    hospital.emergencyReason = emergencyReason.trim();
    await hospital.save();
  } else {
    hospital = await Hospital.create({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      location: location.trim(),
      licenseNumber: normalizedLicense,
      emergencyReason: emergencyReason.trim(),
      user: req.user?.id || null,
    });
  }

  const request = await BloodRequest.create({
    hospital: hospital._id,
    hospitalName: hospital.name,
    bloodGroup,
    units: unitsNumber,
    patientNote: emergencyReason.trim(),
    isUrgent: true,
  });

  const populatedRequest = await request.populate("hospital", "name location phone");
  const emergencyHospital = await EmergencyHospital.create({
    hospital: hospital._id,
    request: request._id,
    hospitalName: hospital.name,
    email: hospital.email,
    phone: hospital.phone,
    location: hospital.location,
    licenseNumber: hospital.licenseNumber,
    bloodGroup,
    units: unitsNumber,
    emergencyReason: emergencyReason.trim(),
    status: "open",
  });

  return res.status(201).json({
    message: "Emergency request submitted successfully",
    hospital,
    request: populatedRequest,
    emergencyHospital,
  });
};

const listHospitals = async (req, res) => {
  const { search } = req.query;
  const filter = {};

  if (req.user?.role === "hospital") {
    filter._id = req.user.id;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const hospitals = await Hospital.find(filter).sort({ createdAt: -1 });
  const dedupedHospitals = Array.from(
    new Map(
      hospitals.map((hospital) => [
        getHospitalIdentityKey({ name: hospital.name, location: hospital.location }),
        hospital,
      ])
    ).values()
  );

  return res.json({ count: dedupedHospitals.length, hospitals: dedupedHospitals });
};

const listEmergencyHospitals = async (req, res) => {
  const { status } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (req.user?.role === "hospital") {
    filter.hospital = req.user.id;
  }

  const emergencyHospitals = await EmergencyHospital.find(filter)
    .populate("hospital", "name location phone email")
    .populate("request", "bloodGroup units isUrgent status createdAt")
    .sort({ createdAt: -1 });

  return res.json({ count: emergencyHospitals.length, emergencyHospitals });
};

module.exports = {
  registerHospital,
  listHospitals,
  listEmergencyHospitals,
};
