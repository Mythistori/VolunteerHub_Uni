import express from "express";
import db from "../db.js";
import { attachUserContext, isEventOwnerOrAdmin } from "../middleware/authInterface.js";

const router = express.Router();

router.get("/shifts/:shiftId/applications", attachUserContext, (req, res) => {
  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(req.params.shiftId);
  if (!shift) return res.status(404).json({ detail: "Shift not found" });

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(shift.event_id);
  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  const apps = db.prepare("SELECT * FROM applications WHERE shift_id = ?").all(req.params.shiftId);
  res.json(apps);
});

router.patch("/applications/:id/review", attachUserContext, (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(422).json({ detail: "Status must be 'approved' or 'rejected'" });
  }

  const application = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!application) return res.status(404).json({ detail: "Application not found" });

  const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(application.shift_id);
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(shift.event_id);

  if (!isEventOwnerOrAdmin(event, req.user)) {
    return res.status(403).json({ detail: "Forbidden" });
  }

  if (status === "approved" && application.status !== "approved") {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM applications WHERE shift_id = ? AND status = 'approved'")
      .get(shift.id);

    if (count >= shift.capacity) {
      return res.status(409).json({ detail: "Shift has reached maximum capacity" });
    }
  }

  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, req.params.id);
  const frontendStatus = status === "approved" ? "Accepted" : "Rejected";
  db.prepare("UPDATE registrations SET status = ? WHERE application_id = ?").run(frontendStatus, req.params.id);
  res.json(db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id));
});

export default router;