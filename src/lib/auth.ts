import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE = "bf_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function setSessionCookie(userId: string) {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Verified user id from the cookie, or null. Deduped per request. */
export const getSession = cache(async (): Promise<{ userId: string } | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return row ?? null;
});

/** For route handlers: the user id, or throws a 401-shaped error. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session.userId;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return row ?? null;
}

/**
 * Login throttle. An in-memory Map is the right size for this app: it costs
 * nothing and needs no extra service. It resets on redeploy, which is fine.
 */
const attempts = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function rateLimit(key: string): { ok: boolean; retryInMs: number } {
  const now = Date.now();
  const hit = attempts.get(key);
  if (!hit || now > hit.resetAt) {
    attempts.set(key, { n: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryInMs: 0 };
  }
  hit.n += 1;
  if (hit.n > MAX_ATTEMPTS) {
    return { ok: false, retryInMs: hit.resetAt - now };
  }
  return { ok: true, retryInMs: 0 };
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}
