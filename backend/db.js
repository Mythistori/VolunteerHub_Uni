import Database from "better-sqlite3";

const db = new Database("volunteer.db");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'published', -- 'draft' | 'published' | 'completed' | 'cancelled'
    organizer_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    title TEXT NOT NULL,
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
    status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
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
`);

export default db;