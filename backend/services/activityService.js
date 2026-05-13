const ActivityLog = require("../models/ActivityLog");
const Hospital = require("../models/Hospital");

const logActivity = async (hospitalId, type, message, meta = {}, hospitalSnapshot = null) => {
  if (!hospitalId) return;

  let snapshot = hospitalSnapshot;
  if (!snapshot) {
    const hospital = await Hospital.findById(hospitalId).select("name email licenseNumber");
    if (!hospital) return;
    snapshot = {
      hospitalName: hospital.name,
      hospitalEmail: hospital.email,
      hospitalLicenseNumber: hospital.licenseNumber,
    };
  }

  await ActivityLog.create({
    hospital: hospitalId,
    hospitalName: snapshot.hospitalName,
    hospitalEmail: snapshot.hospitalEmail,
    hospitalLicenseNumber: snapshot.hospitalLicenseNumber,
    dashboardScope: "hospital_dashboard",
    type,
    message,
    meta,
  });
};

module.exports = {
  logActivity,
};
