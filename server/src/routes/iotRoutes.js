const express = require("express");
const { startIotSession, stopIotSession, getActiveSession, markIotAttendance } = require("../controllers/iotController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Teacher routes to manage IoT sessions
router.post("/session/start", authRequired, requireRole("teacher"), startIotSession);
router.post("/session/stop/:classroomId", authRequired, requireRole("teacher"), stopIotSession);
router.get("/session/:classroomId", authRequired, requireRole("teacher"), getActiveSession);

// ESP32 endpoint (no auth required for simplicity in this prototype, or can use a simple API key later)
router.post("/attendance", markIotAttendance);

module.exports = router;
