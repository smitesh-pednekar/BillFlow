"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Field } from "@/components/ui";
import { signupSchema, loginSchema } from "@/lib/validators";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [formError, setFormError] = React.useState<string | null>(null);

  const schema = mode === "signup" ? signupSchema : loginSchema;
  type Values = z.infer<typeof signupSchema> & z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema as never),
    defaultValues:
      mode === "login"
        ? { email: "demo@billflow.app", password: "demo1234" }
        : undefined,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFormError(body.error ?? "That did not work. Please try again.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {mode === "signup" && (
        <Field label="Your name" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Maya Rodriguez"
            invalid={!!errors.name}
            {...register("name")}
          />
        </Field>
      )}

      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.co"
          invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint={mode === "signup" ? "At least 8 characters." : undefined}
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
          invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      {formError && (
        <p
          role="alert"
          className="rounded-[6px] bg-rust-50 px-3 py-2 text-sm text-rust"
        >
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {isSubmitting
          ? mode === "signup"
            ? "Creating your account…"
            : "Signing in…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-2">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-pine-700 underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to BillFlow?{" "}
            <Link href="/signup" className="font-medium text-pine-700 underline underline-offset-2">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
