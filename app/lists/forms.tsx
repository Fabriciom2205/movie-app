"use client";

import { useActionState, useTransition, type ReactNode } from "react";
import { createList, inviteToList, renameList, type FormState } from "./actions";

const initialState: FormState = { error: null, message: null, value: "" };

const inputClass =
  "min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
const buttonClass =
  "shrink-0 rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60";

export function CreateListForm() {
  const [state, formAction, pending] = useActionState(createList, initialState);
  return (
    <form action={formAction} className="mt-6">
      <div className="flex gap-2">
        <input
          // key: React clears form fields after a submit; this puts back what
          // was typed when the server sends an error.
          key={state.value}
          name="name"
          defaultValue={state.value}
          placeholder="New list name, e.g. Movie night"
          aria-label="New list name"
          maxLength={100}
          required
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
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
  return (
    <form action={formAction}>
      <div className="flex gap-2">
        <input
          key={state.value}
          name="name"
          defaultValue={state.value}
          aria-label="List name"
          maxLength={100}
          required
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function InviteForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(inviteToList.bind(null, listId), initialState);
  return (
    <form action={formAction}>
      <div className="flex gap-2">
        <input
          key={state.value}
          name="email"
          type="email"
          defaultValue={state.value}
          placeholder="Their email"
          aria-label="Email of the person to add"
          autoComplete="off"
          required
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
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

function Status({ state }: { state: FormState }) {
  return (
    <p
      aria-live="polite"
      className={`mt-2 min-h-5 text-sm ${state.error ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}
    >
      {state.error ?? state.message}
    </p>
  );
}
