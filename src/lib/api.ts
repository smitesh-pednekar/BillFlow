import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra }, { status });
}

/**
 * Every route handler ends in this. Errors say what happened, never leak a
 * stack trace, and an unauthenticated call is always 401.
 */
export function handleError(e: unknown) {
  if (e instanceof UnauthorizedError) {
    return fail("You need to be signed in.", 401);
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return fail(first?.message ?? "That input is not valid.", 422, {
      issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  console.error("[api]", e);
  return fail("Something went wrong on our end. Please try again.", 500);
}
