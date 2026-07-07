const asyncHandler = require("express-async-handler");
const Donor = require("../models/Donor");

const ALLOWED_CREATE_FIELDS = ["bloodGroup", "donorType", "organType", "city", "phone", "location"];
const ALLOWED_UPDATE_FIELDS = [...ALLOWED_CREATE_FIELDS, "available"];

function pickAllowedFields(body, allowedFields) {
  const filtered = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filtered[field] = body[field];
    }
  }
  return filtered;
}

// @desc    Register a donor profile
// @route   POST /api/donors
// @access  Private (Donor only)
const registerDonor = asyncHandler(async (req, res) => {
  const existingDonor = await Donor.findOne({ user: req.user._id });
  if (existingDonor) {
    res.status(400);
    throw new Error("User already has a donor profile");
  }

  const donorData = { ...pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS), user: req.user._id };
  const donor = await Donor.create(donorData);
  res.status(201).json(donor);
});

// @desc    Get all donors
// @route   GET /api/donors
// @access  Private
const getDonors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  
  const donors = await Donor.find()
    .populate("user", "email")
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Donor.countDocuments();
  
  res.json({
    donors,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get donors by blood group
// @route   GET /api/donors/blood/:group
// @access  Private
const getDonorsByBloodGroup = asyncHandler(async (req, res) => {
  const donors = await Donor.find({
    bloodGroup: req.params.group
  }).populate("user", "email");
  res.json(donors);
});

// @desc    Get logged in donor profile
// @route   GET /api/donors/me
// @access  Private (Donor only)
const getMyProfile = asyncHandler(async (req, res) => {
  const donor = await Donor.findOne({ user: req.user._id }).populate("user", "email");
  if (!donor) {
    res.status(404);
    throw new Error("Donor profile not found");
  }
  res.json(donor);
});

// @desc    Update logged in donor profile
// @route   PUT /api/donors/me
// @access  Private (Donor only)
const updateDonor = asyncHandler(async (req, res) => {
  let donor = await Donor.findOne({ user: req.user._id });

  if (!donor) {
    res.status(404);
    throw new Error("Donor profile not found");
  }

  const allowedData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

  donor = await Donor.findOneAndUpdate(
    { user: req.user._id },
    allowedData,
    { new: true, runValidators: true }
  );

  res.json(donor);
});

module.exports = {
  registerDonor,
  getDonors,
  getDonorsByBloodGroup,
  getMyProfile,
  updateDonor
};
