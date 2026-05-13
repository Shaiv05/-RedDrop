const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const connectDB = require("../config/db");
const Hospital = require("../models/Hospital");
const BloodRequest = require("../models/BloodRequest");
const BloodInventory = require("../models/BloodInventory");
const DonationRecord = require("../models/DonationRecord");
const ActivityLog = require("../models/ActivityLog");
const EmergencyHospital = require("../models/EmergencyHospital");
const { getHospitalIdentityKey } = require("../utils/hospitalIdentity");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const chooseCanonicalHospital = (group) =>
  [...group].sort((left, right) => {
    const leftScore = Number(Boolean(left.password)) + Number(Boolean(left.user));
    const rightScore = Number(Boolean(right.password)) + Number(Boolean(right.user));
    if (rightScore !== leftScore) return rightScore - leftScore;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  })[0];

const fillCanonicalHospital = (canonical, duplicate) => {
  if (!canonical.phone && duplicate.phone) canonical.phone = duplicate.phone;
  if (!canonical.email && duplicate.email) canonical.email = duplicate.email;
  if (!canonical.licenseNumber && duplicate.licenseNumber) canonical.licenseNumber = duplicate.licenseNumber;
  if (!canonical.password && duplicate.password) canonical.password = duplicate.password;
  if (!canonical.user && duplicate.user) canonical.user = duplicate.user;
  if (!canonical.emergencyReason && duplicate.emergencyReason) canonical.emergencyReason = duplicate.emergencyReason;
  canonical.isVerified = canonical.isVerified || duplicate.isVerified;
};

const mergeInventoryForHospital = async (canonical, duplicateId) => {
  const duplicateInventory = await BloodInventory.find({ hospital: duplicateId });

  for (const entry of duplicateInventory) {
    const existing = await BloodInventory.findOne({
      hospital: canonical._id,
      bloodGroup: entry.bloodGroup,
    });

    if (existing) {
      existing.units += entry.units;
      existing.minLevel = Math.min(existing.minLevel, entry.minLevel);
      existing.hospitalName = canonical.name;
      existing.hospitalEmail = canonical.email;
      existing.hospitalLicenseNumber = canonical.licenseNumber;
      await existing.save();
      await BloodInventory.deleteOne({ _id: entry._id });
      continue;
    }

    entry.hospital = canonical._id;
    entry.hospitalName = canonical.name;
    entry.hospitalEmail = canonical.email;
    entry.hospitalLicenseNumber = canonical.licenseNumber;
    await entry.save();
  }
};

const syncRelatedCollections = async (canonical, duplicateId) => {
  await BloodRequest.updateMany(
    { hospital: duplicateId },
    { $set: { hospital: canonical._id, hospitalName: canonical.name } }
  );

  await EmergencyHospital.updateMany(
    { hospital: duplicateId },
    {
      $set: {
        hospital: canonical._id,
        hospitalName: canonical.name,
        email: canonical.email,
        phone: canonical.phone,
        location: canonical.location,
        licenseNumber: canonical.licenseNumber,
      },
    }
  );

  await DonationRecord.updateMany(
    { hospital: duplicateId },
    {
      $set: {
        hospital: canonical._id,
        hospitalName: canonical.name,
        hospitalEmail: canonical.email,
        hospitalLicenseNumber: canonical.licenseNumber,
      },
    }
  );

  await ActivityLog.updateMany(
    { hospital: duplicateId },
    {
      $set: {
        hospital: canonical._id,
        hospitalName: canonical.name,
        hospitalEmail: canonical.email,
        hospitalLicenseNumber: canonical.licenseNumber,
      },
    }
  );

  await mergeInventoryForHospital(canonical, duplicateId);
};

const run = async () => {
  await connectDB();

  const hospitals = await Hospital.find().select("+password").sort({ createdAt: 1 });
  const groups = new Map();

  for (const hospital of hospitals) {
    const key = getHospitalIdentityKey({ name: hospital.name, location: hospital.location });
    const list = groups.get(key) || [];
    list.push(hospital);
    groups.set(key, list);
  }

  let duplicateGroups = 0;
  let removedHospitals = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue;

    duplicateGroups += 1;
    const canonical = chooseCanonicalHospital(group);
    const duplicates = group.filter((hospital) => !hospital._id.equals(canonical._id));

    for (const duplicate of duplicates) {
      fillCanonicalHospital(canonical, duplicate);
    }
    await canonical.save();

    for (const duplicate of duplicates) {
      await syncRelatedCollections(canonical, duplicate._id);
      await Hospital.deleteOne({ _id: duplicate._id });
      removedHospitals += 1;
      console.log(
        `Merged duplicate hospital "${duplicate.name}" (${duplicate._id}) into ${canonical._id} for identity ${key}`
      );
    }
  }

  console.log(`Duplicate groups fixed: ${duplicateGroups}`);
  console.log(`Duplicate hospital records removed: ${removedHospitals}`);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Hospital dedupe failed:", error);
  await mongoose.connection.close();
  process.exit(1);
});
