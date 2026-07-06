// Generates PWA icons (PNG) without any image libraries: renders concentric
// progress rings onto an RGBA raster and encodes it as PNG using node:zlib.
// Run: npm run icons
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BG = [11, 11, 15];
const RINGS = [
  { color: [228, 87, 46], frac: 0.78 }, // calories — #E4572E
  { color: [23, 190, 187], frac: 0.62 }, // protein — #17BEBB
  { color: [255, 201, 20], frac: 0.85 }, // carbs — #FFC914
  { color: [118, 176, 65], frac: 0.55 }, // fat — #76B041
];

function render(size) {
  const ss = 3; // supersampling factor for smooth edges
  const S = size * ss;
  const px = new Float64Array(S * S * 3);
  // background
  for (let i = 0; i < S * S; i++) {
    px[i * 3] = BG[0];
    px[i * 3 + 1] = BG[1];
    px[i * 3 + 2] = BG[2];
  }
  const cx = S / 2;
  const cy = S / 2;
  const stroke = S * 0.052;
  const gap = S * 0.024;
  const outerR = S / 2 - S * 0.13;

  for (let ri = 0; ri < RINGS.length; ri++) {
    const { color, frac } = RINGS[ri];
    const r = outerR - ri * (stroke + gap);
    const track = color.map((c) => Math.round(c * 0.22 + BG[0] * 0.3));
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        if (Math.abs(dist - r) > stroke / 2) continue;
        // angle from 12 o'clock, clockwise, 0..1
        let a = Math.atan2(dx, -dy) / (2 * Math.PI);
        if (a < 0) a += 1;
        const c = a <= frac ? color : track;
        const i = (y * S + x) * 3;
        px[i] = c[0];
        px[i + 1] = c[1];
        px[i + 2] = c[2];
      }
    }
  }

  // downsample to target size (box filter)
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const i = ((y * ss + sy) * S + x * ss + sx) * 3;
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
      }
      const n = ss * ss;
      const o = (y * size + x) * 4;
      rgba[o] = r / n;
      rgba[o + 1] = g / n;
      rgba[o + 2] = b / n;
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

// ---- minimal PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [180, 192, 512]) {
  const png = encodePng(render(size), size);
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
