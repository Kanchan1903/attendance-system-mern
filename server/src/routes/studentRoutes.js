const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const { myClasses, myAttendanceSummary, getClassroomDetails, submitAssignment, unsubmitAssignment } = require("../controllers/studentController");

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

router.get("/classes", authRequired, requireRole("student"), myClasses);
router.get("/attendance-summary", authRequired, requireRole("student"), myAttendanceSummary);

router.get('/class/:classroomId', authRequired, requireRole('student'), getClassroomDetails);
router.post('/class/:classroomId/assignments/:assignmentId/submit', authRequired, requireRole('student'), upload.single("file"), submitAssignment);
router.delete('/class/:classroomId/assignments/:assignmentId/submit', authRequired, requireRole('student'), unsubmitAssignment);

module.exports = router;


