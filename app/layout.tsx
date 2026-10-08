import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// The design system's two fonts: Fredoka for headings, Nunito for the rest.
// next/font downloads them at build time and serves them from this site, so
// visitors' browsers never call Google. Both are variable fonts, so one file
// each covers every weight. globals.css maps them to font-heading / font-body.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Night",
  description: "Pick one movie to watch tonight.",
};

// Always light: form controls and scrollbars stay light, and phones tint
// their browser bar to match the page (the same color as --color-page).
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#EEF5FF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="px-4 py-6 text-center text-xs text-ink-muted">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
      </body>
    </html>
  );
}
