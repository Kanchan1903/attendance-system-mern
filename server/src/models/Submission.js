const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    prn: { type: String, required: true, index: true },
    content: { type: String, default: "" }, // Can be a URL or text notes
    filePath: { type: String, default: null },
    originalFilename: { type: String, default: null },
    remark: { type: String, default: "" },
    status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
  },
  { timestamps: true }
);

// Ensure a student can only submit once per assignment (they can update it instead of creating duplicates)
SubmissionSchema.index({ assignmentId: 1, prn: 1 }, { unique: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
