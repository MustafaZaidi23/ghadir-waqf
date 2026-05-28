import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const pub = join(__dir, "../public");
const svg = readFileSync(join(pub, "icon.svg"));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(pub, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// Apple touch icon (180×180)
await sharp(svg).resize(180, 180).png().toFile(join(pub, "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");
