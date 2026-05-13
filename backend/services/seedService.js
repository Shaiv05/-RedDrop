const Donor = require("../models/Donor");
const Hospital = require("../models/Hospital");
const BloodRequest = require("../models/BloodRequest");
const UserNotification = require("../models/UserNotification");
const {
  SAMPLE_DONORS,
  SAMPLE_HOSPITALS,
  SAMPLE_BLOOD_REQUESTS,
} = require("../data/sampleData");

const USER_EVENT_NOTIFICATIONS = [
  {
    title: "Blood donation camp",
    message: "Apollo Hospital is organizing a blood donation camp at MG Road Community Hall this Sunday.",
    details:
      "Camp timing is 9:00 AM to 4:00 PM. Donors should carry a valid ID, have a light meal before donating, and stay hydrated.",
    hospitalName: "Apollo Hospital",
    location: "MG Road Community Hall",
    eventDate: new Date("2026-03-15T09:00:00.000Z"),
  },
  {
    title: "Community drive",
    message: "City Care Hospital is hosting a voluntary blood donation drive near Electronic City this weekend.",
    details:
      "The drive is open to all eligible donors. Registration support is available at the hospital helpdesk and on-site from 8:30 AM.",
    hospitalName: "City Care Hospital",
    location: "Electronic City",
    eventDate: new Date("2026-03-14T08:30:00.000Z"),
  },
  {
    title: "Hospital camp alert",
    message: "LifeLine Medical Center is organizing a blood camp at Mysuru Town Hall on Saturday morning.",
    details:
      "Priority support is requested for A+, O+, and B+ donors. Walk-ins are accepted, but early arrival is recommended.",
    hospitalName: "LifeLine Medical Center",
    location: "Mysuru Town Hall",
    eventDate: new Date("2026-03-14T09:00:00.000Z"),
  },
  {
    title: "College donation event",
    message: "Green Cross Hospital is conducting a student blood donation event at National College Auditorium next Wednesday.",
    details:
      "This event includes donor screening, awareness guidance, and on-campus registration counters for students and staff.",
    hospitalName: "Green Cross Hospital",
    location: "National College Auditorium",
    eventDate: new Date("2026-03-18T10:00:00.000Z"),
  },
];

const upsertSampleData = async () => {
  for (const donor of SAMPLE_DONORS) {
    await Donor.updateOne(
      { email: donor.email },
      { $set: donor, $setOnInsert: { user: null } },
      { upsert: true }
    );
  }

  for (const hospital of SAMPLE_HOSPITALS) {
    await Hospital.updateOne(
      { licenseNumber: hospital.licenseNumber },
      { $set: hospital, $setOnInsert: { user: null } },
      { upsert: true }
    );
  }

  for (const request of SAMPLE_BLOOD_REQUESTS) {
    const hospital = await Hospital.findOne({ licenseNumber: request.hospitalLicense }).select("_id");
    if (!hospital) continue;

    await BloodRequest.updateOne(
      {
        hospital: hospital._id,
        bloodGroup: request.bloodGroup,
        patientNote: request.patientNote,
      },
      {
        $set: {
          hospitalName: hospital.name,
          units: request.units,
          isUrgent: Boolean(request.isUrgent),
          neededBy: request.neededBy || null,
          status: "open",
        },
      },
      { upsert: true }
    );
  }

  for (const notification of USER_EVENT_NOTIFICATIONS) {
    await UserNotification.updateOne(
      {
        audience: "all_users",
        type: "event",
        title: notification.title,
      },
      {
        $set: {
          ...notification,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  return {
    donorCount: SAMPLE_DONORS.length,
    hospitalCount: SAMPLE_HOSPITALS.length,
    requestCount: SAMPLE_BLOOD_REQUESTS.length,
  };
};

module.exports = {
  upsertSampleData,
};
