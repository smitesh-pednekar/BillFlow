import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signupSchema } from "@/lib/validators";
import { hashPassword, setSessionCookie, findUserByEmail } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = signupSchema.parse(await req.json());

    if (await findUserByEmail(input.email)) {
      return fail("That email is already registered. Log in instead?", 409);
    }

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        businessName: input.name,
        businessEmail: input.email,
      })
      .returning({ id: users.id });

    await setSessionCookie(user.id);
    return ok({ id: user.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
