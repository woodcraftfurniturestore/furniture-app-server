const express = require('express');
const { getCategories,
getSubCategories,
 getProducts,
getBannerImage,
sendContactMessage,
getAllSubCategories,
getAllProducts,
searchProducts,getOffers,getUserDetails,logoutUser,updateDelivery,createDelivery,
getDelivery,downloadInvoice,getNotifications,getProductsByProductId,ProductById,updateUserDetails,searchProductByName,searchSubCategories,searchCategories,getBanners,searchProductsWithRelated,editUserDetailsByEmail, getSettings,getMarquee,getPolicy,getShopSettings} = require('../controllers/productController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();
router.get('/categories', getCategories);
router.get('/getbanner', getBanners);
router.get('/search',searchProducts);
router.get('/getallc',getCategories);
router.get('/searchc', searchCategories);
router.get('/getsubc/:categoryId', getSubCategories);
router.get('/getallsubc', getAllSubCategories);
router.get('/searchsubc', searchSubCategories);
router.get('/offers', getOffers);
router.get('/getproduct/:subCategoryId', getProducts);
router.get('/getallp', getAllProducts);
router.get('/searchp', searchProductByName);
router.get('/getprofile', authMiddleware, getUserDetails); 
router.put('/delivery', authMiddleware, updateDelivery);
router.post('/create', authMiddleware, createDelivery);
router.get('/userget', authMiddleware, getDelivery);
router.post('/logout', authMiddleware, logoutUser);
router.get('/order/invoice/:orderId', downloadInvoice);
router.get('/notifications',authMiddleware, getNotifications);
router.get('/productlist/:productId', getProductsByProductId);
router.get('/products/:productId',ProductById);
router.put('/updateuserdetails', authMiddleware, updateUserDetails);
router.get('/search-with-related', searchProductsWithRelated );
router.put('/edit/:email', authMiddleware, editUserDetailsByEmail);
router.get('/marquee', getMarquee);
router.get('/policy/:type', getPolicy);
router.get('/shop-settings', getShopSettings);
router.get("/settings", getSettings);
module.exports = router;