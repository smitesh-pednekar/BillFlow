import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { clientSchema } from "@/lib/validators";
import { requireUserId } from "@/lib/auth";
import { listClients } from "@/db/queries/clients";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    return ok(await listClients(userId, { q }));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const input = clientSchema.parse(await req.json());

    const [row] = await db
      .insert(clients)
      .values({
        userId,
        name: input.name,
        email: input.email || null,
        company: input.company || null,
        address: input.address || null,
        phone: input.phone || null,
      })
      .returning();

    return ok(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
