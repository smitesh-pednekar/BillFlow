import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireUserId } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — a 12 MB PNG in a PDF is a real risk
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("No file was uploaded.", 400);
    }

    if (!ALLOWED.has(file.type)) {
      return fail("Use a PNG, JPG, WebP or SVG image.", 415);
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return fail(`That image is ${mb} MB. Keep it under 2 MB.`, 413);
    }
    if (file.size === 0) {
      return fail("That file is empty.", 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (token) {
      // Namespaced by user so one account cannot guess or clobber another's.
      const blob = await put(`logos/${userId}/${Date.now()}.${ext}`, file, {
        access: "public",
        token,
        contentType: file.type,
      });
      return ok({ url: blob.url, storage: "blob" });
    }

    /**
     * No blob store configured: inline the image as a data URL so the feature
     * still works locally and on a deployment without blob storage. Base64 adds
     * about a third, and this string is read back on every settings and invoice
     * load, so the inline path is capped tighter than the blob path.
     * Swapping in Blob later changes nothing else — both return a URL the
     * invoice renders directly.
     */
    const INLINE_MAX = 512 * 1024;
    if (file.size > INLINE_MAX) {
      return fail(
        "Image storage is not configured on this deployment, so logos are limited to 512 KB. Use a smaller image or paste a URL.",
        413,
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    return ok({ url: dataUrl, storage: "inline" });
  } catch (e) {
    return handleError(e);
  }
}
