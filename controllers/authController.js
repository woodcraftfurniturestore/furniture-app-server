const axios = require("axios");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/superAdminModel");
const Admin = require("../models/adminModel");
const Manager = require("../models/managerModel");
const Marketer = require("../models/Marketer");
const Dealer = require("../models/dealerModel");
const { sendRegistrationEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRES = "7d";

//  Helper: sign JWT token
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

/* -------------------------------------------------------------------------- */
/*                               SuperAdmin (public)                          */
/* -------------------------------------------------------------------------- */

//create SuperAdmin 
exports.registerSuperAdmin = async (req, res) => {
  try {
    const { email, password, name, address, phoneNumber } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const exists = await SuperAdmin.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await SuperAdmin.create({
      email,
      password: hashed,
      name,
      address,
      phoneNumber,
      role: "superadmin",
      isActive: true,
    });

    // Send registration email (best-effort)
    try {
      await sendRegistrationEmail(user.email, user.name || "SuperAdmin");
    } catch (e) {
      console.error('Registration email failed:', e && e.message);
    }

    return res.status(201).json({
      message: "SuperAdmin registered successfully",
      data: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
};


/* -------------------------------------------------------------------------- */
/*                               Manager   (allowed by SuperAdmin)            */
/* -------------------------------------------------------------------------- */
//  Create Manager
exports.registerManager = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Only SuperAdmin can create Managers." });
    }
    const { email, password, name, address, phoneNumber } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const exists = await Manager.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const manager = await Manager.create({
      email,
      password: hashed,
      name,
      address,
      phoneNumber,
      createdBy: req.user.id,
      creatorModel: "SuperAdmin",
      isActive: true,
    });

    return res.status(201).json({
      message: "Manager registered successfully",
      data: { id: manager._id, email: manager.email, role: manager.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// Get with search Manager
exports.getManagers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied for this role" });
    }

    const { search } = req.query;
    let filter = { role: "manager" };

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ email: regex }, { name: regex }];
    }

    console.log("Search Filter (Manager):", filter);

    const managers = await Manager.find(filter)
      .select("email role createdBy createdAt name")
      .populate("createdBy", "email role");

    return res.status(200).json({
      message: search ? "Filtered Manager list" : "List of all Managers",
      search: search || null,
      count: managers.length,
      managers,
    });
  } catch (err) {
    console.error("Error in getManagers:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update Manager 
exports.updateManager = async (req, res) => {
  try {
    // authMiddleware must set req.user = { id, role }
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only SuperAdmin can update Managers.' });
    }

    const managerId = req.params.id;
    const { email, password, name } = req.body;

    const manager = await Manager.findById(managerId);
    if (!manager) return res.status(404).json({ message: 'Manager not found' });

    // Update fields if provided
    if (typeof email === 'string' && email.trim() !== '') manager.email = email;
    if (typeof name === 'string') manager.name = name;

    // If password provided, hash it
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      manager.password = hashed;
    }

    await manager.save();

    // Return safe manager info (without password)
    return res.status(200).json({
      message: 'Manager updated successfully',
      manager: {
        id: manager._id,
        email: manager.email,
        name: manager.name,
        role: manager.role,
        createdBy: manager.createdBy || null,
        updatedAt: manager.updatedAt
      }
    });
  } catch (err) {
    console.error('updateManager error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete Manager 
exports.deleteManager = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only SuperAdmin can delete Managers.' });
    }

    const managerId = req.params.id;
    const manager = await Manager.findById(managerId);
    if (!manager) return res.status(404).json({ message: 'Manager not found' });

    await Manager.deleteOne({ _id: managerId });

    return res.status(200).json({ message: 'Manager deleted successfully', id: managerId });
  } catch (err) {
    console.error('deleteManager error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};



/* -------------------------------------------------------------------------- */
/*                              Admin   (allowed by SuperAdmin or Manager)    */
/* -------------------------------------------------------------------------- */

//  Create Admin  

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { address, phoneNumber } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const creatorId = req.user.id;
    const creatorRole = req.user.role;

    if (creatorRole !== "superadmin" && creatorRole !== "manager") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      address,
      phoneNumber,
      role: "admin",
      createdBy: creatorId,
      creatorModel: creatorRole === "manager" ? "Manager" : "SuperAdmin",
      createdByName: req.user.name || req.user.email,
      isActive: true,
    });

    // Optional: Send welcome email
    try { await sendRegistrationEmail(email, name, creatorRole); } catch(e){ console.error('Admin welcome email failed', e && e.message); }

    return res.status(201).json({
      message: "Admin registered successfully",
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        createdBy: creatorRole === "manager" ? "Manager" : "SuperAdmin",
      },
    });
  } catch (err) {
    console.error("Error registering admin:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};


// Update Admin 
exports.updateAdmin = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" && req.user.role !== "manager")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Only SuperAdmin or Manager can update Admins." });
    }

    const adminId = req.params.id;
    const { email, password, name } = req.body;

    // Check admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Update fields
    if (email) admin.email = email;
    if (name) admin.name = name;

    // If password provided → hash it
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      admin.password = hashed;
    }

    await admin.save();

    // Optionally send email
    // await sendRegistrationEmail(admin.email, "Your admin account was updated");

    return res.status(200).json({
      message: "Admin updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdBy: admin.createdBy || null,
        updatedAt: admin.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateAdmin error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
//  GET ADMINS + SEARCH
// exports.getAdmins = async (req, res) => {
//   try {
//     if (!req.user)
//       return res.status(401).json({ message: "Unauthorized" });

//     const userRole = req.user.role;
//     const userId = req.user.id;

//     if (userRole !== "superadmin" && userRole !== "manager") {
//       return res.status(403).json({
//         message: "Access denied for this role",
//       });
//     }

//     const { search } = req.query;
//     let filter = {};

//     // 🔍 Case-insensitive search by name or email
//     if (search && search.trim() !== "") {
//       const regex = new RegExp(search.trim(), "i");
//       filter.$or = [{ email: regex }, { name: regex }];
//     }

//     // 🧩 Role-based filtering
//     if (userRole === "manager") {
//       // Manager can only view admins they created
//       filter.createdBy = userId;
//     }

//     // 🗂️ Fetch admins and populate who created them
//     const admins = await Admin.find(filter)
//       .select("name email role createdBy creatorModel createdAt updatedAt")
//       .populate("createdBy", "name email role");

//     if (!admins || admins.length === 0) {
//       return res.status(404).json({ message: "No admins found" });
//     }

//     // 🧱 Format output like your sample
//     const formattedAdmins = admins.map((admin) => ({
//       _id: admin._id,
//       email: admin.email,
//       name: admin.name,
//       role: admin.role,
//       createdBy: admin.createdBy
//         ? {
//             _id: admin.createdBy._id,
//             email: admin.createdBy.email,
//             name: admin.createdBy.name,
//             role: admin.createdBy.role,
//           }
//         : null,
//       creatorModel: admin.creatorModel || null,
//       createdAt: admin.createdAt,
//       updatedAt: admin.updatedAt,
//       __v: admin.__v || 0,
//     }));

//     return res.status(200).json({
//       message: search ? "Filtered Admin list" : "Admins retrieved successfully",
//       count: formattedAdmins.length,
//       data: formattedAdmins,
//     });
//   } catch (err) {
//     console.error("Error fetching admins:", err);
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };

exports.getAdmins = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Unauthorized" });

    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole !== "superadmin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Access denied for this role",
      });
    }

    const { search, role } = req.query; // added role filter
    let filter = {};

    // 🔍 Case-insensitive search by name or email
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ email: regex }, { name: regex }];
    }

    // 🧩 Role-based filtering (by logged-in user)
    if (userRole === "manager") {
      // Manager can view Admin list (no createdBy restriction)
      // leave filter as-is so they see all admins
    }

    // 🧩 Additional Role Filter (for Superadmin dropdown)
    if (role && role.trim() !== "") {
      const roleRegex = new RegExp(role.trim(), "i");

      // Filter admins created by users of that role (e.g., manager)
      // Need to first find creator IDs with that role
      const UserModel = require("../models/User"); // Adjust if you use separate models
      const creators = await UserModel.find({ role: roleRegex }).select("_id");
      const creatorIds = creators.map((u) => u._id);
      filter.createdBy = { $in: creatorIds };
    }

    // 🗂️ Fetch admins and populate who created them
    const admins = await Admin.find(filter)
      .select("name email role createdBy creatorModel createdAt updatedAt")
      .populate("createdBy", "name email role");

    if (!admins || admins.length === 0) {
      return res.status(404).json({ message: "No admins found" });
    }

    // 🧱 Format output
    const formattedAdmins = admins.map((admin) => ({
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdBy: admin.createdBy
        ? {
            _id: admin.createdBy._id,
            email: admin.createdBy.email,
            name: admin.createdBy.name,
            role: admin.createdBy.role,
          }
        : null,
      creatorModel: admin.creatorModel || null,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      __v: admin.__v || 0,
    }));

    return res.status(200).json({
      message: search || role
        ? "Filtered Admin list"
        : "Admins retrieved successfully",
      count: formattedAdmins.length,
      data: formattedAdmins,
    });
  } catch (err) {
    console.error("Error fetching admins:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
  1
//  DELETE ADMIN
exports.deleteAdmin = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" && req.user.role !== "manager")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Only SuperAdmin or Manager can delete Admins." });
    }

    const adminId = req.params.id;
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    await Admin.deleteOne({ _id: adminId });

    // Optionally send deletion email
    // await sendRegistrationEmail(admin.email, "Your admin account has been deleted");

    return res.status(200).json({
      message: "Admin deleted successfully",
      id: adminId,
      deletedEmail: admin.email,
    });
  } catch (err) {
    console.error("deleteAdmin error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                  Marketer  (allowed by Admin or SuperAdmin or Manager)    */
/* -------------------------------------------------------------------------- */

// REGISTER MARKETER 
exports.registerMarketer = async (req, res) => {
  try {
    const { name, email, password, address, phoneNumber, zone } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const creatorId = req.user.id;
    const creatorRole = req.user.role;

    if (
      creatorRole !== "superadmin" &&
      creatorRole !== "manager" &&
      creatorRole !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMarketer = await Marketer.create({
      name,
      email,
      password: hashedPassword,
      address,
      phoneNumber,
      zone,
      role: "marketer",
      createdBy: creatorId,
      creatorModel:
        creatorRole === "superadmin"
          ? "SuperAdmin"
          : creatorRole === "manager"
          ? "Manager"
          : "Admin",
      createdByName: req.user.name || req.user.email,
      isActive: true,
    });

    // Send welcome email
    try { await sendRegistrationEmail(email, name, creatorRole); } catch(e){ console.error('Marketer welcome email failed', e && e.message); }

    return res.status(201).json({
      message: "Marketer registered successfully",
      data: {
        id: newMarketer._id,
        name: newMarketer.name,
        email: newMarketer.email,
        role: newMarketer.role,
        createdBy: creatorRole,
      },
    });
  } catch (err) {
    console.error("Error registering marketer:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// UPDATE MARKETER
exports.updateMarketer = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" &&
        req.user.role !== "manager" &&
        req.user.role !== "admin")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Only SuperAdmin, Manager, or Admin can update Marketers." });
    }

    const marketerId = req.params.id;
    const { email, password, name } = req.body;

    const marketer = await Marketer.findById(marketerId);
    if (!marketer) return res.status(404).json({ message: "Marketer not found" });

    if (email) marketer.email = email;
    if (name) marketer.name = name;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      marketer.password = hashed;
    }

    await marketer.save();

    return res.status(200).json({
      message: "Marketer updated successfully",
      marketer: {
        id: marketer._id,
        name: marketer.name,
        email: marketer.email,
        role: marketer.role,
        createdBy: marketer.createdBy || null,
        updatedAt: marketer.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateMarketer error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// GET MARKETERS (with search + optional role filter)
exports.getMarketers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const userRole = req.user.role;
    const userId = req.user.id;

    if (
      userRole !== "superadmin" &&
      userRole !== "manager" &&
      userRole !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied for this role" });
    }

    const { search, role } = req.query;
    let filter = {};

    // 🔍 Case-insensitive search by name or email
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ email: regex }, { name: regex }];
    }

    // 🧩 Role-based restriction
    if (userRole === "admin") {
      // Admin sees only marketers they created
      filter.createdBy = userId;
    } else if (userRole === "manager") {
      // Manager can view marketer list (no restriction)
      // leave filter as-is so they see all
    }

    // 🧩 Optional: Filter by creator's role (for SuperAdmin)
    if (role && role.trim() !== "") {
      const roleRegex = new RegExp(role.trim(), "i");
      const UserModel = require("../models/User"); // Adjust if you use separate models
      const creators = await UserModel.find({ role: roleRegex }).select("_id");
      const creatorIds = creators.map((u) => u._id);
      filter.createdBy = { $in: creatorIds };
    }

    const marketers = await Marketer.find(filter)
      .select("name email role createdBy creatorModel createdAt updatedAt")
      .populate("createdBy", "name email role");

    if (!marketers || marketers.length === 0) {
      return res.status(404).json({ message: "No marketers found" });
    }

    const formatted = marketers.map((m) => ({
      _id: m._id,
      email: m.email,
      name: m.name,
      role: m.role,
      createdBy: m.createdBy
        ? {
            _id: m.createdBy._id,
            email: m.createdBy.email,
            name: m.createdBy.name,
            role: m.createdBy.role,
          }
        : null,
      creatorModel: m.creatorModel || null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      __v: m.__v || 0,
    }));

    return res.status(200).json({
      message: search || role
        ? "Filtered Marketer list"
        : "Marketers retrieved successfully",
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching marketers:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// DELETE MARKETER
exports.deleteMarketer = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" &&
        req.user.role !== "manager" &&
        req.user.role !== "admin")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Only SuperAdmin, Manager, or Admin can delete Marketers." });
    }

    const marketerId = req.params.id;
    const marketer = await Marketer.findById(marketerId);
    if (!marketer) return res.status(404).json({ message: "Marketer not found" });

    await Marketer.deleteOne({ _id: marketerId });

    return res.status(200).json({
      message: "Marketer deleted successfully",
      id: marketerId,
      deletedEmail: marketer.email,
    });
  } catch (err) {
    console.error("deleteMarketer error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

//  gst approval (allowed by Marketer/Manager/SuperAdmin)

exports.verifyGST = async (req, res) => {
  try {
    // 🔐 Ensure logged-in user exists
    if (!req.user)
      return res.status(401).json({ message: "Unauthorized: No user found" });

    const { role } = req.user;

    // ✅ Allowed roles
    const allowedRoles = ["superadmin",  "manager", "marketer"];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { gstNumber } = req.body;
    if (!gstNumber) {
      return res.status(400).json({ message: "GST number is required" });
    }

    const apiKey = process.env.GST_API_KEY || "451e1737f45a111b54dc0a025865a9d9";
    const url = `https://sheet.gstincheck.co.in/check/${apiKey}/${gstNumber}`;

    // ✅ Call GST verification API
    const response = await axios.get(url);
    const result = response.data;

    if (result.flag) {
      // 🔒 Create short-lived GST verification token (10 minutes)
      const gstVerificationToken = jwt.sign(
        { gstNumber: gstNumber.toUpperCase() },
        process.env.GST_VERIFY_SECRET || "gst_verify_secret",
        { expiresIn: "10m" }
      );

      return res.status(200).json({
        success: true,
        message: "GST verification successful",
        data: result.data,
        gstVerificationToken,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || "Invalid GST number",
        code: result.errorCode,
      });
    }
  } catch (err) {
    console.error("GST verification error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error verifying GST number",
      error: err.message,
    });
  }
};



/* -------------------------------------------------------------------------- */
/*              DEALER  (allowed by Admin/Marketer/Manager/SuperAdmin)        */
/* -------------------------------------------------------------------------- */

// REGISTER DEALER
exports.registerDealer = async (req, res) => {
  try {
    const {
      companyName,
      phoneNumber,
      gstNumber,
      address,
      email,
      username,
      password,
    } = req.body;

    // ✅ Step 1: Ensure authenticated user (via authMiddleware)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const creatorId = req.user.id;
    const creatorRole = req.user.role;

    // ✅ Step 2: Role-based access
    if (!["superadmin", "manager", "admin", "marketer"].includes(creatorRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ Step 3: Verify GST token from headers
    const gstToken = req.headers["gst-verification-token"];
    if (!gstToken) {
      return res.status(400).json({ message: "GST verification token required" });
    }

    let decodedGST;
    try {
      decodedGST = jwt.verify(
        gstToken,
        process.env.GST_VERIFY_SECRET || "gst_verify_secret"
      );
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired GST verification token",
      });
    }

    // ✅ Step 4: Ensure GST token matches the GST number in request
    if (decodedGST.gstNumber !== gstNumber.toUpperCase()) {
      return res.status(400).json({ message: "GST token does not match GST number" });
    }

    // ✅ Step 5: Validate required fields
    if (
      !companyName ||
      !phoneNumber ||
      !gstNumber ||
      !address ||
      !email ||
      !username ||
      !password
    ) {
      return res.status(400).json({ message: "Missing required dealer fields" });
    }

    // ✅ Step 6: Check for duplicate email or username
    const exists = await Dealer.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    // ✅ Step 7: Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Step 8: Create dealer in DB
    const newDealer = await Dealer.create({
      companyName,
      phoneNumber,
      gstNumber: gstNumber.toUpperCase(),
      address,
      email,
      username,
      password: hashedPassword,
      role: "dealer",
      createdBy: creatorId,
      creatorModel:
        creatorRole === "superadmin"
          ? "SuperAdmin"
          : creatorRole === "manager"
          ? "Manager"
          : creatorRole === "admin"
          ? "Admin"
          : "Marketer",
      createdByName: req.user.name || req.user.email || "Unknown",
      isActive: true,
      isApproved: true,
    });

    // ✅ Step 9: Send registration email (optional)
    try {
      await sendRegistrationEmail(email, companyName, creatorRole);
    } catch (e) {
      console.error("Dealer registration email error:", e?.message);
    }

    // ✅ Step 10: Return success response
    return res.status(201).json({
      message: "Dealer registered successfully",
      data: {
        id: newDealer._id,
        companyName: newDealer.companyName,
        email: newDealer.email,
        username: newDealer.username,
        role: newDealer.role,
        createdBy: creatorRole,
      },
    });
  } catch (err) {
    console.error("Error registering dealer:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// UPDATE DEALER
exports.updateDealer = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" &&
        req.user.role !== "manager" &&
        req.user.role !== "admin" &&
        req.user.role !== "marketer")
    ) {
      return res.status(403).json({ message: "Access denied. Only SuperAdmin, Manager, Admin, or Marketer can update Dealers." });
    }

  const dealerId = req.params.id;
  const { companyName, phoneNumber, gstNumber, address, email, username, password } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    if (email) dealer.email = email;
    if (username) dealer.username = username;
    if (companyName) dealer.companyName = companyName;
    if (phoneNumber) dealer.phoneNumber = phoneNumber;
    if (gstNumber) dealer.gstNumber = gstNumber.toUpperCase();
    if (address) dealer.address = address;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      dealer.password = hashed;
    }

    await dealer.save();

    return res.status(200).json({
      message: "Dealer updated successfully",
      dealer: {
        id: dealer._id,
        companyName: dealer.companyName,
        username: dealer.username,
        phoneNumber: dealer.phoneNumber,
        gstNumber: dealer.gstNumber,
        address: dealer.address,
        email: dealer.email,
        role: dealer.role,
        createdBy: dealer.createdBy || null,
        updatedAt: dealer.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateDealer error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET DEALERS (with search + optional role filter)
exports.getDealers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const userRole = req.user.role;
    const userId = req.user.id;

    if (
      userRole !== "superadmin" &&
      userRole !== "manager" &&
      userRole !== "admin" &&
      userRole !== "marketer"
    ) {
      return res.status(403).json({ message: "Access denied for this role" });
    }

    const { search, role } = req.query;
    let filter = {};

    // search by companyName, email, username or phone
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { email: regex },
        { companyName: regex },
        { username: regex },
        { phoneNumber: regex },
      ];
    }

    // Role-based restriction
    if (userRole === "marketer") {
      // Marketer sees only their own approved dealers
      filter.createdBy = userId;
      filter.isApproved = true;
    } else if (userRole === "admin" || userRole === "manager" || userRole === "superadmin") {
      // admin/manager/superadmin can view full list (no createdBy restriction)
    }

    // Optional filter by creator role (superadmin use-case)
    if (role && role.trim() !== "") {
      const roleRegex = new RegExp(role.trim(), "i");
      const UserModel = require("../models/User");
      const creators = await UserModel.find({ role: roleRegex }).select("_id");
      const creatorIds = creators.map((u) => u._id);
      filter.createdBy = { $in: creatorIds };
    }

    const dealers = await Dealer.find(filter)
      .select("companyName username phoneNumber gstNumber address email role createdBy creatorModel createdAt updatedAt")
      .populate("createdBy", "name email role");

    if (!dealers || dealers.length === 0) {
      return res.status(404).json({ message: "No dealers found" });
    }

    const formatted = dealers.map((m) => ({
      _id: m._id,
      companyName: m.companyName,
      username: m.username,
      phoneNumber: m.phoneNumber,
      gstNumber: m.gstNumber,
      address: m.address,
      email: m.email,
      role: m.role,
      createdBy: m.createdBy
        ? {
            _id: m.createdBy._id,
            email: m.createdBy.email,
            name: m.createdBy.name,
            role: m.createdBy.role,
          }
        : null,
      creatorModel: m.creatorModel || null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      __v: m.__v || 0,
    }));

    return res.status(200).json({
      message: search || role ? "Filtered Dealer list" : "Dealers retrieved successfully",
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching dealers:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE DEALER
exports.deleteDealer = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "superadmin" &&
        req.user.role !== "manager" &&
        req.user.role !== "admin" &&
        req.user.role !== "marketer")
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Only SuperAdmin, Manager, Admin, or Marketer can delete Dealers." });
    }

    const dealerId = req.params.id;
    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    await Dealer.deleteOne({ _id: dealerId });

    return res.status(200).json({
      message: "Dealer deleted successfully",
      id: dealerId,
      deletedEmail: dealer.email,
    });
  } catch (err) {
    console.error("deleteDealer error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Set active/inactive status for a user (SUPERADMIN can set for any, ADMIN for their marketers, MARKETER for their dealers)
exports.setUserActiveStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const actorRole = req.user.role;
    const actorId = req.user.id;
    const targetRole = (req.params.role || '').toLowerCase();
    const targetId = req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive (boolean) is required in body' });

    const allowedTargetRoles = ['admin', 'manager', 'marketer', 'dealer'];
    if (!allowedTargetRoles.includes(targetRole)) return res.status(400).json({ message: 'Invalid target role' });

    // Map role string to model
    let Model;
    if (targetRole === 'admin') Model = Admin;
    else if (targetRole === 'manager') Model = Manager;
    else if (targetRole === 'marketer') Model = Marketer;
    else if (targetRole === 'dealer') Model = Dealer;

    const target = await Model.findById(targetId);
    if (!target) return res.status(404).json({ message: `${targetRole} not found` });

    // Permission checks
    if (actorRole === 'superadmin') {
      // full permission
    } else if (actorRole === 'admin') {
      // admin can only toggle their marketers
      if (targetRole !== 'marketer') return res.status(403).json({ message: 'Admins can only change status of marketers' });
      if (!target.createdBy || target.createdBy.toString() !== actorId) return res.status(403).json({ message: 'Can only change status of marketers created by you' });
    } else if (actorRole === 'marketer') {
      // marketer can only toggle their own dealers
      if (targetRole !== 'dealer') return res.status(403).json({ message: 'Marketers can only change status of dealers' });
      if (!target.createdBy || target.createdBy.toString() !== actorId) return res.status(403).json({ message: 'Can only change status of dealers created by you' });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    target.isActive = isActive;
    await target.save();

    return res.status(200).json({ message: `${targetRole} ${isActive ? 'activated' : 'deactivated'} successfully`, id: target._id });
  } catch (err) {
    console.error('setUserActiveStatus error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


/* -------------------------------------------------------------------------- */
/*                                   LOGIN       (for all roles)              */
/* -------------------------------------------------------------------------- */

//  Login 
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res
        .status(400)
        .json({ message: "Email, password, and role are required" });

  let Model;
  if (role === "superadmin") Model = SuperAdmin;
  else if (role === "admin") Model = Admin;
  else if (role === "manager") Model = Manager;
  else if (role === "marketer") Model = Marketer;
  else if (role === "dealer") Model = Dealer;
  else return res.status(400).json({ message: "Invalid role" });

    const user = await Model.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check active status
    if (typeof user.isActive !== 'undefined' && !user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);

    return res.status(200).json({
      message: "Login successful",
      data: { token, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};


