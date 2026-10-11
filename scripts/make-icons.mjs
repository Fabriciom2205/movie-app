// Rebuilds the icon files that can't be SVG, from the SVG sources:
//   app/icon.svg                            -> app/favicon.ico (16, 32, 48 px)
//   design-system/movie-night/apple-icon.svg -> app/apple-icon.png (180 px)
// Run after changing either SVG:  node scripts/make-icons.mjs
// Uses sharp, which comes with Next.js (it isn't a direct dependency).
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const FAVICON_SIZES = [16, 32, 48];

// An SVG drawn at a given size. `density` makes librsvg draw it at that size
// instead of drawing it small and scaling the pixels up (which would blur it).
async function png(svgPath, size) {
  const svg = await readFile(svgPath);
  const { width } = await sharp(svg).metadata();
  return sharp(svg, { density: (72 * size) / width })
    .resize(size, size)
    .png()
    .toBuffer();
}

// An .ico file is a small header, one 16-byte entry per size, then each
// image. Since Windows Vista the images may simply be PNG files.
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const images = await Promise.all(
  FAVICON_SIZES.map(async (size) => ({ size, data: await png("app/icon.svg", size) })),
);
await writeFile("app/favicon.ico", ico(images));
await writeFile("app/apple-icon.png", await png("design-system/movie-night/apple-icon.svg", 180));
console.log(`Wrote app/favicon.ico (${FAVICON_SIZES.join(", ")} px) and app/apple-icon.png (180 px).`);
