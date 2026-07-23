import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db.js"; // initializes DB + seed user

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import caseRoutes from "./routes/cases.js";
import hearingRoutes from "./routes/hearings.js";
import documentRoutes from "./routes/documents.js";
import paymentRoutes from "./routes/payments.js";
import noteRoutes from "./routes/notes.js";
import reportRoutes from "./routes/reports.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/hearings", hearingRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Basic error handler (e.g. multer file errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Case management API running on http://localhost:${PORT}`);
});
