// const mongoose = require('mongoose');
// const productSchema = new mongoose.Schema({
//     title: { type: String, required: true },
//     description: { 
//         type: String, 
//         required: true, 
//         maxlength: 50 
//     },
//     price: { type: Number, required: true },
//     images: [String],
//     categoryId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'Category',
//         required: true 
//     },
//     subCategoryId: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'SubCategory',
//         required: true 
//     },
//     stock: { 
//         type: Number, 
//         default: 0,
//     },
//     unit: { 
//         type: String, 
//         enum: ['kg', 'ml', 'Ltr','g'],
//         required: true,
//     },
//     offerPrice: { 
//         type: Number, 
//         default: null,
//     },
//     gstPercentage: { type: Number, default: 0 },
//     hasOffer: { 
//         type: Boolean, 
//         default: false, 
//     },
// }, { timestamps: true });
// module.exports = mongoose.model('Product', productSchema);


const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true, maxlength: 200 },
    price: { type: Number, required: true },
    offerPrice: { type: Number, default: null },
    images: [String],

    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: true
    },

    stock: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },

    hasOffer: { type: Boolean, default: false },
    typeOfProduct: { type: Number, enum: [1, 2], required: true }, // 1 = standard, 2 = custom

    measurement: { type: String, default: '' },
    size: { type: String, default: '' },
    weight: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
