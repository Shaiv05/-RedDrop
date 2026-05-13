require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const Donor = require("../models/Donor");
const BloodRequest = require("../models/BloodRequest");
const BloodInventory = require("../models/BloodInventory");
const DonationRecord = require("../models/DonationRecord");
const ActivityLog = require("../models/ActivityLog");
const EmergencyHospital = require("../models/EmergencyHospital");

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reddrop";

const donorSeeds = [
  { name: "Diya Patel", email: "diya.patel@reddrop.in", phone: "+919824551101", bloodGroup: "O+", location: "Kudasan, Gandhinagar", isAvailable: true, lastDonationDate: "2025-12-25" },
  { name: "Rohan Mehta", email: "rohan.mehta@reddrop.in", phone: "+919898771102", bloodGroup: "B+", location: "Bodakdev, Ahmedabad", isAvailable: true, lastDonationDate: "2026-01-16" },
  { name: "Neha Joshi", email: "neha.joshi@reddrop.in", phone: "+919426231103", bloodGroup: "AB+", location: "Naranpura, Ahmedabad", isAvailable: true, lastDonationDate: "2026-02-10" },
  { name: "Rahul Patel", email: "rahul.patel@reddrop.in", phone: "+918200991104", bloodGroup: "O-", location: "Palanpur, Banaskantha", isAvailable: false, lastDonationDate: "2025-11-12" },
];

const inventoryTemplate = [
  { bloodGroup: "A+", units: 14, minLevel: 5 },
  { bloodGroup: "A-", units: 7, minLevel: 4 },
  { bloodGroup: "B+", units: 10, minLevel: 5 },
  { bloodGroup: "B-", units: 6, minLevel: 4 },
  { bloodGroup: "AB+", units: 4, minLevel: 3 },
  { bloodGroup: "AB-", units: 3, minLevel: 3 },
  { bloodGroup: "O+", units: 18, minLevel: 7 },
  { bloodGroup: "O-", units: 2, minLevel: 4 }, // intentionally low for alert
];

const emergencyRequestVariants = [
  { bloodGroup: "O+", units: 3, patientNote: "ICU support for trauma patient", isUrgent: true, status: "open" },
  { bloodGroup: "O-", units: 2, patientNote: "Road traffic accident surgery", isUrgent: true, status: "open" },
  { bloodGroup: "B-", units: 2, patientNote: "NICU emergency transfusion", isUrgent: true, status: "open" },
  { bloodGroup: "A-", units: 2, patientNote: "Postpartum hemorrhage support", isUrgent: true, status: "open" },
];

const nonUrgentRequestVariants = [
  { bloodGroup: "A+", units: 2, patientNote: "Cardiac procedure", isUrgent: false, status: "fulfilled" },
  { bloodGroup: "B+", units: 1, patientNote: "Dialysis support", isUrgent: false, status: "open" },
  { bloodGroup: "AB+", units: 1, patientNote: "Scheduled oncology transfusion", isUrgent: false, status: "open" },
];

const donationTemplate = [
  { donorName: "Rahul Patel", bloodGroup: "O+", unitsDonated: 2, donationDate: "2025-11-12" },
  { donorName: "Priya Shah", bloodGroup: "A+", unitsDonated: 1, donationDate: "2025-12-20" },
  { donorName: "Rohan Mehta", bloodGroup: "B+", unitsDonated: 2, donationDate: "2026-01-16" },
  { donorName: "Neha Joshi", bloodGroup: "AB+", unitsDonated: 1, donationDate: "2026-02-10" },
  { donorName: "Diya Patel", bloodGroup: "O+", unitsDonated: 1, donationDate: "2026-03-02" },
];

const activityTemplate = [
  { type: "inventory_update", message: "Inventory updated for O+ and A+ units." },
  { type: "request_status_update", message: "Request marked fulfilled for cardiac procedure." },
  { type: "donation_complete", message: "Donation completed: 2 units of O+." },
  { type: "profile_update", message: "Hospital profile verified and updated." },
];

const upsertDonors = async () => {
  let count = 0;
  for (const donor of donorSeeds) {
    const existing = await Donor.findOne({ email: donor.email.toLowerCase() });
    if (!existing) {
      await Donor.create({
        ...donor,
        email: donor.email.toLowerCase(),
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate) : null,
      });
    } else {
      existing.name = donor.name;
      existing.phone = donor.phone;
      existing.bloodGroup = donor.bloodGroup;
      existing.location = donor.location;
      existing.isAvailable = donor.isAvailable;
      existing.lastDonationDate = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;
      await existing.save();
    }
    count += 1;
  }
  return count;
};

