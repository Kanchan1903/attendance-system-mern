const mongoose = require("mongoose");
const Semester = require("../models/Semester");

let cachedPromise = null;

async function connectDb(mongoUri) {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (!cachedPromise) {
    mongoose.set("strictQuery", true);
    cachedPromise = mongoose.connect(mongoUri).then(async (m) => {
      try {
        await Semester.syncIndexes();
      } catch {
        /* non-fatal if indexes cannot sync (e.g. conflicting legacy names) */
      }
      return m;
    });
  }
  await cachedPromise;
}

module.exports = { connectDb };

