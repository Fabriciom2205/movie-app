import { card, posterGrid } from "@/app/ui";

// A movie card's shape (posterGrid) in soft blue, for loading.tsx files: the
// movie drops into the same place instead of the page jumping. Pulses only if
// the device allows motion. Hidden from screen readers, so the page should
// say what's loading in words (aria-live).
export function MovieCardSkeleton({ className = "" }: { className?: string }) {
  const block = "rounded-full bg-soft motion-safe:animate-pulse";
  return (
    <div aria-hidden="true" className={`shadow-soft ${card} ${posterGrid} ${className}`}>
      <div className="aspect-2/3 rounded-poster bg-soft motion-safe:animate-pulse sm:row-span-2" />
      <div className="flex flex-col gap-3 self-center sm:self-start">
        <div className={`h-8 w-4/5 ${block}`} />
        <div className={`h-4 w-1/2 ${block}`} />
      </div>
      <div className="col-span-2 flex flex-col gap-3 sm:col-span-1 sm:col-start-2">
        <div className="flex flex-wrap gap-2">
          <div className={`h-7 w-48 ${block}`} />
          <div className={`h-7 w-36 ${block}`} />
        </div>
        <div className={`mt-2 h-4 w-full ${block}`} />
        <div className={`h-4 w-full ${block}`} />
        <div className={`h-4 w-2/3 ${block}`} />
      </div>
    </div>
  );
}
