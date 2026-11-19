// CONTRACT FOR STUDENT 2:
// Student 2's auth middleware must attach `req.user = { id: number, role: string }`
// before any of Student 3's protected routes run.

export function attachUserContext(req, res, next) {
  if (!req.user) {
    // Fallback header support for testing Student 3's endpoints independently via Postman/Thunder Client
    const testId = Number(req.headers["x-user-id"]);
    const testRole = req.headers["x-user-role"];

    if (testId && testRole) {
      req.user = { id: testId, role: testRole };
    } else {
      return res.status(401).json({ detail: "Unauthenticated: missing user context" });
    }
  }
  next();
}

export function isEventOwnerOrAdmin(event, user) {
  return event.organizer_id === user.id || user.role === "admin";
}
