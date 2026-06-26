/**
 * Generates PWA PNG icons from public/favicon.svg (Jiokoe orange lock mark).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const svgPath = path.join(root, 'public', 'favicon.svg')
const svg = fs.readFileSync(svgPath)

const sizes = [192, 512]
for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(path.join(root, 'public', `pwa-${size}.png`))
  console.log(`wrote public/pwa-${size}.png`)
}

// Maskable: logo centered on app background with safe-zone padding (~20%).
const maskSize = 512
const logoSize = Math.round(maskSize * 0.62)
const logoPng = await sharp(svg).resize(logoSize, logoSize).png().toBuffer()
await sharp({
  create: {
    width: maskSize,
    height: maskSize,
    channels: 4,
    background: { r: 23, g: 23, b: 23, alpha: 1 },
  },
})
  .composite([{ input: logoPng, gravity: 'center' }])
  .png()
  .toFile(path.join(root, 'public', 'pwa-512-maskable.png'))
console.log('wrote public/pwa-512-maskable.png')
