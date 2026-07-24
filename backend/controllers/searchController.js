const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Donor = require("../models/Donor");

// @desc    Find nearby available donors
// @route   GET /api/search/nearby
// @access  Private
const searchNearbyDonors = asyncHandler(async (req, res) => {
  const { lat, lng, radius, bloodGroup, organType } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error("Latitude and longitude are required for nearby search");
  }

  // Radius in radians (Earth radius is approx 3963.2 miles)
  const searchRadius = radius ? radius / 3963.2 : 25 / 3963.2; // default 25 miles

  const query = {
    location: {
      $geoWithin: {
        $centerSphere: [[Number(lng), Number(lat)], searchRadius]
      }
    },
    available: true
  };

  if (bloodGroup) query.bloodGroup = bloodGroup;
  if (organType) query.organType = organType;

  const donors = await Donor.find(query).populate("user", "email");

  res.json({
    count: donors.length,
    donors
  });
});

// @desc    Lifelink generic search donors
// @route   GET /api/search/donors
// @access  Private
const searchDonors = asyncHandler(async (req, res) => {
  const { type, query, lat, lng } = req.query;

  const users = await User.find({ profileComplete: true }).select("-password -phone -email -profile.eligibilityFile -profile.pincode");
  
  let results = users.map(u => ({
    id: u._id,
    ...u.profile,
    lat: u.profile?.lat,
    lng: u.profile?.lng,
    available: u.profile?.donateBlood || u.profile?.donateOrgan || false
  }));

  if (type === 'blood') {
    results = results.filter((d) => d.donateBlood && d.available);
    if (query) {
      results = results.filter(
        (d) => d.bloodGroup && d.bloodGroup.toLowerCase() === query.toLowerCase()
      );
    }
  } else if (type === 'organ') {
    results = results.filter((d) => d.donateOrgan && d.available);
    if (query) {
      results = results.filter((d) =>
        d.organs && d.organs.some((o) => o.toLowerCase().includes(query.toLowerCase()))
      );
    }
  }

  if (lat && lng) {
    const latN = Number(lat);
    const lngN = Number(lng);
    
    const haversine = (lat1, lng1, lat2, lng2) => {
      if (!lat1 || !lng1) return Infinity;
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    results = results
      .map((d) => ({
        ...d,
        distance: haversine(d.lat, d.lng, latN, lngN),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  res.json(results);
});

const getDonorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select("-password -phone -email -profile.eligibilityFile -profile.pincode");
  if (!user) {
    res.status(404);
    throw new Error("Donor not found");
  }
  res.json({
    id: user._id,
    ...user.profile,
    lat: user.profile?.lat,
    lng: user.profile?.lng,
  });
});

module.exports = { searchDonors, getDonorById };
