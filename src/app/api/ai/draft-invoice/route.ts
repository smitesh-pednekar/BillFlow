import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { draftInvoice, draftRateLimit, DraftError } from "@/lib/draft";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Describe the work in a sentence or two.")
    .max(2000, "That is too long. Trim it to the essentials."),
});

export async function POST(req: NextRequest) {
  try {
    // The key is server-side only and the endpoint is behind auth, so it can
    // never be called by an anonymous visitor.
    const userId = await requireUserId();

    const limit = draftRateLimit(userId);
    if (!limit.ok) {
      return fail("You have used your drafts for this hour. Try again later.", 429);
    }

    const { prompt } = bodySchema.parse(await req.json());
    const result = await draftInvoice(prompt);

    return ok({ ...result, remaining: limit.remaining });
  } catch (e) {
    if (e instanceof DraftError) return fail(e.message, 502);
    return handleError(e);
  }
}
