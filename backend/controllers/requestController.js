const BloodRequest = require("../models/BloodRequest");
const Hospital = require("../models/Hospital");
const Donor = require("../models/Donor");
const { logActivity } = require("../services/activityService");

const createRequest = async (req, res) => {
  const { hospitalId, bloodGroup, units, patientNote, isUrgent, neededBy } = req.body;

  if (!hospitalId || !bloodGroup || !units) {
    return res.status(400).json({ message: "hospitalId, bloodGroup and units are required" });
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ message: "Hospital not found" });
  }

  const request = await BloodRequest.create({
    hospital: hospital._id,
    hospitalName: hospital.name,
    bloodGroup,
    units,
    patientNote: patientNote || "Emergency",
    isUrgent: Boolean(isUrgent),
    neededBy: neededBy || null,
  });

  const populated = await request.populate("hospital", "name location phone");
  return res.status(201).json({ message: "Blood request created", request: populated });
};

const listRequests = async (req, res) => {
  const { bloodGroup, urgentOnly, status } = req.query;

  const filter = {};

  if (req.user?.role === "hospital") {
    filter.hospital = req.user.id;
  }

  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (status) filter.status = status;
  if (urgentOnly !== undefined) filter.isUrgent = String(urgentOnly).toLowerCase() === "true";

  const requests = await BloodRequest.find(filter)
    .populate("hospital", "name location phone")
    .sort({ isUrgent: -1, createdAt: -1 });

  return res.json({ count: requests.length, requests });
};

const respondToRequest = async (req, res) => {
  const { requestId } = req.params;
  const { donorId, message } = req.body;

  if (!donorId) {
    return res.status(400).json({ message: "donorId is required" });
  }

  const donor = await Donor.findById(donorId);
  if (!donor) {
    return res.status(404).json({ message: "Donor not found" });
  }

  const request = await BloodRequest.findById(requestId);
  if (!request) {
    return res.status(404).json({ message: "Blood request not found" });
  }

  const alreadyResponded = request.responders.some(
    (responder) => responder.donor.toString() === donorId
  );

  if (alreadyResponded) {
    return res.status(409).json({ message: "Donor already responded to this request" });
  }

  request.responders.push({ donor: donor._id, message: message || "" });
  await request.save();

  const populated = await request.populate("responders.donor", "name bloodGroup phone location");
  return res.json({ message: "Response submitted", request: populated });
};

const updateRequestStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!req.user || req.user.role !== "hospital") {
    return res.status(403).json({ message: "Hospital access required" });
  }

  if (!["open", "fulfilled", "cancelled"].includes(String(status))) {
    return res.status(400).json({ message: "status must be open, fulfilled or cancelled" });
  }

  const request = await BloodRequest.findOne({ _id: requestId, hospital: req.user.id });
  if (!request) {
    return res.status(404).json({ message: "Blood request not found" });
  }

  request.status = status;
  await request.save();

  await logActivity(
    req.user.id,
    "request_status_update",
    `Request ${request._id} marked as ${status}`,
    { requestId: String(request._id), status }
  );

  const populated = await request.populate("hospital", "name location phone");
  return res.json({ message: "Request status updated", request: populated });
};

module.exports = {
  createRequest,
  listRequests,
  respondToRequest,
  updateRequestStatus,
};
