import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Token-based authentication for Mission Control
// DASHBOARD_TOKEN env var = the password Blake enters on login
// API_SECRET env var (optional) = bearer token for agent API submissions
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths — no auth required
  if (
    path === "/login" ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path === "/api/auth" ||
    path === "/api/health"
  ) {
    return NextResponse.next();
  }

  // Public read-only dashboard APIs (GET only)
  const isReadOnlyDashboardAPI = 
    request.method === "GET" && 
    (path === "/api/agents" || 
     path === "/api/activity" || 
     path === "/api/tasks" || 
     path === "/api/cron" ||
     path === "/api/wallet");
  
  if (isReadOnlyDashboardAPI) {
    return NextResponse.next();
  }

  // API routes: check bearer token OR cookie
  if (path.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const apiSecret = process.env.API_SECRET;
    const dashboardToken = process.env.DASHBOARD_TOKEN;
    const cookieToken = request.cookies.get("dashboard_token")?.value;

    if (!apiSecret && !dashboardToken) return NextResponse.next(); // no auth configured (local dev)

    // Accept bearer token (for agents) OR cookie (for Blake's browser)
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (bearerToken && (bearerToken === apiSecret || bearerToken === dashboardToken)) {
      return NextResponse.next();
    }
    if (cookieToken && (cookieToken === dashboardToken || cookieToken === apiSecret)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dashboard pages: check cookie
  const token = request.cookies.get("dashboard_token")?.value;
  const validToken = process.env.DASHBOARD_TOKEN;

  if (!validToken) return NextResponse.next();

  if (!token || token !== validToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
