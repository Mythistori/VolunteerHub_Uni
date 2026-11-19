import express from "express";
import cors from "cors";
import eventRoutes from "./routes/events.js";
import applicationRoutes from "./routes/applications.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use("/events", eventRoutes);
app.use("/", applicationRoutes);
app.use("/", attendanceRoutes);
app.use("/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Student 3 Backend running on http://localhost:${PORT}`);
});