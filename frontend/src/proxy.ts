import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("soli_session")?.value;

  // Root page
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url), 302);
    }
    return NextResponse.redirect(new URL("/login", req.url), 302);
  }

  // Protected pages require a token
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url), 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/matters/:path*", "/admin/:path*", "/"],
};

export default proxy;
