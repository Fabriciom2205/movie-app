"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { status: "idle" | "saved" | "error"; message: string | null };

// Far more than anyone subscribes to; stops a hand-made request from sending thousands.
const MAX_SERVICES = 100;

// Saves the settings form: display name, region, and the full set of ticked services.
// Server Actions are public endpoints, so validate everything here instead of
// trusting the form.
export async function saveSettings(_prev: SaveState, formData: FormData): Promise<SaveState> {
  // Same rule as the database's check: 1-50 characters after trimming.
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 1 || displayName.length > 50) {
    return { status: "error", message: "Your name needs 1 to 50 characters." };
  }

  const region = String(formData.get("region") ?? "");
  if (!/^[A-Z]{2}$/.test(region)) {
    return { status: "error", message: "That country doesn't look right." };
  }

  const ids = [...new Set(formData.getAll("provider").map(Number))];
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0)) {
    return { status: "error", message: "One of those services doesn't look right." };
  }
  if (ids.length > MAX_SERVICES) {
    return { status: "error", message: `Pick at most ${MAX_SERVICES} services.` };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) {
    return { status: "error", message: "Your session ended. Sign in again to save." };
  }

  const [profile, settings, services] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    supabase.from("user_settings").select("region").eq("user_id", userId).maybeSingle(),
    supabase.from("user_services").select("provider_id").eq("user_id", userId),
  ]);
  if (profile.error || settings.error || services.error) {
    return { status: "error", message: "Couldn't load your settings. Try again." };
  }

  // Only send what changed.
  const current = new Set(services.data.map((s) => s.provider_id));
  const wanted = new Set(ids);
  const toAdd = ids.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !wanted.has(id));

  // Independent writes, all with the user's session so RLS checks each.
  // Not one transaction: if one fails, saving again finishes the job.
  const results = await Promise.all([
    toAdd.length
      ? supabase
          .from("user_services")
          .upsert(
            toAdd.map((provider_id) => ({ user_id: userId, provider_id })),
            { onConflict: "user_id,provider_id", ignoreDuplicates: true }, // double-submit safe
          )
      : null,
    toRemove.length
      ? supabase
          .from("user_services")
          .delete()
          .eq("user_id", userId)
          .in("provider_id", toRemove)
      : null,
    settings.data?.region !== region
      ? supabase.from("user_settings").update({ region }).eq("user_id", userId)
      : null,
    profile.data?.display_name !== displayName
      ? supabase.from("profiles").update({ display_name: displayName }).eq("user_id", userId)
      : null,
  ]);
  if (results.some((r) => r?.error)) {
    return { status: "error", message: "Couldn't save everything. Try again." };
  }

  refresh(); // re-render the page with the saved settings
  return { status: "saved", message: "Saved." };
}
