const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addProduct,
    getadminAllProducts,
    updateProduct,
    deleteProduct,
    addBanner,
    updateSingleBannerImage,
    deleteBannerImage,
    getAllUsers, getUserById,
    editUserDetails,
    deleteUser,
    exportUserDetails,
    getProductGST,
    setGST,
    removeGST,
    addProductToOffer,
    updateOffer,
    deleteOffer,
    updateBannerImage,
    getTotalUserOrders,
    getUserCount,
    getPendingOrders,
    getCategoryCount,
    getProductCount,
    getAllUsersStatus,
    getNotifications,
    createNotification,
    AdminNotifications,
    viewAllOrder,
    updateOrderStatus,
    getOrderCount,
    sendNotification,
    getAllProductStock,
    adminDownloadInvoice,
    searchUsers,
    OrderDetailPage,
    ProductStock,
    getStatus,
    toggleMaintenance,
    updateMarquee,
    createOrUpdateMarquee,
    upsertPolicy,
    createShopSettings,
    updateShopSettings,
    getSettings,
    setMinOrderAmount,
    updateSettings
} = require('../controllers/managercontroller');
const router = express.Router();
router.post('/pcategory', authMiddleware, addCategory);
router.put('/ucategory/:id', authMiddleware, updateCategory);
router.delete('/dcategory/:id', authMiddleware, deleteCategory);
router.post('/subcategory', authMiddleware, addSubCategory);
router.put('/subcategory/:id', authMiddleware, updateSubCategory);
router.delete('/subcategory/:id', authMiddleware, deleteSubCategory);
router.post('/product', authMiddleware, addProduct);
router.get('/admin/productget',getadminAllProducts);
router.put('/update/:id', authMiddleware,updateProduct);
router.delete('/product/:id', authMiddleware, deleteProduct);
router.post('/banner', addBanner);
router.put('/banner/update/:id', updateBannerImage);
router.delete('/banner/:id', authMiddleware, deleteBannerImage);
router.get('/users', getAllUsers);
router.get('/search-users',searchUsers);
router.get('/user/:userId', getUserById);
router.put('/user/:userId', authMiddleware, editUserDetails);
router.delete('/user/:userId', authMiddleware, deleteUser);
router.get('/export-users', exportUserDetails);
router.get('/getgst/:productId', authMiddleware, getProductGST);
router.post('/set', authMiddleware, setGST);
router.post('/remove-gst', authMiddleware, removeGST);
router.post('/addoffers', authMiddleware, addProductToOffer); 
router.put('/upoffer/:offerId', updateOffer);
router.delete('/deoffer/:offerId', deleteOffer);
router.get('/count',authMiddleware,getOrderCount);
router.get('/user-count', authMiddleware, getUserCount);
router.get('/product-count', authMiddleware, getProductCount);
router.get('/category-count', authMiddleware, getCategoryCount);
router.get('/pending-orders', authMiddleware, getPendingOrders);
router.get('/activeuser', authMiddleware, getAllUsersStatus);
router.get('/admin/orders', authMiddleware, viewAllOrder);
router.get('/admin/notificationget', AdminNotifications);
router.put('/admin/orders/:orderId', authMiddleware, updateOrderStatus);
router.get('/admin/ordersdetail/:orderId', authMiddleware, OrderDetailPage);
router.post('/sendnotification',authMiddleware, sendNotification);
router.get('/products/stock', authMiddleware,getAllProductStock);
router.get('/stockp', ProductStock);
router.get('/admin/order/invoice/:orderId', authMiddleware, adminDownloadInvoice);
router.get('/status', getStatus);
router.post('/toggle-maintenance', toggleMaintenance);
router.post('/marqueep', authMiddleware,createOrUpdateMarquee);
router.put('/marqueeu/:id', authMiddleware,updateMarquee); 
router.post('/admin/policy',authMiddleware, upsertPolicy);
router.post('/shop', authMiddleware,createShopSettings);
router.put('/shopup',authMiddleware, updateShopSettings);
router.post("/min-order", authMiddleware,setMinOrderAmount);
router.put("/settingsput", authMiddleware,updateSettings);
module.exports = router;