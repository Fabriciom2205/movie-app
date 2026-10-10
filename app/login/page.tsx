import { redirect } from "next/navigation";
import { card } from "@/app/ui";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  return (
    <main id="content" className="mx-auto w-full max-w-sm px-4 py-12 sm:py-20">
      <div className={`shadow-soft ${card}`}>
        {/* The home page's logo (just the name), bigger. */}
        <h1 className="text-5xl">Movie Night</h1>
        <p className="mt-1 text-ink-muted">Sign in to pick tonight&rsquo;s movie.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
