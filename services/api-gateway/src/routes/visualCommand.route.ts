import { Router } from "express";
import { handleVisualCommand } from "../controllers/visualCommand.controller";

const router = Router();

// POST /visual-command — direct mode/region switch (no AI inference needed)
router.post("/", handleVisualCommand);

export default router;
