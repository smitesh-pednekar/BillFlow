import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUserId, getCurrentUser } from "@/lib/auth";
import { findInvoice } from "@/db/queries/invoices";
import { toPaperInvoice } from "@/lib/toPaper";
import { InvoicePdf, registerPdfFonts } from "@/components/invoice/InvoicePdf";
import { fail, handleError } from "@/lib/api";

// renderToBuffer needs Node APIs; it cannot run on the edge runtime.
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const user = (await getCurrentUser())!;
    const { id } = await params;

    const invoice = await findInvoice(id, userId);
    if (!invoice) return fail("That invoice does not exist.", 404);

    registerPdfFonts();
    const paper = toPaperInvoice(invoice, user);
    const buffer = await renderToBuffer(<InvoicePdf invoice={paper} />);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
