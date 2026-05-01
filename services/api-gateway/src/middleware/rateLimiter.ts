import rateLimit from "express-rate-limit";

// Limit each IP to 60 requests per minute
// Medical query inference is slow — no need for high throughput on single device
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Too many requests. Slow down." },
});
