const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", authRequired, getDashboardSummary);

module.exports = router;
