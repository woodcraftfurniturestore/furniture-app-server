const mongoose = require("mongoose");
 
const settingSchema = new mongoose.Schema({
  minOrderAmount: { type: Number, required: true, default: 200 }
});
 
module.exports = mongoose.model("Setting", settingSchema);