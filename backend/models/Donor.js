const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema({
  name: String,

  bloodGroup: String,

  donorType: {
    type: String,
    enum: ["blood", "organ"]
  },

  organType: String,

  city: String,

  phone: String,

  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Donor", donorSchema);
