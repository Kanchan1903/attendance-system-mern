const Classroom = require("../models/Classroom");
const Semester = require("../models/Semester");
const ClassroomStudent = require("../models/ClassroomStudent");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { generateClassCode } = require("../utils/classCode");

async function listClassrooms(req, res) {
  const teacherId = req.user.sub;
  const { semesterId } = req.query || {};
  const filter = { teacherId };
  if (semesterId) filter.semesterId = semesterId;
  const classrooms = await Classroom.find(filter).sort({ createdAt: -1 }).lean();
  const classroomIds = classrooms.map((c) => c._id);
  const [studentCounts, assignmentCounts] = await Promise.all([
    ClassroomStudent.aggregate([
      { $match: { classroomId: { $in: classroomIds } } },
      { $group: { _id: "$classroomId", count: { $sum: 1 } } },
    ]),
    Assignment.aggregate([
      { $match: { classroomId: { $in: classroomIds } } },
      { $group: { _id: "$classroomId", count: { $sum: 1 } } },
    ]),
  ]);

  const studentsByClass = new Map(studentCounts.map((x) => [String(x._id), x.count]));
  const assignmentsByClass = new Map(assignmentCounts.map((x) => [String(x._id), x.count]));

  const enriched = classrooms.map((c) => ({
    ...c,
    studentCount: studentsByClass.get(String(c._id)) || 0,
    assignmentCount: assignmentsByClass.get(String(c._id)) || 0,
  }));
  return res.json({ classrooms: enriched });
}

async function createClassroom(req, res) {
  const teacherId = req.user.sub;
  const { subjectName, semesterId } = req.body || {};
  if (!subjectName) return res.status(400).json({ error: "Missing subjectName" });

  let validSemesterId = null;
  if (semesterId) {
    const ok = await Semester.findOne({ _id: semesterId, teacherId }).lean();
    if (!ok) return res.status(400).json({ error: "Invalid semesterId" });
    validSemesterId = semesterId;
  }

  for (let i = 0; i < 12; i++) {
    const classCode = generateClassCode(8);
    try {
      const classroom = await Classroom.create({
        teacherId,
        subjectName: String(subjectName).trim(),
        semesterId: validSemesterId,
        classCode,
      });
      return res.status(201).json({ classroom });
    } catch (err) {
      if (err && err.code === 11000) continue;
      return res.status(400).json({ error: "Failed to create classroom" });
    }
  }
  return res.status(500).json({ error: "Could not generate unique class code" });
}

async function deleteClassroom(req, res) {
  const teacherId = req.user.sub;
  const { id } = req.params;
  const classroom = await Classroom.findOneAndDelete({ _id: id, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });
  await ClassroomStudent.deleteMany({ classroomId: id });
  await Assignment.deleteMany({ classroomId: id });
  await Attendance.deleteMany({ classroomId: id });
  return res.json({ ok: true });
}

async function getClassroomDetails(req, res) {
  const teacherId = req.user.sub;
  const { id } = req.params;
  const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const enrollments = await ClassroomStudent.find({ classroomId: id }).lean();
  const prns = enrollments.map((e) => e.prn);
  const students = await User.find({ role: "student", prn: { $in: prns }, $or: [{ teacherId }, { teacherId: null }] }, { passwordHash: 0 }).lean();
  const usersByPrn = new Map(students.map((s) => [s.prn, s]));

  const attendanceRecords = await Attendance.find({ classroomId: id }).lean();
  const uniqueClasses = new Set(attendanceRecords.map(r => `${r.date}_${r.timeslot}`));
  const totalClasses = uniqueClasses.size;

  const presentCountByPrn = new Map();
  attendanceRecords.forEach(r => {
    if (r.status === "P") {
      presentCountByPrn.set(r.prn, (presentCountByPrn.get(r.prn) || 0) + 1);
    }
  });

  const studentRows = enrollments
    .map((e) => {
      const present = presentCountByPrn.get(e.prn) || 0;
      const percent = totalClasses > 0 ? ((present / totalClasses) * 100).toFixed(1) : 0;
      return {
        prn: e.prn,
        name: usersByPrn.get(e.prn)?.name || "",
        email: usersByPrn.get(e.prn)?.email || "",
        attendancePercent: Number(percent)
      };
    })
    .sort((a, b) => (a.name || a.prn).localeCompare(b.name || b.prn));

  const assignments = await Assignment.find({ classroomId: id }).sort({ dueDate: 1, createdAt: -1 }).lean();
  return res.json({ classroom, students: studentRows, assignments });
}

