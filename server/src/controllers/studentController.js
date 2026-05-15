const ClassroomStudent = require("../models/ClassroomStudent");
const Classroom = require("../models/Classroom");
const Assignment = require("../models/Assignment");
const Attendance = require("../models/Attendance");

async function myClasses(req, res) {
  const prn = req.user.prn;
  if (!prn) return res.status(400).json({ error: "PRN missing" });
  const enrollments = await ClassroomStudent.find({ prn }).lean();
  const classIds = enrollments.map((e) => e.classroomId);
  const classrooms = await Classroom.find({ _id: { $in: classIds } })
    .populate("teacherId", "name email")
    .populate("semesterId", "semesterName sharedReportPath sharedReportDate")
    .sort({ createdAt: -1 })
    .lean();
  const assignments = await Assignment.find({ classroomId: { $in: classIds } }).sort({ createdAt: -1 }).lean();
  const assignmentsByClass = new Map();
  for (const a of assignments) {
    const key = String(a.classroomId);
    if (!assignmentsByClass.has(key)) assignmentsByClass.set(key, []);
    assignmentsByClass.get(key).push({
      _id: a._id,
      title: a.title,
      description: a.description || "",
      dueDate: a.dueDate || null,
      createdAt: a.createdAt,
    });
  }
  const classroomsWithAssignments = classrooms.map((c) => ({
    ...c,
    assignments: assignmentsByClass.get(String(c._id)) || [],
  }));
  return res.json({ classrooms: classroomsWithAssignments });
}

/**
 * Cumulative attendance: per enrolled subject and overall.
 * conducted = attendance rows for this student in that class; attended = status P.
 */
async function myAttendanceSummary(req, res) {
  const prn = req.user.prn;
  if (!prn) return res.status(400).json({ error: "PRN missing" });

  const enrollments = await ClassroomStudent.find({ prn }).lean();
  const classIds = enrollments.map((e) => e.classroomId);
  if (classIds.length === 0) {
    return res.json({
      subjects: [],
      overall: { conducted: 0, attended: 0, percent: 0 },
    });
  }

  const classrooms = await Classroom.find({ _id: { $in: classIds } }).lean();
  const byId = new Map(classrooms.map((c) => [String(c._id), c]));

  const agg = await Attendance.aggregate([
    { $match: { classroomId: { $in: classIds }, prn } },
    {
      $group: {
        _id: "$classroomId",
        conducted: { $sum: 1 },
        attended: { $sum: { $cond: [{ $eq: ["$status", "P"] }, 1, 0] } },
      },
    },
  ]);

  const statsByClass = new Map(agg.map((x) => [String(x._id), { conducted: x.conducted, attended: x.attended }]));

  let overallConducted = 0;
  let overallAttended = 0;

  const subjects = classIds
    .map((id) => {
      const c = byId.get(String(id));
      const st = statsByClass.get(String(id)) || { conducted: 0, attended: 0 };
      overallConducted += st.conducted;
      overallAttended += st.attended;
      const percent =
        st.conducted > 0 ? Number(((st.attended / st.conducted) * 100).toFixed(2)) : 0;
      return {
        classroomId: String(id),
        subjectName: c?.subjectName || "",
        classCode: c?.classCode || "",
        conducted: st.conducted,
        attended: st.attended,
        percent,
      };
    })
    .sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));

  const overallPercent =
    overallConducted > 0
      ? Number(((overallAttended / overallConducted) * 100).toFixed(2))
      : 0;

  return res.json({
    subjects,
    overall: {
      conducted: overallConducted,
      attended: overallAttended,
      percent: overallPercent,
    },
  });
}




const Submission = require('../models/Submission');

async function getClassroomDetails(req, res) {
  const prn = req.user.prn;
  const { classroomId } = req.params;
  const enrollment = await ClassroomStudent.findOne({ prn, classroomId }).lean();
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this class' });
  const classroom = await Classroom.findById(classroomId).populate('teacherId', 'name email').populate('semesterId', 'semesterName semesterCode sharedReportPath sharedReportDate').lean();
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
  const assignments = await Assignment.find({ classroomId }).sort({ createdAt: -1 }).lean();
  const assignmentIds = assignments.map(a => a._id);
  const submissions = await Submission.find({ prn, assignmentId: { $in: assignmentIds } }).lean();
  const subMap = new Map(submissions.map(s => [String(s.assignmentId), s]));
  const assignmentsWithSubs = assignments.map(a => ({ ...a, submission: subMap.get(String(a._id)) || null }));
  return res.json({ classroom, assignments: assignmentsWithSubs });
}

async function submitAssignment(req, res) {
  const prn = req.user.prn;
  const { classroomId, assignmentId } = req.params;
  const { content } = req.body;
  const enrollment = await ClassroomStudent.findOne({ prn, classroomId }).lean();
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });
  
  const updateData = { status: 'submitted' };
  if (content !== undefined) updateData.content = content;
  if (req.file) {
    updateData.filePath = `/uploads/${req.file.filename}`;
    updateData.originalFilename = req.file.originalname;
  }

  const submission = await Submission.findOneAndUpdate(
    { prn, assignmentId },
    updateData,
    { upsert: true, new: true }
  );
  return res.json({ success: true, submission });
}

async function unsubmitAssignment(req, res) {
  const prn = req.user.prn;
  const { classroomId, assignmentId } = req.params;
  const enrollment = await ClassroomStudent.findOne({ prn, classroomId }).lean();
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled' });
  
  await Submission.findOneAndDelete({ prn, assignmentId });
  return res.json({ success: true });
}

module.exports = { myClasses, myAttendanceSummary, getClassroomDetails, submitAssignment, unsubmitAssignment };
