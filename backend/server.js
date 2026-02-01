/**
 * KhataBook API Server
 * Node.js + Express + MySQL + Google OAuth
 * Production-ready for Railway (PORT from env, root route, error handling, CORS).
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transactions");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow frontend when hosted separately (set FRONTEND_URL in Railway)
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route - avoid "Cannot GET /" on Railway
app.get("/", (req, res) => {
  res.send("Khatabook API is running 🚀");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "KhataBook API is running" });
});

// Auth mount debug (GET /api/auth) - verify mounting in browser; remove in production if desired
app.get("/api/auth", (req, res) => {
  res.send("Auth route working");
});

// API routes - POST /api/auth/google is defined in routes/auth.js
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);

// 404 handler - must come AFTER all routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server - Railway sets process.env.PORT
app.listen(PORT, () => {
  console.log(`🚀 KhataBook API running on port ${PORT}`);
  console.log(`🌍 CORS allowed for: ${frontendUrl}`);
});

