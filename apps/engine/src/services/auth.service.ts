import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../lib/tokens";
import { HttpError } from "../lib/errors";

async function createSession(userId: string) {
  const accessToken = signAccessToken(userId);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return { accessToken, refreshToken };
}

export async function signup(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "Email already registered");
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });

  const session = await createSession(user.id);
  return { user, ...session };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordValid) {
    throw new HttpError(401, "Invalid email or password");
  }

  const session = await createSession(user.id);
  return { user, ...session };
}

export async function refreshSession(rawToken: string | undefined) {
  if (!rawToken) {
    throw new HttpError(401, "Missing refresh token");
  }

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt < new Date()) {
    throw new HttpError(401, "Refresh token invalid or expired");
  }

  if (stored.revokedAt) {
    // A rotated-out token came back — treat as theft and kill every active session.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(401, "Refresh token reuse detected, all sessions revoked");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return createSession(stored.userId);
}

export async function logout(rawToken: string | undefined) {
  if (rawToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export function getUserById(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}
