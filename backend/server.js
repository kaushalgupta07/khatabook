/**
 * KhataBook API Server
 * Node.js + Express + MySQL + Google OAuth
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transactions");

const app = express();
const PORT = process.env.PORT || 8080;

// CORS - allow frontend origin
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "KhataBook API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`KhataBook API running at http://localhost:${PORT}`);
  console.log(`CORS allowed for: ${frontendUrl}`);
});
