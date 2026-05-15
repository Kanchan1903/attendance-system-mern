const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema(
  {
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true },
    filePath: { type: String, default: null },
    originalFilename: { type: String, default: null },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", AssignmentSchema);

