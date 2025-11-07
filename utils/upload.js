// const multer = require('multer');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// require('dotenv').config();
// cloudinary.config({
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.CLOUD_API_KEY,
//     api_secret: process.env.CLOUD_API_SECRET,
// });
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'grocery-app',
//         allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
//     },
// });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10000000 },
// }).single('image');
// module.exports = upload;
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'grocery-app',
        allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
    },
});
 
const singleUpload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
}).single('images');
 
const multipleUpload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
}).array('images', 5);
 
module.exports = {
    singleUpload,
    multipleUpload
};
 