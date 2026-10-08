"use client";

import { useActionState, useId } from "react";
import { field, primaryButton, sectionLabel } from "@/app/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-email`} className={sectionLabel}>
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          className={`mt-2 ${field}`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className={sectionLabel}>
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`mt-2 ${field}`}
        />
      </div>

      {/* Always in the page so screen readers hear the error when it appears. */}
      <p aria-live="polite" className="min-h-5 text-sm text-danger">
        {state.error}
      </p>

      <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
