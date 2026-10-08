import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/health: is the live app up, and can it reach the database?
// Called twice a day by .github/workflows/health-check.yml. Besides catching
// outages, that regular database query is what keeps the free Supabase
// project from being paused for inactivity.
//
// Public on purpose (the checker has no login), so it reveals nothing: no
// counts, no error details, the same tiny query every time.
export async function GET() {
  const noStore = { "Cache-Control": "no-store" }; // a cached "ok" would hide an outage

  try {
    // A real query, but the cheapest one: count the cached movies without
    // sending any rows back (head: true). The secret key is needed because
    // logged-out requests can't read any table.
    const { error, status } = await createAdminClient()
      .from("movies")
      .select("id", { count: "exact", head: true });
    // A head request gets no error body back, so the status is the clue
    // (401: bad key, 5xx/521: database down or paused).
    if (error) throw new Error(`database answered HTTP ${status} ${error.code || error.message || ""}`.trim());

    return Response.json({ ok: true }, { headers: noStore });
  } catch (err) {
    // Details go to the server log (Vercel), not to the public response.
    console.error("Health check failed:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false }, { status: 503, headers: noStore });
  }
}
