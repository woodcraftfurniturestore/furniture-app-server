
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

/* Auth Middleware */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader)
      return res.status(401).json({ message: "Access denied. No token provided." });

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* GST Token Middleware */
const verifyGSTTokenMiddleware = (req, res, next) => {
  try {
    const gstToken = req.headers["gst-verification-token"];
    if (!gstToken)
      return res.status(400).json({ message: "GST verification token required" });

    const decodedGST = jwt.verify(
      gstToken,
      process.env.GST_VERIFY_SECRET || "gst_verify_secret"
    );

    if (
      req.body.gstNumber &&
      decodedGST.gstNumber !== req.body.gstNumber.toUpperCase()
    ) {
      return res
        .status(400)
        .json({ message: "GST token does not match GST number" });
    }

    req.verifiedGST = decodedGST;
    next();
  } catch (err) {
    console.error("GST token error:", err.message);
    return res
      .status(401)
      .json({ message: "Invalid or expired GST verification token" });
  }
};

module.exports = { authMiddleware, verifyGSTTokenMiddleware };
