const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
    title: String,
    images:[String],
}
);
const Category = mongoose.model('Category', categorySchema);
module.exports = Category;