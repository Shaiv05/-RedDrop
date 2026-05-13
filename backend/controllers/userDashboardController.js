const User = require("../models/User");
const Hospital = require("../models/Hospital");
const BloodInventory = require("../models/BloodInventory");
const BloodRequest = require("../models/BloodRequest");
const Donor = require("../models/Donor");
const UserBloodRequest = require("../models/UserBloodRequest");
const UserDonationRecord = require("../models/UserDonationRecord");
const UserActivityLog = require("../models/UserActivityLog");
const UserNotification = require("../models/UserNotification");
const UserBloodReportAnalysis = require("../models/UserBloodReportAnalysis");
const { analyzeBloodReport } = require("../services/bloodReportAnalyzerService");

const WAITING_PERIOD_DAYS = 90;

const AWARENESS_ITEMS = [
  {
    title: "Benefits of blood donation",
    description: "Regular blood donation supports emergency care, surgeries, and people with chronic blood disorders.",
  },
  {
    title: "Basic eligibility",
    description: "Most healthy adults aged 18 to 65 can donate if they meet weight and health requirements.",
  },
  {
    title: "Donation frequency",
    description: "Whole blood donation is generally allowed again after 90 days.",
  },
];

const formatDate = (value) => (value ? new Date(value) : null);

const getEligibilitySummary = (lastDonationDate) => {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      daysRemaining: 0,
      nextEligibleDate: null,
      label: "Eligible to donate now",
    };
  }

  const lastDate = new Date(lastDonationDate);
  const nextEligibleDate = new Date(lastDate);
  nextEligibleDate.setDate(nextEligibleDate.getDate() + WAITING_PERIOD_DAYS);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfEligible = new Date(
    nextEligibleDate.getFullYear(),
    nextEligibleDate.getMonth(),
    nextEligibleDate.getDate()
  );
  const diffMs = startOfEligible.getTime() - startOfToday.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    isEligible: daysRemaining === 0,
    daysRemaining,
    nextEligibleDate,
    label: daysRemaining === 0 ? "Eligible to donate now" : `Eligible again in ${daysRemaining} day(s)`,
  };
};

const logUserActivity = async (userId, userName, type, message, meta = {}) => {
  await UserActivityLog.create({
    user: userId,
    userName,
    type,
    message,
    meta,
  });
};

const createUserNotification = async ({
  userId = null,
  userName = "",
  audience = "specific_user",
  type = "system",
  title,
  message,
  details = "",
  hospitalName = "",
  location = "",
  eventDate = null,
}) => {
  await UserNotification.create({
    user: userId,
    userName,
    audience,
    type,
    title,
    message,
    details,
    hospitalName,
    location,
    eventDate,
  });
};

const syncDonorProfile = async (user) => {
  if (!user.phone || !user.city || !user.bloodGroup) {
    return;
  }

  await Donor.updateOne(
    { $or: [{ user: user._id }, { email: user.email }] },
    {
      $set: {
        user: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        location: user.city,
        isAvailable: user.isAvailable,
        lastDonationDate: user.lastDonationDate || null,
      },
    },
    { upsert: true }
  );
};

const mapBloodReportAnalysis = (analysis) => ({
  id: analysis._id,
  fileName: analysis.fileName,
  mimeType: analysis.mimeType,
  extractionMethod: analysis.extractionMethod,
  extractedTextPreview: analysis.extractedTextPreview,
  labName: analysis.labName,
  testDate: analysis.testDate,
  summary: analysis.summary,
  parameters: Array.isArray(analysis.parameters) ? analysis.parameters : [],
  insights: Array.isArray(analysis.insights) ? analysis.insights : [],
  dietSuggestions: Array.isArray(analysis.dietSuggestions) ? analysis.dietSuggestions : [],
  lifestyleSuggestions: Array.isArray(analysis.lifestyleSuggestions) ? analysis.lifestyleSuggestions : [],
  precautions: Array.isArray(analysis.precautions) ? analysis.precautions : [],
  donationEligibility: analysis.donationEligibility || {
    status: "needs_review",
    label: "Needs review",
    reasons: [],
    nextStep: "",
  },
  disclaimer: analysis.disclaimer || "",
  createdAt: analysis.createdAt,
});

