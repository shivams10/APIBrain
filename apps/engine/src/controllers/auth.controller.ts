import type { RequestHandler } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies";
import { STORAGE_KEYS } from "../constants/keys";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const signup: RequestHandler = async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }

  const { user, accessToken, refreshToken } = await authService.signup(parsed.data.email, parsed.data.password);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ id: user.id, email: user.email });
};

export const login: RequestHandler = async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }

  const { user, accessToken, refreshToken } = await authService.login(parsed.data.email, parsed.data.password);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ id: user.id, email: user.email });
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.refreshSession(
      req.cookies?.[STORAGE_KEYS.REFRESH_TOKEN],
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.status(204).send();
  } catch (error) {
    // Every failure mode here (missing/expired/reused token) means the session is over —
    // clear the cookies before forwarding to the error handler for the actual status/message.
    clearAuthCookies(res);
    next(error);
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.cookies?.[STORAGE_KEYS.REFRESH_TOKEN]);
  clearAuthCookies(res);
  res.status(204).send();
};

export const me: RequestHandler = async (req, res) => {
  const user = await authService.getUserById(req.user!.id);
  res.json({ id: user.id, email: user.email });
};
