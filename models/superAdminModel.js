const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  address: { type: String },
  phoneNumber: { type: String },
  role: { type: String, default: 'superadmin' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
