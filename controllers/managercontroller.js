const bcrypt = require("bcryptjs");
const multer = require('multer');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const Category = require('../models/Category');
const SubCategory = require('../models/Subcategory');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
// const { singleUpload, multipleUpload } = require('../utils/upload');
const Banner = require('../models/Banner');
const Order = require('../models/order');
const moment = require('moment');
const SuperAdmin = require("../models/superAdminModel");
const Admin = require("../models/adminModel");
const Manager = require("../models/managerModel");
const Marketer = require("../models/Marketer");
const Dealer = require("../models/dealerModel");
const Delivery = require('../models/Deliveryaddress');
const Notification = require('../models/notificationModel');
const admin = require('../firebaseConfig');
const { sendRegistrationEmail } = require("../services/emailService");
const nodemailer = require('nodemailer');
const Cart = require('../models/Cart');
const PDFDocument = require('pdfkit');
const sendNotificationHelper = require("../utils/sendNotificationHelper");
const NotificationModel = require('../models/notificationModel');
const Maintenance = require('../models/Maintenance');
const generateInvoicePDFBuffer = require('../utils/invoiceGenerator');
const Marquee = require('../models/Marquee');
const Policy = require('../models/Policy');
const axios = require('axios');
const ShopSettings = require('../models/ShopSettings');
const { htmlToText } = require("html-to-text");
const Setting = require("../models/Setting");
const { singleUpload, multipleUpload } = require('../utils/upload');
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRES = "7d";
exports.addCategory = async (req, res) => {
    singleUpload(req, res, async (err) => {
        if (err) return res.status(400).send({ error: 'Error uploading files', details: err.message });
        const { title } = req.body;
        const uploadedImage = req.file ? req.file.path : null;
        if (!title) return res.status(400).send({ error: 'Title is required for the category' });
        if (!uploadedImage) return res.status(400).send({ error: 'Image is required for the category' });
        try {
            const category = new Category({ title, images: [uploadedImage] });
            await category.save();
            res.status(201).send({ message: 'Category added successfully', category });
        } catch (error) {
            res.status(500).send({ error: 'Error adding category', details: error.message });
        }
    });
};
exports.updateCategory = async (req, res) => {
    singleUpload(req, res, async (err) => {
        if (err) return res.status(400).send({ error: 'Error uploading files', details: err.message });
        const { id } = req.params;
        const { title } = req.body;
        const uploadedImages = req.files ? req.files.map(file => file.path) : [];
        try {
            const category = await Category.findById(id);
            if (!category) return res.status(404).send({ error: 'Category not found' });
            if (title) category.title = title;
            if (uploadedImages.length > 0) {
                category.images = uploadedImages;
            }
            await category.save();
            res.status(200).send({ message: 'Category updated successfully', category });
        } catch (error) {
            res.status(500).send({ error: 'Error updating category', details: error.message });
        }
    });
};
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);
        if (!category) return res.status(404).send({ error: 'Category not found' });
        res.status(200).send({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting category', details: error.message });
    }
};
exports.addSubCategory = async (req, res) => {
    singleUpload(req, res, async (err) => {
        if (err) {
            return res.status(400).send({ error: 'Error uploading files', details: err.message });
        }
        const { title, categoryId } = req.body;
        const uploadedImage = req.file ? req.file.path : null;
        if (!title || !categoryId) {
            return res.status(400).send({ error: 'Title and categoryId are required for the subcategory' });
        }
        try {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).send({ error: 'Category not found' });
            }
            // Always store images as an array
            const subCategory = new SubCategory({
                title,
                categoryId: category._id,
                images: uploadedImage ? [uploadedImage] : []
            });
            await subCategory.save();
            res.status(201).send({ message: 'Subcategory added successfully', subCategory });
        } catch (error) {
            res.status(500).send({ error: 'Error adding subcategory', details: error.message });
        }
    });
};
exports.updateSubCategory = async (req, res) => {
    singleUpload(req, res, async (err) => {
        if (err)
            return res.status(400).send({ error: 'Error uploading files', details: err.message });
        const { id } = req.params;
        const { title } = req.body;
        const uploadedImage = req.file ? req.file.path : null;
        try {
            const subCategory = await SubCategory.findById(id);
            if (!subCategory)
                return res.status(404).send({ error: 'Subcategory not found' });
            if (title) subCategory.title = title;
            if (uploadedImage) {
                subCategory.images = [uploadedImage];
            }
            await subCategory.save();
            res.status(200).send({ message: 'Subcategory updated successfully', subCategory });
        } catch (error) {
            res.status(500).send({ error: 'Error updating subcategory', details: error.message });
        }
    });
};
exports.deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const subCategory = await SubCategory.findByIdAndDelete(id);
        if (!subCategory) return res.status(404).send({ error: 'Subcategory not found' });
        res.status(200).send({ message: 'Subcategory deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting subcategory', details: error.message });
    }
};
exports.addProduct = async (req, res) => {
    multipleUpload(req, res, async (err) => {
        if (err) return res.status(400).send({ error: 'Error uploading files', details: err.message });

        const {
            title,
            description,
            price,
            offerPrice,
            categoryId,
            subCategoryId,
            stock,
            typeOfProduct,
            measurement,
            size,
            weight
        } = req.body;

        const uploadedImages = req.files ? req.files.map(file => file.path) : [];
        if (uploadedImages.length === 0) {
            return res.status(400).send({ error: 'At least one image is required' });
        }


        try {
            // const gstPercentage = ((gstPercentage * gstPercentage) / 100).toFixed(2);
            const product = new Product({
                title,
                description,
                price,
                offerPrice: offerPrice ? parseFloat(offerPrice) : null,
                images: uploadedImages,
                categoryId,
                subCategoryId,
                stock,
                typeOfProduct,
                measurement,
                size,
                weight,
                hasOffer: !!offerPrice
            });

            await product.save();
            res.status(201).send({ message: '✅ Product added successfully', product });
        } catch (error) {
            res.status(500).send({ error: 'Error adding product', details: error.message });
        }
    });
};
exports.getadminAllProducts = async (req, res) => {
    try {
        const products = await Product.find().select('title images description price offerPrice stock unit categoryId subCategoryId gstPercentage');
        res.status(200).send({ 
            success: true, 
            products, 
            message: 'Products retrieved successfully' 
        });
    } catch (error) {
        res.status(500).send({ 
            success: false, 
            error: 'Error retrieving products', 
            details: error.message 
        });
    }
};
const sendProductAddedEmail = async (product) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '🛍️ New Product Added to Your Store!',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                <div style="max-width: 600px; background: #ffffff; padding: 20px; margin: auto; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); text-align: center;">
                    <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" 
                        alt="New Product" style="max-width: 100%; height: auto; margin-bottom: 20px;" />
                    <h2 style="color: #333;">🎉 A New Product Has Been Added!</h2>
                    <p style="color: #666; font-size: 16px;">Check out the latest product added to your store.</p>
                    <div style="text-align: left; padding: 15px; background: #f1f1f1; border-radius: 10px; margin-top: 20px;">
                        <p><strong>🛒 Product Name:</strong> ${product.title}</p>
                        <p><strong>💲 Price:</strong> $${product.price}</p>
                        <p><strong>🔖 Offer Price:</strong> ${product.offerPrice ? `$${product.offerPrice}` : 'N/A'}</p>
                        <p><strong>📦 Stock Available:</strong> ${product.stock} units</p>
                        <p><strong>📏 Unit:</strong> ${product.unit}</p>
                    </div>
                    <p style="margin-top: 20px; font-size: 14px; color: #888;">This is an automated email. Please do not reply.</p>
                </div>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};
