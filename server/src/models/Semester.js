const mongoose = require("mongoose");

const SemesterSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    semesterName: { type: String, required: true, trim: true, maxlength: 100 },
    semesterCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    /** Optional subject/course track so the same semester name can exist per faculty per subject */
    subjectName: { type: String, default: "", trim: true, maxlength: 120 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    sharedReportPath: { type: String, default: null },
    sharedReportDate: { type: Date, default: null },
  },
  { timestamps: true }
);

SemesterSchema.index({ teacherId: 1, semesterName: 1, semesterCode: 1 }, { unique: true });

module.exports = mongoose.model("Semester", SemesterSchema);

