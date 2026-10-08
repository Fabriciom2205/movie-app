// WCAG 2.1 contrast ratio between two colors.
//   node .claude/skills/frontend-design/scripts/contrast.mjs "#1E293B" "#EEF5FF"
// Needs: 4.5 for normal text, 3 for large text (24px, or 19px bold) and for
// UI parts like focus rings and input outlines.

const [fg, bg] = process.argv.slice(2);
if (!/^#[0-9a-f]{6}$/i.test(fg ?? "") || !/^#[0-9a-f]{6}$/i.test(bg ?? "")) {
  console.error('Usage: node contrast.mjs "#RRGGBB" "#RRGGBB"');
  process.exit(1);
}

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => channel(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
const ratio = (hi + 0.05) / (lo + 0.05);
const verdict = ratio >= 4.5 ? "passes for text" : ratio >= 3 ? "large text / UI parts only" : "FAILS";
console.log(`${fg} on ${bg}: ${ratio.toFixed(2)}:1 (${verdict})`);
