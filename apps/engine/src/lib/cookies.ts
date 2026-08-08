import type { Response } from "express";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../config/auth";
import { STORAGE_KEYS } from "../constants/keys";

const isProd = process.env.NODE_ENV === "production";
const { ACCESS_TOKEN, REFRESH_TOKEN } = STORAGE_KEYS;
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string | void,
): void {
  res.cookie(ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_TTL_MS,
  });

  res.cookie(REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN);
  res.clearCookie(REFRESH_TOKEN);
}
