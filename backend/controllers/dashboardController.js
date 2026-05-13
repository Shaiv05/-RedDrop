const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const Donor = require("../models/Donor");
const BloodRequest = require("../models/BloodRequest");
const BloodInventory = require("../models/BloodInventory");
const DonationRecord = require("../models/DonationRecord");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../services/activityService");
const { ensureHospitalDashboardData } = require("../services/hospitalDashboardBootstrap");

const donationDisplayKey = (record) =>
  [
    String(record.hospital),
    String(record.donorName || "").trim().toLowerCase(),
    record.bloodGroup,
    record.unitsDonated,
    record.donationDate ? new Date(record.donationDate).toISOString().slice(0, 10) : "",
  ].join("|");

const getHospitalSnapshot = async (hospitalId) => {
  const hospital = await Hospital.findById(hospitalId).select("name email licenseNumber");
  if (!hospital) return null;
  return {
    hospitalName: hospital.name,
    hospitalEmail: hospital.email,
    hospitalLicenseNumber: hospital.licenseNumber,
  };
};

const getOverview = async (req, res) => {
  const hospitalId = req.user.id;
  await ensureHospitalDashboardData(hospitalId);
  const [totalDonors, inventoryDocs, requests, completedDonations] = await Promise.all([
    Donor.countDocuments(),
    BloodInventory.find({ hospital: hospitalId }),
    BloodRequest.find({ hospital: hospitalId }).lean(),
    DonationRecord.countDocuments({ hospital: hospitalId }),
  ]);

  const totalBloodUnits = inventoryDocs.reduce((sum, item) => sum + item.units, 0);
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === "open").length;

  return res.json({
    overview: {
      totalDonors,
      totalBloodUnits,
      totalRequests,
      pendingRequests,
      completedDonations,
    },
  });
};

const listInventory = async (req, res) => {
  await ensureHospitalDashboardData(req.user.id);
  const inventory = await BloodInventory.find({ hospital: req.user.id }).sort({ bloodGroup: 1 });
  return res.json({ count: inventory.length, inventory });
};

const addInventory = async (req, res) => {
  const { bloodGroup, units, minLevel } = req.body;
  const unitsNumber = Number(units);
  const minLevelNumber = minLevel !== undefined ? Number(minLevel) : 5;

  if (!bloodGroup || !Number.isFinite(unitsNumber) || unitsNumber < 0) {
    return res.status(400).json({ message: "bloodGroup and valid units are required" });
  }

  const snapshot = await getHospitalSnapshot(req.user.id);
  if (!snapshot) {
    return res.status(404).json({ message: "Hospital not found" });
  }

  const doc = await BloodInventory.findOneAndUpdate(
    { hospital: req.user.id, bloodGroup },
    {
      $inc: { units: unitsNumber },
      $set: {
        hospitalName: snapshot.hospitalName,
        hospitalEmail: snapshot.hospitalEmail,
        hospitalLicenseNumber: snapshot.hospitalLicenseNumber,
        dashboardScope: "hospital_dashboard",
      },
      $setOnInsert: { minLevel: minLevelNumber },
    },
    { upsert: true, new: true }
  );

  if (minLevel !== undefined) {
    doc.minLevel = minLevelNumber;
    await doc.save();
  }

  await logActivity(
    req.user.id,
    "inventory_add",
    `Added ${unitsNumber} units of ${bloodGroup}`,
    { bloodGroup, units: unitsNumber },
    snapshot
  );

  return res.status(201).json({ message: "Inventory updated", item: doc });
};

const updateInventory = async (req, res) => {
  const { inventoryId } = req.params;
  const { units, minLevel } = req.body;

  const updates = {};
  if (units !== undefined) updates.units = Number(units);
  if (minLevel !== undefined) updates.minLevel = Number(minLevel);

  if (
    (updates.units !== undefined && (!Number.isFinite(updates.units) || updates.units < 0)) ||
    (updates.minLevel !== undefined && (!Number.isFinite(updates.minLevel) || updates.minLevel < 0))
  ) {
    return res.status(400).json({ message: "units/minLevel must be valid numbers >= 0" });
  }

  const snapshot = await getHospitalSnapshot(req.user.id);
  if (!snapshot) {
    return res.status(404).json({ message: "Hospital not found" });
  }

  const doc = await BloodInventory.findOneAndUpdate(
    { _id: inventoryId, hospital: req.user.id },
    {
      ...updates,
      hospitalName: snapshot.hospitalName,
      hospitalEmail: snapshot.hospitalEmail,
      hospitalLicenseNumber: snapshot.hospitalLicenseNumber,
      dashboardScope: "hospital_dashboard",
    },
    { new: true }
  );

  if (!doc) {
    return res.status(404).json({ message: "Inventory record not found" });
  }

  await logActivity(
    req.user.id,
    "inventory_update",
    `Updated inventory for ${doc.bloodGroup}`,
    { bloodGroup: doc.bloodGroup, units: doc.units, minLevel: doc.minLevel },
    snapshot
  );

  return res.json({ message: "Inventory record updated", item: doc });
};

