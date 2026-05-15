const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { getSemesterReport, sendSemesterReport } = require("../controllers/semesterReportController");

const router = express.Router();

router.get("/", authRequired, requireRole("teacher"), getSemesterReport);
router.post("/send", authRequired, requireRole("teacher"), sendSemesterReport);

module.exports = router;