exports.updateProduct = async (req, res) => {
    multipleUpload(req, res, async (err) => {
        if (err) return res.status(400).send({ error: 'Error uploading files', details: err.message });

        const { id } = req.params;
        const {
            title,
            description,
            price,
            offerPrice,
            categoryId,
            subCategoryId,
            stock,
            typeOfProduct,
            measurement,
            size,
            weight
        } = req.body;

        const uploadedImages = req.files ? req.files.map(file => file.path) : [];
        const offerPriceParsed = offerPrice ? parseFloat(offerPrice) : null;

        try {
            const product = await Product.findById(id);
            if (!product) return res.status(404).send({ error: 'Product not found' });

            const wasOutOfStock = product.stock === 0;

            // Update fields if provided
            if (title) product.title = title;
            if (description) product.description = description;
            if (price) product.price = price;
            if (offerPriceParsed !== null) product.offerPrice = offerPriceParsed;
            if (categoryId) product.categoryId = categoryId;
            if (subCategoryId) product.subCategoryId = subCategoryId;
            if (stock) product.stock = stock;
            if (typeOfProduct) product.typeOfProduct = typeOfProduct;
            if (measurement) product.measurement = measurement;
            if (size) product.size = size;
            if (weight) product.weight = weight;

            if (uploadedImages.length > 0) {
                product.images = uploadedImages;
            }

            // Update hasOffer flag
            product.hasOffer = !!offerPriceParsed;

            await product.save();

            // Optional notifications
            await sendProductUpdatedEmail(product);
            if (wasOutOfStock && product.stock > 0) {
                await notifyUsersAboutRestock(product);
            }
            await notifyAllUsersAboutUpdate(product);

            res.status(200).send({ message: 'Product updated successfully', product });
        } catch (error) {
            res.status(500).send({ error: 'Error updating product', details: error.message });
        }
    });
};
const sendProductUpdatedEmail = async (product) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '🛒 Product Updated Notification',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                <h2 style="color: #333;">🔄 Product Updated!</h2>
                <p><strong>🛒 Product Name:</strong> ${product.title}</p>
                <p><strong>💲 Price:</strong> $${product.price}</p>
                <p><strong>🔖 Offer Price:</strong> ${product.offerPrice ? `$${product.offerPrice}` : 'N/A'}</p>
                <p><strong>📦 Stock Available:</strong> ${product.stock} units</p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Update Email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending update email:', error);
    }
};
const notifyUsersAboutRestock = async (product) => {
    try {
        const carts = await Cart.find({ 'items.product': product._id }).populate('user');
        const users = carts.map(cart => cart.user);
        users.forEach(user => {
            if (user && user.email) {
                sendRestockEmail(user, product);
            }
            if (user.fcmToken) {
                sendPushNotification(user.fcmToken, `🎉 ${product.title} is back in stock!`, `Hurry up! ${product.stock} units are available.`);
            }
        });

    } catch (error) {
        console.error('❌ Error notifying users about restock:', error);
    }
};
const sendRestockEmail = async (user, product) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '🎉 Product Restocked!',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                <h2 style="color: #333;">🎉 Product Restocked!</h2>
                <p><strong>🛒 Product Name:</strong> ${product.title}</p>
                <p><strong>📦 Stock Available:</strong> ${product.stock} units</p>
                <p><a href="${process.env.FRONTEND_URL}/cart" style="color: #007bff;">Go to your cart</a> and complete your purchase.</p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Restock email sent to ${user.email}`);
    } catch (error) {
        console.error('❌ Error sending restock email:', error);
    }
};
const notifyAllUsersAboutUpdate = async (product) => {
    try {
        const users = await User.find({ fcmToken: { $exists: true, $ne: null } });

        users.forEach(user => {
            sendPushNotification(user.fcmToken, `🔄 ${product.title} has been updated!`, `Check out the latest changes in our store.`);
        });

    } catch (error) {
        console.error('❌ Error notifying users about product update:', error);
    }
};
const sendPushNotification = async (token, title, body) => {
    const message = {
        notification: { title, body },
        token,
        data: { icon: "ic_notification", page: "/cart" }
    };
    try {
        await admin.messaging().send(message);
        console.log(`📲 Notification sent successfully to ${token}`);
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
    }
};
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) return res.status(404).send({ error: 'Product not found' });
        await sendProductDeletedEmail(product);
        res.status(200).send({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting product', details: error.message });
    }
};
const sendProductDeletedEmail = async (product) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '🚨 Product Deleted Notification',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                <div style="max-width: 600px; background: #ffffff; padding: 20px; margin: auto; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); text-align: center;">
                    <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" 
                        alt="Product Deleted" style="max-width: 100%; height: auto; margin-bottom: 20px;" />
                    <h2 style="color: #d9534f;">⚠️ Product Deleted!</h2>
                    <p style="color: #666; font-size: 16px;">A product has been removed from your store.</p>
                    <div style="text-align: left; padding: 15px; background: #f1f1f1; border-radius: 10px; margin-top: 20px;">
                        <p><strong>🛒 Product Name:</strong> ${product.title}</p>
                        <p><strong>💲 Price:</strong> $${product.price}</p>
                        <p><strong>📦 Stock:</strong> ${product.stock} units</p>
                        <p><strong>📏 Unit:</strong> ${product.unit}</p>
                    </div>
                    <p style="margin-top: 20px; font-size: 14px; color: #888;">This is an automated email. Please do not reply.</p>
                </div>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Deletion Email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending deletion email:', error);
    }
};
exports.addBanner = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).send({ error: 'Error uploading file', details: err.message });
        }
        const uploadedImage = req.file ? req.file.path : null;
        const { page } = req.body;
        if (!uploadedImage) {
            return res.status(400).send({ error: 'An image is required' });
        }
        if (!page) {
            return res.status(400).send({ error: 'Page URL is required' });
        }
        try {
            const banner = new Banner({ image: uploadedImage, page });
            await banner.save();
            res.status(201).send({
                message: 'Banner added successfully',
                banner: {
                    _id: banner._id,
                    image: banner.image,
                    page: banner.page,
                    createdAt: banner.createdAt,
                    updatedAt: banner.updatedAt,
                },
            });
        } catch (error) {
            res.status(500).send({ error: 'Error adding banner', details: error.message });
        }
    });
};
exports.updateBannerImage= async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).send({ error: 'Error uploading file', details: err.message });
        }

        const { id } = req.params;
        const { page } = req.body;
        const updatedImage = req.file ? req.file.path : null;

        if (!id) {
            return res.status(400).send({ error: 'Banner ID is required' });
        }

        try {
            const banner = await Banner.findById(id);
            if (!banner) {
                return res.status(404).send({ error: 'Banner not found' });
            }

            if (updatedImage) banner.image = updatedImage;
            if (page) banner.page = page;

            await banner.save();

            res.status(200).send({
                message: 'Banner updated successfully',
                banner: {
                    _id: banner._id,
                    image: banner.image,
                    page: banner.page,
                    createdAt: banner.createdAt,
                    updatedAt: banner.updatedAt,
                },
            });
        } catch (error) {
            res.status(500).send({ error: 'Error updating banner', details: error.message });
        }
    });
};
exports.deleteBannerImage = async (req, res) => {
    const { id } = req.params;
    try {
        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) {
            return res.status(404).send({ message: 'Banner not found' });
        }
        res.status(200).send({ message: 'Banner deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting banner', details: error.message });
    }
};
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'username phoneNo email address');
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.searchUsers = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search) {
            query.username = { $regex: search, $options: 'i' };
        }
        const users = await User.find(query, 'username phoneNo email address');

        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getUserById = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId, 'username phoneNo email address');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.editUserDetails = async (req, res) => {
    const { userId } = req.params;
    const { username, email, address,phoneNo  } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (username) user.username = username;
        if (email) user.email = email;
        if (address) user.address = address;
        if (phoneNo ) user.phoneNo  = phoneNo ;
        await user.save();
        res.status(200).json({ message: 'User details updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.exportUserDetails = async (req, res) => {
    try {
        const users = await User.find({}, 'username email address phoneNo');
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No users found' });
        }
        const filePath = path.join('/tmp', 'user_details.csv');
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'username', title: 'Username' },
                { id: 'email', title: 'Email' },
                { id: 'address', title: 'Address' },
                { id: 'phoneNo', title: 'Phone Number' },
            ],
        });
        await csvWriter.writeRecords(users);
        res.download(filePath, 'user_details.csv', (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'File download failed' });
            }
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.setGST = async (req, res) => {
    const { productId, gstPercentage } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        product.gstPercentage = gstPercentage;
        await product.save();
        res.status(200).json({ message: 'GST percentage updated', product });
    } catch (error) {
        res.status(500).json({ error: 'Error updating GST percentage', details: error.message });
    }
};
exports.getProductGST = async (req, res) => {
        const { productId } = req.params;
        try {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.status(200).json({ message: 'Product found', product });
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({ error: 'Error fetching product details', details: error.message });
        }
};
exports.removeGST = async (req, res) => {
    const { productId } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (product.gstPercentage !== undefined) {
            product.gstPercentage = undefined;
            await product.save();
            res.status(200).json({ message: 'GST percentage removed successfully', product });
        } else {
            res.status(400).json({ message: 'GST percentage is not set for this product' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error removing GST percentage', details: error.message });
    }
};
exports.addProductToOffer = async (req, res) => {
  try {
    const {
      productId,
      offerTitle,
      offerDescription,
      actualPrice,
      offerPrice,
      startDate,
      endDate,
      unit,

    } = req.body;
    if (!productId || !offerTitle || !actualPrice || !offerPrice || !startDate || !endDate || !unit) {
      return res.status(400).json({
        error: 'All fields are required: productId, offerTitle, actualPrice, offerPrice, startDate, endDate, unit'
      });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const newOffer = new Offer({
      title: offerTitle,
      description: offerDescription,
      actualPrice,
      offerPrice,
      images: product.images,
      startDate,
      endDate,
      unit,
      product: productId,
      gstPercentage: product.gstPercentage || 0,
    });
    await newOffer.save();
    product.hasOffer = true;
    await product.save();
    res.status(201).json({
      message: 'Offer created successfully',
      offer: newOffer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating offer', details: error.message });
  }
};
exports.updateOffer = async (req, res) => {
  try {
    const {
      offerId,
      offerTitle,
      offerDescription,
      actualPrice,
      offerPrice,
      startDate,
      endDate,
      unit
    } = req.body;
    if (!offerId || !offerTitle || !actualPrice || !offerPrice || !startDate || !endDate || !unit) {
      return res.status(400).json({
        error: 'All fields are required: offerId, offerTitle, actualPrice, offerPrice, startDate, endDate, unit'
      });
    }
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    const product = await Product.findById(offer.product);
    if (!product) {
      return res.status(404).json({ error: 'Product associated with offer not found' });
    }
    offer.title = offerTitle;
    offer.description = offerDescription;
    offer.actualPrice = actualPrice;
    offer.offerPrice = offerPrice;
    offer.startDate = startDate;
    offer.endDate = endDate;
    offer.unit = unit;
    await offer.save();
    res.status(200).json({
      message: 'Offer updated successfully',
      offer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating offer', details: error.message });
  }
};
exports.deleteOffer = async (req, res) => {
    const { offerId } = req.params;
    try {
        const offer = await Offer.findByIdAndDelete(offerId);
        if (!offer) return res.status(404).send({ error: 'Offer not found' });
        if (offer.image) {
            fs.unlink(offer.image, (err) => {
                if (err) console.error('Error deleting image file:', err.message);
            });
        }
        res.status(200).send({ message: 'Offer deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting offer', details: error.message });
    }
};
exports.getUserCount = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        res.status(200).json({ userCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getProductCount = async (req, res) => {
    try {
        const productCount = await Product.countDocuments();
        res.status(200).send({ productCount });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching product count', details: error.message });
    }
};
exports.getCategoryCount = async (req, res) => {
    try {
        const categoryCount = await Category.countDocuments();
        res.status(200).send({ categoryCount });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching category count', details: error.message });
    }
};
exports.getPendingOrders = async (req, res) => {
    try {
        const pendingOrders = await Order.find({ status: 'Pending' })
            .populate('user', 'name email username')
            .populate('items.product', 'name price')
            .exec();
        if (pendingOrders.length === 0) {
            return res.status(404).json({ message: 'No pending orders found' });
        }
        res.status(200).json({
            message: 'Pending orders retrieved successfully',
            pendingOrders,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error retrieving pending orders',
            details: error.message,
        });
    }
};
exports.getAllUsersStatus = async (req, res) => {
    try {
        const users = await User.find({}, 'username email status');
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.viewAllOrder = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'username email name address')
            .populate({
                path: 'items.product',
                select: 'title offerPrice price images',
            })
            .populate('paymentMethod')
            .lean();
        console.log("Fetched Orders:", JSON.stringify(orders, null, 2));
 
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }
        const detailedOrders = orders.map(order => {
            const items = order.items.map(item => {
                const deliveryId = item.deliveryId;
                const address = item.address || 'No delivery address provided';
                const phoneNo = item.phoneNo || 'No phone number provided';
                const username = item.username || 'No username provided';
                return {
                    productTitle: item.product?.title || 'Unknown',
                    productImage: item.product?.images?.[0] || '',
                    offerPrice: item.offerPrice || 0,
                    originalPrice: item.product?.price || 0,
                    quantity: item.quantity,
                    totalPrice: (item.offerPrice || 0) * item.quantity,
                    deliveryId: item.deliveryId,
                    address: `${item.houseNo}, ${item.streetName}, ${item.city}, ${item.state} - ${item.pinCode}`,
                    phoneNo: item.phoneNo,
                    username: item.username,
                };
            });
            const user = order.user || { username: 'Unknown', email: 'Unknown', name: 'Unknown', address: 'Unknown' };
            return {
                orderId: order._id,
                user: {
                    username: user.username,
                    email: user.email,
                    name: user.name,
                    address: user.address,
                },
                items,
                orderDate: order.createdAt,
                overallTotal: order.quote?.totalAmount || items.reduce((sum, item) => sum + item.totalPrice, 0),
                paymentMethod: order.paymentMethod,
                status: order.status,
            };
        });
        res.status(200).json({ orders: detailedOrders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: 'Error fetching order history', details: error.message });
    }
};
const sendEmailNotification = async (userEmail, order, status, deliveryItem = null, shopSettings = null) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
    let attachments = [];
    if (status === "Delivered" && deliveryItem && shopSettings) {
      const pdfBuffer = await generateInvoicePDFBuffer(order, deliveryItem, shopSettings);
      attachments.push({
        filename: `invoice_${order._id}.pdf`,
        content: pdfBuffer,
      });
    }
    const mailOptions = {
      from: `"My Grocery" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Your Order ${order._id} Status: ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" alt="Delivery Service" style="width: 100%; height: auto; border-bottom: 5px solid #4CAF50;" />
            <div style="padding: 20px;">
              <h2 style="font-size: 24px; color: #333; margin-bottom: 10px;">Hello!</h2>
              <p style="font-size: 16px; color: #555;">Your order with ID <strong>${order._id}</strong> has been updated to <strong style="color: #4CAF50;">${status}</strong>.</p>
              ${status === "Shipped" ? "<p style='font-size: 16px; color: #555;'>We’ll notify you once your order is delivered.</p>" : ""}
              ${status === "Delivered" ? "<p style='font-size: 16px; color: #555;'>Thank you for shopping with us! Your invoice is attached.</p>" : ""}
              <p style="font-size: 14px; color: #777; margin-top: 40px; text-align: center;">Thank you for your order!</p>
            </div>
          </div>
        </div>
      `,
      attachments,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
};
exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const validStatuses = ["Placed", "Shipped", "Delivered", "Cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid status. Only "Placed", "Shipped", "Delivered" or "Cancelled" are allowed.',
    });
  }
  try {
    const order = await Order.findById(orderId).populate("user").populate("items.product");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status === status) {
      console.log(`ℹ️ Order already in status: ${status}, skipping duplicate update.`);
    } else if (status === "Cancelled" && order.status !== "Placed") {
      return res.status(400).json({
        message: 'Cannot cancel an order unless it is in the "Placed" status.',
      });
    } else if (order.status === "Shipped" && status !== "Delivered" && status !== "Cancelled") {
      return res.status(400).json({
        message: 'Cannot update status from "Shipped" unless it is "Delivered" or "Cancelled".',
      });
    } else if (order.status === "Delivered" && status !== "Cancelled") {
      return res.status(400).json({
        message: 'Cannot update status after delivery, only cancellation is allowed.',
      });
    }
    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date() });
    await order.save();
    let deliveryItem = null;
    if (status === "Delivered" && order.user && order.user._id) {
      const delivery = await Delivery.findOne({ userId: order.user._id });
      if (delivery && delivery.items.length > 0) {
        for (const item of order.items) {
          deliveryItem = delivery.items.find(d => d._id.toString() === item.deliveryId?.toString());
          if (deliveryItem) break;
        }
      }
    }
if (order.user && order.user.email) {
  try {
    let shopSettings = null;
    if (status === "Delivered") {
      shopSettings = await ShopSettings.findOne();
    }
    const recipients = [order.user.email];
    if (status === "Delivered" && deliveryItem && deliveryItem.email) {
      recipients.push(deliveryItem.email);
    }
    await sendEmailNotification(recipients, order, status, deliveryItem, shopSettings);

  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
}
    for (const item of order.items) {
      const notificationPayload = {
        orderId: order._id,
        title: `Order ${status}`,
        body: `Your order with ID ${order._id} has been ${status.toLowerCase()}.`,
        icon: "ic_notification",
        page: "/order-details",
        ...(item.deliveryId && { deliveryId: item.deliveryId }),
      };
      const notificationResponse = await sendNotificationHelper(notificationPayload);
      if (!notificationResponse.success) {
        console.error("❌ Failed to send notification for deliveryId:", item.deliveryId);
      }
    }
    res.status(200).json({
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ error: "Error updating order status", details: error.message });
  }
};
exports.OrderDetailPage = async (req, res) => {
    const { orderId } = req.params;
    try {
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ order });
    } catch (err) {
        console.error("Error fetching order details:", err);
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};
exports.getOrderCount = async (req, res) => {
    try {
        const orderCount = await Order.countDocuments();
        res.status(200).json({ orderCount });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching order count', details: error.message });
    }
};
exports.sendNotification = async (req, res) => {
    const { title, body, icon, page, productId } = req.body;
    if (!title || !body || (!page && !productId)) {
        return res.status(400).json({ success: false, error: 'Missing title, body, and either page or productId' });
    }
    try {
        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
        }
        const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } });
        if (!users.length) {
            return res.status(404).json({ success: false, message: 'No users with valid FCM tokens found' });
        }
        const tokens = [...new Set(users.flatMap(user => user.fcmTokens))];
        if (tokens.length === 0) {
            return res.status(404).json({ success: false, message: 'No valid FCM tokens found' });
        }
        const sentTokens = new Set();
        const sendNotifications = tokens.map(async (token) => {
            if (sentTokens.has(token)) return null; 
            sentTokens.add(token);
            const user = users.find(user => user.fcmTokens.includes(token));
            const message = {
                notification: { title, body },
                data: { page: page || '', productId: productId || '' },
                android: { notification: { icon: icon || 'ic_notification' } },
                token,
            };
            try {
                const response = await admin.messaging().send(message);
                const newNotification = new Notification({
                    title,
                    body,
                    icon: icon || 'ic_notification',
                    page: page || '',
                    productId: productId || '',
                    userId: user._id,
                    date: new Date(),
                });
                await newNotification.save();
                return { userId: user._id, token, success: true, response };
            } catch (error) {
                return { userId: user?._id, token, success: false, error: error.message };
            }
        });
        const responses = (await Promise.all(sendNotifications)).filter(Boolean);
        return res.status(200).json({
            success: true,
            message: "Notifications sent successfully",
            results: responses.length > 0 ? responses : [],
        });
    } catch (error) {
        console.error("Notification Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
exports.getAllProductStock = async (req, res) => {
    try {
        const products = await Product.find({}, 'title images stock');
        res.status(200).send({ message: 'Product stock details fetched successfully', products });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching product stock details', details: error.message });
    }
};
exports.ProductStock = async (req, res) => {
    try {
        const { search } = req.query;
        const query = {};
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        const products = await Product.find(query, 'title images stock');
        res.status(200).send({ message: 'Product stock details fetched successfully', products });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching product stock details', details: error.message });
    }
};
exports.adminDownloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await Order.findById(orderId)
      .populate('items.product', 'title offerPrice price gstRate')
      .populate('paymentMethod');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const delivery = await Delivery.findOne(
      { userId: order.user, 'items._id': { $in: order.items.map(i => i.deliveryId) } },
      { items: 1 }
    );
    if (!delivery || !delivery.items?.length) {
      return res.status(404).json({ message: 'Delivery details not found' });
    }
    let deliveryItem = null;
    for (const it of order.items) {
      deliveryItem = delivery.items.find(d => String(d._id) === String(it.deliveryId));
      if (deliveryItem) break;
    }
    if (!deliveryItem) return res.status(404).json({ message: 'No matching delivery item found' });
    const shop = await ShopSettings.findOne().select('name email address phoneNumber profileImage');
    if (!shop) {
      return res.status(404).json({ message: 'Shop settings not found' });
    }
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
    doc.pipe(res);
    const INR = v => `₹${Number(v || 0).toFixed(2)}`;
    const safe = v => (v ?? '').toString();
    const paymentMethodLabel = (() => {
      if (!order.paymentMethod) return 'N/A';
      if (typeof order.paymentMethod === 'string') return order.paymentMethod;
      return order.paymentMethod.name || order.paymentMethod.type || 'N/A';
    })();
    const headerY = 40;
    const logoX = 50;
    try {
  const logoUrl = shop.profileImage || 'N/A';
  const resp = await axios.get(logoUrl, { responseType: 'arraybuffer' });
  const buf = Buffer.from(resp.data, 'base64');
  doc.image(buf, logoX, headerY, { width: 60 });
} catch {}
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111')
      .text(safe(shop.inviteSubject), 120, headerY + 10);
    const metaX = 360;
    doc.font('Helvetica').fontSize(10).fillColor('#444');
    doc.text(`Invoice : INV-${orderId}`, metaX, headerY+5);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, metaX, headerY + 30);
    doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`, metaX, headerY + 45);
    doc.text(`Payment: ${safe(paymentMethodLabel).toUpperCase()}`, metaX, headerY + 60);
    doc.moveTo(50, 120).lineTo(545, 120).stroke();
    const addrTop = 132;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
    doc.text('From:', 50, addrTop);
    doc.text('Bill To:', 300, addrTop);
    doc.font('Helvetica').fontSize(9).fillColor('#444');
    doc.text(safe(shop.name), 50, addrTop + 16);
    doc.text(safe(shop.address), 50, addrTop + 30, { width: 220 });
    doc.text(`Phone: ${safe(shop.phoneNumber)}`, 50, addrTop + 50);
    doc.text(`Email: ${safe(shop.email)}`, 50, addrTop + 64);
    doc.text(safe(deliveryItem.username), 300, addrTop + 16);
    doc.text(`${safe(deliveryItem.houseNo)}, ${safe(deliveryItem.streetName)}`, 300, addrTop + 30, { width: 230 });
    doc.text(`${safe(deliveryItem.city)}, ${safe(deliveryItem.state)} - ${safe(deliveryItem.pinCode)}`, 300, addrTop + 44);
    doc.text(`Phone: ${safe(deliveryItem.phoneNo)}`, 300, addrTop + 58);
    const defaultGstPercent = 5;
    const tableTop = 220;
    const col = { index: 55, title: 75, qty: 300, unit: 350, gstPct: 415, gstAmt: 465, total: 515 };
    const rowH = 22;
    doc.rect(50, tableTop, 495, rowH).fill('#E5E7EB').stroke();
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(9);
    doc.text('', col.index, tableTop + 6, { width: 15 });
    doc.text('Description', col.title, tableTop + 6, { width: 210 });
    doc.text('Qty', col.qty, tableTop + 6, { width: 20, align: 'center' });
    doc.text('Unit', col.unit, tableTop + 6, { width: 35, align: 'right' });
    doc.text('GST%', col.gstPct, tableTop + 6, { width: 35, align: 'right' });
    doc.text('GST Amt', col.gstAmt, tableTop + 6, { width: 45, align: 'right' });
    doc.text('Total', col.total, tableTop + 6, { width: 30, align: 'right' });
    doc.moveTo(50, tableTop + rowH).lineTo(545, tableTop + rowH).stroke();
    let y = tableTop + rowH;
    let subtotal = 0;
    let gstTotal = 0;
    const ensureSpace = (needed = rowH) => {
      if (y + needed > doc.page.height - 100) {
        doc.moveTo(50, y + 4).lineTo(545, y + 4).stroke();
        doc.addPage();
        const top = 50;
        doc.rect(50, top, 495, rowH).fill('#E5E7EB').stroke();
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(9);
        doc.text('', col.index, top + 6, { width: 15 });
        doc.text('Description', col.title, top + 6, { width: 210 });
        doc.text('Qty', col.qty, top + 6, { width: 25, align: 'center' });
        doc.text('Unit', col.unit, top + 6, { width: 35, align: 'right' });
        doc.text('GST%', col.gstPct, top + 6, { width: 10, align: 'right' });
        doc.text('GST Amt', col.gstAmt, top + 6, { width: 30, align: 'right' });
        doc.text('Total', col.total, top + 6, { width: 25, align: 'right' });
        doc.moveTo(50, top + rowH).lineTo(545, top + rowH).stroke();
        y = top + rowH;
      }
    };
    order.items.forEach((it, idx) => {
      const p = it.product || {};
      const unit = Number(p.offerPrice ?? p.price ?? 0);
      const qty = Number(it.quantity || 0);
      const gstPct = Number(p.gstRate ?? it.gstRate ?? defaultGstPercent);
      const taxable = unit * qty;
      const gstAmt = (taxable * gstPct) / 100;
      const lineTotal = taxable + gstAmt;
      subtotal += taxable;
      gstTotal += gstAmt;
      ensureSpace();
      if (idx % 2 === 0) {
        doc.rect(50, y, 495, rowH).fill('#FAFAFA').stroke();
      }
      doc.fillColor('#000').font('Helvetica').fontSize(9);
      doc.text(String(idx + 1), col.index, y + 6, { width: 15 });
      doc.text(safe(p.title), col.title, y + 6, { width: 210 });
      doc.text(String(qty), col.qty, y + 6, { width: 25, align: 'center' });
      doc.text((unit), col.unit, y + 6, { width: 29, align: 'right' });
      doc.text(`${gstPct}%`, col.gstPct, y + 6, { width: 28, align: 'right' });
      doc.text((gstAmt), col.gstAmt, y + 6, { width: 27, align: 'right' });
      doc.text((lineTotal), col.total, y + 6, { width: 25, align: 'right' });
      y += rowH;
    });
    ensureSpace(rowH * 3);
    doc.moveTo(50, y).lineTo(545, y).stroke();
    const grandTotal = subtotal + gstTotal;
    y += rowH;
    doc.rect(50, y - 4, 495, rowH).fill('#EEF2FF').stroke();
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10);
    doc.text('Grand Total', col.title, y + 6, { width: 200 });
    doc.text((grandTotal), col.total, y + 6, { width: 38, align: 'right' });
    y += rowH + 16;
    doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
    doc.text(`Thank you for shopping with ${safe(shop.name)}!`, 50, y, { width: 495, align: 'center' });
    y += 12;
    doc.text(`Support: ${safe(shop.phoneNumber)} • ${safe(shop.email)}`, 50, y, { width: 495, align: 'center' });
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Error generating invoice', details: error.message });
  }
};
exports.getShopSettings = async (req, res) => {
  try {
    const settings = await ShopSettings.findOne()
      .select('inviteSubject email address phoneNumber');
    if (!settings) {
      return res.status(404).json({ message: 'No settings found' });
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Get shop settings error:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.AdminNotifications = async (req, res) => {
    try {
      const notifications = await NotificationModel.find();   
      res.status(200).json({ data: notifications });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
};
exports.getStatus = async (req, res) => {
  try {
    const config = await Maintenance.findOne();
    res.json({
      maintenance: config?.isActive || false,
      message: config?.message || 'App is running normally.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.toggleMaintenance = async (req, res) => {
  try {
    const { isActive, message } = req.body;
    let config = await Maintenance.findOne();

    if (!config) config = new Maintenance();
    config.isActive = isActive;
    config.message = message || config.message;

    await config.save();

    res.json({
      success: true,
      message: `Maintenance mode is now ${isActive ? 'enabled' : 'disabled'}`,
      config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.createOrUpdateMarquee = async (req, res) => {
  try {
    const { content, isActive } = req.body;
    let marquee = await Marquee.findOne();
    if (marquee) {
      marquee.content = content;
      marquee.isActive = isActive;
      await marquee.save();
    } else {
      marquee = await Marquee.create({ content, isActive });
    }
    res.json({ success: true, marquee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.updateMarquee = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isActive } = req.body;
    if (isActive) {
      await Marquee.updateMany({}, { isActive: false });
    }
    const updated = await Marquee.findByIdAndUpdate(
      id,
      { content, isActive },
      { new: true }
    );
    res.json({ success: true, marquee: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.upsertPolicy = async (req, res) => {
  try {
    const { type, content } = req.body;
    const allowedTypes = ["privacy", "terms", "shipping", "refunds"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid policy type" });
    }
    if (!content || content.trim() === "") {
      return res.status(400).json({ success: false, message: "Content is required" });
    }
    const policy = await Policy.findOneAndUpdate(
      { type },
      { content, updatedAt: Date.now() },
      { new: true, upsert: true }
    );
    res.status(200).json({
      success: true,
      message: `${type} policy updated successfully`,
      policy: {
        _id: policy._id,
        type: policy.type,
        content: policy.content,
        updatedAt: policy.updatedAt,
      },
    });
  } catch (error) {
    console.error("Policy update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.createShopSettings = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        const exists = await ShopSettings.findOne();
        if (exists) {
            return res.status(400).json({ message: 'Settings already exist. Use PUT to update.' });
        }
        const {
            websiteUrl,
            profileImage,
            mapLink,
            message,
            name,
            phoneNumber,
            whatsappNumber,
            email,
            address,
            poweredBy
        } = req.body;
        const settings = new ShopSettings({
            websiteUrl,
            profileImage,
            mapLink,
            message,
            name,
            phoneNumber,
            whatsappNumber,
            email,
            address,
            poweredBy: {
                image: poweredBy?.image,
                name: poweredBy?.name,
                link: poweredBy?.link
            }
        });
        await settings.save();
        res.status(201).json({
            message: "Shop settings created successfully",
            settings
        });
    } catch (error) {
        console.error("Create shop settings error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateShopSettings = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        const {
            websiteUrl,
            profileImage,
            mapLink,
            message,
            name,
            phoneNumber,
            whatsappNumber,
            email,
            address,
            poweredBy
        } = req.body;
        const updateData = {
            websiteUrl,
            profileImage,
            mapLink,
            message,
            name,
            phoneNumber,
            whatsappNumber,
            email,
            address
        };
        if (poweredBy) {
            updateData.poweredBy = {};
            if (poweredBy.image) updateData.poweredBy.image = poweredBy.image;
            if (poweredBy.name) updateData.poweredBy.name = poweredBy.name;
            if (poweredBy.link) updateData.poweredBy.link = poweredBy.link;
        }
        const settings = await ShopSettings.findOneAndUpdate(
            {},
            updateData,
            { new: true, runValidators: true }
        );
        if (!settings) {
            return res.status(404).json({ message: 'Settings not found. Create first.' });
        }
        res.status(200).json({
            message: 'Shop settings updated successfully',
            settings
        });
    } catch (error) {
        console.error("Update shop settings error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching settings", error: err.message });
  }
};
exports.setMinOrderAmount = async (req, res) => {
  try {
    const { minOrderAmount } = req.body;
 
    if (!minOrderAmount) {
      return res.status(400).json({ message: "minOrderAmount is required" });
    }
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({ minOrderAmount });
    } else {
      settings.minOrderAmount = minOrderAmount;
      settings.updatedAt = new Date();
    }
    await settings.save();
    res.json({ message: "Minimum order amount saved", settings });
  } catch (err) {
    res.status(500).json({ message: "Error saving min order", error: err.message });
  }
};
exports.updateSettings = async (req, res) => {
  try {
    const { minOrderAmount } = req.body;
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({ minOrderAmount });
    } else {
      settings.minOrderAmount = minOrderAmount;
      settings.updatedAt = new Date();
    }
    await settings.save();
    res.json({ message: "Settings updated", settings });
  } catch (err) {
    res.status(500).json({ message: "Error updating settings", error: err.message });
  }
};