const removeInventory = async (req, res) => {
  const { inventoryId } = req.params;
  const doc = await BloodInventory.findOneAndDelete({ _id: inventoryId, hospital: req.user.id });
  if (!doc) {
    return res.status(404).json({ message: "Inventory record not found" });
  }

  const snapshot = await getHospitalSnapshot(req.user.id);
  if (snapshot) {
    await logActivity(
      req.user.id,
      "inventory_remove",
      `Removed inventory for ${doc.bloodGroup}`,
      { bloodGroup: doc.bloodGroup },
      snapshot
    );
  }

  return res.json({ message: "Inventory record removed" });
};

const listDonations = async (req, res) => {
  await ensureHospitalDashboardData(req.user.id);
  const records = await DonationRecord.find({ hospital: req.user.id }).sort({ donationDate: -1 }).lean();
  const seen = new Set();
  const uniqueRecords = records.filter((record) => {
    const key = donationDisplayKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return res.json({ count: uniqueRecords.length, records: uniqueRecords });
};

const createDonation = async (req, res) => {
  const { donorName, bloodGroup, unitsDonated, donationDate, requestId } = req.body;
  const units = Number(unitsDonated);

  if (!donorName || !bloodGroup || !Number.isFinite(units) || units < 1 || !donationDate) {
    return res
      .status(400)
      .json({ message: "donorName, bloodGroup, unitsDonated and donationDate are required" });
  }

  const snapshot = await getHospitalSnapshot(req.user.id);
  if (!snapshot) {
    return res.status(404).json({ message: "Hospital not found" });
  }

  const record = await DonationRecord.create({
    hospital: req.user.id,
    hospitalName: snapshot.hospitalName,
    hospitalEmail: snapshot.hospitalEmail,
    hospitalLicenseNumber: snapshot.hospitalLicenseNumber,
    dashboardScope: "hospital_dashboard",
    request: requestId || null,
    donorName: String(donorName).trim(),
    bloodGroup,
    unitsDonated: units,
    donationDate: new Date(donationDate),
  });

  const inventory = await BloodInventory.findOne({ hospital: req.user.id, bloodGroup });
  if (inventory) {
    inventory.units += units;
    inventory.hospitalName = snapshot.hospitalName;
    inventory.hospitalEmail = snapshot.hospitalEmail;
    inventory.hospitalLicenseNumber = snapshot.hospitalLicenseNumber;
    inventory.dashboardScope = "hospital_dashboard";
    await inventory.save();
  } else {
    await BloodInventory.create({
      hospital: req.user.id,
      hospitalName: snapshot.hospitalName,
      hospitalEmail: snapshot.hospitalEmail,
      hospitalLicenseNumber: snapshot.hospitalLicenseNumber,
      dashboardScope: "hospital_dashboard",
      bloodGroup,
      units,
      minLevel: 5,
    });
  }

  await logActivity(
    req.user.id,
    "donation_complete",
    `Donation completed: ${units} units of ${bloodGroup} by ${donorName}`,
    { donorName, bloodGroup, units },
    snapshot
  );

  return res.status(201).json({ message: "Donation record saved", record });
};

const listNotifications = async (req, res) => {
  const hospitalId = req.user.id;
  await ensureHospitalDashboardData(hospitalId);

  const [urgentRequests, recentRequests, lowStock, recentDonors] = await Promise.all([
    BloodRequest.countDocuments({ hospital: hospitalId, status: "open", isUrgent: true }),
    BloodRequest.countDocuments({
      hospital: hospitalId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    BloodInventory.find({
      hospital: hospitalId,
      $expr: { $lte: ["$units", "$minLevel"] },
    }).lean(),
    Donor.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  const notifications = [];
  if (urgentRequests > 0) notifications.push(`${urgentRequests} urgent blood request(s) need attention`);
  if (recentRequests > 0) notifications.push(`${recentRequests} new request(s) added in last 24 hours`);
  if (recentDonors > 0) notifications.push(`${recentDonors} new donor registration(s) in last 24 hours`);
  if (lowStock.length > 0) {
    notifications.push(
      `Low stock alert for ${lowStock.map((x) => x.bloodGroup).join(", ")}`
    );
  }

  return res.json({ count: notifications.length, notifications });
};

const listActivities = async (req, res) => {
  await ensureHospitalDashboardData(req.user.id);
  const activities = await ActivityLog.find({ hospital: req.user.id }).sort({ createdAt: -1 }).limit(20);
  return res.json({ count: activities.length, activities });
};

const getProfile = async (req, res) => {
  const hospital = await Hospital.findById(req.user.id).select("-password");
  if (!hospital) {
    return res.status(404).json({ message: "Hospital not found" });
  }
  return res.json({ hospital });
};

const updateProfile = async (req, res) => {
  const { name, phone, email, location } = req.body;
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    return res.status(404).json({ message: "Hospital not found" });
  }

  if (name) hospital.name = String(name).trim();
  if (phone) hospital.phone = String(phone).trim();
  if (email) hospital.email = String(email).toLowerCase().trim();
  if (location) hospital.location = String(location).trim();

  await hospital.save();
  await Promise.all([
    BloodInventory.updateMany(
      { hospital: req.user.id },
      {
        $set: {
          hospitalName: hospital.name,
          hospitalEmail: hospital.email,
          hospitalLicenseNumber: hospital.licenseNumber,
          dashboardScope: "hospital_dashboard",
        },
      }
    ),
    DonationRecord.updateMany(
      { hospital: req.user.id },
      {
        $set: {
          hospitalName: hospital.name,
          hospitalEmail: hospital.email,
          hospitalLicenseNumber: hospital.licenseNumber,
          dashboardScope: "hospital_dashboard",
        },
      }
    ),
    ActivityLog.updateMany(
      { hospital: req.user.id },
      {
        $set: {
          hospitalName: hospital.name,
          hospitalEmail: hospital.email,
          hospitalLicenseNumber: hospital.licenseNumber,
          dashboardScope: "hospital_dashboard",
        },
      }
    ),
  ]);

  await logActivity(
    req.user.id,
    "profile_update",
    "Hospital profile updated",
    {},
    {
      hospitalName: hospital.name,
      hospitalEmail: hospital.email,
      hospitalLicenseNumber: hospital.licenseNumber,
    }
  );

  return res.json({ message: "Profile updated", hospital });
};

const getReports = async (req, res) => {
  const hospitalId = req.user.id;
  await ensureHospitalDashboardData(hospitalId);
  const hospitalObjectId = new mongoose.Types.ObjectId(hospitalId);

  const [donationStats, requestedGroups, monthlyDonations] = await Promise.all([
    DonationRecord.aggregate([
      { $match: { hospital: hospitalObjectId } },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          totalUnitsDonated: { $sum: "$unitsDonated" },
        },
      },
    ]),
    BloodRequest.aggregate([
      { $match: { hospital: hospitalObjectId } },
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    DonationRecord.aggregate([
      { $match: { hospital: hospitalObjectId } },
      {
        $group: {
          _id: {
            year: { $year: "$donationDate" },
            month: { $month: "$donationDate" },
          },
          units: { $sum: "$unitsDonated" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]),
  ]);

  return res.json({
    reports: {
      totalDonations: donationStats[0]?.totalDonations || 0,
      totalUnitsDonated: donationStats[0]?.totalUnitsDonated || 0,
      mostRequestedBloodGroup: requestedGroups[0]?._id || "N/A",
      monthlyDonationData: monthlyDonations
        .map((row) => ({
          month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
          units: row.units,
        }))
        .reverse(),
    },
  });
};

module.exports = {
  getOverview,
  listInventory,
  addInventory,
  updateInventory,
  removeInventory,
  listDonations,
  createDonation,
  listNotifications,
  listActivities,
  getProfile,
  updateProfile,
  getReports,
};
