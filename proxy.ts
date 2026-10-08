import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // A recommendation's luck comes from a seed in its URL, so the same link
  // always shows the same movie (reloading, or adding it to a list, doesn't
  // swap it). Arriving without one (the home form, "Start over") gets a fresh
  // seed, which is what makes each new visit a new shuffle.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/pick" && !/^\d{1,9}$/.test(searchParams.get("seed") ?? "")) {
    const url = request.nextUrl.clone();
    url.searchParams.set("seed", String(1 + Math.floor(Math.random() * 999_999_999)));
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  // Run on every path except static files and optimized images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
