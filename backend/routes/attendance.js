import express from "express";
import db from "../db.js";
import { attachUserContext, isEventOwnerOrAdmin } from "../middleware/authInterface.js";

const router = express.Router();

function calculatePoints(hoursLogged, pointsPerHour) {
  return Math.round(hoursLogged * pointsPerHour);
}

// Record check-in, hours logged, and calculated points for an approved application
router.post("/applications/:applicationId/attendance", attachUserContext, (req, res) => {
  const { checked_in = true, hours_logged = 0 } = req.body;
  if (hours_logged < 0 || hours_logged > 24) {
    return res.status(422).json({ detail: "hours_logged must be between 0 and 24" });
  }

  const application = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(req.params.applicationId);
  if (!application) return res.status(404).json({ detail: "Application not found" });
  if (application.status !== "approved") {
    return res.status(400).json({ detail: "Cannot log attendance for an unapproved application" });
  }

  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(application.shift_id);
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(shift.event_id);

  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  const finalHours = checked_in ? Number(hours_logged) : 0;
  const pointsAwarded = checked_in ? calculatePoints(finalHours, shift.points_per_hour) : 0;

  const existing = db
    .prepare("SELECT * FROM attendances WHERE application_id = ?")
    .get(application.id);

  if (!existing) {
    db.prepare(
      `INSERT INTO attendances (application_id, volunteer_id, checked_in, hours_logged, points_awarded)
       VALUES (?, ?, ?, ?, ?)`
    ).run(application.id, application.volunteer_id, checked_in ? 1 : 0, finalHours, pointsAwarded);
  } else {
    db.prepare(
      `UPDATE attendances
       SET checked_in = ?, hours_logged = ?, points_awarded = ?, recorded_at = CURRENT_TIMESTAMP
       WHERE application_id = ?`
    ).run(checked_in ? 1 : 0, finalHours, pointsAwarded, application.id);
  }

  res.json(db.prepare("SELECT * FROM attendances WHERE application_id = ?").get(application.id));
});

// Query calculated hours & points for any volunteer_id
router.get("/volunteers/:volunteerId/points", (req, res) => {
  const stats = db
    .prepare(
      `SELECT
         COALESCE(SUM(hours_logged), 0) AS total_hours,
         COALESCE(SUM(points_awarded), 0) AS total_points,
         COUNT(CASE WHEN checked_in = 1 THEN 1 END) AS shifts_attended
       FROM attendances
       WHERE volunteer_id = ?`
    )
    .get(req.params.volunteerId);

  res.json({
    volunteer_id: Number(req.params.volunteerId),
    total_hours: Number(stats.total_hours.toFixed(2)),
    total_points: stats.total_points,
    shifts_attended: stats.shifts_attended,
  });
});

export default router;