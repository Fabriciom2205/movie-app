// Shown right away while the well-known movies load from TMDB: the grid's
// shape in soft blue, laid out like rate-grid.tsx. Pulses only if the device
// allows motion.
export default function RateLoading() {
  const block = "bg-soft motion-safe:animate-pulse";
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <div className="h-10" /> {/* where the Done link goes */}
      <p aria-live="polite" className="sr-only">
        Loading movies to rate…
      </p>
      <div aria-hidden="true">
        <div className={`mt-4 h-9 w-3/4 max-w-md rounded-full ${block}`} />
        <div className={`mt-4 h-4 w-full max-w-2xl rounded-full ${block}`} />
        <div className={`mt-2 h-4 w-2/3 max-w-xl rounded-full ${block}`} />
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="rounded-card border-2 border-line bg-card p-2.5">
              <div className={`aspect-2/3 rounded-poster ${block}`} />
              <div className={`mt-3 h-4 w-4/5 rounded-full ${block}`} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className={`h-10 rounded-full ${block}`} />
                <div className={`h-10 rounded-full ${block}`} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
