import "dotenv/config";
import express, { Request, Response } from "express";
import { parseAnswerToCommand } from "./parsers/answerParser";
import { buildDirectCommand } from "./parsers/directCommandBuilder";
import { ParseRequestSchema, DirectCommandSchema } from "./validators/schemas";

const app = express();
app.use(express.json({ limit: "512kb" }));

// ─── Health ────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: true, service: "instruction-engine" });
});

// ─── Parse: AI answer → visual command ────────────────────────
app.post("/parse", (req: Request, res: Response) => {
  const parsed = ParseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: false, errors: parsed.error.flatten() });
    return;
  }

  const { answer, raw_context } = parsed.data;
  const command = parseAnswerToCommand(answer, raw_context);

  res.json({ status: true, command });
});

// ─── Direct: region/mode tap → visual command ─────────────────
app.post("/direct", (req: Request, res: Response) => {
  const parsed = DirectCommandSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: false, errors: parsed.error.flatten() });
    return;
  }

  const { region, mode } = parsed.data;
  const command = buildDirectCommand(region, mode);

  res.json({ status: true, command });
});

export default app;
