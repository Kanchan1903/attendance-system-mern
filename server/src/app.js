const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  app.use("/uploads", express.static(path.join(process.cwd(), uploadDir)));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", apiRoutes);

  return app;
}

module.exports = { createApp };

