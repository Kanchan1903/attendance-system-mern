const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { listSemesters, createSemester, semesterSummary, exportSemesterAssignments } = require("../controllers/semesterController");

const router = express.Router();

router.get("/", authRequired, requireRole("teacher"), listSemesters);
router.get("/summary", authRequired, requireRole("teacher"), semesterSummary);
router.post("/", authRequired, requireRole("teacher"), createSemester);
router.get("/:id/export-assignments", authRequired, requireRole("teacher"), exportSemesterAssignments);

module.exports = router;

