const mongoose = require('mongoose');
const offerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    actualPrice: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    images: { type: [String], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    unit: { type: String, enum: ['kg', 'Ltr', 'ml', 'g'], required: true },
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true
    },
    gstPercentage: { type: Number, default: 0 },
});
const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;