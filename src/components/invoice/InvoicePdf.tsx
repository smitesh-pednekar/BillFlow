import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/invoice";
import type { PaperInvoice } from "./InvoicePaper";

/**
 * Register a real font. The built-in Helvetica has no £ or ₹ glyph, so an
 * unregistered document silently renders currency as a blank box.
 * DejaVu Sans covers the currency symbols this app offers.
 */
let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "DejaVu",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf",
        fontWeight: 700,
      },
    ],
  });
  // react-pdf hyphenates aggressively by default; invoices read better without.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const C = {
  ink: "#171A17",
  ink2: "#5C625C",
  ink3: "#8C938B",
  line: "#DDE1DA",
  pine: "#12433A",
  pine100: "#DCEBE4",
  rust: "#A83218",
  rust50: "#FBE7E1",
  slate: "#4C5563",
  slate50: "#EAEDF1",
  indigo: "#23478F",
  indigo50: "#E5EBF7",
  sunken: "#EDEFEA",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "DejaVu",
    fontSize: 9,
    color: C.ink,
    paddingTop: 42,
    paddingBottom: 54,
    paddingHorizontal: 44,
    lineHeight: 1.5,
  },
  header: { flexDirection: "row", justifyContent: "space-between" },
  logo: { height: 30, maxWidth: 130, objectFit: "contain", marginBottom: 8 },
  fromName: { fontSize: 10, fontWeight: 700 },
  muted: { color: C.ink2 },
  faint: { color: C.ink3, fontSize: 7.5 },
  right: { textAlign: "right" },
  title: { fontSize: 17, fontWeight: 700 },
  number: { fontSize: 9.5, color: C.ink2, marginTop: 2 },
  chip: {
    marginTop: 6,
    alignSelf: "flex-end",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 9,
    fontSize: 7.5,
    fontWeight: 700,
  },
  meta: { flexDirection: "row", marginTop: 26 },
  metaCol: { flex: 1, paddingRight: 12 },
  label: { fontSize: 7.5, color: C.ink3, marginBottom: 3 },
  strong: { fontWeight: 700 },

  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 5,
    marginTop: 26,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 7,
  },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 46, textAlign: "right" },
  cRate: { width: 74, textAlign: "right" },
  cAmt: { width: 82, textAlign: "right" },

  totals: { marginTop: 16, marginLeft: "auto", width: 210 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 6,
    paddingTop: 8,
  },
  grandValue: { fontSize: 16, fontWeight: 700 },

  notes: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 14,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    textAlign: "center",
    color: C.ink3,
    fontSize: 7,
  },
});

const CHIP: Record<string, { bg: string; fg: string }> = {
  paid: { bg: C.pine100, fg: C.pine },
  overdue: { bg: C.rust50, fg: C.rust },
  void: { bg: C.sunken, fg: C.ink3 },
  draft: { bg: C.slate50, fg: C.slate },
  sent: { bg: C.indigo50, fg: C.indigo },
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The PDF rendering of an invoice. Deliberately mirrors InvoicePaper's layout
 * and takes the identical PaperInvoice shape, so a change to what an invoice
 * shows is a change in one data structure, not two divergent templates.
 */
export function InvoicePdf({ invoice }: { invoice: PaperInvoice }) {
  const { billFrom, billTo, items, currency, status } = invoice;
  const chip = CHIP[status] ?? CHIP.draft;
  const money = (c: number) => formatMoney(c, currency);

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author={billFrom.name}
      subject={`Invoice ${invoice.number} for ${billTo.name}`}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flex: 1, paddingRight: 20 }}>
            {billFrom.logoUrl ? <Image style={s.logo} src={billFrom.logoUrl} /> : null}
            <Text style={s.fromName}>{billFrom.name}</Text>
            {billFrom.address ? (
              <Text style={s.muted}>{billFrom.address}</Text>
            ) : null}
            {billFrom.email ? <Text style={s.muted}>{billFrom.email}</Text> : null}
            {billFrom.phone ? <Text style={s.muted}>{billFrom.phone}</Text> : null}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Invoice</Text>
            <Text style={s.number}>{invoice.number}</Text>
            <Text style={[s.chip, { backgroundColor: chip.bg, color: chip.fg }]}>
              {STATUS_LABEL[status]}
            </Text>
          </View>
        </View>

        <View style={s.meta}>
          <View style={s.metaCol}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.strong}>{billTo.name}</Text>
            {billTo.company ? <Text style={s.muted}>{billTo.company}</Text> : null}
            {billTo.address ? <Text style={s.muted}>{billTo.address}</Text> : null}
            {billTo.email ? <Text style={s.muted}>{billTo.email}</Text> : null}
          </View>
          <View style={s.metaCol}>
            <Text style={s.label}>Issued</Text>
            <Text>{fmtDate(invoice.issueDate)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.label}>Due</Text>
            <Text
              style={
                status === "overdue" ? { color: C.rust, fontWeight: 700 } : {}
              }
            >
              {fmtDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={[s.cDesc, s.label]}>Description</Text>
          <Text style={[s.cQty, s.label]}>Qty</Text>
          <Text style={[s.cRate, s.label]}>Rate</Text>
          <Text style={[s.cAmt, s.label]}>Amount</Text>
        </View>

        {items.length === 0 ? (
          <View style={s.row}>
            <Text style={[s.cDesc, s.muted]}>No line items.</Text>
          </View>
        ) : (
          items.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.cDesc}>{it.description}</Text>
              <Text style={[s.cQty, s.muted]}>
                {Number.isInteger(it.quantity)
                  ? it.quantity
                  : it.quantity.toFixed(2)}
              </Text>
              <Text style={[s.cRate, s.muted]}>{money(it.unitCents)}</Text>
              <Text style={s.cAmt}>{money(it.amountCents)}</Text>
            </View>
          ))
        )}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{money(invoice.subtotalCents)}</Text>
          </View>

          {invoice.discountCents > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>
                {invoice.discountKind === "percent"
                  ? `Discount (${invoice.discountValue / 100}%)`
                  : "Discount"}
              </Text>
              <Text>-{money(invoice.discountCents)}</Text>
            </View>
          )}

          {invoice.taxCents > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Tax ({invoice.taxBps / 100}%)</Text>
              <Text>{money(invoice.taxCents)}</Text>
            </View>
          )}

          <View style={s.grand}>
            <Text style={s.strong}>Total</Text>
            <Text style={s.grandValue}>{money(invoice.totalCents)}</Text>
          </View>
        </View>

        {(invoice.notes || invoice.terms) && (
          <View style={s.notes}>
            {invoice.notes ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={s.label}>Notes</Text>
                <Text style={s.muted}>{invoice.notes}</Text>
              </View>
            ) : null}
            {invoice.terms ? (
              <View>
                <Text style={s.label}>Terms</Text>
                <Text style={s.muted}>{invoice.terms}</Text>
              </View>
            ) : null}
          </View>
        )}

        {invoice.footer ? (
          <Text style={s.footer} fixed>
            {invoice.footer}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
