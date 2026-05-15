const mongoose = require("mongoose");

const ClassroomSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subjectName: { type: String, required: true, trim: true, maxlength: 160 },
    classCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 16, index: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, ref: "Semester", default: null, index: true },
  },
  { timestamps: true }
);

ClassroomSchema.index({ teacherId: 1, semesterId: 1, subjectName: 1, classCode: 1 }, { unique: true });

module.exports = mongoose.model("Classroom", ClassroomSchema);

