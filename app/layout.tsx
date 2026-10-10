import type { Metadata, Viewport } from "next";
import { DM_Mono, League_Gothic } from "next/font/google";
import Image from "next/image";
import { secondaryButton } from "@/app/ui";
import moonlitRoom from "./moonlit-room.webp";
import "./globals.css";

// The design system's two fonts: League Gothic (tall cinema-ticket capitals)
// for headings and buttons, DM Mono (typewriter-like ticket print) for the
// rest. next/font downloads them at build time and serves them from this
// site, so visitors' browsers never call Google. League Gothic is a variable
// font (one file); DM Mono isn't, so it needs its weights listed: 400 for
// text, 500 for emphasis. globals.css maps them to font-heading / font-body.
const leagueGothic = League_Gothic({
  variable: "--font-league-gothic",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Movie Night",
  description: "Pick one movie to watch tonight.",
};

// The content panels are light, so form controls stay light. Phones tint their
// browser bar to match the night room behind them (the same as --color-night).
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#241F42",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${leagueGothic.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip link: the first thing Tab reaches. It waits above the screen
            and slides into view when focused. Every page marks where its own
            content starts with id="content" (the home page: after its nav). */}
        <a
          href="#content"
          className={`${secondaryButton} fixed top-3 left-3 z-50 bg-page shadow-soft -translate-y-20 focus:translate-y-0`}
        >
          Skip to content
        </a>
        {/* The room art, fixed behind every page (decoration only). Its source
            is design-system/movie-night/moonlit-room.svg; MASTER.md says how
            it's laid out. Phones: a small strip of the room across the top
            (fairy lights, the window and moon) fading into the night color;
            wider: the whole room. */}
        <div aria-hidden="true" className="fixed inset-x-0 top-0 -z-10 h-56 sm:inset-0 sm:h-auto">
          <Image
            src={moonlitRoom}
            alt=""
            fill
            loading="eager"
            placeholder="blur"
            sizes="(max-width: 639px) 110vw, 100vw"
            className="object-cover object-[8%_50%] lg:object-center"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-night sm:hidden" />
        </div>
        {/* On phones the content starts 96px down, so the moon peeks out above
            it, and runs edge to edge so text keeps its width. */}
        <div className="flex-1 pt-24 sm:px-6 sm:pt-10">{children}</div>
        <footer className="px-4 py-6 text-center text-xs">
          <p className="inline-block rounded-field bg-night/85 px-3 py-1.5 text-on-night">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
            <br />
            Room illustration inspired by Lofi Night by redtreacle.
          </p>
        </footer>
      </body>
    </html>
  );
}
