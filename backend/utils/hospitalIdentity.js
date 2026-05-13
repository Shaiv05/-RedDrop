const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeHospitalField = (value) =>
  (value || "")
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const buildHospitalIdentityQuery = ({ name, location }) => ({
  name: { $regex: `^${escapeRegex(normalizeHospitalField(name))}$`, $options: "i" },
  location: { $regex: `^${escapeRegex(normalizeHospitalField(location))}$`, $options: "i" },
});

const getHospitalIdentityKey = ({ name, location }) =>
  `${normalizeHospitalField(name)}::${normalizeHospitalField(location)}`;

module.exports = {
  normalizeHospitalField,
  buildHospitalIdentityQuery,
  getHospitalIdentityKey,
};
