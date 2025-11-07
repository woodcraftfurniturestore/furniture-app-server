const mongoose = require('mongoose');
const policySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['privacy', 'terms','shipping','refunds'],
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Policy', policySchema);