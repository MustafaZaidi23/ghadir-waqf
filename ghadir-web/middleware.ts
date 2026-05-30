import { NextResponse, NextRequest } from "next/server";

// Auto-detect the visitor's country once and store it in a cookie the client
// can read. Vercel's edge always sets `x-vercel-ip-country`; we fall back to
// the Accept-Language region. A user's explicit choice (localStorage) always
// overrides this on the client.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (!req.cookies.get("ghadir_country")) {
    const detected =
      req.headers.get("x-vercel-ip-country") ||
      acceptLanguageCountry(req.headers.get("accept-language"));

    if (detected && /^[A-Za-z]{2}$/.test(detected)) {
      res.cookies.set("ghadir_country", detected.toUpperCase(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }

  return res;
}

// "en-GB,en;q=0.9" → "GB"
function acceptLanguageCountry(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/[a-zA-Z]{2}-([A-Za-z]{2})/);
  return match ? match[1] : null;
}

// Run on page routes only — skip api, static assets, and files.
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
