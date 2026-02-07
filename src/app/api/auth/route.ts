import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const validToken = process.env.DASHBOARD_TOKEN;

    if (!validToken) {
      // No token configured - allow access (local dev only)
      return NextResponse.json({ success: true });
    }

    if (password !== validToken) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    // Set auth cookie (7 days)
    const cookieStore = await cookies();
    cookieStore.set("dashboard_token", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("dashboard_token");
  return NextResponse.json({ success: true });
}
