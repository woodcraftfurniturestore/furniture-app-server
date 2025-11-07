const mongoose = require('mongoose');
const BannerSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: true,
        },
        page: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);
const Banner = mongoose.model('Banner', BannerSchema);
module.exports = Banner;