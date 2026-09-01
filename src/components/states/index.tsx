"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

/* ---------------------------------------------------------------- Empty --- */

/**
 * Empty states are invitations with a next action, never a shrug.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-pine-50 text-pine-700">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p>
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex h-11 items-center justify-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-900"
            >
              {action.label}
            </Link>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Error --- */

export function ErrorState({
  title = "Something went wrong",
  body = "That did not load. It is usually temporary.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-rust-50 text-rust">
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
          <path
            d="M10 6.5v4M10 13.5h.01M10 2.5 1.5 17.5h17L10 2.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Skeleton --- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-sunken", className)}
      aria-hidden="true"
    />
  );
}

/** Matches the shape of the real table, not a spinner. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1 max-w-[180px]" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[10px] border border-line bg-surface p-4"
        >
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
        </div>
      ))}
    </div>
  );
}
