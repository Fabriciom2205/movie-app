"use client";

import { useActionState, useId } from "react";
import { Perforation } from "@/app/ticket";
import { field, primaryButton, sectionLabel } from "@/app/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

// The bottom of the login ticket (app/login/page.tsx): the fields, then the
// tear line and the stub with Sign in.
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const id = useId();

  return (
    <form action={formAction}>
      <div className="flex flex-col gap-4 px-5 pt-6 sm:px-6">
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
      </div>

      {/* No notches: this ticket floats on the room art, not the page color. */}
      <Perforation notches={false} className="mt-2" />

      <div className="px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
        <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
