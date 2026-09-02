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
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
