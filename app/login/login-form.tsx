"use client";

import { useActionState, useId, type ReactNode } from "react";
import { TearLine } from "@/app/ticket";
import { field, paper, primaryButton, sectionLabel } from "@/app/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

// The login ticket's two pieces of paper (app/login/page.tsx has the tape,
// the tilt and the outline around them). The form wraps both, so Sign in on
// the stub submits the fields on the top piece. The top piece is `children`
// (the band and the name), then the fields; below the tear line, the stub
// with Sign in.
export function LoginForm({ children }: { children: ReactNode }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const id = useId();

  return (
    <form action={formAction}>
      <div className={`ticket-cut-top ${paper} pt-4 pb-5 sm:pt-5`}>
        {children}

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
      </div>

      {/* The stub. It overlaps the top piece by 1px so no faint line shows. */}
      <div className={`ticket-cut-stub relative -mt-px ${paper} py-4 sm:py-5`}>
        <TearLine />
        <div className="px-5 pt-2 pb-1 sm:px-6">
          <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </form>
  );
}
