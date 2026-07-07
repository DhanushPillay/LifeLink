const asyncHandler = require("express-async-handler");
const Hospital = require("../models/Hospital");

const ALLOWED_FIELDS = ["hospitalName", "email", "phone", "city", "address", "location"];

function pickAllowedFields(body, allowedFields) {
  const filtered = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filtered[field] = body[field];
    }
  }
  return filtered;
}

// @desc    Register a hospital profile
// @route   POST /api/hospitals
// @access  Private (Hospital only)
const registerHospital = asyncHandler(async (req, res) => {
  const existingHospital = await Hospital.findOne({ user: req.user._id });
  if (existingHospital) {
    res.status(400);
    throw new Error("User already has a hospital profile");
  }

  const hospitalData = { ...pickAllowedFields(req.body, ALLOWED_FIELDS), user: req.user._id };
  const hospital = await Hospital.create(hospitalData);
  res.status(201).json(hospital);
});

// @desc    Get all hospitals
// @route   GET /api/hospitals
// @access  Private
const getHospitals = asyncHandler(async (req, res) => {
  const hospitals = await Hospital.find().populate("user", "email");
  res.json(hospitals);
});

// @desc    Get logged in hospital profile
// @route   GET /api/hospitals/me
// @access  Private (Hospital only)
const getMyHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ user: req.user._id }).populate("user", "email");
  if (!hospital) {
    res.status(404);
    throw new Error("Hospital profile not found");
  }
  res.json(hospital);
});

module.exports = {
  registerHospital,
  getHospitals,
  getMyHospital
};
