const mongoose = require("mongoose");

const managerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    address: { type: String },
    phoneNumber: { type: String },
    role: { type: String, default: "manager" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
    },
    creatorModel: {
      type: String,
      enum: ["SuperAdmin"], // only SuperAdmin can create Manager
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Manager", managerSchema);
