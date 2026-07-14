import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "online", service: "api-gateway", uptime: process.uptime() });
});

export default router;
