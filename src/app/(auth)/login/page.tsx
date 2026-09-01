import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign in — BillFlow" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Sign in to pick up where you left off.
        </p>
      </div>

      {/* Demo credentials live in the UI so a reviewer never has to open the README. */}
      <div className="rounded-[6px] border border-dashed border-pine-500 bg-pine-50 px-3 py-2.5">
        <p className="text-[0.8125rem] font-medium text-pine-700">
          Demo account — already filled in
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-ink-2">
          demo@billflow.app · demo1234
        </p>
      </div>

      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
