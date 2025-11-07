const mongoose = require('mongoose');
const marqueeSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });
module.exports = mongoose.model('Marquee', marqueeSchema);