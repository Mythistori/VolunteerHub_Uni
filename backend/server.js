import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import db from "./db.js";
import { JWT_SECRET } from "./middleware/authInterface.js";
import eventRoutes from "./routes/events.js";
import applicationRoutes from "./routes/applications.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";
import frontendBridgeRoutes from "./routes/frontendBridge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const require = createRequire(import.meta.url);
process.env.JWT_SECRET = JWT_SECRET;
const createAuthRouter = require(path.join(rootDir, "authRoutes.js"));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const authRouter = createAuthRouter(
  async (newUser) => {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(newUser.email);
    if (existing) return null;

    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(newUser.name, newUser.email, newUser.password_hash, newUser.role || "student");

    return db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(info.lastInsertRowid);
  },
  async (email) => {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
  }
);

app.use("/auth", authRouter);
app.use("/events", eventRoutes);
app.use("/", frontendBridgeRoutes);
app.use("/", applicationRoutes);
app.use("/", attendanceRoutes);
app.use("/admin", adminRoutes);

app.use(express.static(rootDir));
app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "main_page.html"));
});

app.listen(PORT, () => {
  console.log(`VolunteerHub Full-Stack Server running on http://localhost:${PORT}`);
});