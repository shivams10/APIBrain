import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../lib/tokens";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies";
import { STORAGE_KEYS } from "../constants/keys";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

async function createSession(userId: string) {
  const accessToken = signAccessToken(userId);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return { accessToken, refreshToken };
}

export const signup: RequestHandler = async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  const { accessToken, refreshToken } = await createSession(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ id: user.id, email: user.email });
};

export const login: RequestHandler = async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const { accessToken, refreshToken } = await createSession(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ id: user.id, email: user.email });
};

export const refresh: RequestHandler = async (req, res) => {
  const incomingToken = req.cookies?.[STORAGE_KEYS.REFRESH_TOKEN];
  if (!incomingToken) {
    res.status(401).json({ error: "Missing refresh token" });
    return;
  }

  const tokenHash = hashRefreshToken(incomingToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt < new Date()) {
    clearAuthCookies(res);
    res.status(401).json({ error: "Refresh token invalid or expired" });
    return;
  }

  if (stored.revokedAt) {
    // A rotated-out token came back — treat as theft and kill every active session.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearAuthCookies(res);
    res.status(401).json({ error: "Refresh token reuse detected, all sessions revoked" });
    return;
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refreshToken } = await createSession(stored.userId);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(204).send();
};

export const logout: RequestHandler = async (req, res) => {
  const incomingToken = req.cookies?.[STORAGE_KEYS.REFRESH_TOKEN];
  if (incomingToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(incomingToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearAuthCookies(res);
  res.status(204).send();
};

export const me: RequestHandler = async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ id: user.id, email: user.email });
};
