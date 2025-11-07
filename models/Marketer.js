const mongoose = require("mongoose");

const marketerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    address: { type: String },
    phoneNumber: { type: String },
    zone: { type: String },
    role: { type: String, default: "marketer" },

    // store creator reference dynamically (SuperAdmin, Manager, or Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
    },
    creatorModel: {
      type: String,
      enum: ["SuperAdmin", "Manager", "Admin"],
    },

    // store creator name for convenience
    createdByName: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Marketer", marketerSchema);
