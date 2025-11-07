const mongoose = require("mongoose");

const dealerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"], // basic Indian mobile validation
    },
    gstNumber: {
      type: String,
      required: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GST number format",
      ],
    },
    address: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "dealer" },

  // activation & approval flags
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },

    // relationship fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
    },
    creatorModel: {
      type: String,
      enum: ["SuperAdmin", "Manager", "Admin", "Marketer"],
    },
    createdByName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dealer", dealerSchema);
