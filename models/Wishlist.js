
const mongoose = require('mongoose');
const wishlistSchema = new mongoose.Schema({
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dealer',
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            }
        }
    ]
});
const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
