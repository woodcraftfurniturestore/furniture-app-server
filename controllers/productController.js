const Category = require('../models/Category');
const SubCategory = require('../models/Subcategory');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const SuperAdmin = require("../models/superAdminModel");
const Admin = require("../models/adminModel");
const Manager = require("../models/managerModel");
const Marketer = require("../models/Marketer");
const Dealer = require("../models/dealerModel");
const Offer = require('../models/Offer');
const Delivery = require('../models/Deliveryaddress');
const contactMessageSchema = require('../models/contactMessageModel');
const { sendRegistrationEmail } = require("../services/emailService");
const Order = require('../models/order');
const PDFDocument = require('pdfkit');
const Notification = require('../models/notificationModel');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Marquee = require('../models/Marquee');
const Policy = require('../models/Policy');
const ShopSettings = require('../models/ShopSettings');
const Setting = require("../models/Setting");
const { singleUpload, multipleUpload } = require('../utils/upload');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.searchCategories = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a category name to search.'
            });
        }
        const categories = await Category.find({
            title: { $regex: name, $options: 'i' }
        });
        res.status(200).json({
            success: true,
            categories,
            message: 'Search results retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching for categories',
            error: error.message
        });
    }
};
exports.getSubCategories = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const subCategories = await SubCategory.find({ categoryId });
        if (!subCategories || subCategories.length === 0) {
            return res.status(404).json({ success: false, message: 'No subcategories found' });
        }
        res.status(200).json({ success: true, subCategories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProducts = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const products = await Product.find({ subCategoryId });
        if (!products || products.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found' });
        }
        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .select('title images description price offerPrice stock gstPercentage hasOffer categoryId subCategoryId measurement size weight');
        
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
exports.searchProductByName = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).send({
                success: false,
                message: 'Please provide a product name to search.'
            });
        }
        const products = await Product.find({
            title: { $regex: name, $options: 'i' }
        }).select('title images description price offerPrice stock gstPercentage measurement size weight');

        res.status(200).send({
            success: true,
            products,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'Error searching for products',
            error: error.message
        });
    }
};
exports.ProductById = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find();
        if (banners.length === 0) {
            return res.status(404).send({ message: 'No banners found' });
        }
        res.status(200).send({
            message: 'Banners fetched successfully',
            banners,
        });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching banners', details: error.message });
    }
};
exports.sendContactMessage = async (req, res) => {
    const { name, email, phoneno, message } = req.body;
    if (!name || !email || !phoneno || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const emailBody = {
        from: email,
        to: process.env.EMAIL_USER,
        subject: `Contact Message from ${name}`,
        text: `You have received a new message from ${name} (${email}, ${phoneno}):\n\n${message}`,
    };
    try {
        await sendEmail(emailBody, 'Message sent to admin');
        res.status(200).json({ success: true, message: 'Your message has been sent!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
    }
};
exports.searchProducts = async (req, res) => {
    try {
      const { title } = req.query;
      if (!title) {
        return res.status(400).send({ error: 'Title query parameter is required' });
      }
      const isNumeric = !isNaN(title);
      if (isNumeric) {
        const value = Number(title);
        const priceRange = {
          $gte: value - 50,
          $lte: value + 50
        };
        const productsByPrice = await Product.find({ price: priceRange }).select('title description price offerPrice images categoryId subCategoryId stock measurement size weight');
        if (productsByPrice.length > 0) {
          return res.status(200).json({ products: productsByPrice });
        }
        return res.status(404).send({ error: 'No products found in the given price range' });
      }
      const regexQuery = { $regex: title, $options: 'i' };
      const query = { title: regexQuery };
      const products = await Product.find(query).select('title description price offerPrice images categoryId subCategoryId stock measurement size weight');
      if (products.length > 0) {
        return res.status(200).json({ products });
      }
      const subcategories = await SubCategory.find({ title: regexQuery });
      if (subcategories.length > 0) {
        const subcategoryResults = await Promise.all(
          subcategories.map(async (subcategory) => {
            const productsInSubcategory = await Product.find({ subCategoryId: subcategory._id });
            return {
              subcategory: subcategory.title,
              products: productsInSubcategory,
            };
          })
        );
        return res.status(200).json({ subcategories: subcategoryResults });
      }
      const categories = await Category.find({ title: regexQuery });
      if (categories.length > 0) {
        const categoryResults = await Promise.all(
          categories.map(async (category) => {
            const productsInCategory = await Product.find({ categoryId: category._id });
            return {
              category: category.title,
              products: productsInCategory,
            };
          })
        );
        return res.status(200).json({ categories: categoryResults });
      }
      return res.status(404).send({ error: 'No results found for the given title or price' });
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).send({ error: 'Error searching products', details: error.message });
    }
};
exports.getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();
        if (!offers || offers.length === 0) {
            return res.status(404).send({ message: 'No offers found' });
        }
        res.status(200).send({ offers });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching offers', details: error.message });
    }
};
exports.getAllSubCategories = async (req, res) => {
    try {
        const subCategories = await SubCategory.find({}, 'title images')
            .populate('categoryId', 'title');
        res.status(200).send({ message: 'Subcategories fetched successfully', subCategories });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching subcategories', details: error.message });
    }
};
exports.searchSubCategories = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).send({ 
                success: false, 
                message: 'Please provide a subcategory name to search.' 
            });
        }
        const subCategories = await SubCategory.find(
            { title: { $regex: name, $options: 'i' } }, 
            'title images'
        ).populate('categoryId', 'title');

        res.status(200).send({ 
            success: true,
            message: 'Search results retrieved successfully',
            subCategories 
        });
    } catch (error) {
        res.status(500).send({ 
            success: false, 
            message: 'Error searching for subcategories', 
            error: error.message 
        });
    }
};
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user.DealerId).select('-password'); 
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            message: 'User details fetched successfully',
            user: {
                username: user.username,
                email: user.email,
                phoneNo: user.phoneNo,
                address: user.address,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createDelivery = async (req, res) => {
    try {
      console.log('Incoming request body:', req.body);
   
      const {
        phoneNo,
        username,
        houseNo,
        streetName,
        city,
        state,
        pinCode
      } = req.body;
   
      const DealerId = req.user.DealerId;
   
      // Validate input
      if (!phoneNo || !username || !houseNo || !streetName || !city || !state || !pinCode) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
   
      const deliveryItem = {
        phoneNo: phoneNo.trim(),
        username: username.trim(),
        houseNo: houseNo.trim(),
        streetName: streetName.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim()
      };
   
      let delivery = await Delivery.findOne({ DealerId });
   
      if (!delivery) {
        delivery = new Delivery({
          DealerId,
          items: [deliveryItem]
        });
      } else {
        // 🧹 Filter out any bad entries that don't match the schema
        delivery.items = delivery.items.filter(item =>
          item.houseNo && item.streetName && item.city && item.state && item.pinCode
        );
   
        if (delivery.items.length >= 5) {
          return res.status(400).json({ message: 'Maximum delivery limit of 5 reached.' });
        }
   
        delivery.items.push(deliveryItem);
      }
   
      console.log('Saving delivery object:', JSON.stringify(delivery, null, 2));
   
      await delivery.save();
   
      res.status(201).json({
        message: 'Delivery created successfully',
        delivery
      });
   
    } catch (error) {
      console.error('Error in createDelivery:', error);
      res.status(500).json({
        message: 'Server error',
        error: error.message
      });
    }
};
exports.updateDelivery = async (req, res) => {
    try {
      const {
        phoneNo,
        username,
        houseNo,
        streetName,
        city,
        state,
        pinCode,
        deliveryId
      } = req.body;
  
      const DealerId = req.user.DealerId;
  
      // Validate input
      if (!phoneNo || !username || !houseNo || !streetName || !city || !state || !pinCode || !deliveryId) {
        return res.status(400).json({ message: 'All fields are required.' });
      }
  
      const delivery = await Delivery.findOne({ DealerId });
  
      if (!delivery) {
        return res.status(404).json({ message: 'Delivery not found for the given user.' });
      }
  
      const addressIndex = delivery.items.findIndex(item => item._id.toString() === deliveryId);
  
      if (addressIndex === -1) {
        return res.status(404).json({ message: 'Address not found in delivery items.' });
      }
  
      delivery.items[addressIndex] = {
        phoneNo: phoneNo.trim(),
        username: username.trim(),
        houseNo: houseNo.trim(),
        streetName: streetName.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim()
      };
  
      await delivery.save();
  
      res.status(200).json({
        message: 'Delivery address updated successfully',
        delivery
      });
  
    } catch (error) {
      console.error("Error updating delivery:", error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
};  
exports.getDelivery = async (req, res) => {
    try {
        const DealerId = req.user.DealerId;
        const deliveries = await Delivery.find({ DealerId });
        if (!deliveries.length) {
            return res.status(404).json({ message: 'No deliveries found.' });
        }
        res.status(200).json(deliveries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
exports.logoutUser = (req, res) => {
    try {
        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const extractDealerId = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: "Token is missing" });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (err) {
            return res.status(403).json({ success: false, error: "Invalid token" });
        }
        if (!decodedToken.DealerId) {
            return res.status(400).json({ success: false, error: "User ID is missing from token" });
        }
        req.DealerId = decodedToken.DealerId; 
        next();
    });
};
exports.getNotifications = [
    extractDealerId, 
    async (req, res) => {
        try {
            const DealerId = req.DealerId; 
            if (!DealerId) {
                return res.status(400).json({ success: false, error: 'User ID is missing from token' });
            }
            console.log(DealerId);
            const notifications = await Notification.find({ DealerId })
                .sort({ date: -1 })
                .limit(10);
            if (notifications.length === 0) {
                return res.status(404).json({ success: false, message: 'No notifications found for this user' });
            }
            return res.status(200).json({
                success: true,
                data: notifications,
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
];
exports.getProductsByProductId = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const relatedProducts = await Product.find({
            subCategoryId: product.subCategoryId,
            _id: { $ne: productId }
        });
        res.status(200).json({
            success: true,
            message: 'Related products retrieved successfully',
            relatedProducts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving products',
            error: error.message,
        });
    }
};
exports.updateUserDetails = async (req, res) => {
    const { username, address, phoneNo } = req.body;
    if (!username || !address || !phoneNo) {
        return res.status(400).json({ error: 'Username, address, and phone number are required' });
    }
    try {
        const user = await User.findById(req.user.DealerId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.username = username; 
        user.address = address;
        user.phoneNo = phoneNo;
        await user.save();
        res.status(200).json({
            message: 'User details updated successfully',
            user: {
                username: user.username,
                address: user.address,
                phoneNo: user.phoneNo,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.searchProductsWithRelated = async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'Title query parameter is required' });
    }
    const trimmedTitle = title.trim().toLowerCase();
    const isShortQuery = trimmedTitle.length < 3;
    if (isShortQuery) {
      const startsWithRegex = new RegExp(`\\b${trimmedTitle}`, 'i');
      let matchingProducts = await Product.find({
        title: { $regex: startsWithRegex }
      })
      .select('title price offerPrice images stock categoryId subCategoryId')
      .limit(10)
      .populate('categoryId subCategoryId', 'title');
      if (matchingProducts.length === 0) {
        const categoryProducts = await Product.aggregate([
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category'
            }
          },
          {
            $lookup: {
              from: 'subcategories',
              localField: 'subCategoryId',
              foreignField: '_id',
              as: 'subcategory'
            }
          },
          {
            $match: {
              $or: [
                { 'category.title': { $regex: startsWithRegex } },
                { 'subcategory.title': { $regex: startsWithRegex } }
              ]
            }
          },
          {
            $limit: 10
          }
        ]);

        matchingProducts = categoryProducts.map(p => ({
          ...p,
          categoryId: p.category[0]?._id,
          subCategoryId: p.subcategory[0]?._id
        }));
      }
      const formattedProducts = matchingProducts.map(p => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        offerPrice: p.offerPrice,
        images: p.images,
        stock: p.stock,
        category: p.categoryId?.title || p.category?.[0]?.title || '',
        subcategory: p.subCategoryId?.title || p.subcategory?.[0]?.title || ''
      }));
      return res.status(200).json({ products: formattedProducts });
    }
    const exactMatchRegex = new RegExp(`\\b${trimmedTitle}\\b`, 'i');
    let matchingProducts = await Product.find({
      title: { $regex: exactMatchRegex }
    })
    .select('title price offerPrice images stock categoryId subCategoryId')
    .limit(10)
    .populate('categoryId subCategoryId', 'title');
    if (matchingProducts.length < 5) {
      const partialMatchRegex = new RegExp(trimmedTitle, 'i');
      const additionalProducts = await Product.find({
        title: { $regex: partialMatchRegex },
        _id: { $nin: matchingProducts.map(p => p._id) }
      })
      .select('title price offerPrice images stock categoryId subCategoryId')
      .limit(10 - matchingProducts.length)
      .populate('categoryId subCategoryId', 'title');

      matchingProducts = [...matchingProducts, ...additionalProducts];
    }
    if (matchingProducts.length < 5) {
      const categoryProducts = await Product.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $lookup: {
            from: 'subcategories',
            localField: 'subCategoryId',
            foreignField: '_id',
            as: 'subcategory'
          }
        },
        {
          $match: {
            $or: [
              { 'category.title': { $regex: new RegExp(`\\b${trimmedTitle}\\b`, 'i') } },
              { 'subcategory.title': { $regex: new RegExp(`\\b${trimmedTitle}\\b`, 'i') } }
            ],
            _id: { $nin: matchingProducts.map(p => p._id) }
          }
        },
        {
          $limit: 10 - matchingProducts.length
        }
      ]);

      matchingProducts = [
        ...matchingProducts,
        ...categoryProducts.map(p => ({
          ...p,
          categoryId: p.category[0]?._id,
          subCategoryId: p.subcategory[0]?._id
        }))
      ];
    }
    const formattedProducts = matchingProducts.map(p => ({
      _id: p._id,
      title: p.title,
      price: p.price,
      offerPrice: p.offerPrice,
      images: p.images,
      stock: p.stock,
      category: p.categoryId?.title || p.category?.[0]?.title || '',
      subcategory: p.subCategoryId?.title || p.subcategory?.[0]?.title || ''
    }));
    return res.status(200).json({ products: formattedProducts });
  } catch (error) {
    console.error('Error in searchProductsWithRelated:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const order = await Order.findById(orderId)
      .populate("items.product", "title offerPrice price gstRate images");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const delivery = await Delivery.findOne({ DealerId: order.user });
    if (!delivery || !delivery.items.length) {
      return res.status(404).json({ message: "Delivery details not found" });
    }
    let matchingDeliveryItem = null;
    for (let item of order.items) {
      matchingDeliveryItem = delivery.items.find(
        (deliveryItem) =>
          deliveryItem._id.toString() === item.deliveryId.toString()
      );
      if (matchingDeliveryItem) break;
    }
    if (!matchingDeliveryItem) {
      return res
        .status(404)
        .json({ message: "No matching delivery item found" });
    }
    const shopSettings = await ShopSettings.findOne().select(
      "name email phoneNumber address profileImage "
    );
    if (!shopSettings) {
      return res.status(404).json({ message: "Shop settings not found" });
    }
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const invoiceDate = new Date().toLocaleDateString();
    const invoiceNumber = `INV-${orderId}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`
    );
    doc.pipe(res);
    doc.rect(0, 0, doc.page.width, 80).fill("#2E86C1");
    if (shopSettings.profileImage) {
      try {
        const logoResponse = await axios.get(shopSettings.profileImage, {
          responseType: "arraybuffer",
        });
        const logoBuffer = Buffer.from(logoResponse.data, "base64");
        doc.save();
        doc.circle(75, 45, 25).clip();
        doc.image(logoBuffer, 50, 20, { width: 50, height: 50 });
        doc.restore();
      } catch (err) {
        console.error("Failed to load profile image:", err.message);
      }
    }
    doc.fillColor("#ffffff")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(shopSettings.name || "N/A", 110, 30, { align: "left" })
      .fontSize(14)
      .font("Helvetica")
      .text("TAX INVOICE", 400, 40, { align: "right" });
    doc.fillColor("#000000")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice Number:", 10, 100)
      .font("Helvetica")
      .text(`${invoiceNumber}`, 180, 100)
      .font("Helvetica-Bold")
      .text("Order Date:", 10, 115)
      .font("Helvetica")
      .text(`${order.createdAt.toLocaleDateString()}`, 180, 115)
      .font("Helvetica-Bold")
      .text("Invoice Date:", 10, 130)
      .font("Helvetica")
      .text(`${invoiceDate}`, 180, 130)
      .font("Helvetica-Bold")
      .text("Payment Method:", 10, 145)
      .font("Helvetica")
      .text(`${order.paymentMethod.toUpperCase()}`, 180, 145);
    doc.moveTo(10, 165).lineTo(550, 165).strokeColor("#cccccc").stroke();
    const fromAddressTop = 180;
    doc.fillColor("#2E86C1")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("From Address:", 10, fromAddressTop)
      .fillColor("#000000")
      .font("Helvetica")
      .fontSize(10)
      .text(shopSettings.name || "N/A", 10, fromAddressTop + 15)
      .text(shopSettings.address || "No Address Provided", 10, fromAddressTop + 30)
      .text(`Phone: ${shopSettings.phoneNumber || "N/A"}`, 10, fromAddressTop + 45)
      .text(`Email: ${shopSettings.email || "N/A"}`, 10, fromAddressTop + 60);
    doc.fillColor("#2E86C1")
      .font("Helvetica-Bold")
      .text("Billing Address:", 410, fromAddressTop)
      .fillColor("#000000")
      .font("Helvetica")
      .text(`${matchingDeliveryItem.username}`, 410, fromAddressTop + 15)
      .text(
        `${matchingDeliveryItem.houseNo}, ${matchingDeliveryItem.streetName}`,
        410,
        fromAddressTop + 30
      )
      .text(
        `${matchingDeliveryItem.city}, ${matchingDeliveryItem.state} - ${matchingDeliveryItem.pinCode}`,
        410,
        fromAddressTop + 45
      )
      .text(`Phone: ${matchingDeliveryItem.phoneNo}`, 410, fromAddressTop + 60);
    doc.fillColor("#2E86C1")
      .font("Helvetica-Bold")
      .text("Shipping Address:", 410, fromAddressTop + 90)
      .fillColor("#000000")
      .font("Helvetica")
      .text(`${matchingDeliveryItem.username}`, 410, fromAddressTop + 105)
      .text(
        `${matchingDeliveryItem.houseNo}, ${matchingDeliveryItem.streetName}`,
        410,
        fromAddressTop + 120
      )
      .text(
        `${matchingDeliveryItem.city}, ${matchingDeliveryItem.state} - ${matchingDeliveryItem.pinCode}`,
        410,
        fromAddressTop + 135
      )
      .text(`Phone: ${matchingDeliveryItem.phoneNo}`, 410, fromAddressTop + 150);
    doc.moveTo(10, fromAddressTop + 180)
      .lineTo(550, fromAddressTop + 180)
      .strokeColor("#cccccc")
      .stroke();
    const tableTop = fromAddressTop + 190;
    doc.fillColor("#2E86C1")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Product", 20, tableTop)
      .text("Qty", 100, tableTop, { align: "center" })
      .text("Unit Price", 200, tableTop, { align: "center" })
      .text("GST %", 300, tableTop, { align: "center" })
      .text("GST Amt", 400, tableTop, { align: "center" })
      .text("Total", 480, tableTop, { align: "right" });
    doc.moveTo(10, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .strokeColor("#cccccc")
      .stroke();
    let y = tableTop + 25;
    let subtotal = 0;
    let gstTotal = 0;
    order.items.forEach((item, index) => {
      const product = item.product;
      const unitPrice = product.offerPrice || product.price || 0;
      const qty = item.quantity;
      const gstPct = product.gstRate || 5;
      const taxable = unitPrice * qty;
      const gstAmt = (taxable * gstPct) / 100;
      const lineTotal = taxable + gstAmt;
      subtotal += taxable;
      gstTotal += gstAmt;
      if (index % 2 === 0) {
        doc.rect(10, y - 2, 530, 20).fill("#f4f6f7").fillColor("#000000");
      }
      doc.fillColor("#000000")
        .font("Helvetica")
        .fontSize(10)
        .text(product.title, 20, y)
        .text(qty.toString(), 100, y, { align: "center" })
        .text(unitPrice.toFixed(2), 200, y, { align: "center" })
        .text(`${gstPct}%`, 300, y, { align: "center" })
        .text(gstAmt.toFixed(2), 400, y, { align: "center" })
        .text(lineTotal.toFixed(2), 480, y, { align: "right" });
      y += 20;
    });
    const grandTotal = subtotal + gstTotal;
doc.moveTo(10, y).lineTo(550, y).strokeColor("#cccccc").stroke();
doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
doc.text(`Subtotal: ${subtotal.toFixed(2)}`, 400, y + 25, { align: "right" });
y += 20;
doc.text(`GST Total: ${gstTotal.toFixed(2)}`, 300, y + -10, { align: "right" });
y += 20;
doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, 400, y + -2, { align: "right" });
y += 20;
      const footerHeight = 80;
const requiredSpace = footerHeight + 20;
const currentPageRemainingSpace = doc.page.height - y - 10;
if (currentPageRemainingSpace < requiredSpace) {
  doc.addPage();
  y = 50;
}

doc
  .fillColor('#000000')
  .fontSize(10)
  .font('Helvetica')
  .text('Thank you for your business!', 20, y + 15, { align: 'center' })
  .text(
    `Contact: ${shopSettings.phoneNumber || 'N/A'} | ${shopSettings.email || 'N/A'}`,
    10,
    y + 30,
    { align: 'center' }
  )
  .text(`Follow us: ${shopSettings.name || 'N/A'}`, 10, y + 45, { align: 'center' });
    if (y > 300) {
      doc
        .rotate(45, { origin: [300, y - 100] })
        .opacity(0.05)
        .fontSize(80)
        
        .font('Helvetica-Bold')
        .text('PAID', 100, y - 150, { align: 'center' })
        .opacity(1)
        .rotate(-45, { origin: [300, y - 100] });
    }
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error.message);
    res.status(500).json({ error: 'Error generating invoice', details: error.message });
  }
};
exports.editUserDetailsByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { username, address, phoneNo } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (username) user.username = username;
    if (address) user.address = address;
    if (phoneNo) user.phoneNo = phoneNo;
    await user.save();
    return res.status(200).json({
      message: 'User details updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        address: user.address,
        phoneNo: user.phoneNo
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
exports.getMarquee = async (req, res) => {
  try {
    const marquee = await Marquee.findOne({ isActive: true }).select('_id content isActive');
    res.json({ success: true, marquee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getPolicy = async (req, res) => {
  try {
    const { type } = req.params;
    const allowedTypes = ["privacy", "terms", "shipping", "refunds"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid policy type" });
    }
    const policy = await Policy.findOne({ type }).select("_id type content updatedAt");
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }
    res.status(200).json({ success: true, policy });
  } catch (error) {
    console.error("Policy fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getShopSettings = async (req, res) => {
    try {
        const settings = await ShopSettings.findOne()
            .select('poweredBy websiteUrl profileImage mapLink message name phoneNumber whatsappNumber address email link');

        if (!settings) {
            return res.status(404).json({ message: 'No settings found' });
        }
        res.status(200).json(settings);
    } catch (error) {
        console.error("Get shop settings error:", error);
        res.status(500).json({ message: 'Server error' });
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