import express from "express";
import db from "../db.js";

const router = express.Router();

// Frontend expects GET /shifts and GET /shifts?event_id=1 with `role` field
router.get("/shifts", (req, res) => {
  const { event_id } = req.query;
  const rows = event_id
    ? db.prepare("SELECT * FROM shifts WHERE event_id = ?").all(event_id)
    : db.prepare("SELECT * FROM shifts").all();

  const normalized = rows.map((s) => ({
    ...s,
    role: s.role || s.title
  }));
  res.json(normalized);
});

// Frontend expects GET /registrations?event_id=... or ?email=...
router.get("/registrations", (req, res) => {
  const { event_id, email } = req.query;
  let query = "SELECT * FROM registrations WHERE 1=1";
  const params = [];

  if (event_id) {
    query += " AND event_id = ?";
    params.push(event_id);
  }
  if (email) {
    query += " AND LOWER(email) = LOWER(?)";
    params.push(email.trim());
  }

  res.json(db.prepare(query).all(...params));
});

// Frontend submits applications from main_page.html (script1.js) and events.html (event.js)
router.post("/registrations", (req, res) => {
  const {
    full_name,
    email,
    event,
    event_id,
    shift_id,
    participation_type = "volunteer",
    status = "Pending",
    message = "",
    created_at
  } = req.body || {};

  if (!full_name || !email) {
    return res.status(400).json({ error: "full_name and email are required" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Duplicate check for shift applications
  if (shift_id) {
    const duplicate = db
      .prepare("SELECT id FROM registrations WHERE shift_id = ? AND LOWER(email) = ? AND status != 'Rejected'")
      .get(shift_id, cleanEmail);
    if (duplicate) {
      return res.status(409).json({ error: "You have already applied for this shift." });
    }
  }

  // Also link into Student 3's applications table if a shift_id is provided
  let linkedAppId = null;
  if (shift_id) {
    let user = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (!user) {
      const userInfo = db
        .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'volunteer')")
        .run(full_name.trim(), cleanEmail, "guest_placeholder");
      user = { id: Number(userInfo.lastInsertRowid) };
    }

    const appStatus = status.toLowerCase() === "accepted" ? "approved" : status.toLowerCase() === "rejected" ? "rejected" : "pending";
    const appResult = db
      .prepare("INSERT OR IGNORE INTO applications (shift_id, volunteer_id, status) VALUES (?, ?, ?)")
      .run(shift_id, user.id, appStatus);

    if (appResult.lastInsertRowid) {
      linkedAppId = Number(appResult.lastInsertRowid);
    }
  }

  const info = db
    .prepare(`
      INSERT INTO registrations (full_name, email, event, event_id, shift_id, application_id, participation_type, status, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      full_name.trim(),
      cleanEmail,
      event || null,
      event_id || null,
      shift_id || null,
      linkedAppId,
      participation_type,
      status,
      message,
      created_at || new Date().toISOString()
    );

  const created = db.prepare("SELECT * FROM registrations WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

export default router;