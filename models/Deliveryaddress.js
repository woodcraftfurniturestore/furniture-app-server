const mongoose = require('mongoose');
const deliverySchema = new mongoose.Schema({
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Dealer'
  },
  items: [{
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
    username: {
      type: String,
      required: true
    },
    houseNo: {
      type: String,
      required: true
    },
    streetName: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pinCode: {
      type: String,
      required: true
    }
  }]
});
const Delivery = mongoose.model('Delivery', deliverySchema);
module.exports = Delivery;