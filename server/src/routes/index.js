const express = require("express");
const authRoutes = require("./authRoutes");
const semesterRoutes = require("./semesterRoutes");
const classroomRoutes = require("./classroomRoutes");
const enrollmentRoutes = require("./enrollmentRoutes");
const studentRoutes = require("./studentRoutes");
const semesterReportRoutes = require("./semesterReportRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/semesters", semesterRoutes);
router.use("/classrooms", classroomRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/student", studentRoutes);
router.use("/semester-report", semesterReportRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;

