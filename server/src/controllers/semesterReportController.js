const Classroom = require("../models/Classroom");
const ClassroomStudent = require("../models/ClassroomStudent");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Semester = require("../models/Semester");
const fs = require("fs");
const path = require("path");

function resolveRange(range, from, to) {
  const today = new Date().toISOString().slice(0, 10);
  if (range === "1month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return { from: d.toISOString().slice(0, 10), to: today, range: "1month" };
  }
  if (range === "custom") {
    const safeFrom = from || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      return d.toISOString().slice(0, 10);
    })();
    const safeTo = to || today;
    return { from: safeFrom, to: safeTo, range: "custom" };
  }
  const d = new Date();
  d.setDate(d.getDate() - 15);
  return { from: d.toISOString().slice(0, 10), to: today, range: "15days" };
}

async function buildSemesterMatrix({ teacherId, semesterId, range, from, to }) {
  const semester = await Semester.findOne({ _id: semesterId, teacherId }).lean();
  if (!semester) return null;

  const resolved = resolveRange(range, from, to);
  const subjects = await Classroom.find({ teacherId, semesterId })
    .sort({ subjectName: 1, createdAt: 1 })
    .lean();
  const subjectIds = subjects.map((s) => s._id);

  const enrollments = await ClassroomStudent.find({ classroomId: { $in: subjectIds } }).lean();
  const uniquePrns = [...new Set(enrollments.map((e) => e.prn))];
  const students = await User.find({ role: "student", prn: { $in: uniquePrns }, $or: [{ teacherId }, { teacherId: null }] }).lean();
  const studentByPrn = new Map(students.map((s) => [s.prn, s]));

  const attendanceRows = await Attendance.find({
    classroomId: { $in: subjectIds },
    date: { $gte: resolved.from, $lte: resolved.to },
    prn: { $in: uniquePrns },
  }).lean();

  const agg = new Map();
  for (const a of attendanceRows) {
    const key = `${a.prn}:${String(a.classroomId)}`;
    const cur = agg.get(key) || { total: 0, present: 0 };
    cur.total += 1;
    if (a.status === "P") cur.present += 1;
    agg.set(key, cur);
  }

  const matrixRows = uniquePrns
    .map((prn) => {
      const user = studentByPrn.get(prn);
      const subjectStats = {};
      let cumTotal = 0;
      let cumPresent = 0;
      for (const subj of subjects) {
        const key = `${prn}:${String(subj._id)}`;
        const val = agg.get(key) || { total: 0, present: 0 };
        const percent = val.total > 0 ? Number(((val.present / val.total) * 100).toFixed(2)) : 0;
        subjectStats[String(subj._id)] = {
          conducted: val.total,
          attended: val.present,
          total: val.total,
          present: val.present,
          percent,
        };
        cumTotal += val.total;
        cumPresent += val.present;
      }
      const cumulativePercent = cumTotal > 0 ? Number(((cumPresent / cumTotal) * 100).toFixed(2)) : 0;
      return {
        prn,
        name: user?.name || "",
        subjectStats,
        cumulativePercent,
        totalClasses: cumTotal,
        totalAttended: cumPresent,
      };
    })
    .sort((a, b) => (a.name || a.prn).localeCompare(b.name || b.prn));

  return {
    semester: {
      id: String(semester._id),
      semesterName: semester.semesterName,
      semesterCode: semester.semesterCode,
    },
    range: resolved.range,
    from: resolved.from,
    to: resolved.to,
    subjects: subjects.map((s) => ({ id: String(s._id), subjectName: s.subjectName, classCode: s.classCode })),
    rows: matrixRows,
  };
}

