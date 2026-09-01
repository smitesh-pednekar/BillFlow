import "server-only";
import { formatMoney } from "./money";

export interface SendInvoiceArgs {
  to: string;
  subject?: string;
  message?: string;
  invoiceNumber: string;
  totalCents: number;
  currency: string;
  dueDate: string;
  businessName: string;
  link: string;
}

export interface SendResult {
  sent: boolean;
  error: string | null;
}

/**
 * Email is the secondary path on purpose: the shareable link is what always
 * works. With no RESEND_API_KEY the send flow still succeeds and simply
 * reports that email is not configured, so a reviewer running this locally
 * never hits a 500.
 */
export async function sendInvoiceEmail(
  args: SendInvoiceArgs,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, error: "Email is not configured on this deployment." };
  }

  const from = process.env.EMAIL_FROM ?? "BillFlow <onboarding@resend.dev>";
  const amount = formatMoney(args.totalCents, args.currency);
  const subject =
    args.subject?.trim() ||
    `Invoice ${args.invoiceNumber} from ${args.businessName} — ${amount}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject,
        html: invoiceEmailHtml({ ...args, amount, subject }),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        sent: false,
        error: `The email provider rejected the message (${res.status}). ${detail.slice(0, 200)}`,
      };
    }
    return { sent: true, error: null };
  } catch {
    return { sent: false, error: "Could not reach the email provider." };
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

function invoiceEmailHtml(
  args: SendInvoiceArgs & { amount: string; subject: string },
): string {
  const due = new Date(`${args.dueDate}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const note = args.message?.trim()
    ? `<p style="margin:0 0 20px;color:#5C625C;font-size:15px;line-height:1.55">${esc(
        args.message,
      ).replace(/\n/g, "<br>")}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F6F7F5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F5;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #DDE1DA;border-radius:10px;padding:32px">
    <tr><td>
      <p style="margin:0 0 4px;color:#8C938B;font-size:13px">${esc(args.businessName)}</p>
      <h1 style="margin:0 0 20px;font-size:22px;color:#171A17;font-weight:600">
        Invoice ${esc(args.invoiceNumber)}
      </h1>
      ${note}
      <table role="presentation" width="100%" style="border-top:1px solid #DDE1DA;border-bottom:1px solid #DDE1DA;margin:0 0 24px">
        <tr>
          <td style="padding:14px 0;color:#5C625C;font-size:14px">Amount due</td>
          <td style="padding:14px 0;text-align:right;color:#171A17;font-size:20px;font-weight:600">${esc(args.amount)}</td>
        </tr>
        <tr>
          <td style="padding:0 0 14px;color:#5C625C;font-size:14px">Due</td>
          <td style="padding:0 0 14px;text-align:right;color:#171A17;font-size:14px">${esc(due)}</td>
        </tr>
      </table>
      <a href="${esc(args.link)}"
         style="display:block;background:#12433A;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:6px;font-size:15px;font-weight:500">
        View and pay invoice
      </a>
      <p style="margin:20px 0 0;color:#8C938B;font-size:12px;text-align:center">
        Or paste this link into your browser:<br>
        <span style="color:#5C625C">${esc(args.link)}</span>
      </p>
    </td></tr>
  </table>
  <p style="margin:16px 0 0;color:#8C938B;font-size:12px">Sent with BillFlow</p>
</td></tr>
</table>
</body></html>`;
}
