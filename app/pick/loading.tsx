// Shown right away while the picker checks what's streaming (live TMDB data).
export default function PickLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p aria-live="polite" className="text-zinc-500">
        Picking tonight&rsquo;s movie…
      </p>
    </main>
  );
}
