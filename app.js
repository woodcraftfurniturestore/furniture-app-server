
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const passport = require("passport");

dotenv.config();
const connectDB = require("./config/db");
const Dealer = require("./models/dealerModel");
const { authMiddleware, verifyGSTTokenMiddleware } = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Connect MongoDB
(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message || err);
  }
})();

// Routes
console.log("🟡 Loading routes...");
try {
  const authRoutes = require("./routes/authRoutes");
  const cartRoutes = require("./routes/cartRoutes");
  const managerRoutes = require("./routes/managerRouters");
  const productRoutes = require("./routes/productRoutes");

  app.use("/api/auth", authRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/manager", managerRoutes);
  app.use("/api/product", productRoutes);
  console.log("✅ Routes mounted successfully");
} catch (err) {
  console.error("❌ Route import failed:", err);
}


// ✅ FCM token route for dealers
app.post("/api/send-fcm-token", async (req, res) => {
  const { token, dealerId } = req.body;

  if (!token || !dealerId) {
    return res.status(400).json({ success: false, error: "FCM token and dealerId are required" });
  }

  try {
    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    dealer.fcmToken = token;
    await dealer.save();
    res.status(200).json({ success: true, message: "Token updated successfully" });
  } catch (error) {
    console.error("FCM update error:", error);
    res.status(500).json({ success: false, error: error.message || "Server error" });
  }
});

// Root route
app.get("/", (req, res) => {
  res.status(200).send("✅ Furniture Backend Running Successfully!");
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Internal Error:", err.stack || err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app; // ✅ required by Vercel