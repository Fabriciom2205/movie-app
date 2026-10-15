"use client";

import { useId, useSyncExternalStore } from "react";

// Today's date for a ticket ("Fri, Oct 10"), in the viewer's own time zone.
// The server runs in UTC and doesn't know that zone (at 9pm in New York it's
// already tomorrow in UTC), so the server renders nothing and the browser
// fills the date in right after the page loads.
export function TicketDate() {
  const today = useSyncExternalStore(subscribe, todayLabel, () => "");
  return <span>{today}</span>;
}

// Today's date as a round rubber stamp in the second ink (the home ticket):
// the venue around the ring, the weekday and "OCT 14" in the middle, with
// wobbly edges and worn spots like real stamp ink. Same time-zone rule as
// TicketDate. Its accessible name is the date; the rest is decoration.
// Place and size it from outside (className), e.g. absolute in a corner.
export function DateStamp({ className = "" }: { className?: string }) {
  const weekday = useSyncExternalStore(subscribe, () => format({ weekday: "short" }), () => "");
  const day = useSyncExternalStore(subscribe, () => format({ month: "short", day: "numeric" }), () => "");
  // Ids for the ring path and the ink filter, unique on the page (useId's
  // own characters aren't all safe inside url(#...), so keep the safe ones).
  const id = useId().replace(/[^\w-]/g, "");
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={day ? `Tonight: ${weekday}, ${day}` : "Tonight"}
      className={`pointer-events-none rotate-12 text-stamp-red opacity-90 mix-blend-multiply ${className}`}
    >
      <defs>
        <path id={`${id}-ring`} d="M17 60a43 43 0 1 1 86 0a43 43 0 1 1-86 0" />
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.2} result="wobbly" />
          <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves={2} seed={11} result="spots" />
          <feColorMatrix in="spots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.4" result="wear" />
          <feComposite in="wobbly" in2="wear" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-ink)`} fill="currentColor">
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text className="font-body text-[9.5px] font-medium">
          <textPath href={`#${id}-ring`} textLength="262" lengthAdjust="spacing">
            THE MOONLIT ROOM &middot; ADMITTED &middot;
          </textPath>
        </text>
        <text x="60" y="51" textAnchor="middle" className="font-body text-[10px] font-medium tracking-[0.2em]">
          {weekday.toUpperCase()}
        </text>
        <text x="60" y="78" textAnchor="middle" className="font-heading text-[24px] tracking-[0.04em]">
          {day.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

// The date doesn't need live updates while the page is open.
const subscribe = () => () => {};

function todayLabel() {
  return format({ weekday: "short", month: "short", day: "numeric" });
}

function format(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options).format(new Date());
}
