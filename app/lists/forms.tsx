"use client";

import { useActionState, useId, useTransition, type ReactNode } from "react";
import { CircleCheck, Plus } from "lucide-react";
import { field, fieldPrimaryButton, fieldSecondaryButton, sectionLabel, tag } from "@/app/ui";
import { createList, inviteToList, renameList, type FormState } from "./actions";

const initialState: FormState = { error: null, message: null, value: "" };

export function CreateListForm() {
  const [state, formAction, pending] = useActionState(createList, initialState);
  const inputId = useId();
  return (
    <form action={formAction}>
      <label htmlFor={inputId} className={sectionLabel}>
        Start a new list
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          // key: React clears form fields after a submit; this puts back what
          // was typed when the server sends an error.
          key={state.value}
          name="name"
          defaultValue={state.value}
          placeholder="e.g. Movie night"
          maxLength={100}
          autoComplete="off"
          required
          className={field}
        />
        {/* The page's one primary action. */}
        <button type="submit" disabled={pending} className={fieldPrimaryButton}>
          <Plus aria-hidden="true" className="size-5" />
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function RenameListForm({ listId, name }: { listId: string; name: string }) {
  const [state, formAction, pending] = useActionState(renameList.bind(null, listId), {
    ...initialState,
    value: name,
  });
  const inputId = useId();
  return (
    <form action={formAction}>
      <label htmlFor={inputId} className={sectionLabel}>
        List name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          key={state.value}
          name="name"
          defaultValue={state.value}
          maxLength={100}
          autoComplete="off"
          required
          className={field}
        />
        <button type="submit" disabled={pending} className={fieldSecondaryButton}>
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function InviteForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(inviteToList.bind(null, listId), initialState);
  const inputId = useId();
  return (
    <form action={formAction}>
      <label htmlFor={inputId} className={sectionLabel}>
        Add someone by the email they sign in with
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          key={state.value}
          name="email"
          type="email"
          defaultValue={state.value}
          placeholder="name@example.com"
          autoComplete="off"
          spellCheck={false}
          required
          className={field}
        />
        <button type="submit" disabled={pending} className={fieldSecondaryButton}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

// A button that asks "are you sure?" before running a Server Action (with its
// arguments already bound). Deliberately not a <form>: a form would also work
// before this JavaScript loads, skipping the question. A plain button does
// nothing until then.
export function ConfirmButton({
  action,
  question,
  children,
  className,
}: {
  action: () => Promise<void>;
  question: string;
  children: ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  function handleClick() {
    if (!window.confirm(question)) return;
    // Errors thrown by the action reach app/lists/error.tsx.
    startTransition(() => action());
  }
  return (
    <button type="button" onClick={handleClick} disabled={pending} className={className}>
      {children}
    </button>
  );
}

// Under each form: the error in red, or what worked as a mint tag. Always in
// the page so screen readers hear the message when it appears.
function Status({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : (
        state.message && (
          <p className={`mt-2 ${tag} bg-mint text-on-mint`}>
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        )
      )}
    </div>
  );
}
