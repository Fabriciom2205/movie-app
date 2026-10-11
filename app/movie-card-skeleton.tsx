import type { ReactNode } from "react";
import { posterGrid } from "@/app/ui";

// A movie ticket's shape (posterGrid) in soft lavender, for loading.tsx files:
// the movie drops into the same place instead of the page jumping. Pulses only
// if the device allows motion. The blocks are hidden from screen readers, so
// say what's loading in words (aria-live): `children` go at the top of the
// ticket, outside the hidden part (/pick puts its band there).
export function MovieCardSkeleton({ className = "", children }: { className?: string; children?: ReactNode }) {
  const block = "bg-soft motion-safe:animate-pulse";
  return (
    <div className={`bg-ticket shadow-soft ${className}`}>
      {children}
      <div aria-hidden="true" className={`${posterGrid} p-5 sm:p-6`}>
        <div className={`aspect-2/3 sm:row-span-2 ${block}`} />
        <div className="flex flex-col gap-3 self-end sm:self-start">
          <div className={`h-3 w-2/3 ${block}`} />
          <div className={`h-10 w-4/5 ${block}`} />
          <div className={`h-4 w-1/3 ${block}`} />
        </div>
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1 sm:col-start-2">
          <div className={`h-14 w-full ${block}`} />
          <div className={`h-14 w-full ${block}`} />
          <div className={`mt-2 h-4 w-full ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-2/3 ${block}`} />
        </div>
      </div>
    </div>
  );
}
