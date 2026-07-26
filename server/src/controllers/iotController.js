const Attendance = require("../models/Attendance");
const ClassroomStudent = require("../models/ClassroomStudent");

// In-memory store for active IoT sessions.
// In a production environment, you might use Redis or a database table.
// Structure: [ { classroomId, date, timeslot, teacherId } ]
let activeSessions = [];

exports.startIotSession = async (req, res) => {
  try {
    const { classroomId, date, timeslot } = req.body;
    const teacherId = req.user.id;

    if (!classroomId || !date || !timeslot) {
      return res.status(400).json({ error: "classroomId, date, and timeslot are required" });
    }

    // Check if session already active for this classroom
    const existingIndex = activeSessions.findIndex((s) => s.classroomId === classroomId);
    if (existingIndex !== -1) {
      // Update it
      activeSessions[existingIndex] = { classroomId, date, timeslot, teacherId };
    } else {
      activeSessions.push({ classroomId, date, timeslot, teacherId });
    }

    res.json({ message: "IoT session started successfully", activeSession: { classroomId, date, timeslot } });
  } catch (err) {
    console.error("Error starting IoT session:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.stopIotSession = async (req, res) => {
  try {
    const { classroomId } = req.params;

    activeSessions = activeSessions.filter((s) => s.classroomId !== classroomId);

    res.json({ message: "IoT session stopped successfully" });
  } catch (err) {
    console.error("Error stopping IoT session:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const session = activeSessions.find((s) => s.classroomId === classroomId);

    if (session) {
      res.json({ active: true, session });
    } else {
      res.json({ active: false });
    }
  } catch (err) {
    console.error("Error getting IoT session:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Endpoint for the ESP32 device
exports.markIotAttendance = async (req, res) => {
  try {
    const { prn } = req.body;

    if (!prn) {
      return res.status(400).json({ error: "prn is required" });
    }

    if (activeSessions.length === 0) {
      return res.status(400).json({ error: "No active IoT sessions available" });
    }

    // Find all active classrooms this student is enrolled in
    const enrollments = await ClassroomStudent.find({ prn });
    const enrolledClassroomIds = enrollments.map(e => e.classroomId.toString());

    // Find a matching active session
    const matchingSession = activeSessions.find(s => enrolledClassroomIds.includes(s.classroomId.toString()));

    if (!matchingSession) {
      return res.status(400).json({ error: "Student not enrolled in any active IoT session" });
    }

    const { classroomId, date, timeslot, teacherId } = matchingSession;

    // Record attendance
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { prn, classroomId, date, timeslot },
      { 
        status: "P", 
        markedBy: "iot",
        teacherId 
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ message: "Attendance marked successfully", prn });
  } catch (err) {
    console.error("Error marking IoT attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};
