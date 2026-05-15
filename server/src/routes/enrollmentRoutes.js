const express = require("express");
const multer = require("multer");
const { authRequired, requireRole } = require("../middleware/auth");
const {
  joinByCode,
  listClassroomStudents,
  addStudentToClassroom,
  updateStudentInClassroom,
  removeStudentFromClassroom,
  uploadStudentsCsv,
} = require("../controllers/enrollmentController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Student joins a class by code
router.post("/join", authRequired, requireRole("student"), joinByCode);

// Teacher manages enrollment per classroom
router.get("/classrooms/:classroomId/students", authRequired, requireRole("teacher"), listClassroomStudents);
router.post("/classrooms/:classroomId/students", authRequired, requireRole("teacher"), addStudentToClassroom);
router.patch("/classrooms/:classroomId/students", authRequired, requireRole("teacher"), updateStudentInClassroom);
router.post("/classrooms/:classroomId/students/upload", authRequired, requireRole("teacher"), upload.single("studentsCsv"), uploadStudentsCsv);
router.delete("/classrooms/:classroomId/students", authRequired, requireRole("teacher"), removeStudentFromClassroom);

module.exports = router;

