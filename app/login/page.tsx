import { redirect } from "next/navigation";
import { WallTicket } from "@/app/ticket";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  // One ticket taped to the room's wall (MASTER.md "Login"): the band and the
  // name, then LoginForm (the fields, the tear line and the Sign in stub).
  // The ticket is narrow, so the band's print nearly meets in the middle at
  // every width: the tape sits high, over the band's empty top edge.
  return (
    <main id="content" className="mx-auto w-full max-w-sm px-4 py-12 sm:py-20">
      <WallTicket tape tapeTop="-top-6">
        <LoginForm>
          {/* The band, up against the paper's top edge. Accounts are
              invite-only, so it's members only. */}
          <div className="-mt-4 flex items-baseline justify-between gap-4 bg-primary px-5 pt-2.5 pb-2 leading-none text-on-primary sm:-mt-5 sm:px-6">
            <span className="font-heading text-3xl leading-none tracking-wide uppercase">Admit one</span>
            <span className="text-[11px] font-medium tracking-widest uppercase">Members only</span>
          </div>
          <div className="px-5 pt-5 sm:px-6">
            {/* The home page's logo (just the name), bigger. */}
            <h1 className="text-5xl">Movie Night</h1>
            <p className="mt-2 text-sm text-ink-muted">Sign in to pick tonight&rsquo;s movie.</p>
          </div>
        </LoginForm>
      </WallTicket>
    </main>
  );
}
