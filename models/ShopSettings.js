// const mongoose = require('mongoose');
// const shopSettingsSchema = new mongoose.Schema({
//     websiteUrl: { type: String, required: true },
//     profileImage: { type: String, required: true },
//     mapLink: { type: String, required: true },
//     message: { type: String, required: true },
//     name: { type: String, required: true },
//     phoneNumber: { type: String, required: true },
//     whatsappNumber: { type: String, required: true },
//      email: { type: String, required: true },
//     address: { type: String, required: true },
//     poweredBy: {
//         image: { type: String, required: true },
//         name: { type: String, required: true }
//     },
// }, { timestamps: true });
// module.exports = mongoose.model('ShopSettings', shopSettingsSchema);


const mongoose = require('mongoose');
const shopSettingsSchema = new mongoose.Schema({
    websiteUrl: { type: String, required: true },
    profileImage: { type: String, required: true },
    mapLink: { type: String, required: true },
    message: { type: String, required: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    whatsappNumber: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    poweredBy: {
        image: { type: String, required: true },
        name: { type: String, required: true },
     link: { type: String, required: true },

    },
}, { timestamps: true });
module.exports = mongoose.model('ShopSettings', shopSettingsSchema);