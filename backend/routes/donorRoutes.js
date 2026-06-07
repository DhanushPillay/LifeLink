const express = require("express");

const Donor = require("../models/Donor");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const donor = await Donor.create(req.body);

    res.status(201).json(donor);

  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/", async (req, res) => {
  try {
    const donors = await Donor.find();

    res.json(donors);

  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/blood/:group", async (req, res) => {
  try {
    const donors = await Donor.find({
      bloodGroup: req.params.group
    });

    res.json(donors);

  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
