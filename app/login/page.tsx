import { redirect } from "next/navigation";
import { Popcorn } from "lucide-react";
import { card } from "@/app/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:py-20">
      <div className={`shadow-soft ${card}`}>
        {/* The home page's logo, bigger. */}
        <span className="grid size-14 place-items-center rounded-full bg-primary text-on-primary">
          <Popcorn aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Movie Night</h1>
        <p className="mt-1 text-ink-muted">Sign in to pick tonight&rsquo;s movie.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
