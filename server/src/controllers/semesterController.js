const Semester = require("../models/Semester");
const Classroom = require("../models/Classroom");
const ClassroomStudent = require("../models/ClassroomStudent");
const Assignment = require("../models/Assignment");

async function listSemesters(req, res) {
  const teacherId = req.user.sub;
  const semesters = await Semester.find({ teacherId }).sort({ createdAt: 1 }).lean();
  return res.json({ semesters });
}

async function createSemester(req, res) {
  const teacherId = req.user.sub;
  const { semesterName, semesterCode, subjectName, startDate, endDate } = req.body || {};
  if (!semesterName || !semesterCode) {
    return res.status(400).json({ error: "Missing semesterName or semesterCode" });
  }
  const subjectKey = subjectName != null ? String(subjectName).trim() : "";
  try {
    const semester = await Semester.create({
      teacherId,
      semesterName: String(semesterName).trim(),
      semesterCode: String(semesterCode).trim().toUpperCase(),
      subjectName: subjectKey,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });
    return res.status(201).json({ semester });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({
        error:
          "A semester with this name or code already exists for this faculty and subject track. Change the name, code, or subject track.",
      });
    }
    return res.status(400).json({ error: "Failed to create semester" });
  }
}

async function semesterSummary(req, res) {
  const teacherId = req.user.sub;
  const semesters = await Semester.find({ teacherId }).sort({ createdAt: 1 }).lean();
  const semesterIds = semesters.map((s) => s._id);
  const classrooms = await Classroom.find({ teacherId, semesterId: { $in: semesterIds } }).lean();

  const classesBySemester = new Map();
  classrooms.forEach((c) => {
    const key = String(c.semesterId || "");
    classesBySemester.set(key, (classesBySemester.get(key) || 0) + 1);
  });

  const classroomIds = classrooms.map((c) => c._id);
  const [studentsAgg, assignmentsAgg] = await Promise.all([
    ClassroomStudent.aggregate([
      { $match: { classroomId: { $in: classroomIds } } },
      { $lookup: { from: "classrooms", localField: "classroomId", foreignField: "_id", as: "classroom" } },
      { $unwind: "$classroom" },
      { $group: { _id: "$classroom.semesterId", prns: { $addToSet: "$prn" } } },
      { $project: { count: { $size: "$prns" } } },
    ]),
    Assignment.aggregate([
      { $match: { classroomId: { $in: classroomIds } } },
      { $lookup: { from: "classrooms", localField: "classroomId", foreignField: "_id", as: "classroom" } },
      { $unwind: "$classroom" },
      { $group: { _id: "$classroom.semesterId", count: { $sum: 1 } } },
    ]),
  ]);

  const studentsBySemester = new Map(studentsAgg.map((x) => [String(x._id), x.count]));
  const assignmentsBySemester = new Map(assignmentsAgg.map((x) => [String(x._id), x.count]));

  const summary = semesters.map((s) => ({
    ...s,
    classroomCount: classesBySemester.get(String(s._id)) || 0,
    enrolledStudents: studentsBySemester.get(String(s._id)) || 0,
    assignmentCount: assignmentsBySemester.get(String(s._id)) || 0,
  }));
  return res.json({ semesters: summary });
}

async function exportSemesterAssignments(req, res) {
  try {
    const teacherId = req.user.sub;
    const { id } = req.params;

    const semester = await Semester.findOne({ _id: id, teacherId }).lean();
    if (!semester) return res.status(404).json({ error: "Semester not found" });

    const classrooms = await Classroom.find({ semesterId: id, teacherId }).lean();
    const classroomIds = classrooms.map(c => c._id);
    const classesById = new Map(classrooms.map(c => [String(c._id), c]));

    const enrollments = await ClassroomStudent.find({ classroomId: { $in: classroomIds } }).lean();
    const prnsSet = new Set(enrollments.map(e => e.prn));
    const prns = Array.from(prnsSet);
    
    const User = require("../models/User");
    const students = await User.find({ role: "student", prn: { $in: prns } }).lean();
    const usersByPrn = new Map(students.map((s) => [s.prn, s]));

    const assignments = await Assignment.find({ classroomId: { $in: classroomIds } }).sort({ createdAt: 1 }).lean();
    const assignmentIds = assignments.map(a => a._id);

    const Submission = require("../models/Submission");
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean();

    const submissionsByStudent = {};
    submissions.forEach(sub => {
      if (!submissionsByStudent[sub.prn]) submissionsByStudent[sub.prn] = {};
      submissionsByStudent[sub.prn][sub.assignmentId] = sub.remark || "No remark";
    });

    const PDFDocument = require("pdfkit-table");
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=semester-assignment-report-${id}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(`Semester Assignment Report - ${semester.semesterName}`, { align: "center" });
    doc.moveDown();

    // Prepare table headers
    const headers = ["PRN", "Name"];
    assignments.forEach(a => {
      const className = classesById.get(String(a.classroomId))?.subjectName || "Unknown";
      headers.push(`${className}\n${a.title}`);
    });

    // Prepare table rows
    const rows = prns.map(prn => {
      const studentName = usersByPrn.get(prn)?.name || "";
      const row = [prn, studentName];
      assignments.forEach(a => {
        row.push(submissionsByStudent[prn]?.[a._id] || "-");
      });
      return row;
    }).sort((a, b) => a[1].localeCompare(b[1]));

    const table = {
      title: "Student Assignment Remarks (All Subjects)",
      headers: headers,
      rows: rows
    };

    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font("Helvetica").fontSize(8);
      },
    });

    doc.end();
  } catch (err) {
    console.error("Export Semester Assignments Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to export semester assignments" });
    }
  }
}

module.exports = { listSemesters, createSemester, semesterSummary, exportSemesterAssignments };

