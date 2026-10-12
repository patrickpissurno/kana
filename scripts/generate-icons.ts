import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const OUTPUT_DIR = resolve(SCRIPT_DIR, '../packages/web/app/assets/icons');

const CANVAS_SIZE = 512;
const BG_COLOR = { r: 20, g: 20, b: 20 }; // #141414
const FG_COLOR = { r: 220, g: 38, b: 38 }; // #dc2626 (Vermilion red)

type Point = [number, number];

interface StrokeDef {
  points: Point[];
  widths: [number, number];
}

const KANA_STROKES: StrokeDef[] = [
  // か (Ka)
  // Stroke 1: Top-curve sweeping right and down into hook
  {
    points: [
      [125, 210],
      [175, 195],
      [215, 220],
    ],
    widths: [12, 15],
  },
  {
    points: [
      [215, 220],
      [218, 280],
      [195, 335],
    ],
    widths: [15, 12],
  },
  {
    points: [
      [195, 335],
      [185, 348],
      [162, 318],
    ],
    widths: [12, 6],
  },
  // Stroke 2: Sweeping crossing stroke from top to lower-left
  {
    points: [
      [180, 148],
      [176, 240],
      [138, 355],
    ],
    widths: [14, 10],
  },
  // Stroke 3: Accent dot
  {
    points: [
      [225, 162],
      [236, 174],
      [248, 190],
    ],
    widths: [8, 11],
  },

  // な (Na)
  // Stroke 1: Top horizontal
  {
    points: [
      [278, 210],
      [310, 208],
      [342, 205],
    ],
    widths: [11, 12],
  },
  // Stroke 2: Diagonal crossing stroke
  {
    points: [
      [316, 152],
      [312, 220],
      [284, 320],
    ],
    widths: [14, 10],
  },
  // Stroke 3: Top-right dot
  {
    points: [
      [366, 178],
      [376, 188],
      [388, 205],
    ],
    widths: [8, 11],
  },
  // Stroke 4: Downward loop
  {
    points: [
      [356, 248],
      [346, 290],
      [338, 335],
    ],
    widths: [11, 11],
  },
  {
    points: [
      [338, 335],
      [362, 362],
      [382, 340],
    ],
    widths: [11, 10],
  },
  {
    points: [
      [382, 340],
      [386, 315],
      [342, 315],
    ],
    widths: [10, 7],
  },
];

function createBmpBuffer(strokes: StrokeDef[], scale = 1.0, size = CANVAS_SIZE): Buffer {
  const rowSize = (size * 3 + 3) & ~3;
  const pixelArraySize = rowSize * size;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(size, 18);
  buf.writeInt32LE(size, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(pixelArraySize, 34);

  const alpha = new Float32Array(size * size);

  const drawSegment = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => {
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - Math.max(r0, r1) - 2));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + Math.max(r0, r1) + 2));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - Math.max(r0, r1) - 2));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + Math.max(r0, r1) + 2));

    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let t = 0;
        if (lenSq > 0.0001) {
          t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / lenSq));
        }
        const cx = x0 + t * dx;
        const cy = y0 + t * dy;
        const r = r0 + t * (r1 - r0);
        const dist = Math.hypot(x - cx, y - cy);
        const cov = Math.max(0, Math.min(1, r + 0.75 - dist));
        const idx = y * size + x;
        if (cov > alpha[idx]!) {
          alpha[idx] = cov;
        }
      }
    }
  };

  const center = size / 2;

  for (const stroke of strokes) {
    const pts = stroke.points.map(([px, py]) => [
      center + (px - center) * scale,
      center + (py - center) * scale,
    ]);
    const w0 = stroke.widths[0] * scale;
    const w1 = stroke.widths[1] * scale;

    const steps = 30;
    let prevX = pts[0]![0]!;
    let prevY = pts[0]![1]!;
    let prevW = w0;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * pts[0]![0]! + 2 * u * t * pts[1]![0]! + t * t * pts[2]![0]!;
      const y = u * u * pts[0]![1]! + 2 * u * t * pts[1]![1]! + t * t * pts[2]![1]!;
      const w = u * w0 + t * w1;
      drawSegment(prevX, prevY, x, y, prevW, w);
      prevX = x;
      prevY = y;
      prevW = w;
    }
  }

  for (let y = 0; y < size; y++) {
    const rowOffset = 54 + (size - 1 - y) * rowSize;
    for (let x = 0; x < size; x++) {
      const a = alpha[y * size + x]!;
      const r = Math.round(BG_COLOR.r * (1 - a) + FG_COLOR.r * a);
      const g = Math.round(BG_COLOR.g * (1 - a) + FG_COLOR.g * a);
      const b = Math.round(BG_COLOR.b * (1 - a) + FG_COLOR.b * a);
      const px = rowOffset + x * 3;
      buf[px] = b;
      buf[px + 1] = g;
      buf[px + 2] = r;
    }
  }

  return buf;
}

function generateSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#141414" rx="96" />
  <text x="256" y="325" font-size="200" font-family="'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif" font-weight="800" text-anchor="middle" fill="#dc2626" letter-spacing="-8">かな</text>
</svg>
`;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('Generating master icon bitmaps...');
  const standardBmp = createBmpBuffer(KANA_STROKES, 1.0);
  const maskableBmp = createBmpBuffer(KANA_STROKES, 0.75); // Inner safe-zone 75% for Android adaptive masks

  const standardImg = new Bun.Image(standardBmp);
  const maskableImg = new Bun.Image(maskableBmp);

  console.log('Encoding PNGs via Bun.Image...');
  await standardImg.resize(512, 512).png().write(resolve(OUTPUT_DIR, 'icon-512.png'));
  await standardImg.resize(192, 192).png().write(resolve(OUTPUT_DIR, 'icon-192.png'));
  await standardImg.resize(180, 180).png().write(resolve(OUTPUT_DIR, 'apple-touch-icon.png'));

  await maskableImg.resize(512, 512).png().write(resolve(OUTPUT_DIR, 'icon-maskable-512.png'));
  await maskableImg.resize(192, 192).png().write(resolve(OUTPUT_DIR, 'icon-maskable-192.png'));

  console.log('Emitting SVG icon...');
  await Bun.write(resolve(OUTPUT_DIR, 'icon.svg'), generateSvg());

  console.log(`PWA assets successfully generated in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
