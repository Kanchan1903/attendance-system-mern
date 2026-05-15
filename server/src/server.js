const path = require("path");
const fs = require("fs");

// Load environment from project root `.env` (preferred) or `server/.env`
const rootEnv = path.resolve(__dirname, "..", "..", ".env");
const serverEnv = path.resolve(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : serverEnv });

const { createApp } = require("./app");
const { connectDb } = require("./config/db");

async function main() {
  const port = Number(process.env.PORT || 5000);
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment");
  }

  await connectDb(mongoUri);

  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

