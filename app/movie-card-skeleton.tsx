import type { ReactNode } from "react";
import { WallTicket } from "@/app/ticket";
import { paper, posterGrid } from "@/app/ui";

// A movie ticket's shape (posterGrid) in soft lavender, taped to the wall like
// the real one, for loading.tsx files: the movie drops into the same place
// instead of the page jumping. Pulses only if the device allows motion. The
// blocks are hidden from screen readers, so say what's loading in words
// (aria-live): `children` go at the top of the ticket, outside the hidden
// part, up against the paper's top edge (/pick and the movie page put their
// band there).
export function MovieCardSkeleton({ className = "", children }: { className?: string; children?: ReactNode }) {
  const block = "bg-soft motion-safe:animate-pulse";
  return (
    <WallTicket tape tapeTop="-top-6 sm:-top-3.5" className={className}>
      <div className={`ticket-cut ${paper} py-4 sm:py-5`}>
        {children && <div className="-mt-4 sm:-mt-5">{children}</div>}
        <div aria-hidden="true" className={`${posterGrid} px-5 pt-5 pb-1 sm:px-6 sm:pt-6`}>
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
    </WallTicket>
  );
}
