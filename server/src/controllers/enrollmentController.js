const bcrypt = require("bcryptjs");
const Classroom = require("../models/Classroom");
const ClassroomStudent = require("../models/ClassroomStudent");
const User = require("../models/User");

async function joinByCode(req, res) {
  const { classCode } = req.body || {};
  const prn = req.user.prn;
  if (!prn) return res.status(400).json({ error: "PRN missing" });
  if (!classCode) return res.status(400).json({ error: "Missing classCode" });

  const classroom = await Classroom.findOne({ classCode: String(classCode).trim().toUpperCase() }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom code not found" });

  try {
    await ClassroomStudent.create({ classroomId: classroom._id, prn });
    return res.json({ ok: true, classroomId: String(classroom._id) });
  } catch (err) {
    if (err && err.code === 11000) return res.json({ ok: true, already: true, classroomId: String(classroom._id) });
    return res.status(400).json({ error: "Failed to join classroom" });
  }
}

async function listClassroomStudents(req, res) {
  const teacherId = req.user.sub;
  const { classroomId } = req.params;

  const classroom = await Classroom.findOne({ _id: classroomId, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const enrollments = await ClassroomStudent.find({ classroomId }).lean();
  const prns = enrollments.map((e) => e.prn);
  const students = await User.find({ prn: { $in: prns }, role: "student", $or: [{ teacherId }, { teacherId: null }] }, { passwordHash: 0 }).lean();
  const byPrn = new Map(students.map((s) => [s.prn, s]));

  const rows = enrollments
    .map((e) => {
      const u = byPrn.get(e.prn);
      return {
        prn: e.prn,
        name: u ? u.name : "",
        email: u ? u.email : "",
        joinedAt: e.joinedAt,
      };
    })
    .sort((a, b) => (a.name || a.prn).localeCompare(b.name || b.prn));

  return res.json({ students: rows });
}

async function addStudentToClassroom(req, res) {
  const teacherId = req.user.sub;
  const { classroomId } = req.params;
  const { prn, name, email } = req.body || {};
  if (!prn || !name) return res.status(400).json({ error: "Missing prn or name" });

  const classroom = await Classroom.findOne({ _id: classroomId, teacherId }).lean();
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const prnStr = String(prn).trim();
  const nameStr = String(name).trim();

  let student = await User.findOne({ prn: prnStr, teacherId, role: "student" });
  if (!student) {
    // create a student like current PHP flow
    let candidateEmail = email ? String(email).trim().toLowerCase() : `${prnStr}@student.local`;
    let suffix = 1;
    // ensure unique email
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await User.findOne({ email: candidateEmail }).lean();
      if (!exists) break;
      candidateEmail = `${prnStr}+${suffix}@student.local`;
      suffix += 1;
    }
    const passwordHash = await bcrypt.hash("Student@123", 10);
    student = await User.create({
      name: nameStr,
      email: candidateEmail,
      passwordHash,
      role: "student",
      prn: prnStr,
      teacherId,
    });
  } else {
    student.name = nameStr;
    await student.save();
  }

  try {
    await ClassroomStudent.create({ classroomId, prn: prnStr });
  } catch (err) {
    if (!(err && err.code === 11000)) {
      return res.status(400).json({ error: "Failed to enroll student" });
    }
  }
  return res.json({ ok: true });
}

async function removeStudentFromClassroom(req, res) {
  try {
    const teacherId = req.user.sub;
    const { classroomId } = req.params;
    const { prn } = req.body || {};
    if (!prn) return res.status(400).json({ error: "Missing prn" });

    const classroom = await Classroom.findOne({ _id: classroomId, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    await ClassroomStudent.deleteOne({ classroomId, prn: String(prn).trim() });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove student" });
  }
}

async function updateStudentInClassroom(req, res) {
  try {
    const teacherId = req.user.sub;
    const { classroomId } = req.params;
    const { prn, name, email } = req.body || {};
    if (!prn) return res.status(400).json({ error: "Missing prn" });

    const classroom = await Classroom.findOne({ _id: classroomId, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const enrollment = await ClassroomStudent.findOne({ classroomId, prn: String(prn).trim() }).lean();
    if (!enrollment) return res.status(404).json({ error: "Student not enrolled in this class" });

    const student = await User.findOne({ prn: String(prn).trim(), teacherId, role: "student" });
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (name && String(name).trim()) {
      student.name = String(name).trim();
    }

    if (email && String(email).trim()) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: student._id } }).lean();
      if (exists) return res.status(400).json({ error: "Email already in use" });
      student.email = normalizedEmail;
    }

    await student.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update student details" });
  }
}

async function uploadStudentsCsv(req, res) {
  try {
    const teacherId = req.user.sub;
    const { classroomId } = req.params;
    const classroom = await Classroom.findOne({ _id: classroomId, teacherId }).lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: "CSV file is required" });

    const content = req.file.buffer.toString("utf8");
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.replace(/\uFEFF/g, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return res.status(400).json({ error: "CSV is empty" });

    const splitRow = (line) => {
      const comma = (line.match(/,/g) || []).length;
      const semicolon = (line.match(/;/g) || []).length;
      const delim = semicolon > comma ? ";" : ",";
      return line.split(delim).map((x) => x.trim());
    };

    let start = 0;
    const firstCols = splitRow(lines[0]).map((x) => x.toLowerCase());
    if (firstCols[0] === "prn") start = 1; // header row

    let added = 0;
    let skipped = 0;
    for (let i = start; i < lines.length; i++) {
      try {
        const cols = splitRow(lines[i]);
        const prn = cols[0] || "";
        const name = cols[1] || `Student ${prn}`;
        const email = cols[2] || "";
        if (!prn) {
          skipped += 1;
          continue;
        }

        const prnStr = String(prn).trim();
        const nameStr = String(name).trim();
        let student = await User.findOne({ prn: prnStr, teacherId, role: "student" });
        if (!student) {
          let candidateEmail = email ? String(email).trim().toLowerCase() : `${prnStr}@student.local`;
          let suffix = 1;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const exists = await User.findOne({ email: candidateEmail }).lean();
            if (!exists) break;
            candidateEmail = `${prnStr}+${suffix}@student.local`;
            suffix += 1;
          }
          const passwordHash = await bcrypt.hash("Student@123", 10);
          student = await User.create({
            name: nameStr,
            email: candidateEmail,
            passwordHash,
            role: "student",
            prn: prnStr,
            teacherId,
          });
        } else if (nameStr) {
          student.name = nameStr;
          await student.save();
        }

        try {
          await ClassroomStudent.create({ classroomId, prn: prnStr });
          added += 1;
        } catch (err) {
          skipped += 1;
        }
      } catch (err) {
        skipped += 1;
      }
    }

    return res.json({ ok: true, added, skipped });
  } catch (err) {
    const payload = { error: "Failed to upload CSV" };
    if (process.env.NODE_ENV !== "production" && err?.message) payload.details = err.message;
    return res.status(500).json(payload);
  }
}

module.exports = {
  joinByCode,
  listClassroomStudents,
  addStudentToClassroom,
  updateStudentInClassroom,
  removeStudentFromClassroom,
  uploadStudentsCsv,
};

