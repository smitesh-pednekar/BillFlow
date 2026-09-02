import "server-only";
import { z } from "zod";
import { parseMoneyToCents, round } from "./money";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

/**
 * What the model is asked to return. Kept deliberately small: descriptions,
 * numbers, and an optional tax rate. Anything else the editor already handles.
 */
const draftSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        quantity: z.coerce.number().min(0).max(100_000),
        // The model is asked for major units (pounds), not cents.
        unit_amount: z.coerce.number().min(0).max(10_000_000),
      }),
    )
    .min(1)
    .max(25),
  tax_percent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export interface DraftItem {
  description: string;
  quantity: number;
  unitCents: number;
}

export interface DraftResult {
  items: DraftItem[];
  taxBps: number;
  notes: string | null;
  /** True when no key is configured and a worked example was returned. */
  demo: boolean;
}

const SYSTEM = `You turn a freelancer's plain-English description of work into invoice line items.

Rules:
- Return ONLY the line items the description actually mentions. Never invent work.
- "3 days at 400" means quantity 3, unit_amount 400. Keep the unit the user used.
- If a total is given for several units, divide it into a per-unit amount.
- unit_amount is a number in major currency units (e.g. 400 means four hundred), never a string, never with a currency symbol.
- If a tax or VAT or GST rate is mentioned, set tax_percent to that number. Otherwise omit it.
- Write each description the way it would read on an invoice: specific, no filler.
- Reply with JSON only. No prose, no markdown fences.`;

const SHAPE = `{"items":[{"description":string,"quantity":number,"unit_amount":number}],"tax_percent":number,"notes":string}`;

/**
 * Worked examples so the feature still demonstrates without a key, and so a
 * reviewer running this locally never hits a 500. Matched loosely on keywords.
 */
const EXAMPLES: { match: RegExp; result: Omit<DraftResult, "demo"> }[] = [
  {
    match: /brand|logo|identity/i,
    result: {
      items: [
        { description: "Brand identity — logo, palette and type system", quantity: 1, unitCents: 320000 },
        { description: "Brand guidelines document", quantity: 1, unitCents: 95000 },
      ],
      taxBps: 2000,
      notes: null,
    },
  },
  {
    match: /website|landing|page|frontend|web/i,
    result: {
      items: [
        { description: "Landing page design — 3 concepts", quantity: 3, unitCents: 68000 },
        { description: "Frontend implementation", quantity: 24, unitCents: 9500 },
      ],
      taxBps: 2000,
      notes: null,
    },
  },
  {
    match: /.*/,
    result: {
      items: [
        { description: "Design and consultation, 3 days", quantity: 3, unitCents: 40000 },
        { description: "Revisions, 5 hours", quantity: 5, unitCents: 4000 },
      ],
      taxBps: 1800,
      notes: null,
    },
  },
];

function workedExample(prompt: string): DraftResult {
  const hit = EXAMPLES.find((e) => e.match.test(prompt)) ?? EXAMPLES[EXAMPLES.length - 1];
  return { ...hit.result, demo: true };
}

/**
 * Models sometimes wrap JSON in prose or a markdown fence despite being asked
 * not to. Recover the object rather than failing the request.
 */
function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in reply");
    return JSON.parse(text.slice(start, end + 1));
  }
}

export class DraftError extends Error {}

export async function draftInvoice(prompt: string): Promise<DraftResult> {
  const key = process.env.GROQ_API_KEY;

  // No key: still demonstrable, and honest about it.
  if (!key) return workedExample(prompt);

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1200,
        // Groq's OpenAI-compatible JSON mode.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${SYSTEM}\n\nReturn exactly this shape:\n${SHAPE}` },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new DraftError("The drafting service did not respond. Try again.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[draft]", res.status, detail.slice(0, 300));
    if (res.status === 429) {
      throw new DraftError("The drafting service is busy. Try again in a moment.");
    }
    throw new DraftError("Could not draft those line items. Try rewording it.");
  }

  const body = await res.json().catch(() => null);
  const content: string | undefined = body?.choices?.[0]?.message?.content;
  if (!content) throw new DraftError("The drafting service returned nothing.");

  let parsed;
  try {
    parsed = draftSchema.parse(extractJson(content));
  } catch {
    throw new DraftError(
      "Could not read that as line items. Try describing the work more plainly.",
    );
  }

  const items = parsed.items
    .map((i) => ({
      description: i.description,
      quantity: i.quantity,
      // The model returns major units; money lives in cents everywhere else.
      unitCents: parseMoneyToCents(i.unit_amount),
    }))
    .filter((i) => i.description.length > 0);

  if (items.length === 0) {
    throw new DraftError("No line items came back. Try describing the work again.");
  }

  return {
    items,
    taxBps: parsed.tax_percent ? round(parsed.tax_percent * 100) : 0,
    notes: parsed.notes || null,
    demo: false,
  };
}

/**
 * Per-user throttle. A public endpoint proxying an LLM on our key is a bill
 * waiting to happen, so this is deliberately tight.
 */
const calls = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;

export function draftRateLimit(userId: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const hit = calls.get(userId);
  if (!hit || now > hit.resetAt) {
    calls.set(userId, { n: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_PER_HOUR - 1 };
  }
  hit.n += 1;
  if (hit.n > MAX_PER_HOUR) return { ok: false, remaining: 0 };
  return { ok: true, remaining: MAX_PER_HOUR - hit.n };
}
