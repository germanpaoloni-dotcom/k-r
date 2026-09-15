import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { refreshTokens, users } from "../../db/schema.js";
import { firstOrThrow } from "../../db/utils.js";
import { config } from "../../config.js";
import type { RegisterInput, LoginInput } from "@kor/types";

const REFRESH_BYTES = 32;

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function toPublicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    accountType: user.accountType,
    privacyMode: user.privacyMode,
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokenPair(app: FastifyInstance, userId: string) {
  const accessToken = await app.jwt.sign({ sub: userId }, { expiresIn: config.JWT_ACCESS_TTL });

  const refreshSecret = randomBytes(REFRESH_BYTES).toString("base64url");
  const tokenHash = await bcrypt.hash(refreshSecret, 10);
  const expiresAt = new Date(Date.now() + config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  const row = firstOrThrow(
    await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt }).returning({ id: refreshTokens.id })
  );

  // El refresh token que viaja al cliente combina el id de fila (para lookup O(1))
  // con el secreto (que solo existe hasheado en la base).
  const refreshToken = `${row.id}.${refreshSecret}`;

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
  };
}

export async function register(app: FastifyInstance, input: RegisterInput) {
  const existing = await db.query.users.findFirst({
    where: (u, { or, eq: e }) => or(e(u.email, input.email), e(u.username, input.username)),
  });
  if (existing) {
    throw new AuthError(409, "Ya existe una cuenta con ese email o nombre de usuario.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = firstOrThrow(
    await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        username: input.username.toLowerCase(),
        displayName: input.displayName,
      })
      .returning()
  );

  const tokens = await issueTokenPair(app, user.id);
  return { user: toPublicUser(user), tokens };
}

export async function login(app: FastifyInstance, input: LoginInput) {
  const user = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.email, input.email),
  });
  if (!user) throw new AuthError(401, "Email o contraseña incorrectos.");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AuthError(401, "Email o contraseña incorrectos.");

  const tokens = await issueTokenPair(app, user.id);
  return { user: toPublicUser(user), tokens };
}

export async function refresh(app: FastifyInstance, refreshToken: string) {
  const [id, secret] = refreshToken.split(".");
  if (!id || !secret) throw new AuthError(401, "Refresh token inválido.");

  const row = await db.query.refreshTokens.findFirst({
    where: (rt, { eq: e }) => e(rt.id, id),
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw new AuthError(401, "Refresh token inválido o expirado.");
  }

  const valid = await bcrypt.compare(secret, row.tokenHash);
  if (!valid) throw new AuthError(401, "Refresh token inválido.");

  // Rotación: se revoca el token usado y se emite un par nuevo.
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));

  return issueTokenPair(app, row.userId);
}

export async function logout(refreshToken: string) {
  const [id] = refreshToken.split(".");
  if (!id) return;
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
}

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({ where: (u, { eq: e }) => e(u.id, userId) });
  return user ? toPublicUser(user) : null;
}
