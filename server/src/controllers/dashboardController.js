const Semester = require("../models/Semester");
const Classroom = require("../models/Classroom");
const ClassroomStudent = require("../models/ClassroomStudent");
const Attendance = require("../models/Attendance");

async function getDashboardSummary(req, res) {
  const teacherId = req.user.sub;
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  try {
    // 1. Get total active semesters/classrooms
    const semesters = await Semester.find({ teacherId }).lean();
    const semesterIds = semesters.map((s) => s._id);
    const classrooms = await Classroom.find({ teacherId, semesterId: { $in: semesterIds } }).lean();
    const classroomIds = classrooms.map((c) => c._id);

    // 2. Get total unique students
    const enrollments = await ClassroomStudent.find({ classroomId: { $in: classroomIds } }).lean();
    const uniqueStudentsCount = new Set(enrollments.map((e) => e.prn)).size;

    // 3. Get Attendance for current and last month
    const [currentMonthAttendance, lastMonthAttendance] = await Promise.all([
      Attendance.find({
        teacherId,
        date: { $gte: currentMonthStart, $lte: currentMonthEnd },
      }).lean(),
      Attendance.find({
        teacherId,
        date: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }).lean()
    ]);

    // Calculate Average Attendance
    const calcAvg = (records) => {
      if (records.length === 0) return 0;
      const present = records.filter(r => r.status === "P").length;
      return (present / records.length) * 100;
    };

    const currentAvg = calcAvg(currentMonthAttendance);
    const lastAvg = calcAvg(lastMonthAttendance);
    const growth = lastAvg === 0 ? (currentAvg > 0 ? 100 : 0) : ((currentAvg - lastAvg) / lastAvg) * 100;

    // 4. Subject Attendance Overview (Current Month)
    const subjectStatsMap = new Map();
    classrooms.forEach(c => {
      subjectStatsMap.set(String(c._id), {
        id: String(c._id),
        subjectName: c.subjectName,
        total: 0,
        present: 0,
        studentsCount: 0
      });
    });

    // Count students per classroom
    enrollments.forEach(e => {
      const cid = String(e.classroomId);
      if (subjectStatsMap.has(cid)) {
        subjectStatsMap.get(cid).studentsCount++;
      }
    });

    // Calculate subject-wise attendance
    currentMonthAttendance.forEach(a => {
      const cid = String(a.classroomId);
      if (subjectStatsMap.has(cid)) {
        const stats = subjectStatsMap.get(cid);
        stats.total++;
        if (a.status === "P") stats.present++;
      }
    });

    const subjectAttendance = Array.from(subjectStatsMap.values()).map(s => ({
      ...s,
      percent: s.total > 0 ? Number(((s.present / s.total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.percent - a.percent);

    // 5. Recent Classes
    // Group attendance records by classroomId, date, timeslot to infer unique classes
    const recentClassesMap = new Map();
    currentMonthAttendance.forEach(a => {
      const key = `${a.classroomId}_${a.date}_${a.timeslot}`;
      if (!recentClassesMap.has(key)) {
        const classroom = classrooms.find(c => String(c._id) === String(a.classroomId));
        recentClassesMap.set(key, {
          classroomId: a.classroomId,
          subjectName: classroom ? classroom.subjectName : 'Unknown',
          date: a.date,
          timeslot: a.timeslot,
          timestamp: new Date(`${a.date}T${a.timeslot.split('-')[0] || '00:00'}:00`).getTime()
        });
      }
    });

    const recentClasses = Array.from(recentClassesMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5) // Last 5 classes
      .map(c => ({
        ...c,
        status: new Date() > c.timestamp ? "Completed" : "Upcoming" // simplified status
      }));

    return res.json({
      kpis: {
        totalStudents: uniqueStudentsCount,
        totalClasses: classrooms.length,
        averageAttendance: Number(currentAvg.toFixed(1)),
        attendanceGrowth: Number(growth.toFixed(1))
      },
      subjectAttendance,
      recentClasses
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    return res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
}

module.exports = { getDashboardSummary };
