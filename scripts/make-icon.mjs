// Gera build/icon.png (1024x1024): um berrante em pixel art roxo (#bd93f9) sobre #282a36.
// Desenho procedural numa grade 32x32 — original, sem assets de terceiros.
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const GRID = 32
const SIZE = 1024
const CELL = SIZE / GRID

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]
const C = {
  clear: [0, 0, 0, 0],
  plate: hex('#282a36'),
  plateEdge: hex('#44475a'),
  plateShade: hex('#21222c'),
  horn: hex('#bd93f9'),
  hornLight: hex('#d9c2ff'),
  hornDark: hex('#8a63d2'),
  outline: hex('#5b3f9a'),
  band: hex('#ff79c6'),
  bandDark: hex('#c9559c'),
  bell: hex('#191a21'),
  mouth: hex('#f8f8f2'),
  note: hex('#50fa7b')
}

const grid = Array.from({ length: GRID }, () => Array(GRID).fill(C.clear))
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < GRID && y < GRID) grid[y][x] = c }

// Placa com cantos chanfrados em degrau (sem arredondado)
for (let y = 1; y < GRID - 1; y++) for (let x = 1; x < GRID - 1; x++) {
  const cx = Math.min(x - 1, GRID - 2 - x), cy = Math.min(y - 1, GRID - 2 - y)
  if (cx + cy < 3) continue
  const edge = cx === 0 || cy === 0 || cx + cy === 3
  set(x, y, edge ? C.plateEdge : cy >= GRID - 6 && y > GRID / 2 ? C.plateShade : C.plate)
}

// Curva central (Bézier quadrática): bocal à esquerda, campânula à direita
const P0 = [4.5, 8.5], P1 = [8, 28], P2 = [23.5, 16]
const at = (s) => [
  (1 - s) ** 2 * P0[0] + 2 * (1 - s) * s * P1[0] + s * s * P2[0],
  (1 - s) ** 2 * P0[1] + 2 * (1 - s) * s * P1[1] + s * s * P2[1]
]
const radius = (s) => 0.85 + 1.6 * s + 3.4 * s ** 6
const inside = Array.from({ length: GRID }, () => Array(GRID).fill(-1))
for (let i = 0; i <= 400; i++) {
  const s = i / 400
  const [px, py] = at(s)
  const r = radius(s)
  for (let y = Math.floor(py - r - 1); y <= py + r + 1; y++) for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue
    if (Math.hypot(x + 0.5 - px, y + 0.5 - py) <= r) inside[y][x] = Math.max(inside[y][x], s)
  }
}
const isIn = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID && inside[y][x] >= 0
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
  if (!isIn(x, y)) continue
  const s = inside[y][x]
  let c = C.horn
  if (!isIn(x, y - 1)) c = C.hornLight
  if (!isIn(x, y + 1) || !isIn(x + 1, y + 1)) c = C.hornDark
  if (!isIn(x - 1, y) && !isIn(x, y - 1)) c = C.hornLight
  // anéis decorativos ao longo do corpo
  for (const b of [0.3, 0.52, 0.72]) if (Math.abs(s - b) < 0.018) c = isIn(x, y + 1) ? C.band : C.bandDark
  set(x, y, c)
}
// contorno
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
  if (isIn(x, y)) continue
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isIn(x + dx, y + dy))) set(x, y, C.outline)
}
// boca da campânula: elipse com aro claro e interior escuro
const [bx, by] = at(1)
const rb = radius(1)
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
  const dx = (x + 0.5 - bx) / 1.9, dy = (y + 0.5 - by) / (rb + 0.4)
  const d = dx * dx + dy * dy
  if (d <= 1) set(x, y, d <= 0.45 ? C.bell : C.hornLight)
  else if (d <= 1.45 && x >= Math.floor(bx)) set(x, y, C.outline)
}
const [mx, my] = at(0)
set(Math.floor(mx) - 1, Math.floor(my), C.mouth)
set(Math.floor(mx), Math.floor(my), C.mouth)
set(Math.floor(mx) - 1, Math.floor(my) - 1, C.outline)
// "som" saindo da campânula: três blocos
for (const [x, y] of [[27, 9], [27, 17], [28, 13]]) set(x, y, C.note)

const png = new PNG({ width: SIZE, height: SIZE })
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const c = grid[Math.floor(y / CELL)][Math.floor(x / CELL)]
  const i = (y * SIZE + x) * 4
  png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = c[3]
}
mkdirSync(join(root, 'build'), { recursive: true })
writeFileSync(join(root, 'build', 'icon.png'), PNG.sync.write(png))
mkdirSync(join(root, 'resources'), { recursive: true })
writeFileSync(join(root, 'resources', 'icon.png'), PNG.sync.write(png))
console.log('build/icon.png gerado')
