import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          BillFlow
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>

      {/* Tinted panel: one line, no stock photography. */}
      <div className="hidden bg-pine-900 p-12 lg:flex lg:flex-col lg:justify-center">
        <blockquote className="max-w-md">
          <p className="font-display text-2xl leading-snug text-white">
            &ldquo;It takes about a minute to send an invoice, and I can see the
            moment a client opens it.&rdquo;
          </p>
          <footer className="mt-4 text-sm text-pine-100">
            The reason BillFlow exists.
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
