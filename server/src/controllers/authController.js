const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signAccessToken } = require("../utils/tokens");

async function register(req, res) {
  try {
    const { name, email, password, role, prn } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (role === "student" && !prn) {
      return res.status(400).json({ error: "PRN is required for student" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      role,
      prn: role === "student" ? String(prn).trim() : null,
    });
    const token = signAccessToken(user);
    return res.status(201).json({
      token,
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role, prn: user.prn },
    });
  } catch (err) {
    const msg = err && err.code === 11000 ? "User already exists" : "Failed to register";
    const status = err && err.code === 11000 ? 400 : 500;
    return res.status(status).json({ error: msg, detail: process.env.NODE_ENV === "production" ? undefined : String(err.message || err) });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).lean();
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAccessToken(user);
    return res.json({
      token,
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role, prn: user.prn },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to login", detail: process.env.NODE_ENV === "production" ? undefined : String(err.message || err) });
  }
}

async function me(req, res) {
  return res.json({
    user: {
      id: req.user.sub,
      role: req.user.role,
      prn: req.user.prn || null,
      name: req.user.name || "",
    },
  });
}

module.exports = { register, login, me };