const seedHospitalDashboardData = async (hospital, hospitalIndex) => {
  for (const row of inventoryTemplate) {
    await BloodInventory.findOneAndUpdate(
      { hospital: hospital._id, bloodGroup: row.bloodGroup },
      {
        hospital: hospital._id,
        hospitalName: hospital.name,
        hospitalEmail: hospital.email,
        hospitalLicenseNumber: hospital.licenseNumber,
        dashboardScope: "hospital_dashboard",
        bloodGroup: row.bloodGroup,
        units: row.units,
        minLevel: row.minLevel,
      },
      { new: true, upsert: true }
    );
  }

  const requestTemplate = [
    emergencyRequestVariants[hospitalIndex % emergencyRequestVariants.length],
    nonUrgentRequestVariants[hospitalIndex % nonUrgentRequestVariants.length],
    nonUrgentRequestVariants[(hospitalIndex + 1) % nonUrgentRequestVariants.length],
  ];

  const urgentOpenRequests = [];
  for (const row of requestTemplate) {
    const request = await BloodRequest.findOneAndUpdate(
      {
        hospital: hospital._id,
        bloodGroup: row.bloodGroup,
        patientNote: row.patientNote,
      },
      {
        hospital: hospital._id,
        hospitalName: hospital.name,
        bloodGroup: row.bloodGroup,
        units: row.units,
        patientNote: row.patientNote,
        isUrgent: row.isUrgent,
        status: row.status,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (request.isUrgent && request.status === "open") {
      urgentOpenRequests.push(request);
    }
  }

  for (const row of donationTemplate) {
    await DonationRecord.findOneAndUpdate(
      {
        hospital: hospital._id,
        donorName: row.donorName,
        bloodGroup: row.bloodGroup,
        donationDate: new Date(row.donationDate),
      },
      {
        hospital: hospital._id,
        hospitalName: hospital.name,
        hospitalEmail: hospital.email,
        hospitalLicenseNumber: hospital.licenseNumber,
        dashboardScope: "hospital_dashboard",
        donorName: row.donorName,
        bloodGroup: row.bloodGroup,
        unitsDonated: row.unitsDonated,
        donationDate: new Date(row.donationDate),
      },
      { new: true, upsert: true }
    );
  }

  for (const row of activityTemplate) {
    const exists = await ActivityLog.findOne({
      hospital: hospital._id,
      type: row.type,
      message: row.message,
    });
    if (!exists) {
      await ActivityLog.create({
        hospital: hospital._id,
        hospitalName: hospital.name,
        hospitalEmail: hospital.email,
        hospitalLicenseNumber: hospital.licenseNumber,
        dashboardScope: "hospital_dashboard",
        type: row.type,
        message: row.message,
      });
    }
  }

  for (const request of urgentOpenRequests) {
    await EmergencyHospital.findOneAndUpdate(
      {
        hospital: hospital._id,
        request: request._id,
      },
      {
        hospital: hospital._id,
        request: request._id,
        hospitalName: hospital.name,
        email: hospital.email,
        phone: hospital.phone,
        location: hospital.location,
        licenseNumber: hospital.licenseNumber,
        bloodGroup: request.bloodGroup,
        units: request.units,
        emergencyReason: request.patientNote || "Emergency",
        status: request.status,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }
};

const main = async () => {
  await mongoose.connect(uri);
  console.log("Connected to:", uri);

  const donorCount = await upsertDonors();
  const hospitals = await Hospital.find({
    name: { $not: /audit/i },
  }).sort({ createdAt: -1 });

  for (const [index, hospital] of hospitals.entries()) {
    await seedHospitalDashboardData(hospital, index);
  }

  const [totalDonors, totalHospitals, totalInventory, totalRequests, totalDonations, totalActivities, totalEmergencyHospitals] =
    await Promise.all([
      Donor.countDocuments(),
      Hospital.countDocuments(),
      BloodInventory.countDocuments(),
      BloodRequest.countDocuments(),
      DonationRecord.countDocuments(),
      ActivityLog.countDocuments(),
      EmergencyHospital.countDocuments(),
    ]);

  console.log("Dashboard seed completed.");
  console.log("Processed donor templates:", donorCount);
  console.log("Totals => hospitals:", totalHospitals);
  console.log("Totals => donors:", totalDonors);
  console.log("Totals => inventory:", totalInventory);
  console.log("Totals => requests:", totalRequests);
  console.log("Totals => donations:", totalDonations);
  console.log("Totals => activities:", totalActivities);
  console.log("Totals => emergencyHospitals:", totalEmergencyHospitals);

  await mongoose.connection.close();
};

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
