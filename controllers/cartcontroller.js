const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Order = require('../models/order');
const SuperAdmin = require("../models/superAdminModel");
const Admin = require("../models/adminModel");
const Manager = require("../models/managerModel");
const Marketer = require("../models/Marketer");
const Dealer = require("../models/dealerModel");
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Delivery = require('../models/Deliveryaddress');
const { sendRegistrationEmail } = require("../services/emailService");
const Offer = require('../models/Offer');
const nodemailer = require('nodemailer');
const sendNotificationHelper = require("../utils/sendNotificationHelper");
const { singleUpload, multipleUpload } = require('../utils/upload');
const Setting = require("../models/Setting");
exports.viewCart = async (req, res) => {
    const DealerId = req.Dealer.DealerId;
    try {
        const cart = await Cart.findOne({ user: DealerId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }
        let totalAmount = 0;
        let originalTotalAmount = 0;
        let totalGST = 0;
        const detailedItems = cart.items.map((item) => {
            const product = item.product;
            const priceToUse = item.isOffer ? item.offerPrice : product.offerPrice;
            const gstAmount = (priceToUse * product.gstPercentage) / 100;
            const totalWithGST = priceToUse + gstAmount;
            originalTotalAmount += product.price * item.quantity;
            totalAmount += totalWithGST * item.quantity;
            totalGST += gstAmount * item.quantity;
            return {
                productId: product._id.toString(),
                productTitle: product.title,
                productImages: product.images[0] || product.images,
                quantity: item.quantity,
                stock: product.stock,
                originalPrice: product.price,
                offerPrice: priceToUse,
                 gstPercentage: product.gstPercentage,
                gstAmount: gstAmount * item.quantity,
                totalWithGST: totalWithGST * item.quantity,
                totalOriginalPrice: product.price * item.quantity,
                totalOfferPrice: totalWithGST * item.quantity,
                savings: (product.price - priceToUse),
 offerId: item.offer || null  * item.quantity,
            };
        });
        const savings = originalTotalAmount - totalAmount;
        cart.quote = {
            totalAmount,
            originalTotalAmount,
            savings,
            totalGST,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        await cart.save();
        res.status(200).json({
            cart: {
                items: detailedItems,
                quote: cart.quote,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cart', details: error.message });
    }
};
const sendLowStockAlert = async (product) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || 'hk1396897@gmail.com',
        subject: '⚠️ Low Stock Alert: Action Needed!',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
                <div style="max-width: 600px; background: #ffffff; padding: 20px; margin: auto; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
                    <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" 
                        alt="Delivery Service" style="max-width: 100%; height: auto; margin-bottom: 20px;" />
                    <h2 style="color: #ff6600; margin-bottom: 10px;">⚠️ Low Stock Alert</h2>
                    <p style="color: #555; font-size: 16px;">The stock for <strong>${product.title}</strong> is running low.</p>
                    <p style="color: #d9534f; font-size: 18px; font-weight: bold;">Only ${product.stock} items left!</p>
                    <img src="${product.images}" alt="${product.title}" 
                        style="max-width: 150px; height: auto; border-radius: 8px; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
                    <p style="font-size: 14px; color: #888; margin-top: 15px;">Please restock as soon as possible to avoid stockouts.</p>
                </div>
            </div>
        `,
    };
    await transporter.sendMail(mailOptions);
};
exports.addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const DealerId = req.user.DealerId;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (quantity > product.stock) {
            return res.status(400).json({ message: `Only ${product.stock} items available in stock.` });
        }
        const offer = await Offer.findOne({ product: productId });
        let offerPrice = product.price;
        let isOffer = false;
        let offerId = null;
        if (offer) {
            isOffer = true;
            offerPrice = offer.offerPrice;
            offerId = offer._id;
        }
        let cart = await Cart.findOne({ user: DealerId });
        if (!cart) {
            cart = new Cart({ user: DealerId, items: [{ product: productId, quantity, offer: offerId, isOffer, offerPrice }] });
        } else {
            const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
            if (itemIndex > -1) {
                const item = cart.items[itemIndex];
                if (item.quantity + quantity > product.stock) {
                    return res.status(400).json({ message: `Only ${product.stock - item.quantity} items available in stock.` });
                }
                item.quantity += quantity;
                if (offer) {
                    item.offer = offerId;
                    item.isOffer = true;
                    item.offerPrice = offer.offerPrice;
                }
            } else {
                cart.items.push({ product: productId, quantity, offer: offerId, isOffer, offerPrice });
            }
        }
        await cart.save();
        if (product.stock - quantity < 5) {
            await sendLowStockAlert(product);
        }
        res.status(200).json({
            message: 'Product added to cart successfully!',
            cart,
            stockMessage: product.stock - quantity < 5 ? `Hurry! Only ${product.stock - quantity} left. Restocking soon!` : null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adding product to cart', details: error.message });
    }
};
exports.removeFromCart = async (req, res) => {
    const { productId } = req.body; 
    const DealerId = req.user.DealerId;
    try {
        console.log('Removing product from cart:', productId, 'for user:', DealerId);
        const cart = await Cart.findOne({ user: DealerId });
        if (!cart) {
            console.log('Cart not found, creating a new cart');
            const newCart = new Cart({
                user: DealerId,
                items: [],
                quote: {
                    totalAmount: 0,
                    originalTotalAmount: 0,
                    savings: 0,
                    totalGST: 0,
                    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60*  1000),
                }
            });
            await newCart.save();
            return res.status(404).json({ message: 'Cart not found, created a new cart.' });
        }
        const originalItemCount = cart.items.length;
        cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        if (cart.items.length === originalItemCount) {
            console.log('Product not found in cart');
            return res.status(404).json({ message: 'Product not found in cart' });
        }
        let totalAmount = 0;
        let originalTotalAmount = 0;
        let totalGST = 0;
        for (let item of cart.items) {
            const product = await Product.findById(item.product);
            if (!product) {
                console.log('Product not found:', item.product);
                continue;
            }
            originalTotalAmount += product.price * item.quantity;
            const gstAmount = (product.offerPrice * product.gstPercentage) / 100;
            const totalWithGST = product.offerPrice + gstAmount;
            totalAmount += totalWithGST * item.quantity;
            totalGST += gstAmount * item.quantity;
        }
        const savings = originalTotalAmount - totalAmount;
        cart.quote = {
            totalAmount,
            originalTotalAmount,
            savings,
            totalGST,
            validUntil: new Date(Date.now() + 7 * 24 * 60*  60*  1000), 
        };
        await cart.save();
        console.log('Updated cart:', cart);
        res.status(200).json({ message: 'Product removed from cart', cart });
    } catch (error) {
        console.log('Error removing product from cart:', error.message);
        res.status(500).json({ error: 'Error removing product from cart', details: error.message });
    }
};
exports.updateCartQuantity = async (req, res) => {
    const { quantity } = req.body;
    const { productId } = req.params;
    const DealerId = req.user.DealerId;
    try {
        const cart = await Cart.findOne({ user: DealerId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (quantity > product.stock) {
            return res.status(400).json({ message: `Only ${product.stock} items available in stock.` });
        }
        cart.items[itemIndex].quantity = quantity;
        let totalAmount = 0;
        let originalTotalAmount = 0;
        let totalGST = 0;
        for (let item of cart.items) {
            const product = await Product.findById(item.product);
            originalTotalAmount += product.price * item.quantity;
            const gstAmount = (product.offerPrice * product.gstPercentage) / 100;
            const totalWithGST = product.offerPrice + gstAmount;
            totalAmount += totalWithGST * item.quantity;
            totalGST += gstAmount * item.quantity;
        }

        const savings = originalTotalAmount - totalAmount;
        cart.quote = {
            totalAmount,
            originalTotalAmount,
            savings,
            totalGST,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        await cart.save();
        res.status(200).json({ message: 'Cart updated', cart });
    } catch (error) {
        res.status(500).json({ error: 'Error updating cart', details: error.message });
    }
};
exports.updateProductQuantity = async (req, res) => {
    const { quantity } = req.body;
    const { productId } = req.params;
    const DealerId = req.user.id;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }
        if (quantity < 1) {
            return res.status(400).json({ 
                success: false,
                message: 'Quantity must be at least 1' 
            });
        }
        if (quantity > product.stock) {
            return res.status(400).json({ 
                success: false,
                message: `Only ${product.stock} items available in stock`,
                availableStock: product.stock
            });
        }
        product.stock -= quantity;
        await product.save();
        res.status(200).json({
            success: true,
            message: 'Stock updated successfully',
            productId: productId,
            quantity: quantity,
            remainingStock: product.stock,
            unitPrice: product.offerPrice,
            totalAmount: product.offerPrice * quantity
        });

    } catch (error) {
        console.error('Error updating product quantity:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error updating product quantity', 
            details: error.message 
        });
    }
};
exports.addToWishlist = async (req, res) => {
    const { productId } = req.body;
    const DealerId = req.user.DealerId;

    try {
        // 1. Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 2. Find or create wishlist
        let wishlist = await Wishlist.findOne({ user: DealerId });
        if (!wishlist) {
            wishlist = new Wishlist({
                user: DealerId,
                items: [{ product: productId }]
            });
        } else {
            // 3. Avoid duplicates
            const itemIndex = wishlist.items.findIndex(
                (item) => item.product.toString() === productId
            );
            if (itemIndex === -1) {
                wishlist.items.push({ product: productId });
            }
        }

        // 4. Save wishlist
        await wishlist.save();

        // 5. Build populated response safely
        const populatedWishlistItems = [];
        for (let item of wishlist.items) {
            const product = await Product.findById(item.product);
            if (product) {
                populatedWishlistItems.push({
                    productId: product._id,
                    name: product.name,
                    title: product.title,
                    images: product.images?.[0] || product.images,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    gstPercentage: product.gstPercentage,
                });
            }
        }

        return res.status(200).json({
            message: 'Product added to wishlist',
            wishlist: populatedWishlistItems,
        });

    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({
            error: 'Error adding product to wishlist',
            details: error.message
        });
    }
};

// exports.addToWishlist = async (req, res) => {
//     const { productId } = req.body;
//     const DealerId = req.user.DealerId;
//     try {
//         const product = await Product.findById(productId);
//         if (!product) return res.status(404).json({ message: 'Product not found' });

//         let wishlist = await Wishlist.findOne({ user: DealerId });
//         if (!wishlist) {
//             wishlist = new Wishlist({ user: DealerId, items: [{ product: productId }] });
//         } else {
//             const itemIndex = wishlist.items.findIndex((item) => item.product.toString() === productId);
//             if (itemIndex === -1) {
//                 wishlist.items.push({ product: productId });
//             }
//         }
//         const populatedWishlistItems = [];
//         for (let item of wishlist.items) {
//             const product = await Product.findById(item.product);
//             populatedWishlistItems.push({
//                 productId: product._id,
//                 name: product.name,
//                 title: product.title,
//                 images: product.images[0] || product.images,
//                 price: product.price,
//                 offerPrice: product.offerPrice,
//                 gstPercentage: product.gstPercentage,
//             });
//         }
//         await wishlist.save();
//         res.status(200).json({
//             message: 'Product added to wishlist',
//             wishlist: populatedWishlistItems,
//         });
//     } catch (error) {
//         res.status(500).json({ error: 'Error adding product to wishlist', details: error.message });
//     }
// };
exports.viewWishlist = async (req, res) => {
    const DealerId = req.user.DealerId;
    try {
        const wishlist = await Wishlist.findOne({ user: DealerId }).populate('items.product', 'name title offerPrice price stock gstPercentage images');
        
        if (!wishlist || wishlist.items.length === 0) {
            return res.status(404).json({ message: 'Wishlist is empty or not found' });
        }
        const populatedWishlistItems = wishlist.items.map((item) => {
            const product = item.product;
            return {
                productId: product._id,
                name: product.name,
                title: product.title,
                images: product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null, // Safe check
                price: product.price,
                offerPrice: product.offerPrice,
                gstPercentage: product.gstPercentage,
                stock: product.stock,
            };
        });
        res.status(200).json({
            message: 'Wishlist retrieved successfully',
            wishlist: populatedWishlistItems,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching wishlist', details: error.message });
    }
};
exports.removeFromWishlist = async (req, res) => {
    const { productId } = req.body; 
    const DealerId = req.user.DealerId;
    try {
        const wishlist = await Wishlist.findOne({ user: DealerId });
        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }
        wishlist.items = wishlist.items.filter(
            (item) => item.product.toString() !== productId
        );
        await wishlist.save();
        res.status(200).json({
            message: 'Product removed from wishlist',
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error removing product from wishlist',
            details: error.message,
        });
    }
};
exports.cancelOrder = async (req, res) => {
    const { orderId } = req.body;
    const DealerId = req.user.DealerId;
    try {
        const order = await Order.findOne({ _id: orderId, user: DealerId }).populate('user');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }
        if (order.status === 'Shipped') {
            return res.status(400).json({ message: 'Cannot cancel a confirmed order' });
        }
        order.status = 'Cancelled';
        await order.save();
        for (let item of order.items) {
            if (!item.product) continue;
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { new: true, runValidators: false }
            );
        }
        try {
            const notificationPayload = {
                orderId: order._id,
                title: "Order Cancelled",
                body: `Your order has been cancelled successfully.`,
                icon: "ic_notification",
                page: "/order-details",
            };
            await sendNotificationHelper(notificationPayload);
        } catch (error) {
            console.error("Notification Sending Failed:", error);
        }
        if (order.user?.email) {
            await sendCancellationEmail(order.user.email, order);
        }
        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ error: 'Error cancelling order', details: error.message });
    }
};
const sendCancellationEmail = async (email, order) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        html: `
        <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" alt="Delivery Service" style="max-width: 100%; height: auto;" />
        <p>Your order with ID ${order._id} has been successfully cancelled!</p>
        <p>Best regards,</p>
        <p>Fresh Grocery</p>
    `,
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Order Cancellation Confirmation',
        text: `Your order with ID ${order._id} has been successfully cancelled.\n\nThank you.`,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Cancellation email sent successfully');
    } catch (error) {
        console.error('Error sending cancellation email:', error);
    }
};
exports.FetchOrderDetail = async (req, res) => {
    const DealerId = req.user.DealerId; 
    const { orderId } = req.body; 
    if (!orderId) {
        return res.status(400).json({ message: 'Order ID is required' });
    }
    try {
        const order = await Order.findOne({ _id: orderId, user: DealerId })
            .populate('items.product', 'title offerPrice price images');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const items = order.items.map((item) => {
            const product = item.product;
            return {
                productTitle: product.title,
                productImage: product.images[0],
                offerPrice: item.isOffer ? item.offerPrice : product.offerPrice,
                quantity: item.quantity,
            };
        });
        const deliveryDetails = await Delivery.findOne({ DealerId: DealerId });
        const detailedOrder = {
            orderId: order._id,
            items,
            orderDate: order.createdAt,
            overallTotal: order.quote.totalAmount,
            address: deliveryDetails?.address || 'N/A',
            phoneNo: deliveryDetails?.phoneNo || 'N/A',
            username: deliveryDetails?.username || 'N/A',
            paymentMethod: order.paymentMethod,
            status: order.status,
        };
        res.status(200).json({ order: detailedOrder });
    } catch (error) {
        console.error('Fetch Order Detail Error:', error);
        res.status(500).json({ error: 'Error fetching order detail', details: error.message });
    }
};
exports.OrderHistory = async (req, res) => {
    const DealerId = req.user.DealerId;
    try {
        const orders = await Order.find({ user: DealerId })
            .populate('items.product', 'title offerPrice price images')
            .sort({ createdAt: -1 });
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found' });
        }
        const detailedOrders = await Promise.all(orders.map(async (order) => {
            const items = order.items.map((item) => {
                const product = item.product;
                return {
                    productTitle: product.title,
                    productId:product.id,
                    productImage: product.images[0],
                    offerPrice: item.offerPrice,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                    deliveryId: item.deliveryId,
                };
            });
            return {
                orderId: order._id,
                items,
                orderDate: order.createdAt,
                overallTotal: order.quote.totalAmount,
                paymentMethod: order.paymentMethod,
                status: order.status,
            };
        }));
        res.status(200).json({ orders: detailedOrders });
    } catch (error) {
        console.error('Order History Error:', error);
        res.status(500).json({ error: 'Error fetching order history', details: error.message });
    }
};
exports.checkout = async (req, res) => {
  const { paymentMethod, type, productId, deliveryId, offerId, quantity = 1 } = req.body;
  const DealerId = req.user?.DealerId;
  const adminEmail = process.env.ADMIN_EMAIL || "mailto:hk1396897@gmail.com";
  try {
    console.log("Checkout Request Received:", req.body);
    const setting = await Setting.findOne();
const minOrderAmount = setting?.minOrderAmount || 200;
    const delivery = await Delivery.findOne({ DealerId, "items._id": deliveryId });
    if (!delivery) return res.status(404).json({ message: "Delivery address not found." });
    const deliveryItem = delivery.items.find(item => item._id.toString() === deliveryId);
    if (!deliveryItem) return res.status(404).json({ message: "Delivery item not found." });
    const { phoneNo, username, houseNo, streetName, city, state, pinCode } = deliveryItem;
    if (!phoneNo || !username || !houseNo || !streetName || !city || !state || !pinCode) {
      return res.status(400).json({ message: "Incomplete delivery details." });
    }
    let cart = null, originalTotalAmount = 0, totalAmount = 0, totalGST = 0, savings = 0;
    let orderItems = [];
    if (type === "cartNow") {
      cart = await Cart.findOne({ user: DealerId }).populate("items.product");
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(404).json({ message: "Cart is empty" });
      }
      for (let item of cart.items) {
        const product = item.product;
        if (!product) continue;
        const priceToUse = item.isOffer ? item.offerPrice : product.offerPrice;
        const gstAmount = (priceToUse * product.gstPercentage) / 100;
        originalTotalAmount += product.price * item.quantity;
        totalGST += gstAmount * item.quantity;
        totalAmount += (priceToUse + gstAmount) * item.quantity;
        savings += (product.price - priceToUse) * item.quantity;
        if (product.stock - item.quantity <= 0) {
          await sendStockAlert(adminEmail, product);
        }
        await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          deliveryId,
          phoneNo,
          houseNo,
          streetName,
          city,
          state,
          pinCode,
          username,
          offerId: offerId || null,
          isOffer: !!offerId,
          offerPrice: priceToUse
        });
      }
      await Cart.deleteOne({ user: DealerId });
      console.log("Cart cleared after payment");
    } else if (type === "buyNow") {
      let product = null, selectedOffer = null, priceToUse, gstPercentage;
      if (offerId) {
        selectedOffer = await Offer.findById(offerId).populate("product");
        if (!selectedOffer || !selectedOffer.product) return res.status(404).json({ message: "Offer not found" });
        product = selectedOffer.product;
        const currentDate = new Date();
        if ((selectedOffer.startDate && currentDate < selectedOffer.startDate) ||
            (selectedOffer.endDate && currentDate > selectedOffer.endDate)) {
          return res.status(400).json({ message: "Offer is not active" });
        }
        priceToUse = selectedOffer.offerPrice;
        gstPercentage = selectedOffer.gstPercentage || product.gstPercentage || 0;
      } else if (productId) {
        product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });
        priceToUse = product.offerPrice;
        gstPercentage = product.gstPercentage || 0;
      } else {
        return res.status(400).json({ message: "Product or offer ID required" });
      }
      const gstAmount = (priceToUse * gstPercentage) / 100;
      totalGST = gstAmount * quantity;
      totalAmount = (priceToUse + gstAmount) * quantity;
      originalTotalAmount = product.price * quantity;
      savings = (product.price - priceToUse) * quantity;
      if (product.stock - quantity <= 0) {
        await sendStockAlert(adminEmail, product);
      }
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });
      orderItems.push({
        product: product._id,
        quantity,
        deliveryId,
        phoneNo,
        houseNo,
        streetName,
        city,
        state,
        pinCode,
        username,
        offerId: offerId || null,
        isOffer: !!offerId,
        offerPrice: priceToUse
      });
    } else {
      return res.status(400).json({ message: "Invalid type or missing data" });
    }
 if (totalAmount < minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount is ₹${minOrderAmount}. Your total is ₹${totalAmount}.`
      });
    }
    const quote = {
      totalAmount,
      originalTotalAmount,
      savings,
      totalGST,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const newOrder = new Order({
      user: DealerId,
      deliveryId,
      items: orderItems,
      paymentMethod,
      quote,
      status: "Placed",
      paymentDetails: {},
      statusHistory: [
        { status: "Placed", timestamp: new Date() }
      ]
    });
    if (paymentMethod === "online") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: totalAmount * 100,
          currency: "INR",
          payment_capture: 1,
          notes: {
            orderId: newOrder._id.toString(),
            deliveryId: deliveryId,
          },
        });
        newOrder.paymentDetails = {
          razorpayOrderId: razorpayOrder.id,
          razorpayPaymentId: "",
          razorpaySignature: "",
        };
      } catch (razorpayError) {
        console.error("Razorpay Error:", razorpayError);
        return res.status(500).json({ message: "Payment processing error", error: razorpayError.message });
      }
    }
    await newOrder.save();
    const user = await User.findById(DealerId);
    if (user?.email) await sendOrderConfirmationEmail(user.email, newOrder);
    if (paymentMethod === "cod" && user?.fcmTokens) {
      await sendNotificationHelper({
        DealerId,
        orderId: newOrder._id,
        title: "Order Confirmed",
        body: `Your order with ID ${newOrder._id} has been placed successfully (COD).`,
        icon: "ic_notification",
        page: `/order-details/${newOrder._id}`,
        deliveryId
      });
    }
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('items.product')
      .lean();
    res.status(200).json({
      message: paymentMethod === "online" ? "Order placed successfully" : "Order placed successfully (COD)",
      order: {
        orderId: populatedOrder._id,
        items: populatedOrder.items.map(item => ({
          productTitle: item.product?.title || "N/A",
          productId: item.product?._id,
          productImage: item.product?.images?.[0] || null,
          offerPrice: item.offerPrice,
          quantity: item.quantity
        })),
        orderDate: populatedOrder.createdAt,
        overallTotal: populatedOrder.quote.totalAmount,
        gstAmount: populatedOrder.quote.totalGST,
        houseNo: populatedOrder.items[0].houseNo,
        streetName: populatedOrder.items[0].streetName,
        city: populatedOrder.items[0].city,
        state: populatedOrder.items[0].state,
        pinCode: populatedOrder.items[0].pinCode,
        phoneNo: populatedOrder.items[0].phoneNo,
        username: populatedOrder.items[0].username,
        paymentMethod: populatedOrder.paymentMethod,
        status: populatedOrder.status,
        statusHistory: populatedOrder.statusHistory
      },
      paymentDetails: paymentMethod === "online" ? populatedOrder.paymentDetails : {},
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ message: "Error during checkout", error: error.message });
  }
};
exports.viewOrderHistory = async (req, res) => {
  const DealerId = req.user.DealerId;
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({ user: DealerId, _id: orderId })
      .populate('items.product', 'title offerPrice price images');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const deliveryItem = order.items[0];
    if (!deliveryItem) {
      return res.status(404).json({ message: 'Delivery item not found for the given order' });
    }
    const { houseNo, streetName, city, state, pinCode, phoneNo, username } = deliveryItem;
    const items = order.items.map(item => ({
      productTitle: item.product?.title || "N/A",
      productId: item.product?._id,
      productImage: item.product?.images?.[0] || null,
      offerPrice: item.offerPrice,
      quantity: item.quantity,
      totalPrice: (item.offerPrice || 0) * item.quantity
    }));
    const orderDetails = {
      orderId: order._id,
      items,
      orderDate: order.createdAt,
      overallTotal: order.quote.totalAmount,
      gstAmount: order.quote.totalGST,
      houseNo: houseNo || 'N/A',
      streetName: streetName || 'N/A',
      city: city || 'N/A',
      state: state || 'N/A',
      pinCode: pinCode || 'N/A',
      phoneNo: phoneNo || 'N/A',
      username: username || 'N/A',
      paymentMethod: order.paymentMethod,
      status: order.status,
      statusHistory: order.statusHistory
    };
    res.status(200).json({ order: orderDetails });
  } catch (error) {
    console.error('Order Detail Error:', error);
    res.status(500).json({ error: 'Error fetching order details', details: error.message });
  }
};
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.confirmPayment = async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    console.log('Payment verification initiated');
    console.log('Received Razorpay Order ID:', razorpayOrderId);
    console.log('Received Razorpay Payment ID:', razorpayPaymentId);
    console.log('Received Razorpay Signature:', razorpaySignature);
    try {
        const order = await Order.findOne({ 'paymentDetails.razorpayOrderId': razorpayOrderId });
        if (!order) {
            console.error('Order not found');
            return res.status(400).json({ error: 'Order not found' });
        }
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const generatedSignature = hmac.digest('hex');
        console.log('Generated Signature:', generatedSignature);
        if (generatedSignature !== razorpaySignature) {
            console.error('Invalid Razorpay signature');
            order.status = 'Failed';
            await order.save();
            return res.status(400).json({ error: 'Invalid Razorpay signature' });
        }
        try {
            const payment = await razorpay.payments.fetch(razorpayPaymentId);
            console.log('Payment details:', payment);
            if (payment.status !== 'captured') {
                console.error('Payment not captured, status:', payment.status);
                order.status = 'Failed';
                await order.save();
                return res.status(400).json({ error: 'Payment not captured' });
            }
            order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
            order.paymentDetails.razorpaySignature = razorpaySignature;
            order.status = 'Placed';
            await order.save();
            console.log('Payment verified successfully');
            const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
            const deliveryId = razorpayOrder.notes.deliveryId;
            console.log('Retrieved deliveryId from Razorpay Order:', deliveryId);
            if (order.items.length > 0) {
                const DealerId = order.user;
                const cart = await Cart.findOne({ user: DealerId });
                if (cart) {
                    await Cart.deleteOne({ user: DealerId });
                    console.log('Cart cleared after payment');
                }
            }
            try {
                const user = await User.findById(DealerId);
                if (user?.email) {
                    await sendOrderConfirmationEmail(user.email, newOrder);
                    console.log("Order confirmation email sent to:", user.email);
                }
            } catch (emailError) {
                console.error("Email Sending Failed:", emailError);
            }
            try {
                const notificationPayload = {
                    orderId: order._id,
                    title: "Order Confirmed",
                    body: `Your order with ID ${order._id} has been placed successfully.`,
                    icon: "ic_notification",
                    page: "/order-details",
                    deliveryId: deliveryId,
                };
                await sendNotificationHelper(notificationPayload);
                console.log("Notification Sent Successfully");
            } catch (notificationError) {
                console.error("Notification Sending Failed:", notificationError);
            }
            res.status(200).json({
                message: 'Payment verified successfully',
                orderId: order._id,
                status: order.status,
            });
        } catch (error) {
            console.error('Error fetching payment status:', error);
            order.status = 'Failed';
            await order.save();
            return res.status(500).json({ error: 'Error verifying payment status', details: error.message });
        }
    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        if (order) {
            order.status = 'Failed';
            await order.save();
        }
        res.status(500).json({ error: 'Error during payment verification', details: error.message });
    }
};
const sendStockAlert = async (adminEmail, product) =>{
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: `⚠️ Stock Alert: ${product.name} is Out of Stock!`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                    <h2 style="color: #d9534f;">🚨 Stock Alert 🚨</h2>
                    <p>The product <strong>${product.name}</strong> (ID: ${product.title}) is now <b style="color: red;">out of stock</b>.</p>
                    <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" 
                        alt="Stock Out Alert" 
                        style="max-width: 100%; height: auto; border-radius: 10px; margin-top: 10px;">
                    <p>Please restock this product as soon as possible.</p>
                    <p><strong>Product ID:</strong> ${product.title}</p>         
                    <p><strong>Last Known Stock:</strong> 0</p>
                    <p style="color: #d9534f; font-weight: bold;">Action Required: Restock the item!</p>
                </div>
            `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Stock alert email sent to admin at ${adminEmail}`);
    } catch (error) {
        console.error("❌ Failed to send stock alert email:", error);
    }
};
async function sendOrderConfirmationEmail(email, order) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        let productListHTML = '';
        for (let item of order.items) {
            const product = await Product.findById(item.product);
            productListHTML += `
                <tr style="border-bottom: 1px solid #f1f1f1; padding: 15px 0;">
                    <td style="padding-right: 20px;">
                        <img src="${product.images}" alt="${product.title}" style="max-width: 100px; height: auto; border-radius: 8px;">
                    </td>
                    <td style="text-align: left; padding-left: 15px;">
                        <strong>${product.title}</strong>
                    </td>
                    <td style="text-align: center;">
                        ${item.quantity}
                    </td>
                    <td style="text-align: right; padding-right: 20px;">
                        ₹${(product.price * item.quantity).toFixed(2)}
                    </td>
                </tr>
            `;
        }
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Order Confirmation - Your Order is Placed',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; padding-bottom: 20px; border-bottom: 3px solid #ff6600;">
                            <img src="https://res.cloudinary.com/dfsimrqwi/image/upload/v1738671301/Untitled_design_4_w4lysj.png" alt="Delivery Service"  style="max-width: 100%; height: auto; border-radius: 10px">
                            <h2 style="color: #ff6600; font-size: 24px; margin-top: 15px;">Your Order is Confirmed! 🎉</h2>
                            <p style="font-size: 16px; color: #666;">Thank you for shopping with us. Your order has been placed successfully.</p>
                        </div>
                        <p style="font-size: 16px; text-align: center; margin-top: 20px;"><strong>Order ID:</strong> <span style="color: #ff6600; font-weight: bold;">${order._id}</span></p>
                        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f9f9f9; text-align: left;">
                                    <th style="padding: 10px;">Product</th>
                                    <th style="padding: 10px; text-align: center;">Quantity</th>
                                    <th style="padding: 10px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productListHTML}
                            </tbody>
                        </table>
                        <div style="padding: 20px; background: #f8f8f8; border-radius: 10px; margin-top: 20px;">
                            <p><strong>📦 Total Amount:</strong> <span style="color: #ff6600; font-size: 18px;">₹${order.quote.totalAmount.toFixed(2)}</span></p>
                            <p><strong>💳 Payment Method:</strong> ${order.paymentMethod}</p>
                            <p><strong>🚚 Estimated Delivery:</strong> 3-5 Business Days</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                        </div>
                        <p style="font-size: 14px; color: #777; text-align: center; margin-top: 20px;">We will notify you once your order is shipped. Need help? <a href="mailto:support@yourwebsite.com" style="color: #ff6600;">Contact us</a>.</p>
                        <p style="text-align: center; font-size: 12px; color: #aaa;">Thank you for choosing us! &#169; 2025 Fresh Grocery</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent to:', email);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
