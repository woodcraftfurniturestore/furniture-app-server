const express = require("express");
const router = express.Router();
const { authMiddleware, verifyGSTTokenMiddleware } = require("../middleware/authMiddleware");
const {
  registerSuperAdmin,
  registerManager,updateManager, deleteManager, getManagers,
  registerAdmin,getAdmins, updateAdmin, deleteAdmin,
  registerMarketer,updateMarketer,deleteMarketer,getMarketers,
  registerDealer, updateDealer, deleteDealer, getDealers,
  setUserActiveStatus,
  login,verifyGST 
 
} = require("../controllers/authController");

// verifyGST
router.post("/verify-gst", authMiddleware, verifyGST);

// superadmin
router.post("/register/superadmin", registerSuperAdmin);

// manager
router.post("/register/manager", authMiddleware, registerManager);
router.get("/users/manager", authMiddleware, getManagers);
router.put('/manager/:id', authMiddleware, updateManager);
router.delete('/manager/:id', authMiddleware, deleteManager);


//  admin
router.post("/register/admin", authMiddleware, registerAdmin);
router.put('/admin/:id', authMiddleware, updateAdmin);
router.delete('/admin/:id', authMiddleware, deleteAdmin);
router.get("/users/admin", authMiddleware, getAdmins);

// marketer
router.post("/register/marketer", authMiddleware, registerMarketer);
router.put("/marketer/:id", authMiddleware, updateMarketer);
router.delete("/marketer/:id", authMiddleware, deleteMarketer);
router.get("/users/marketer", authMiddleware, getMarketers);

// dealer
router.post("/register/dealer",verifyGSTTokenMiddleware,registerDealer);
router.put('/dealer/:id', authMiddleware, updateDealer);
router.delete('/dealer/:id', authMiddleware, deleteDealer);
router.get('/users/dealer', authMiddleware, getDealers);

// activate/deactivate user (body: { isActive: true|false })
router.patch('/user/:role/:id/status', authMiddleware, setUserActiveStatus);

// common login route for all roles
router.post("/login", login);




module.exports = router;
