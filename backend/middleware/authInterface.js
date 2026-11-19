import jwt from "jsonwebtoken";
import db from "../db.js";

export const JWT_SECRET = process.env.JWT_SECRET || "volunteerhub_sdu_dev_secret_2026";
process.env.JWT_SECRET = JWT_SECRET;

export function attachUserContext(req, res, next) {
  if (req.user) return next();

  // 1. Check Student 2's JWT Bearer token
  const authHeader = req.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
      const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(Number(payload.sub));
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ detail: "User no longer exists" });
    } catch {
      return res.status(401).json({ detail: "Invalid or expired JWT token" });
    }
  }

  const testId = Number(req.headers["x-user-id"]);
  const testRole = req.headers["x-user-role"];
  if (testId && testRole) {
    req.user = { id: testId, role: testRole };
    return next();
  }

  return res.status(401).json({ detail: "Unauthenticated: provide Bearer token or test headers" });
}

export function isEventOwnerOrAdmin(event, user) {
  return event.organizer_id === user.id || user.role === "admin";
}