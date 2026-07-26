const path = require("path");
const fs = require("fs");

// Load .env if present (for local testing or when fallback env vars exist on disk)
const rootEnv = path.resolve(__dirname, "..", ".env");
const serverEnv = path.resolve(__dirname, "..", "server", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : serverEnv });

const { createApp } = require("../server/src/app");
const { connectDb } = require("../server/src/config/db");

const app = createApp();

module.exports = async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(500).json({ error: "Server configuration error: MONGODB_URI is not set in environment variables." });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server configuration error: JWT_SECRET is not set in environment variables." });
    }

    await connectDb(mongoUri);
    return app(req, res);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Serverless API execution error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
