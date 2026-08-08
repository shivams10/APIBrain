import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens";
import { STORAGE_KEYS } from "../constants/keys";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[STORAGE_KEYS.ACCESS_TOKEN];

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
