import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple token-based authentication
// Token is set via DASHBOARD_TOKEN env var
export function middleware(request: NextRequest) {
  // Skip auth for the login page, static assets, and ALL /api/reviews endpoints
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname.startsWith("/api/reviews")
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookie
  const token = request.cookies.get("dashboard_token")?.value;
  const validToken = process.env.DASHBOARD_TOKEN;

  // If no token configured, allow access (local dev)
  if (!validToken) {
    return NextResponse.next();
  }

  // Require authentication for dashboard pages and /api/auth
  if (!token || token !== validToken) {
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/health|_next/static|_next/image|favicon.ico).*)",
  ],
};
