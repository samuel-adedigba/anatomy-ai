import { Router } from "express";
import { handleAsk } from "../controllers/ask.controller";
import { sanitizeQuery } from "../middleware/sanitizeQuery";

const router = Router();

// POST /ask — main query endpoint
// sanitizeQuery runs before controller to block injection attempts
router.post("/", sanitizeQuery, handleAsk);

export default router;