const getUserDashboard = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [myRequests, donationHistory, recentActivities, hospitals, inventory, emergencyRequests, storedNotifications, latestAnalysis, recentAnalyses] =
    await Promise.all([
      UserBloodRequest.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
      UserDonationRecord.find({ user: user._id }).sort({ donationDate: -1 }).lean(),
      UserActivityLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(8).lean(),
      Hospital.find().sort({ createdAt: -1 }).limit(20).lean(),
      BloodInventory.find({ units: { $gt: 0 } })
        .sort({ units: -1, updatedAt: -1 })
        .limit(24)
        .lean(),
      BloodRequest.find({
        status: "open",
        isUrgent: true,
        ...(user.bloodGroup ? { bloodGroup: user.bloodGroup } : {}),
      })
        .populate("hospital", "name location phone")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      UserNotification.find({
        isActive: true,
        type: { $ne: "profile" },
        $or: [{ audience: "all_users" }, { audience: "specific_user", user: user._id }],
      })
        .sort({ eventDate: 1, createdAt: -1 })
        .limit(8)
        .lean(),
      UserBloodReportAnalysis.findOne({ user: user._id }).sort({ createdAt: -1 }).lean(),
      UserBloodReportAnalysis.find({ user: user._id }).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

  const lastDonationDate =
    donationHistory.length > 0 ? donationHistory[0].donationDate : user.lastDonationDate || null;
  const eligibility = getEligibilitySummary(lastDonationDate);

  const normalizedCity = (user.city || "").trim().toLowerCase();
  const hospitalById = new Map(hospitals.map((hospital) => [String(hospital._id), hospital]));
  const nearbyHospitals = hospitals
    .filter((hospital) =>
      normalizedCity
        ? String(hospital.location || "").toLowerCase().includes(normalizedCity)
        : true
    )
    .slice(0, 6)
    .map((hospital) => {
      const stock = inventory.filter(
        (entry) => String(entry.hospital) === String(hospital._id)
      );

      return {
        id: hospital._id,
        name: hospital.name,
        location: hospital.location,
        phone: hospital.phone,
        email: hospital.email,
        availableBloodGroups: stock.map((entry) => `${entry.bloodGroup} (${entry.units})`),
      };
    });

  const availableBloodInfo = inventory.map((entry) => {
    const hospital = hospitalById.get(String(entry.hospital));

    return {
      id: entry._id,
      hospitalName: entry.hospitalName,
      bloodGroup: entry.bloodGroup,
      units: entry.units,
      location: hospital?.location || "",
      phone: hospital?.phone || "",
      email: hospital?.email || entry.hospitalEmail || "",
    };
  });

  const notifications = storedNotifications.map((notification) => ({
    id: notification._id,
    title: notification.title,
    message: notification.message,
    details: notification.details,
    createdAt: notification.eventDate || notification.createdAt,
    type: notification.type,
    hospitalName: notification.hospitalName,
    location: notification.location,
  }));

  return res.json({
    overview: {
      bloodGroup: user.bloodGroup || "Not set",
      totalDonations: donationHistory.length,
      lastDonationDate,
      isEligible: eligibility.isEligible,
      eligibilityLabel: eligibility.label,
    },
    profile: {
      name: user.name,
      email: user.email,
      age: user.age,
      bloodGroup: user.bloodGroup || "",
      city: user.city || "",
      phone: user.phone || "",
      isAvailable: user.isAvailable,
      lastDonationDate,
    },
    donationStatus: eligibility,
    myRequests,
    donationHistory,
    nearbyHospitals,
    availableBloodInfo,
    emergencyRequests: emergencyRequests.map((request) => ({
      id: request._id,
      hospitalName: request.hospitalName || request.hospital?.name || "Unknown Hospital",
      bloodGroup: request.bloodGroup,
      units: request.units,
      requestDate: request.createdAt,
      status: request.status,
      location: request.hospital?.location || "Location not shared",
      phone: request.hospital?.phone || "Not shared",
    })),
    notifications,
    recentActivities: recentActivities.map((activity) => ({
      id: activity._id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
    })),
    bloodReportAnalysis: latestAnalysis ? mapBloodReportAnalysis(latestAnalysis) : null,
    bloodReportHistory: Array.isArray(recentAnalyses) ? recentAnalyses.map(mapBloodReportAnalysis) : [],
    awareness: AWARENESS_ITEMS,
    donationReminder: {
      isEligible: eligibility.isEligible,
      nextEligibleDate: eligibility.nextEligibleDate,
      message: eligibility.label,
    },
  });
};

const updateUserProfile = async (req, res) => {
  const { name, age, bloodGroup, city, phone, isAvailable, lastDonationDate } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (name) user.name = String(name).trim();
  if (age !== undefined && age !== null && age !== "") user.age = Number(age);
  if (bloodGroup !== undefined) user.bloodGroup = String(bloodGroup).trim();
  if (city !== undefined) user.city = String(city).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  if (typeof isAvailable === "boolean") user.isAvailable = isAvailable;

  if (lastDonationDate) {
    const parsed = new Date(lastDonationDate);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "lastDonationDate must be a valid date" });
    }
    user.lastDonationDate = parsed;
  } else if (lastDonationDate === null || lastDonationDate === "") {
    user.lastDonationDate = null;
  }

  await user.save();
  await syncDonorProfile(user);
  await logUserActivity(user._id, user.name, "profile_updated", "Profile information updated.");

  return res.json({
    message: "Profile updated successfully",
    profile: {
      name: user.name,
      email: user.email,
      age: user.age,
      bloodGroup: user.bloodGroup,
      city: user.city,
      phone: user.phone,
      isAvailable: user.isAvailable,
      lastDonationDate: user.lastDonationDate,
    },
  });
};

