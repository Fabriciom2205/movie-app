"use client";

import { useSyncExternalStore } from "react";

// Today's date for a ticket ("Fri, Oct 10"), in the viewer's own time zone.
// The server runs in UTC and doesn't know that zone (at 9pm in New York it's
// already tomorrow in UTC), so the server renders nothing and the browser
// fills the date in right after the page loads.
export function TicketDate() {
  const today = useSyncExternalStore(subscribe, todayLabel, () => "");
  return <span>{today}</span>;
}

// The date doesn't need live updates while the page is open.
const subscribe = () => () => {};

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}
