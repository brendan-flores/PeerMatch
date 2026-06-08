import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BRAND_PAGE_BG = { r: 229, g: 246, b: 244 }; // #E5F6F4
const BRAND_HEADER_BG = { r: 255, g: 255, b: 255 }; // white header surface

function isBackgroundPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const lum = (r + g + b) / 3;

  // Preserve logo colors (orange/blue) and dark tagline text.
  if (sat >= 28) return false;
  if (lum < 95) return false;

  // Neutral light grays, checkerboard, and near-white matte.
  return lum >= 95;
}

async function processLogo(inputPath, outputPath, background = "transparent") {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (!isBackgroundPixel(r, g, b)) continue;

    if (background === "transparent") {
      data[i + 3] = 0;
      continue;
    }

    const bg = background === "page" ? BRAND_PAGE_BG : BRAND_HEADER_BG;
    data[i] = bg.r;
    data[i + 1] = bg.g;
    data[i + 2] = bg.b;
    data[i + 3] = 255;
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

const root = path.resolve(import.meta.dirname, "..");
const source = process.argv[2] || path.join(root, "public", "branding", "peermatch-brand-logo.png");
const outTransparent = path.join(root, "public", "branding", "peermatch-brand-logo.png");
const outHeader = path.join(root, "public", "branding", "peermatch-brand-logo-header.png");

await processLogo(source, outTransparent, "transparent");
await processLogo(source, outHeader, "header");

for (const file of [outTransparent, outHeader]) {
  const trimmed = await sharp(file).trim({ threshold: 10 }).png().toBuffer();
  fs.writeFileSync(file, trimmed);
}

const meta = await sharp(outTransparent).metadata();
console.log("Processed:", { source, outTransparent, outHeader, size: `${meta.width}x${meta.height}` });
