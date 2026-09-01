import Link from "next/link";

export default function Landing() {
  return (
    <main className="p-10">
      <h1 className="font-display text-3xl">BillFlow</h1>
      <Link href="/login" className="text-pine-700 underline">Sign in</Link>
    </main>
  );
}