const createUserBloodRequest = async (req, res) => {
  const { patientName, bloodGroup, units, hospitalId, hospitalName, city, reason, patientCondition, notes } = req.body;

  if (!patientName || !bloodGroup || !units || (!hospitalId && !hospitalName)) {
    return res.status(400).json({
      message: "patientName, bloodGroup, units, and hospital selection are required",
    });
  }

  let resolvedHospitalName = hospitalName;
  let resolvedHospitalId = null;
  const user = await User.findById(req.user.id).select("name");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    resolvedHospitalId = hospital._id;
    resolvedHospitalName = hospital.name;
  }

  const request = await UserBloodRequest.create({
    user: req.user.id,
    userName: user.name,
    patientName: String(patientName).trim(),
    bloodGroup,
    units: Number(units),
    hospital: resolvedHospitalId,
    hospitalName: String(resolvedHospitalName).trim(),
    city: city ? String(city).trim() : "",
    reason: reason ? String(reason).trim() : "",
    patientCondition: patientCondition ? String(patientCondition).trim() : "",
    notes: notes ? String(notes).trim() : "",
  });

  await logUserActivity(
    req.user.id,
    user.name,
    "blood_request_submitted",
    `Blood request submitted for ${request.patientName}.`,
    { requestId: String(request._id) }
  );

  await createUserNotification({
    userId: req.user.id,
    userName: user.name,
    type: "request_status",
    title: "Blood request submitted",
    message: `Your blood request for ${request.patientName} at ${request.hospitalName} has been submitted.`,
    details: request.reason || request.patientCondition || request.notes || "Hospital will review your request shortly.",
    hospitalName: request.hospitalName,
    location: request.city,
  });

  return res.status(201).json({ message: "Blood request created", request });
};