async function getAttendanceSheet(req, res) {
  const teacherId = req.user.sub;
  const { id } = req.params;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const timeslot = String(req.query.timeslot || "Lecture 1");

  const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const enrollments = await ClassroomStudent.find({ classroomId: id }).lean();
  const prns = enrollments.map((e) => e.prn);
  const students = await User.find({ role: "student", prn: { $in: prns } }).lean();
  const usersByPrn = new Map(students.map((s) => [s.prn, s]));

  const rows = enrollments
    .map((e) => ({
      prn: e.prn,
      name: usersByPrn.get(e.prn)?.name || "",
      email: usersByPrn.get(e.prn)?.email || "",
      status: "",
    }))
    .sort((a, b) => (a.name || a.prn).localeCompare(b.name || b.prn));

  const attendance = await Attendance.find({ classroomId: id, date, timeslot }).lean();
  const statusByPrn = new Map(attendance.map((a) => [a.prn, a.status]));
  rows.forEach((r) => {
    r.status = statusByPrn.get(r.prn) || "";
  });

  return res.json({ classroom, date, timeslot, rows });
}

async function saveAttendanceSheet(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id } = req.params;
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10));
    const timeslot = String(req.body?.timeslot || "Lecture 1");
    const statuses = req.body?.statuses || {};

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const enrollments = await ClassroomStudent.find({ classroomId: id }).lean();
    const allowedPrns = new Set(enrollments.map((e) => e.prn));

    const mongoose = require("mongoose");
    const ops = [];
    for (const [prn, status] of Object.entries(statuses)) {
      if (!allowedPrns.has(prn)) continue;
      if (status !== "P" && status !== "A") continue;
      ops.push({
        updateOne: {
          filter: { prn, classroomId: new mongoose.Types.ObjectId(id), date, timeslot },
          update: { $set: { status, markedBy: "manual", teacherId: new mongoose.Types.ObjectId(teacherId) } },
          upsert: true,
        },
      });
    }
    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("Save Attendance Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function exportAttendance(req, res) {
  const teacherId = req.user.sub;
  const { id } = req.params;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const timeslot = String(req.query.timeslot || "Lecture 1");

  const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const enrollments = await ClassroomStudent.find({ classroomId: id }).lean();
  const prns = enrollments.map((e) => e.prn);
  const students = await User.find({ role: "student", prn: { $in: prns } }).lean();
  const usersByPrn = new Map(students.map((s) => [s.prn, s]));
  const attendance = await Attendance.find({ classroomId: id, date, timeslot }).lean();
  const statusByPrn = new Map(attendance.map((a) => [a.prn, a.status]));

  const lines = ["PRN\tName\tDate\tTime Slot\tStatus"];
  enrollments
    .map((e) => ({
      prn: e.prn,
      name: usersByPrn.get(e.prn)?.name || "",
      status: statusByPrn.get(e.prn) || "A",
    }))
    .sort((a, b) => (a.name || a.prn).localeCompare(b.name || b.prn))
    .forEach((r) => {
      lines.push(`${r.prn}\t${r.name}\t${date}\t${timeslot}\t${r.status}`);
    });

  res.setHeader("Content-Type", "application/vnd.ms-excel");
  res.setHeader("Content-Disposition", `attachment; filename=attendance-${id}-${date}.xls`);
  return res.send(lines.join("\n"));
}

async function listAssignments(req, res) {
  const teacherId = req.user.sub;
  const { id } = req.params;
  const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });
  const assignments = await Assignment.find({ classroomId: id }).sort({ createdAt: -1 }).lean();
  return res.json({ assignments });
}

