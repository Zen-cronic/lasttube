import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const source = fs.readFileSync(path.resolve('public/icon-source.svg'));
const outputDir = path.resolve('public/icons');
fs.mkdirSync(outputDir, { recursive: true });

await Promise.all(
  [192, 512].map((size) =>
    sharp(source)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `lasttube-${size}.png`)),
  ),
);

console.log('[generate:icons] wrote 192px and 512px mobile app icons');
