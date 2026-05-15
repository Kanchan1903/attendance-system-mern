const mongoose = require("mongoose");

const ClassroomStudentSchema = new mongoose.Schema(
  {
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    prn: { type: String, required: true, trim: true, maxlength: 32, index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ClassroomStudentSchema.index({ classroomId: 1, prn: 1 }, { unique: true });

module.exports = mongoose.model("ClassroomStudent", ClassroomStudentSchema);

