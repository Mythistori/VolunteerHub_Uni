import express from "express";
import db from "../db.js";
import { attachUserContext } from "../middleware/authInterface.js";

const router = express.Router();

router.get("/dashboard", attachUserContext, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ detail: "Admin role required" });
  }

  const totalEvents = db.prepare("SELECT COUNT(*) as c FROM events").get().c;
  const activeEvents = db.prepare("SELECT COUNT(*) as c FROM events WHERE status = 'published'").get().c;
  const totalShifts = db.prepare("SELECT COUNT(*) as c FROM shifts").get().c;
  const pendingApps = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'pending'").get().c;
  const approvedApps = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'approved'").get().c;
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(hours_logged), 0) as hours,
         COALESCE(SUM(points_awarded), 0) as points,
         COUNT(DISTINCT volunteer_id) as active_volunteers
       FROM attendances
       WHERE checked_in = 1`
    )
    .get();

  res.json({
    total_events: totalEvents,
    active_events: activeEvents,
    total_shifts: totalShifts,
    pending_applications: pendingApps,
    approved_applications: approvedApps,
    active_volunteers: totals.active_volunteers,
    total_hours_logged: Number(totals.hours.toFixed(2)),
    total_points_distributed: totals.points,
  });
});

export default router;