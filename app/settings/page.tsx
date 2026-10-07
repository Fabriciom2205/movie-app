import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProviderList, getRegions, tmdbImageUrl, type WatchProvider } from "@/lib/tmdb";
import { SettingsForm, type ProviderOption } from "./settings-form";

// The big US subscription services, shown up front in this order. TMDB's own
// ranking puts rent/buy stores and niche channels above HBO Max and Tubi.
const US_SHORTLIST = [
  8, // Netflix
  9, // Amazon Prime Video
  337, // Disney Plus
  15, // Hulu
  1899, // HBO Max
  2303, // Paramount Plus Premium
  2616, // Paramount Plus Essential
  386, // Peacock Premium
  387, // Peacock Premium Plus
  350, // Apple TV
  283, // Crunchyroll
  43, // Starz
  526, // AMC+
  11, // MUBI
  258, // Criterion Channel
  99, // Shudder
  191, // Kanopy
  73, // Tubi TV
  300, // Pluto TV
];

// Other regions: no curated list, so take TMDB's top N.
const FALLBACK_SHORTLIST_SIZE = 20;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  // Filter by user_id: list-mates' services are readable too.
  const [profile, settings, services, regions] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    supabase.from("user_settings").select("region").eq("user_id", userId).maybeSingle(),
    supabase.from("user_services").select("provider_id").eq("user_id", userId),
    getRegions(),
  ]);
  // Fail loudly: showing "no services" by mistake and then saving would wipe them.
  if (settings.error) throw settings.error;
  if (services.error) throw services.error;
  if (profile.error) throw profile.error;

  const region = settings.data?.region ?? "US";
  const providers = await getProviderList(region); // needs the region, so it waits

  const shortlist =
    region === "US"
      ? US_SHORTLIST
      : providers.slice(0, FALLBACK_SHORTLIST_SIZE).map((p) => p.provider_id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Search
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Settings</h1>

      <SettingsForm
        displayName={profile.data?.display_name ?? ""}
        region={region}
        regions={regions.map((r) => ({ code: r.iso_3166_1, name: r.english_name }))}
        providers={shortlistFirst(providers, shortlist).map(toOption)}
        shortlist={shortlist}
        saved={services.data.map((s) => s.provider_id)}
      />

      {/* Required attribution: TMDB's provider data comes from JustWatch. */}
      <p className="mt-10 text-xs text-zinc-500">Streaming service data provided by JustWatch.</p>
    </main>
  );
}

// Shortlisted services first (in shortlist order), then the rest in TMDB's order.
function shortlistFirst(providers: WatchProvider[], shortlist: number[]): WatchProvider[] {
  const rank = new Map(shortlist.map((id, i) => [id, i]));
  const picked = providers
    .filter((p) => rank.has(p.provider_id))
    .sort((a, b) => rank.get(a.provider_id)! - rank.get(b.provider_id)!);
  const rest = providers.filter((p) => !rank.has(p.provider_id));
  return [...picked, ...rest];
}

// Only what the browser needs; ~300 of these get sent to the client. The logo
// URL is built here because lib/tmdb.ts is server-only.
function toOption(p: WatchProvider): ProviderOption {
  return { id: p.provider_id, name: p.provider_name, logoUrl: tmdbImageUrl(p.logo_path, "w92") };
}
