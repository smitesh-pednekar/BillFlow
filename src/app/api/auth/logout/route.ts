import { clearSessionCookie } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
