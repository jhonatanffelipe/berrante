// Gera o ícone do app (build/icon.png 1024x1024, usado para o .icns e o Dock em dev).
// Estilo painel de telemetria: placa azul-marinho quase preta, matriz de LEDs apagados ao fundo
// e o símbolo do Berrante (a peça "cadeirinha"/Z do Tetris) em LEDs azuis acesos.
// Desenho procedural — original, sem assets de terceiros.
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 1024
const GRID = 16 // matriz de 16x16 blocos: menos blocos, maiores, legíveis até no Dock pequeno
const STEP = 46 // passo inteiro: toda borda de bloco cai exatamente num pixel (nitidez)
const PLATE = STEP * (GRID + 2) // 1 bloco de respiro em cada borda
const MARGIN = (SIZE - PLATE) / 2 // ~98px (guia de ícones do macOS)
const CELL = STEP - 6 // vão fixo de 6px entre blocos
const RADIUS = 180

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const C = {
  plateTop: hex('#0f1a2b'),
  plateBottom: hex('#060b14'),
  border: hex('#22344f'),
  off: hex('#121d30'),
  accent: hex('#2f8cff')
}

// ---------- símbolo: a peça "cadeirinha" (Z) do Tetris, toda azul
// Cada quadrado da peça vira 4x4 LEDs acesos; a peça (3x2 quadrados) fica centrada na matriz 16x16.
const PIECE = [[0, 0], [1, 0], [1, 1], [2, 1]]
const SQUARE = 4
const OX = (GRID - 3 * SQUARE) / 2
const OY = (GRID - 2 * SQUARE) / 2
const cells = new Map() // "x,y" -> cor
for (const [px, py] of PIECE)
  for (let y = 0; y < SQUARE; y++)
    for (let x = 0; x < SQUARE; x++) cells.set(`${OX + px * SQUARE + x},${OY + py * SQUARE + y}`, C.accent)

// ---------- raster
const px = new Float32Array(SIZE * SIZE * 4)
const glow = new Float32Array(SIZE * SIZE)

function roundedPlate(x, y) {
  const lx = x - MARGIN, ly = y - MARGIN
  if (lx < 0 || ly < 0 || lx >= PLATE || ly >= PLATE) return -1
  const cx = Math.min(lx, PLATE - 1 - lx), cy = Math.min(ly, PLATE - 1 - ly)
  if (cx < RADIUS && cy < RADIUS) {
    const d = Math.hypot(RADIUS - cx, RADIUS - cy)
    if (d > RADIUS) return -1
    return RADIUS - d
  }
  return Math.min(cx, cy)
}

for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4
    const edge = roundedPlate(x, y)
    if (edge < 0) continue
    const t = (y - MARGIN) / PLATE
    let c = C.plateTop.map((v, k) => v + (C.plateBottom[k] - v) * t)
    if (edge < 6) c = C.border
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = Math.min(1, edge + 1)
  }

const rect = (gx, gy, color, alpha = 1) => {
  const x0 = MARGIN + STEP * (gx + 1) + (STEP - CELL) / 2
  const y0 = MARGIN + STEP * (gy + 1) + (STEP - CELL) / 2
  const r = 5
  for (let y = Math.floor(y0); y < y0 + CELL; y++)
    for (let x = Math.floor(x0); x < x0 + CELL; x++) {
      const cx = Math.min(x - x0, x0 + CELL - 1 - x), cy = Math.min(y - y0, y0 + CELL - 1 - y)
      if (cx < r && cy < r && Math.hypot(r - cx, r - cy) > r) continue
      const i = (y * SIZE + x) * 4
      for (let k = 0; k < 3; k++) px[i + k] = px[i + k] * (1 - alpha) + color[k] * alpha
    }
}

// LEDs apagados (textura de matriz)
for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) if (!cells.has(`${gx},${gy}`)) rect(gx, gy, C.off, 0.55)

// brilho: mapa dos blocos acesos, depois blur
for (const [k, c] of cells) {
  const [gx, gy] = k.split(',').map(Number)
  const cxp = MARGIN + STEP * (gx + 1.5), cyp = MARGIN + STEP * (gy + 1.5)
  const a = c[3] ?? 1
  for (let y = Math.floor(cyp - STEP / 2); y < cyp + STEP / 2; y++)
    for (let x = Math.floor(cxp - STEP / 2); x < cxp + STEP / 2; x++) glow[y * SIZE + x] = Math.max(glow[y * SIZE + x], a)
}
function blur(src, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length)
  for (let y = 0; y < SIZE; y++) {
    let acc = 0
    for (let x = -r; x < SIZE + r; x++) {
      acc += src[y * SIZE + Math.min(SIZE - 1, Math.max(0, x + r))] - src[y * SIZE + Math.min(SIZE - 1, Math.max(0, x - r - 1))]
      if (x >= 0 && x < SIZE) tmp[y * SIZE + x] = acc / (2 * r + 1)
    }
  }
  for (let x = 0; x < SIZE; x++) {
    let acc = 0
    for (let y = -r; y < SIZE + r; y++) {
      acc += tmp[Math.min(SIZE - 1, Math.max(0, y + r)) * SIZE + x] - tmp[Math.min(SIZE - 1, Math.max(0, y - r - 1)) * SIZE + x]
      if (y >= 0 && y < SIZE) out[y * SIZE + x] = acc / (2 * r + 1)
    }
  }
  return out
}
const g = blur(blur(glow, 14), 14)
for (let p = 0; p < SIZE * SIZE; p++) {
  const i = p * 4
  if (px[i + 3] === 0) continue
  const a = Math.min(1, g[p] * 0.6)
  for (let k = 0; k < 3; k++) px[i + k] = px[i + k] + (C.accent[k] - px[i + k]) * a * 0.3
}

// blocos acesos por cima
for (const [k, c] of cells) {
  const [gx, gy] = k.split(',').map(Number)
  rect(gx, gy, c, c[3] ?? 1)
}

const png = new PNG({ width: SIZE, height: SIZE })
for (let p = 0; p < SIZE * SIZE * 4; p += 4) {
  png.data[p] = Math.round(px[p]); png.data[p + 1] = Math.round(px[p + 1]); png.data[p + 2] = Math.round(px[p + 2])
  png.data[p + 3] = Math.round(px[p + 3] * 255)
}
for (const dir of ['build', 'resources']) {
  mkdirSync(join(root, dir), { recursive: true })
  writeFileSync(join(root, dir, 'icon.png'), PNG.sync.write(png))
}
console.log('ícone gerado em build/icon.png e resources/icon.png')
