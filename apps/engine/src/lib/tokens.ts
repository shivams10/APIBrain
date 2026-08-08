import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_MS } from "../config/auth";

export type AccessTokenPayload = { sub: string };

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(64).toString("hex");
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}