async function getSemesterReport(req, res) {
  const teacherId = req.user.sub;
  const semesterId = req.query.semesterId || req.query.semester_id;
  const range = req.query.range || "15days";
  const from = req.query.from || "";
  const to = req.query.to || "";
  const format = (req.query.format || "").toLowerCase();

  if (!semesterId) return res.status(400).json({ error: "semesterId is required" });
  const report = await buildSemesterMatrix({ teacherId, semesterId, range, from, to });
  if (!report) return res.status(404).json({ error: "Semester not found" });

  if (format === "xls") {
    const headers = ["PRN", "Student", ...report.subjects.map((s) => `${s.subjectName} %`), "Cumulative %", "Total Conducted", "Total Attended"];
    const lines = [headers.join("\t")];
    for (const row of report.rows) {
      const vals = [row.prn, row.name];
      for (const s of report.subjects) {
        vals.push(`${row.subjectStats[s.id]?.percent ?? 0}%`);
      }
      vals.push(`${row.cumulativePercent}%`, String(row.totalClasses), String(row.totalAttended));
      lines.push(vals.join("\t"));
    }
    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", `attachment; filename=semester-cumulative-${report.semester.id}-${report.from}-to-${report.to}.xls`);
    return res.send(lines.join("\n"));
  }

  if (format === 'pdf') {
    const PDFDocument = require('pdfkit-table');
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=semester-cumulative-${report.semester.id}-${report.from}-to-${report.to}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).text("Semester Cumulative Attendance", { align: 'center' });
    doc.fontSize(12).text(`${report.semester.semesterName} (${report.semester.semesterCode})`, { align: 'center' });
    doc.text(`Range: ${report.from} to ${report.to}`, { align: 'center' });
    doc.moveDown();

    const headers = ["PRN", "Student", ...report.subjects.map((s) => `${s.subjectName} %`), "Cumul %", "Cond", "Att"];

    const rows = report.rows.map(row => {
      const vals = [String(row.prn), String(row.name)];
      for (const s of report.subjects) vals.push(`${row.subjectStats[s.id]?.percent ?? 0}%`);
      vals.push(`${row.cumulativePercent}%`, String(row.totalClasses), String(row.totalAttended));
      return vals;
    });

    const table = {
      headers: headers,
      rows: rows,
    };

    try {
      await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
        prepareRow: () => doc.font("Helvetica").fontSize(8),
      });
    } catch (e) {
      console.error(e);
    }

    doc.end();
    return;
  }

  return res.json(report);
}

async function sendSemesterReport(req, res) {
  const teacherId = req.user.sub;
  const semesterId = req.body.semesterId || req.query.semesterId;
  const range = req.body.range || req.query.range || "15days";
  const from = req.body.from || req.query.from || "";
  const to = req.body.to || req.query.to || "";

  if (!semesterId) return res.status(400).json({ error: "semesterId is required" });
  const report = await buildSemesterMatrix({ teacherId, semesterId, range, from, to });
  if (!report) return res.status(404).json({ error: "Semester not found" });

  const PDFDocument = require('pdfkit-table');
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  const reportsDir = path.join(process.cwd(), "uploads", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `semester-cumulative-${report.semester.id}-${Date.now()}.pdf`;
  const filePath = path.join(reportsDir, filename);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  doc.fontSize(16).text("Semester Cumulative Attendance", { align: 'center' });
  doc.fontSize(12).text(`${report.semester.semesterName} (${report.semester.semesterCode})`, { align: 'center' });
  doc.text(`Range: ${report.from} to ${report.to}`, { align: 'center' });
  doc.moveDown();

  const headers = ["PRN", "Student", ...report.subjects.map((s) => `${s.subjectName} %`), "Cumul %", "Cond", "Att"];

  const rows = report.rows.map(row => {
    const vals = [String(row.prn), String(row.name)];
    for (const s of report.subjects) vals.push(`${row.subjectStats[s.id]?.percent ?? 0}%`);
    vals.push(`${row.cumulativePercent}%`, String(row.totalClasses), String(row.totalAttended));
    return vals;
  });

  const table = {
    headers: headers,
    rows: rows,
  };

  try {
    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
      prepareRow: () => doc.font("Helvetica").fontSize(8),
    });
  } catch (e) {
    console.error("PDF Generation Error:", e);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }

  doc.end();

  stream.on("finish", async () => {
    const dbPath = `/uploads/reports/${filename}`;
    await Semester.findOneAndUpdate(
      { _id: semesterId, teacherId },
      { sharedReportPath: dbPath, sharedReportDate: new Date() }
    );
    res.json({ success: true, message: "Report successfully shared with students." });
  });

  stream.on("error", (err) => {
    console.error("File writing error:", err);
    res.status(500).json({ error: "Failed to save the report" });
  });
}

module.exports = { getSemesterReport, sendSemesterReport };


