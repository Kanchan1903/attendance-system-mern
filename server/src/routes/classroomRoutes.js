const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const {
  listClassrooms,
  createClassroom,
  deleteClassroom,
  getClassroomDetails,
  getAttendanceSheet,
  saveAttendanceSheet,
  exportAttendance,
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  updateSubmissionRemark,
  exportAssignments,
} = require("../controllers/classroomController");

const router = express.Router();
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

router.get("/", authRequired, requireRole("teacher"), listClassrooms);
router.post("/", authRequired, requireRole("teacher"), createClassroom);
router.get("/:id/details", authRequired, requireRole("teacher"), getClassroomDetails);
router.get("/:id/attendance", authRequired, requireRole("teacher"), getAttendanceSheet);
router.post("/:id/attendance", authRequired, requireRole("teacher"), saveAttendanceSheet);
router.get("/:id/export", authRequired, requireRole("teacher"), exportAttendance);
router.get("/:id/export-assignments", authRequired, requireRole("teacher"), exportAssignments);
router.get("/:id/assignments", authRequired, requireRole("teacher"), listAssignments);
router.post("/:id/assignments", authRequired, requireRole("teacher"), upload.single("file"), createAssignment);
router.get("/:id/assignments/:assignmentId/submissions", authRequired, requireRole("teacher"), getAssignmentSubmissions);
router.put("/:id/assignments/:assignmentId/submissions/:submissionId/remark", authRequired, requireRole("teacher"), updateSubmissionRemark);
router.put("/:id/assignments/:assignmentId", authRequired, requireRole("teacher"), upload.single("file"), updateAssignment);
router.delete("/:id/assignments/:assignmentId", authRequired, requireRole("teacher"), deleteAssignment);
router.delete("/:id", authRequired, requireRole("teacher"), deleteClassroom);

module.exports = router;

