"use client";

import * as React from "react";
import { ErrorState } from "@/components/states";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <ErrorState
        title="That page did not load"
        body="Something went wrong on our end. It is usually temporary."
        onRetry={reset}
      />
    </div>
  );
}
