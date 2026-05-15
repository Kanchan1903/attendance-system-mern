const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    prn: { type: String, required: true, trim: true, maxlength: 32, index: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    timeslot: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, required: true, enum: ["P", "A"] },
    markedBy: { type: String, enum: ["manual", "iot"], default: "manual" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ teacherId: 1, prn: 1, classroomId: 1, date: 1, timeslot: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);

