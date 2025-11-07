const mongoose = require('mongoose');
const maintenanceSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'App is under maintenance.'
  }
}, { timestamps: true });
module.exports = mongoose.model('Maintenance', maintenanceSchema);