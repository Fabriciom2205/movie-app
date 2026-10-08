// Paste into the browser's JavaScript tool while a reference site is open.
// It only reads: it returns the page's most-used text colors, backgrounds,
// fonts, corner radii and shadows, plus samples of common elements, so a look
// can be adapted from real values instead of guessed from a screenshot.
// (A plain script, not a module: the last expression is the result.)
(() => {
  const count = (map, key) => key && map.set(key, (map.get(key) ?? 0) + 1);
  const top = (map, n = 8) =>
    [...map]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value, times]) => `${value} (x${times})`);

  // Tailwind's rounded-full is an "infinite" radius (shows as 3.35544e+07px),
  // and its shadows come stacked with empty transparent layers.
  const radius = (r) => (parseFloat(r) > 9999 ? "pill (fully round)" : r);
  const shadow = (s) =>
    s
      .split(/,(?![^(]*\))/)
      .map((part) => part.trim())
      .filter((part) => !part.startsWith("rgba(0, 0, 0, 0)"))
      .join(", ") || null;

  const textColors = new Map();
  const backgrounds = new Map();
  const fonts = new Map();
  const radii = new Map();
  const shadows = new Map();

  for (const el of document.querySelectorAll("body *")) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue; // not shown
    const s = getComputedStyle(el);
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (hasOwnText) {
      count(textColors, s.color);
      count(fonts, `${s.fontFamily.split(",")[0]} ${s.fontWeight}`);
    }
    if (s.backgroundColor !== "rgba(0, 0, 0, 0)") count(backgrounds, s.backgroundColor);
    if (s.borderRadius !== "0px") count(radii, radius(s.borderRadius));
    if (s.boxShadow !== "none") count(shadows, shadow(s.boxShadow));
  }

  const sample = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      selector,
      font: s.fontFamily,
      size: s.fontSize,
      weight: s.fontWeight,
      lineHeight: s.lineHeight,
      color: s.color,
      background: s.backgroundColor,
      radius: radius(s.borderRadius),
      padding: s.padding,
    };
  };

  return {
    page: location.href,
    pageBackground: getComputedStyle(document.body).backgroundColor,
    contentWidth: Math.round(document.querySelector("main")?.getBoundingClientRect().width ?? 0) || null,
    textColors: top(textColors),
    backgrounds: top(backgrounds),
    fonts: top(fonts),
    radii: top(radii),
    shadows: top(shadows, 4),
    samples: ["h1", "h2", "p", "a", "button", "input:not([type=hidden])"].map(sample).filter(Boolean),
  };
})();
