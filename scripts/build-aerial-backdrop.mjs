/**
 * Generates `public/admin/aerial-backdrop.svg` — the decorative aerial-suburb
 * tile rendered behind The Living Console (`/admin`).
 *
 * Source of truth lives in `docs/admin-redesign/prototype/shell.jsx`
 * (`HomeBackdrop` function). Whenever the prototype changes its aerial, edit
 * THIS script and re-run `node scripts/build-aerial-backdrop.mjs` to refresh
 * the committed SVG asset.
 *
 * Why pre-render to a static file: keeps `/admin` JS bundle free of ~6KB of
 * inline SVG; the asset is cached separately by the browser; future edits
 * are diffable as XML rather than as JSX.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'public', 'admin', 'aerial-backdrop.svg')

// ---------------------------------------------------------------------------
// Geometry — kept in lockstep with `docs/admin-redesign/prototype/shell.jsx`.
// ---------------------------------------------------------------------------

const PARK_CANOPY_TREES = [
  // north-west park canopy
  [60, 40], [110, 80], [160, 40], [210, 90], [260, 50], [300, 120], [160, 160], [100, 180], [60, 140], [240, 180],
  [340, 80], [400, 160], [440, 220], [120, 240], [200, 250], [80, 20], [180, 20], [290, 30], [380, 50], [460, 90],
  [500, 160], [460, 260], [380, 260], [300, 250], [140, 290], [40, 280],
  // central green ring
  [840, 720], [890, 760], [950, 740], [1010, 790], [890, 820], [940, 870], [820, 790], [1040, 760], [810, 860], [1070, 830],
  // lake-side park canopy (denser, ringing the water)
  [1410, 990], [1470, 1010], [1540, 990], [1620, 985], [1700, 985], [1780, 990], [1860, 1000], [1940, 1010],
  [1420, 1080], [1410, 1170], [1450, 1240], [1920, 1090], [1960, 1170], [1900, 1240],
  [1500, 1240], [1580, 1260], [1680, 1250], [1780, 1240], [1860, 1240],
  [1340, 1050], [1340, 1130], [1340, 1210], [1340, 990],
  // roadside copses (small clusters at street corners)
  [550, 300], [565, 310], [1050, 300], [1065, 310], [1470, 300], [1485, 310],
  [550, 640], [565, 650], [1050, 640], [1065, 650], [1470, 640], [1485, 650],
  [550, 960], [565, 970], [1050, 960], [1065, 970],
]

const BACKYARD_TREES = [
  [310, 80], [480, 90], [680, 80], [860, 90], [1040, 80], [1240, 90], [1440, 80], [1640, 90], [1840, 80],
  [330, 210], [510, 220], [710, 210], [890, 220], [1070, 210], [1270, 220], [1470, 210], [1670, 220], [1870, 210],
  [60, 410], [260, 400], [420, 410], [660, 400], [860, 410], [1040, 400], [1330, 400], [1530, 410], [1760, 400],
  [80, 540], [280, 550], [440, 540], [680, 550], [880, 540], [1070, 550], [1340, 540], [1540, 550], [1770, 540],
  [60, 740], [260, 750], [440, 740], [1140, 740], [1340, 740],
  [80, 880], [280, 890], [440, 880], [1140, 880], [1340, 880],
  [60, 1080], [260, 1090], [440, 1080], [660, 1080], [860, 1090], [1040, 1080],
]

const STREET_TREES = [
  [560, 330], [560, 395], [560, 460], [560, 525], [560, 590],
  [560, 670], [560, 735], [560, 800], [560, 865], [560, 925],
  [560, 1015], [560, 1080], [560, 1140],
  [1058, 30], [1058, 95], [1058, 160], [1058, 225],
  [1058, 330], [1058, 395], [1058, 460], [1058, 525], [1058, 590],
  [1058, 670], [1058, 735], [1058, 800], [1058, 865], [1058, 925],
  [1058, 1015], [1058, 1080], [1058, 1140],
  [1480, 30], [1480, 95], [1480, 160], [1480, 225],
  [1480, 330], [1480, 395], [1480, 460], [1480, 525], [1480, 590],
  [1480, 670], [1480, 735], [1480, 800], [1480, 865], [1480, 925],
  [30, 275], [110, 275], [190, 275], [270, 275], [350, 275], [430, 275], [510, 275],
  [600, 275], [680, 275], [760, 275], [840, 275], [920, 275], [1000, 275],
  [1090, 275], [1170, 275], [1250, 275], [1330, 275], [1410, 275],
  [1510, 275], [1600, 275], [1690, 275], [1780, 275], [1860, 275],
  [30, 615], [110, 615], [190, 615], [270, 615], [350, 615], [430, 615], [510, 615],
  [600, 615], [680, 615], [760, 615], [840, 615], [920, 615], [1000, 615],
  [1090, 615], [1170, 615], [1250, 615], [1330, 615], [1410, 615],
  [1510, 615], [1600, 615], [1690, 615], [1780, 615], [1860, 615],
  [30, 940], [110, 940], [190, 940], [270, 940], [350, 940], [430, 940], [510, 940],
  [600, 940], [680, 940], [760, 940], [840, 940], [920, 940], [1000, 940],
]

// Each row: [x, y, w, h, roof, flags] where flags is bitset: 1=pitch, 2=pool.
// Garden defaults to true; the prototype never explicitly disables it.
const HOUSES = [
  [600, 20, 70, 100, '#D08469', 1],
  [690, 14, 80, 110, '#B26553', 0],
  [790, 20, 74, 100, '#DD9376', 3],
  [884, 18, 80, 106, '#9A7B62', 0],
  [980, 22, 56, 96, '#C77762', 1],
  [610, 148, 86, 100, '#8B98A4', 0],
  [710, 146, 74, 106, '#D08469', 3],
  [800, 150, 86, 98, '#E0A581', 0],
  [900, 146, 76, 106, '#B45F4B', 1],
  [990, 150, 56, 100, '#9A7B62', 0],

  [1090, 20, 80, 106, '#DD9376', 1],
  [1190, 14, 74, 110, '#8B98A4', 0],
  [1280, 20, 80, 104, '#D08469', 3],
  [1380, 22, 68, 100, '#B26553', 0],
  [1090, 148, 86, 104, '#C77762', 1],
  [1190, 150, 74, 100, '#E0A581', 0],
  [1284, 146, 78, 106, '#9A7B62', 1],
  [1380, 150, 68, 104, '#8B98A4', 0],

  [1510, 20, 74, 100, '#E0A581', 1],
  [1600, 14, 80, 110, '#B26553', 0],
  [1696, 22, 76, 104, '#D08469', 3],
  [1790, 20, 70, 100, '#9A7B62', 0],
  [1510, 148, 80, 100, '#8B98A4', 0],
  [1610, 146, 74, 106, '#DD9376', 1],
  [1704, 150, 78, 100, '#C77762', 2],
  [1798, 148, 68, 106, '#B45F4B', 1],

  [20, 340, 80, 110, '#D08469', 1],
  [120, 346, 74, 100, '#B26553', 0],
  [214, 340, 86, 106, '#DD9376', 3],
  [320, 348, 74, 100, '#8B98A4', 0],
  [414, 342, 76, 106, '#9A7B62', 1],
  [20, 476, 86, 110, '#B45F4B', 1],
  [126, 478, 74, 100, '#E0A581', 0],
  [220, 472, 80, 106, '#D08469', 3],
  [320, 478, 76, 100, '#C77762', 0],
  [416, 476, 80, 106, '#9A7B62', 1],

  [600, 340, 80, 106, '#DD9376', 1],
  [700, 344, 80, 100, '#8B98A4', 2],
  [800, 340, 76, 106, '#D08469', 1],
  [894, 346, 74, 100, '#B26553', 0],
  [988, 342, 56, 106, '#E0A581', 1],
  [600, 476, 86, 110, '#9A7B62', 1],
  [706, 478, 74, 100, '#C77762', 0],
  [800, 472, 86, 106, '#8B98A4', 2],
  [906, 478, 68, 100, '#DD9376', 1],
  [996, 476, 56, 106, '#B45F4B', 0],

  [1090, 340, 124, 120, '#9A7B62', 1],
  [1230, 344, 104, 116, '#D08469', 2],
  [1346, 340, 104, 120, '#8B98A4', 1],
  [1090, 490, 104, 120, '#DD9376', 0],
  [1210, 486, 124, 124, '#B26553', 3],
  [1346, 490, 104, 120, '#C77762', 0],

  [1510, 346, 80, 100, '#D08469', 1],
  [1606, 340, 74, 106, '#8B98A4', 2],
  [1700, 348, 80, 100, '#E0A581', 0],
  [1794, 346, 74, 106, '#9A7B62', 1],
  [1510, 478, 86, 106, '#B26553', 1],
  [1610, 480, 74, 100, '#DD9376', 2],
  [1704, 476, 80, 106, '#C77762', 1],
  [1800, 480, 68, 100, '#8B98A4', 0],

  [20, 680, 80, 106, '#E0A581', 1],
  [120, 676, 74, 110, '#B45F4B', 0],
  [214, 680, 86, 106, '#DD9376', 3],
  [320, 686, 74, 100, '#D08469', 0],
  [414, 680, 76, 106, '#8B98A4', 1],
  [20, 816, 86, 110, '#9A7B62', 1],
  [126, 820, 74, 100, '#C77762', 0],
  [220, 814, 80, 106, '#B26553', 3],
  [320, 820, 76, 100, '#DD9376', 0],
  [416, 816, 80, 106, '#8B98A4', 1],

  [1110, 680, 80, 106, '#D08469', 1],
  [1210, 676, 74, 110, '#E0A581', 0],
  [1304, 680, 86, 106, '#B26553', 3],
  [1410, 686, 56, 100, '#8B98A4', 0],
  [1110, 816, 86, 110, '#DD9376', 1],
  [1216, 820, 74, 100, '#9A7B62', 0],
  [1310, 814, 80, 106, '#C77762', 3],
  [1410, 820, 56, 100, '#B45F4B', 0],

  [20, 1010, 80, 106, '#E0A581', 1],
  [120, 1006, 74, 110, '#B26553', 2],
  [214, 1010, 86, 106, '#D08469', 1],
  [320, 1016, 74, 100, '#9A7B62', 0],
  [414, 1010, 76, 106, '#8B98A4', 1],
  [600, 1010, 80, 106, '#C77762', 1],
  [700, 1006, 74, 110, '#DD9376', 2],
  [794, 1010, 86, 106, '#B45F4B', 1],
  [900, 1016, 74, 100, '#8B98A4', 0],
  [994, 1010, 56, 106, '#E0A581', 1],
]

// Compact number formatter — trims trailing zeros so we don't emit "16.18".
function n(value) {
  const r = Math.round(value * 100) / 100
  return Number.isInteger(r) ? r.toString() : r.toString().replace(/\.?0+$/, '')
}

function renderHouse([x, y, w, h, roof, flags]) {
  const pitch = (flags & 1) === 1
  const pool = (flags & 2) === 2
  const halfH = h * 0.5
  const halfW = w * 0.5
  const roofLine = pitch
    ? `<polyline points="0,${n(halfH)} ${n(halfW)},${n(halfH - w * 0.18)} ${n(w)},${n(halfH)}" fill="none" stroke="#08060D" stroke-width="0.7" opacity="0.35"/>`
    : `<line x1="0" y1="${n(halfH)}" x2="${n(w)}" y2="${n(halfH)}" stroke="#08060D" stroke-width="0.7" opacity="0.3"/>`
  const parts = [
    `<rect width="${n(w)}" height="${n(h)}" fill="${roof}"/>`,
    roofLine,
    `<line x1="${n(halfW)}" y1="0" x2="${n(halfW)}" y2="${n(h)}" stroke="#08060D" stroke-width="0.5" opacity="0.22"/>`,
    `<rect x="0" y="${n(h - 3)}" width="${n(w)}" height="3" fill="#08060D" opacity="0.12"/>`,
    `<rect x="${n(w * 0.1)}" y="${n(h + 4)}" width="${n(w * 0.3)}" height="6" fill="#A4BE83" opacity="0.55"/>`,
  ]
  if (pool) {
    parts.push(
      `<rect x="${n(w * 0.55)}" y="${n(h + 4)}" width="${n(w * 0.35)}" height="11" fill="#7BB5D2" rx="2"/>`,
    )
  }
  return `<g transform="translate(${n(x)} ${n(y)})">${parts.join('')}</g>`
}

function renderDots(coords, radius, fill, opacity) {
  return coords
    .map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${radius}" fill="${fill}" opacity="${opacity}"/>`)
    .join('')
}

// ---------------------------------------------------------------------------

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<rect width="1920" height="1200" fill="#FDF7DF"/>
<g transform="rotate(-7 960 600)">
<rect x="-200" y="-200" width="2320" height="1600" fill="#FDF7DF"/>
<!-- Parkland blobs -->
<path d="M-100 -100 C 240 -50, 420 -80, 540 80 C 580 220, 400 300, 240 260 C 80 240, -120 200, -100 -100 Z" fill="#DDE7C2"/>
<ellipse cx="230" cy="120" rx="140" ry="66" fill="#B6CC92"/>
<ellipse cx="230" cy="120" rx="96" ry="44" fill="none" stroke="#8FAA6E" stroke-width="1.5" opacity="0.55"/>
<path d="M820 700 C 940 680, 1050 720, 1090 820 C 1060 920, 940 940, 850 890 Z" fill="#DDE7C2"/>
<path d="M1380 940 C 1620 900, 1900 980, 2120 1120 L 2120 1500 L 1300 1500 Z" fill="#DDE7C2"/>
<!-- Lake -->
<path d="M1560 1020 C 1680 990, 1830 1010, 1900 1080 C 1940 1150, 1860 1210, 1740 1210 C 1620 1210, 1500 1170, 1500 1100 C 1500 1050, 1520 1030, 1560 1020 Z" fill="#7BB5D2"/>
<path d="M1580 1030 C 1690 1010, 1820 1030, 1880 1090" fill="none" stroke="#9FCFE6" stroke-width="2" opacity="0.7"/>
<path d="M1600 1180 C 1700 1200, 1800 1190, 1860 1160" fill="none" stroke="#5A98B5" stroke-width="1" opacity="0.5"/>
<ellipse cx="1700" cy="1100" rx="6" ry="2" fill="#FDF7DF" opacity="0.7"/>
<ellipse cx="1780" cy="1140" rx="5" ry="2" fill="#FDF7DF" opacity="0.6"/>
<ellipse cx="1640" cy="1130" rx="4" ry="1.5" fill="#FDF7DF" opacity="0.55"/>
<!-- Pond -->
<ellipse cx="970" cy="820" rx="40" ry="22" fill="#7BB5D2"/>
<ellipse cx="965" cy="815" rx="28" ry="12" fill="none" stroke="#9FCFE6" stroke-width="1.5" opacity="0.7"/>
<!-- Park canopy trees -->
${renderDots(PARK_CANOPY_TREES, 9, '#8FAA6E', 0.82)}
<!-- Backyard trees -->
${renderDots(BACKYARD_TREES, 5, '#7E9B62', 0.7)}
<!-- Streets -->
<rect x="-200" y="290" width="2320" height="32" fill="#EDE4CD"/>
<rect x="-200" y="630" width="2320" height="28" fill="#EDE4CD"/>
<rect x="-200" y="950" width="2320" height="28" fill="#EDE4CD"/>
<rect x="540" y="-200" width="26" height="1600" fill="#EDE4CD"/>
<rect x="1040" y="-200" width="24" height="1600" fill="#EDE4CD"/>
<rect x="1460" y="-200" width="26" height="1600" fill="#EDE4CD"/>
<line x1="-200" y1="306" x2="2120" y2="306" stroke="#C9BEA1" stroke-width="1.2" stroke-dasharray="14 10" opacity="0.7"/>
<line x1="-200" y1="644" x2="2120" y2="644" stroke="#C9BEA1" stroke-width="1.2" stroke-dasharray="14 10" opacity="0.7"/>
<line x1="-200" y1="964" x2="2120" y2="964" stroke="#C9BEA1" stroke-width="1.2" stroke-dasharray="14 10" opacity="0.7"/>
<line x1="553" y1="-200" x2="553" y2="1400" stroke="#C9BEA1" stroke-width="1" stroke-dasharray="10 10" opacity="0.7"/>
<line x1="1052" y1="-200" x2="1052" y2="1400" stroke="#C9BEA1" stroke-width="1" stroke-dasharray="10 10" opacity="0.7"/>
<line x1="1473" y1="-200" x2="1473" y2="1400" stroke="#C9BEA1" stroke-width="1" stroke-dasharray="10 10" opacity="0.7"/>
<!-- Houses -->
${HOUSES.map(renderHouse).join('\n')}
<!-- Street trees -->
${renderDots(STREET_TREES, 7, '#7E9B62', 0.8)}
</g>
</svg>
`

mkdirSync(dirname(OUT_PATH), { recursive: true })
writeFileSync(OUT_PATH, svg, 'utf8')

const sizeKb = (Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)
console.log(`Wrote ${OUT_PATH} (${sizeKb} KB, ${HOUSES.length} houses)`)
