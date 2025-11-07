const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        default: 'ic_notification',
    },
    page: {
        type: String,
        required: function () {
            return !this.productId;
        },
    },
    productId: {
        type: String,
        default: null,
    },
    orderId: {   
        type: String,
        default: null,
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    deliveryId: { 
        type: String,
        default: null,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});
module.exports = mongoose.model('Notification', NotificationSchema);
