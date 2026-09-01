import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create your account — BillFlow" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Start invoicing free
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          No card required. Send your first invoice in about a minute.
        </p>
      </div>
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
