import "server-only";

/**
 * The absolute base URL used to build shareable invoice links and email links.
 *
 * Read on the server only, despite the NEXT_PUBLIC_ prefix, so it is picked up
 * at runtime rather than baked into a client bundle.
 *
 * On Vercel, VERCEL_PROJECT_PRODUCTION_URL is injected automatically, so a
 * deployment that forgets NEXT_PUBLIC_APP_URL still produces working links
 * instead of sending clients to localhost. Set the variable anyway when using
 * a custom domain — that is what the fallback cannot know.
 */
/**
 * Normalises a hand-entered value. A dashboard field invites a bare hostname,
 * a stray pair of quotes, or a trailing slash, and each of those produces a
 * link that looks right in the app but does not open.
 */
function normalise(raw: string): string {
  const v = raw
    .trim()
    .replace(/^["']|["']$/g, "") // quotes pasted along with the value
    .replace(/\/+$/, ""); // trailing slash
  if (!v) return "";
  // A bare hostname is assumed https; localhost keeps http.
  if (!/^https?:\/\//i.test(v)) {
    return /^localhost(:\d+)?$/i.test(v) ? `http://${v}` : `https://${v}`;
  }
  return v;
}

export function appUrl(): string {
  const configured = normalise(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (configured) return configured;

  const vercel = normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "");
  if (vercel) return vercel;

  return "http://localhost:3000";
}