const createUserDonationRecord = async (req, res) => {
  const { hospitalName, bloodGroup, unitsDonated, donationDate } = req.body;

  if (!hospitalName || !bloodGroup || !unitsDonated || !donationDate) {
    return res.status(400).json({
      message: "hospitalName, bloodGroup, unitsDonated and donationDate are required",
    });
  }

  const parsedDate = new Date(donationDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "donationDate must be a valid date" });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const record = await UserDonationRecord.create({
    user: req.user.id,
    userName: user.name,
    hospitalName: String(hospitalName).trim(),
    bloodGroup,
    unitsDonated: Number(unitsDonated),
    donationDate: parsedDate,
  });

  if (user && (!user.lastDonationDate || parsedDate > user.lastDonationDate)) {
    user.lastDonationDate = parsedDate;
    await user.save();
    await syncDonorProfile(user);
  }

  await logUserActivity(
    req.user.id,
    user.name,
    "donation_completed",
    `Donation recorded at ${record.hospitalName}.`,
    { donationId: String(record._id) }
  );

  await createUserNotification({
    userId: req.user.id,
    userName: user.name,
    type: "donation",
    title: "Donation record saved",
    message: `Your donation at ${record.hospitalName} was recorded successfully.`,
    details: `${record.unitsDonated} unit(s) of ${record.bloodGroup} added on ${parsedDate.toDateString()}.`,
    hospitalName: record.hospitalName,
  });

  return res.status(201).json({ message: "Donation record added", record });
};

const analyzeUserBloodReport = async (req, res) => {
  const { fileName, mimeType, fileDataUrl, reportText = "" } = req.body;

  if (!fileName || !mimeType || (!fileDataUrl && !reportText)) {
    return res.status(400).json({
      message: "fileName, mimeType, and either fileDataUrl or reportText are required",
    });
  }

  const user = await User.findById(req.user.id).select("name age bloodGroup");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const analysis = await analyzeBloodReport({
    fileName: String(fileName).trim(),
    mimeType: String(mimeType).trim(),
    fileDataUrl: fileDataUrl ? String(fileDataUrl) : "",
    reportText: String(reportText || ""),
    userProfile: {
      age: user.age,
      bloodGroup: user.bloodGroup,
    },
  });

  const savedAnalysis = await UserBloodReportAnalysis.create({
    user: user._id,
    fileName: String(fileName).trim(),
    mimeType: String(mimeType).trim(),
    extractionMethod: analysis.extractionMethod,
    extractedTextPreview: analysis.extractedText.slice(0, 1200),
    labName: analysis.labName,
    testDate: analysis.testDate,
    summary: analysis.summary,
    parameters: analysis.parameters,
    insights: analysis.insights,
    dietSuggestions: analysis.dietSuggestions,
    lifestyleSuggestions: analysis.lifestyleSuggestions,
    precautions: analysis.precautions,
    donationEligibility: analysis.donationEligibility,
    disclaimer: analysis.disclaimer,
  });

  await logUserActivity(
    req.user.id,
    user.name,
    "blood_report_analyzed",
    `Blood report analyzed from ${savedAnalysis.fileName}.`,
    { analysisId: String(savedAnalysis._id) }
  );

  await createUserNotification({
    userId: req.user.id,
    userName: user.name,
    type: "system",
    title: "Blood report analyzed",
    message: `Analysis completed for ${savedAnalysis.fileName}.`,
    details: savedAnalysis.summary,
  });

  return res.status(201).json({
    message: "Blood report analyzed successfully",
    analysis: mapBloodReportAnalysis(savedAnalysis),
  });
};

const deleteUserBloodReportAnalysis = async (req, res) => {
  const analysis = await UserBloodReportAnalysis.findOne({
    _id: req.params.analysisId,
    user: req.user.id,
  });

  if (!analysis) {
    return res.status(404).json({ message: "Saved blood report analysis not found" });
  }

  await UserBloodReportAnalysis.deleteOne({ _id: analysis._id });

  const user = await User.findById(req.user.id).select("name");
  if (user) {
    await logUserActivity(
      req.user.id,
      user.name,
      "blood_report_deleted",
      `Blood report analysis deleted for ${analysis.fileName}.`,
      { analysisId: String(analysis._id) }
    );
  }

  return res.json({ message: "Blood report analysis deleted" });
};

module.exports = {
  getUserDashboard,
  updateUserProfile,
  createUserBloodRequest,
  createUserDonationRecord,
  analyzeUserBloodReport,
  deleteUserBloodReportAnalysis,
};
