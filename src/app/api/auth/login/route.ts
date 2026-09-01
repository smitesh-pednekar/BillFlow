import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validators";
import {
  verifyPassword,
  setSessionCookie,
  findUserByEmail,
  rateLimit,
  clearRateLimit,
} from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = loginSchema.parse(await req.json());

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = `${ip}:${input.email}`;
    const limit = rateLimit(key);
    if (!limit.ok) {
      const mins = Math.ceil(limit.retryInMs / 60000);
      return fail(`Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, 429);
    }

    const user = await findUserByEmail(input.email);
    // Same message either way: never confirm which emails exist.
    const bad = () => fail("Email or password is incorrect.", 401);
    if (!user) return bad();
    if (!(await verifyPassword(input.password, user.passwordHash))) return bad();

    clearRateLimit(key);
    await setSessionCookie(user.id);
    return ok({ id: user.id });
  } catch (e) {
    return handleError(e);
  }
}
