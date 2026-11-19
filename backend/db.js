import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "volunteer.db"));
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    image TEXT DEFAULT '',
    capacity INTEGER DEFAULT 30,
    places_left INTEGER DEFAULT 30,
    points INTEGER DEFAULT 5,
    status TEXT DEFAULT 'published',
    organizer_id INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    role TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    capacity INTEGER DEFAULT 10,
    points_per_hour INTEGER DEFAULT 10,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shift_id, volunteer_id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER UNIQUE NOT NULL,
    volunteer_id INTEGER NOT NULL,
    checked_in INTEGER DEFAULT 0,
    hours_logged REAL DEFAULT 0.0,
    points_awarded INTEGER DEFAULT 0,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    event TEXT,
    event_id INTEGER,
    shift_id INTEGER,
    application_id INTEGER,
    participation_type TEXT DEFAULT 'volunteer',
    status TEXT DEFAULT 'Pending',
    message TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Auto-seed from root db.json on first run so frontend pages have data immediately
const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get().count;
const dbJsonPath = path.resolve(__dirname, "..", "db.json");

if (eventCount === 0 && fs.existsSync(dbJsonPath)) {
  const seed = JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));

  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, description, location, category, date, start_date, end_date, image, capacity, places_left, points, status, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1)
  `);

  for (const ev of seed.events || []) {
    insertEvent.run(
      ev.id,
      ev.title,
      ev.description || "",
      ev.location,
      ev.category,
      ev.date,
      ev.date,
      ev.date,
      ev.image || "",
      ev.capacity ?? 30,
      ev.places_left ?? ev.capacity ?? 30,
      ev.points ?? 5
    );
  }

  const insertShift = db.prepare(`
    INSERT INTO shifts (id, event_id, title, role, start_time, end_time, capacity, points_per_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, 10)
  `);

  for (const sh of seed.shifts || []) {
    insertShift.run(
      sh.id,
      sh.event_id,
      sh.role,
      sh.role,
      sh.start_time,
      sh.end_time,
      sh.capacity ?? 10
    );
  }

  const insertReg = db.prepare(`
    INSERT INTO registrations (id, full_name, email, event, event_id, shift_id, participation_type, status, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const reg of seed.registrations || []) {
    insertReg.run(
      reg.id,
      reg.full_name,
      reg.email,
      reg.event || null,
      reg.event_id || null,
      reg.shift_id || null,
      reg.participation_type || "volunteer",
      reg.status || "Pending",
      reg.message || "",
      reg.created_at || new Date().toISOString()
    );
  }
}

export default db;