import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import askRouter from "./routes/ask.route";
import visualCommandRouter from "./routes/visualCommand.route";
import healthRouter from "./routes/health.route";

const app = express();

// ─── Security headers ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*" })); // TODO: verify — restrict origin in production
app.use(express.json({ limit: "1mb" }));

// ─── Rate limiting ──────────────────────────────────────────────
app.use(rateLimiter);

// ─── Routes ─────────────────────────────────────────────────────
app.use("/health", healthRouter);
app.use("/ask", askRouter);
app.use("/visual-command", visualCommandRouter);

// ─── Global error handler ───────────────────────────────────────
app.use(errorHandler);

export default app;
