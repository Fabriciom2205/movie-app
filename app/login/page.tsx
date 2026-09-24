import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Movie Night</h1>
      <p className="mb-8 text-zinc-500">Sign in to pick tonight&apos;s movie.</p>
      <LoginForm />
    </main>
  );
}
