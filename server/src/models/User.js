const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 190 },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["teacher", "student"], index: true },
    prn: { type: String, default: null, trim: true, maxlength: 32, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index(
  { teacherId: 1, prn: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "student", prn: { $type: "string" } },
  }
);

module.exports = mongoose.model("User", UserSchema);

