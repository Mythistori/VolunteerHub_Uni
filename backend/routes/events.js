import express from "express";
import db from "../db.js";
import { attachUserContext, isEventOwnerOrAdmin } from "../middleware/authInterface.js";

const router = express.Router();

// --- EVENT CRUD BACKEND ---
router.post("/", attachUserContext, (req, res) => {
  if (!["organizer", "admin"].includes(req.user.role)) {
    return res.status(403).json({ detail: "Only organizers or admins can create events" });
  }

  const { title, description, location, category, start_date, end_date } = req.body;
  if (!title || !location || !category || !start_date || !end_date) {
    return res.status(422).json({ detail: "Missing required event fields" });
  }

  const info = db
    .prepare(
      `INSERT INTO events (title, description, location, category, start_date, end_date, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title, description || "", location, category, start_date, end_date, req.user.id);

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(event);
});

router.get("/", (req, res) => {
  const { category, status } = req.query;
  let query = "SELECT * FROM events WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  res.json(db.prepare(query).all(...params));
});

router.get("/:id", (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ detail: "Event not found" });
  res.json(event);
});

router.patch("/:id", attachUserContext, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ detail: "Event not found" });
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  const allowed = ["title", "description", "location", "category", "start_date", "end_date", "status"];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }

  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  res.json(db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id));
});

router.delete("/:id", attachUserContext, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ detail: "Event not found" });
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// --- SHIFT MANAGEMENT BACKEND ---
router.post("/:eventId/shifts", attachUserContext, (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.eventId);
  if (!event) return res.status(404).json({ detail: "Event not found" });
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  const { title, start_time, end_time, capacity = 10, points_per_hour = 10 } = req.body;
  if (!title || !start_time || !end_time) {
    return res.status(422).json({ detail: "Missing required shift fields" });
  }

  const info = db
    .prepare(
      `INSERT INTO shifts (event_id, title, start_time, end_time, capacity, points_per_hour)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.eventId, title, start_time, end_time, capacity, points_per_hour);

  res.status(201).json(db.prepare("SELECT * FROM shifts WHERE id = ?").get(info.lastInsertRowid));
});

router.get("/:eventId/shifts", (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.eventId);
  if (!event) return res.status(404).json({ detail: "Event not found" });

  res.json(db.prepare("SELECT * FROM shifts WHERE event_id = ?").all(req.params.eventId));
});

router.patch("/shifts/:shiftId", attachUserContext, (req, res) => {
  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(req.params.shiftId);
  if (!shift) return res.status(404).json({ detail: "Shift not found" });

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(shift.event_id);
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  const allowed = ["title", "start_time", "end_time", "capacity", "points_per_hour"];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }

  if (updates.length > 0) {
    values.push(req.params.shiftId);
    db.prepare(`UPDATE shifts SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  res.json(db.prepare("SELECT * FROM shifts WHERE id = ?").get(req.params.shiftId));
});

router.delete("/shifts/:shiftId", attachUserContext, (req, res) => {
  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(req.params.shiftId);
  if (!shift) return res.status(404).json({ detail: "Shift not found" });

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(shift.event_id);
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  db.prepare("DELETE FROM shifts WHERE id = ?").run(req.params.shiftId);
  res.status(204).send();
});

export default router;