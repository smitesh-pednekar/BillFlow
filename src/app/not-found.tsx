import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="tnum text-[0.8125rem] font-medium text-ink-3">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
        We could not find that page
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-ink-2">
        The link may be wrong, or the invoice may have been removed.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-900"
      >
        Back to BillFlow
      </Link>
    </div>
  );
}
