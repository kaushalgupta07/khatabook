/**
 * Auth routes - Google OAuth login.
 */
const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /auth/google
 * Body: { idToken: string } - Google ID token from frontend
 * Creates user if first login, returns JWT and user info.
 */
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }

  try {
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email?.split("@")[0] || "User";

    // Find or create user
    const [existingRows] = await pool.execute(
      "SELECT id, name, email FROM users WHERE google_id = ?",
      [googleId]
    );

    let userId;
    let userName = name;

    if (existingRows.length > 0) {
      userId = existingRows[0].id;
      userName = existingRows[0].name;
    } else {
      // First login - create user
      const [result] = await pool.execute(
        "INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)",
        [name, email, googleId]
      );
      userId = result.insertId;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: userId,
        name: userName,
        email,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

module.exports = router;
