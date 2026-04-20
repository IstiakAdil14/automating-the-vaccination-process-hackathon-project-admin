import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_BLOCKED_ROUTES, type AdminRole } from "@/lib/permissions";

const PROTECTED_PREFIXES = [
  "/dashboard", "/heatmap", "/centers", "/staff",
  "/users", "/supply", "/fraud", "/broadcast", "/reports", "/settings",
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = !!token?.id;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  /* -- Unauthenticated -- */
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* -- Already logged in -- */
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  /* -- RBAC -- */
  if (isLoggedIn && isProtected) {
    const role = token.role as AdminRole;
    const blocked = ROLE_BLOCKED_ROUTES[role] ?? [];
    const isBlocked = blocked.some(
      (b) => pathname === b || pathname.startsWith(b + "/")
    );
    if (isBlocked) {
      const url = new URL("/dashboard", req.nextUrl);
      url.searchParams.set("error", "insufficient_permissions");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - /api/auth (NextAuth endpoints must be public)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
