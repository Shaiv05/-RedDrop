const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const SAMPLE_DONORS = [
  {
    name: "Rahul Shah",
    phone: "+919824112233",
    email: "rahul.shah@reddrop.in",
    bloodGroup: "O+",
    location: "Satellite, Ahmedabad",
    isAvailable: true,
    lastDonationDate: daysAgo(78),
  },
  {
    name: "Nisha Patel",
    phone: "+919722334455",
    email: "nisha.patel@reddrop.in",
    bloodGroup: "A+",
    location: "Navrangpura, Ahmedabad",
    isAvailable: true,
    lastDonationDate: daysAgo(132),
  },
  {
    name: "Imran Shaikh",
    phone: "+919930221144",
    email: "imran.shaikh@reddrop.in",
    bloodGroup: "B-",
    location: "Sarkhej, Ahmedabad",
    isAvailable: false,
    lastDonationDate: daysAgo(44),
  },
  {
    name: "Kunal Trivedi",
    phone: "+918780445566",
    email: "kunal.trivedi@reddrop.in",
    bloodGroup: "O-",
    location: "Maninagar, Ahmedabad",
    isAvailable: true,
    lastDonationDate: daysAgo(22),
  },
];

const SAMPLE_HOSPITALS = [
  {
    name: "Fortis Hospital",
    phone: "+919910001111",
    email: "fortis.ahmedabad@example.com",
    location: "SG Highway, Ahmedabad",
    licenseNumber: "GJ-AH-1001",
    isVerified: true,
  },
  {
    name: "Apollo Hospital",
    phone: "+919910002222",
    email: "apollo.ahmedabad@example.com",
    location: "Bopal, Ahmedabad",
    licenseNumber: "GJ-AH-1002",
    isVerified: true,
  },
  {
    name: "Manipal Hospital",
    phone: "+919910003333",
    email: "manipal.ahmedabad@example.com",
    location: "Science City Road, Ahmedabad",
    licenseNumber: "GJ-AH-1003",
    isVerified: true,
  },
  {
    name: "Columbia Asia Hospital",
    phone: "+919910004444",
    email: "columbia.gandhinagar@example.com",
    location: "Sector 16, Gandhinagar",
    licenseNumber: "GJ-GN-1004",
    isVerified: true,
  },
  {
    name: "Narayana Health",
    phone: "+919910005555",
    email: "narayana.ahmedabad@example.com",
    location: "Naranpura, Ahmedabad",
    licenseNumber: "GJ-AH-1005",
    isVerified: true,
  },
  {
    name: "BGS Gleneagles Hospital",
    phone: "+919910006666",
    email: "bgs.gandhinagar@example.com",
    location: "Kudasan, Gandhinagar",
    licenseNumber: "GJ-GN-1006",
    isVerified: true,
  },
];

const SAMPLE_BLOOD_REQUESTS = [
  {
    hospitalLicense: "GJ-AH-1001",
    bloodGroup: "O+",
    units: 3,
    patientNote: "ICU support for trauma patient",
    isUrgent: true,
    neededBy: daysAgo(-2),
  },
  {
    hospitalLicense: "GJ-AH-1005",
    bloodGroup: "B+",
    units: 2,
    patientNote: "Scheduled cancer treatment transfusion",
    isUrgent: false,
    neededBy: daysAgo(-3),
  },
];

module.exports = {
  SAMPLE_DONORS,
  SAMPLE_HOSPITALS,
  SAMPLE_BLOOD_REQUESTS,
};
