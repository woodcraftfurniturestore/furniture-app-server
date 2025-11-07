const mongoose = require('mongoose');
const cartSchema = new mongoose.Schema({
    dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }, 
            quantity: { type: Number, required: true },
            isOffer: { type: Boolean, default: false },
            offerPrice: { type: Number },
        },
    ],
    quote: {
        totalAmount: { type: Number, required: true, default: 0 },
        originalTotalAmount: { type: Number, required: true, default: 0 },
        savings: { type: Number, required: true, default: 0 },
        totalGST: { type: Number, required: true, default: 0 },
        validUntil: { type: Date, required: true, default: Date.now },
    },
});
module.exports = mongoose.model('Cart', cartSchema);