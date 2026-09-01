import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------- Button --- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium " +
  "transition-colors disabled:pointer-events-none disabled:opacity-50 " +
  "whitespace-nowrap select-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-pine-700 text-white hover:bg-pine-900",
  secondary:
    "bg-surface text-ink border border-line hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-rust text-white hover:brightness-90",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  // 44px min touch target on the two sizes used on mobile
  sm: "h-9 px-3 text-[0.8125rem]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          BUTTON_BASE,
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner className="size-4" />}
        {children}
      </button>
    );
  },
);

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------------------------------------------- Input --- */

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-[6px] border bg-surface px-3 text-sm text-ink",
        "placeholder:text-ink-3 transition-colors",
        invalid ? "border-rust" : "border-line hover:border-ink-3",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-[6px] border bg-surface px-3 py-2 text-sm text-ink",
        "placeholder:text-ink-3 transition-colors resize-y min-h-[80px]",
        invalid ? "border-rust" : "border-line hover:border-ink-3",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-[6px] border bg-surface px-3 text-sm text-ink",
        "transition-colors appearance-none bg-no-repeat",
        invalid ? "border-rust" : "border-line hover:border-ink-3",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%235C625C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.75rem center",
        paddingRight: "2rem",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

/* --------------------------------------------------------------- Field --- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[0.8125rem] font-medium text-ink-2"
      >
        {label}
        {required && <span className="text-rust ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[0.8125rem] text-rust">{error}</p>
      ) : hint ? (
        <p className="text-[0.8125rem] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Card --- */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-line bg-surface shadow-[0_1px_2px_rgb(23_26_23_/_0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
