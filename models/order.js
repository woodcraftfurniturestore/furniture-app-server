const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  offerPrice: { type: Number },
  isOffer: { type: Boolean, default: false },
  deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  phoneNo: { type: String },
  houseNo: { type: String, required: true },
  streetName: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  username: { type: String },
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }
});
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Failed'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});
const orderSchema = new mongoose.Schema({
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
  items: [orderItemSchema],
  paymentMethod: {
    type: String,
    enum: ['online', 'cod'],
    required: true
  },
  status: {
    type: String,
    enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Failed'],
    default: 'Placed',
  },
  statusHistory: [statusHistorySchema],
  paymentDetails: {
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
  },
  quote: {
    totalAmount: { type: Number, required: true },
    totalGST: { type: Number, required: true },
    savings: { type: Number, required: true },
    originalTotalAmount: { type: Number, required: true },
    validUntil: { type: Date, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});
module.exports = mongoose.model('Order', orderSchema);