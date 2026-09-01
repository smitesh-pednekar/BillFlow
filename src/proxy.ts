import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "bf_session";
const APP_PREFIXES = ["/dashboard", "/invoices", "/clients", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

async function isSignedIn(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const signedIn = await isSignedIn(req);

  if (APP_PREFIXES.some((p) => pathname.startsWith(p)) && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // /i/[token] is deliberately excluded: the public invoice needs no auth.
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/clients/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
