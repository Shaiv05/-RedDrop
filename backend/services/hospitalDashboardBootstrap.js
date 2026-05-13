const Hospital = require("../models/Hospital");
const BloodRequest = require("../models/BloodRequest");
const BloodInventory = require("../models/BloodInventory");
const DonationRecord = require("../models/DonationRecord");
const ActivityLog = require("../models/ActivityLog");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getSeedUnitsForBloodGroup = (bloodGroup) => {
  const seededRanges = {
    "A+": 14,
    "A-": 6,
    "B+": 12,
    "B-": 5,
    "AB+": 8,
    "AB-": 4,
    "O+": 18,
    "O-": 7,
  };

  return seededRanges[bloodGroup] || 5;
};

const getSeedMinLevelForBloodGroup = (bloodGroup) => {
  const minLevels = {
    "A+": 5,
    "A-": 3,
    "B+": 5,
    "B-": 3,
    "AB+": 4,
    "AB-": 2,
    "O+": 6,
    "O-": 3,
  };

  return minLevels[bloodGroup] || 3;
};

const ensureHospitalDashboardData = async (hospitalId) => {
  const hospital = await Hospital.findById(hospitalId).select("name email licenseNumber location");
  if (!hospital) return null;

  const [existingInventory, donationCount, requestCount, activityCount] = await Promise.all([
    BloodInventory.find({ hospital: hospitalId }).select("bloodGroup").lean(),
    DonationRecord.countDocuments({ hospital: hospitalId }),
    BloodRequest.countDocuments({ hospital: hospitalId }),
    ActivityLog.countDocuments({ hospital: hospitalId }),
  ]);

  const snapshot = {
    hospitalName: hospital.name,
    hospitalEmail: hospital.email,
    hospitalLicenseNumber: hospital.licenseNumber,
  };

  const existingGroups = new Set(existingInventory.map((item) => item.bloodGroup));
  const missingGroups = BLOOD_GROUPS.filter((bloodGroup) => !existingGroups.has(bloodGroup));

  if (missingGroups.length > 0) {
    await BloodInventory.insertMany(
      missingGroups.map((bloodGroup) => ({
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        bloodGroup,
        units: getSeedUnitsForBloodGroup(bloodGroup),
        minLevel: getSeedMinLevelForBloodGroup(bloodGroup),
      }))
    );
  }

  if (requestCount === 0) {
    const starterRequests = [
      {
        hospital: hospitalId,
        hospitalName: hospital.name,
        bloodGroup: "O+",
        units: 2,
        patientNote: `Emergency trauma support required near ${hospital.location}.`,
        isUrgent: true,
        neededBy: daysAgo(-1),
        status: "open",
      },
      {
        hospital: hospitalId,
        hospitalName: hospital.name,
        bloodGroup: "A+",
        units: 1,
        patientNote: `Scheduled surgery support for patient admitted at ${hospital.name}.`,
        isUrgent: false,
        neededBy: daysAgo(-2),
        status: "open",
      },
    ];

    for (const request of starterRequests) {
      await BloodRequest.updateOne(
        {
          hospital: hospitalId,
          bloodGroup: request.bloodGroup,
          patientNote: request.patientNote,
        },
        { $set: request },
        { upsert: true }
      );
    }
  }

  if (donationCount === 0) {
    const starterDonations = [
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Rahul Shah",
        bloodGroup: "O+",
        unitsDonated: 1,
        donationDate: daysAgo(10),
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Nisha Patel",
        bloodGroup: "A+",
        unitsDonated: 1,
        donationDate: daysAgo(18),
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Karan Mehta",
        bloodGroup: "B+",
        unitsDonated: 2,
        donationDate: daysAgo(42),
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Sneha Desai",
        bloodGroup: "O-",
        unitsDonated: 1,
        donationDate: daysAgo(71),
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Aditi Kapoor",
        bloodGroup: "AB+",
        unitsDonated: 1,
        donationDate: daysAgo(103),
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        donorName: "Vikas Iyer",
        bloodGroup: "A-",
        unitsDonated: 2,
        donationDate: daysAgo(134),
      },
    ];

    for (const donation of starterDonations) {
      await DonationRecord.updateOne(
        {
          hospital: hospitalId,
          donorName: donation.donorName,
          bloodGroup: donation.bloodGroup,
          donationDate: donation.donationDate,
          dashboardScope: "hospital_dashboard",
        },
        { $set: donation },
        { upsert: true }
      );
    }
  }

  if (activityCount === 0) {
    const starterActivities = [
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        type: "dashboard_initialized",
        message: "Hospital dashboard initialized with starter backend data.",
        meta: { source: "backend_init" },
      },
      {
        hospital: hospitalId,
        ...snapshot,
        dashboardScope: "hospital_dashboard",
        type: "inventory_ready",
        message: "Initial blood inventory has been prepared for dashboard access.",
        meta: { source: "backend_init" },
      },
    ];

    for (const activity of starterActivities) {
      await ActivityLog.updateOne(
        {
          hospital: hospitalId,
          type: activity.type,
          message: activity.message,
          dashboardScope: "hospital_dashboard",
        },
        { $set: activity },
        { upsert: true }
      );
    }
  }

  return snapshot;
};

module.exports = {
  ensureHospitalDashboardData,
};
