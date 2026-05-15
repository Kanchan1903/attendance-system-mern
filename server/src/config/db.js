const mongoose = require("mongoose");
const Semester = require("../models/Semester");

async function connectDb(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  try {
    await Semester.syncIndexes();
  } catch {
    /* non-fatal if indexes cannot sync (e.g. conflicting legacy names) */
  }
}

module.exports = { connectDb };

