const mongoose = require('mongoose');
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'] 
},
  phoneNo: { 
    type: String, 
    required: true, 
    validate: {
        validator: function(value) {
            return value && value.length === 10 && /^[0-9]{10}$/.test(value);
        },
        message: 'Phone number must be exactly 10 digits.'
    }
},
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
});
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
module.exports = ContactMessage;