async function createAssignment(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id } = req.params;
    const { title, description, dueDate } = req.body || {};
    if (!title) return res.status(400).json({ error: "Missing title" });

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const assignmentData = {
      classroomId: id,
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      dueDate: dueDate ? new Date(dueDate) : null,
    };

    if (req.file) {
      assignmentData.filePath = `/uploads/${req.file.filename}`;
      assignmentData.originalFilename = req.file.originalname;
    }

    const assignment = await Assignment.create(assignmentData);
    return res.status(201).json({ assignment });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create assignment" });
  }
}

async function updateAssignment(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id, assignmentId } = req.params;
    const { title, description, dueDate } = req.body || {};

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const assignment = await Assignment.findOne({ _id: assignmentId, classroomId: id });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    if (title) assignment.title = String(title).trim();
    if (description !== undefined) assignment.description = String(description).trim();
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;

    if (req.file) {
      assignment.filePath = `/uploads/${req.file.filename}`;
      assignment.originalFilename = req.file.originalname;
    }

    await assignment.save();
    return res.json({ assignment });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update assignment" });
  }
}

async function deleteAssignment(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id, assignmentId } = req.params;

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const assignment = await Assignment.findOneAndDelete({ _id: assignmentId, classroomId: id });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const Submission = require("../models/Submission");
    await Submission.deleteMany({ assignmentId });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete assignment" });
  }
}

async function getAssignmentSubmissions(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id, assignmentId } = req.params;

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const assignment = await Assignment.findOne({ _id: assignmentId, classroomId: id }).lean();
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const Submission = require("../models/Submission");
    const submissions = await Submission.find({ assignmentId }).lean();
    
    const prns = submissions.map(s => s.prn);
    const students = await User.find({ role: "student", prn: { $in: prns } }).lean();
    const studentsByPrn = new Map(students.map(s => [s.prn, s]));

    const enrichedSubmissions = submissions.map(s => ({
      ...s,
      studentName: studentsByPrn.get(s.prn)?.name || "Unknown",
    })).sort((a, b) => a.studentName.localeCompare(b.studentName));

    return res.json({ assignment, submissions: enrichedSubmissions });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
}

async function updateSubmissionRemark(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id, submissionId } = req.params;
    const { remark } = req.body;

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const Submission = require("../models/Submission");
    const submission = await Submission.findByIdAndUpdate(
      submissionId,
      { remark, status: "graded" },
      { new: true }
    );
    
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    return res.json({ submission });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update remark" });
  }
}

async function exportAssignments(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id } = req.params;

    const classroom = await Classroom.findOne({ _id: id, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const enrollments = await ClassroomStudent.find({ classroomId: id }).lean();
    const prns = enrollments.map((e) => e.prn);
    const students = await User.find({ role: "student", prn: { $in: prns } }).lean();
    const usersByPrn = new Map(students.map((s) => [s.prn, s]));

    const assignments = await Assignment.find({ classroomId: id }).sort({ createdAt: 1 }).lean();
    const assignmentIds = assignments.map(a => a._id);

    const Submission = require("../models/Submission");
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean();

    const submissionsByStudent = {};
    submissions.forEach(sub => {
      if (!submissionsByStudent[sub.prn]) submissionsByStudent[sub.prn] = {};
      submissionsByStudent[sub.prn][sub.assignmentId] = sub.remark || "No remark";
    });

    const PDFDocument = require("pdfkit-table");
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=assignment-report-${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`Assignment Report - ${classroom.subjectName}`, { align: "center" });
    doc.moveDown();

    // Prepare table headers
    const headers = ["PRN", "Name"];
    assignments.forEach(a => headers.push(a.title));

    // Prepare table rows
    const rows = enrollments.map(e => {
      const studentName = usersByPrn.get(e.prn)?.name || "";
      const row = [e.prn, studentName];
      assignments.forEach(a => {
        row.push(submissionsByStudent[e.prn]?.[a._id] || "-");
      });
      return row;
    }).sort((a, b) => a[1].localeCompare(b[1]));

    const table = {
      title: "Student Assignment Remarks",
      headers: headers,
      rows: rows
    };

    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font("Helvetica").fontSize(10);
      },
    });

    doc.end();
  } catch (err) {
    console.error("Export Assignments Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to export assignments" });
    }
  }
}

module.exports = {
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
};


