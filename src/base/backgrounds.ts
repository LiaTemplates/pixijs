/**
 * Built-in backgrounds as SVG (1600 × 900): `bg base:forest`.
 * They are generated from a few shapes, so they stay small in the bundle.
 */

const W = 1600
const H = 900

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const svg = (body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`

const sky = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`

function hills(y: number, amp: number, color: string, seed: number, n = 6) {
  const r = rng(seed)
  let d = `M0 ${H} L0 ${y}`
  const step = W / n
  for (let i = 0; i < n; i++) {
    const x1 = i * step + step / 2
    const y1 = y - amp * (0.4 + r())
    d += ` Q${x1} ${y1} ${(i + 1) * step} ${y + (r() - 0.5) * amp * 0.4}`
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`
}

function tree(x: number, y: number, s: number, leaf: string, trunk = '#6b4a2b') {
  return (
    `<rect x="${x - 10 * s}" y="${y - 90 * s}" width="${20 * s}" height="${90 * s}" fill="${trunk}"/>` +
    `<polygon points="${x},${y - 330 * s} ${x - 90 * s},${y - 150 * s} ${x + 90 * s},${y - 150 * s}" fill="${leaf}"/>` +
    `<polygon points="${x},${y - 260 * s} ${x - 120 * s},${y - 70 * s} ${x + 120 * s},${y - 70 * s}" fill="${leaf}"/>`
  )
}

function roundTree(x: number, y: number, s: number, leaf: string) {
  return (
    `<rect x="${x - 12 * s}" y="${y - 120 * s}" width="${24 * s}" height="${120 * s}" fill="#7a5532"/>` +
    `<circle cx="${x}" cy="${y - 170 * s}" r="${80 * s}" fill="${leaf}"/>` +
    `<circle cx="${x - 55 * s}" cy="${y - 130 * s}" r="${55 * s}" fill="${leaf}"/>` +
    `<circle cx="${x + 55 * s}" cy="${y - 130 * s}" r="${55 * s}" fill="${leaf}"/>`
  )
}

function stars(n: number, seed: number, maxY = H * 0.7) {
  const r = rng(seed)
  let s = ''
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${(r() * 2.2 + 0.6).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`
  }
  return s
}

function cloud(x: number, y: number, s: number, c = '#ffffff', o = 0.9) {
  return `<g fill="${c}" opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${90 * s}" ry="${38 * s}"/><ellipse cx="${x - 60 * s}" cy="${y + 10 * s}" rx="${60 * s}" ry="${30 * s}"/><ellipse cx="${x + 65 * s}" cy="${y + 8 * s}" rx="${70 * s}" ry="${30 * s}"/><ellipse cx="${x + 10 * s}" cy="${y - 25 * s}" rx="${55 * s}" ry="${35 * s}"/></g>`
}

function house(x: number, y: number, w: number, h: number, wall: string, roof: string) {
  const win = (wx: number, wy: number) =>
    `<rect x="${wx}" y="${wy}" width="${w * 0.2}" height="${h * 0.22}" fill="#ffe9a8" stroke="#5b4636" stroke-width="5"/>`
  return (
    `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${wall}"/>` +
    `<polygon points="${x - w * 0.1},${y - h} ${x + w / 2},${y - h - h * 0.65} ${x + w * 1.1},${y - h}" fill="${roof}"/>` +
    `<rect x="${x + w * 0.4}" y="${y - h * 0.45}" width="${w * 0.2}" height="${h * 0.45}" fill="#7a4b2a"/>` +
    win(x + w * 0.1, y - h * 0.75) +
    win(x + w * 0.7, y - h * 0.75)
  )
}

const BUILDERS: Record<string, () => string> = {
  forest: () => {
    const r = rng(3)
    let back = ''
    let front = ''
    for (let i = 0; i < 14; i++) back += tree(i * 125 + r() * 60, 640 + r() * 30, 0.9 + r() * 0.4, '#2f6b4f')
    for (let i = 0; i < 8; i++) front += tree(i * 230 + r() * 80 - 40, 900, 1.4 + r() * 0.5, '#1f4d36', '#4a321d')
    return svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>${cloud(300, 140, 1)}${cloud(1200, 110, 1.3)}` +
        hills(600, 140, '#7fb87a', 11) +
        back +
        `<rect y="700" width="${W}" height="200" fill="#5e9a4d"/>` +
        front,
      sky('s', '#8fd3ff', '#e2f6ff')
    )
  },
  river: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>${cloud(1300, 150, 1.2)}${cloud(450, 90, 0.9)}` +
        hills(520, 160, '#8fbf7a', 5, 4) +
        hills(600, 90, '#6aa95a', 8) +
        `<path d="M600 600 C 700 650, 450 720, 300 900 L1300 900 C 1050 760, 1000 650, 900 600 Z" fill="url(#w)"/>` +
        `<path d="M520 760 q60 -14 120 0 M820 700 q50 -12 100 0 M700 830 q70 -16 140 0" stroke="#e6f7ff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>` +
        roundTree(150, 760, 1.2, '#3f8a46') +
        roundTree(1450, 780, 1.4, '#357a3d') +
        `<ellipse cx="1180" cy="860" rx="70" ry="28" fill="#9a9a9a"/><ellipse cx="360" cy="840" rx="50" ry="20" fill="#8a8a8a"/>`,
      sky('s', '#7fc8ff', '#dff3ff') + sky('w', '#5fb3e8', '#2d7fc0')
    ),
  village: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>${cloud(250, 120, 1)}${cloud(1100, 160, 1.1)}` +
        hills(560, 120, '#9ccc7c', 21) +
        `<rect y="700" width="${W}" height="200" fill="#88b860"/>` +
        house(120, 720, 260, 200, '#f2d7a6', '#b5482f') +
        house(520, 700, 220, 170, '#e8c3a0', '#7b4f9e') +
        house(1000, 720, 280, 210, '#f5e1c0', '#2f6fa8') +
        house(1380, 700, 180, 150, '#e9cfa6', '#b5482f') +
        `<path d="M700 900 Q760 780 820 700 L880 700 Q900 800 1000 900 Z" fill="#d9c08f"/>` +
        roundTree(860, 700, 0.9, '#4f9a49'),
      sky('s', '#9ad7ff', '#f2fbff')
    ),
  room: () =>
    svg(
      `<rect width="${W}" height="620" fill="#f3e3c9"/>` +
        `<rect y="620" width="${W}" height="280" fill="#b98455"/>` +
        Array.from({ length: 9 }, (_, i) => `<rect x="${i * 200}" y="620" width="6" height="280" fill="#a5714a"/>`).join('') +
        `<rect y="600" width="${W}" height="24" fill="#8a5d3b"/>` +
        `<rect x="160" y="140" width="380" height="300" fill="#bfe6ff" stroke="#fff" stroke-width="18"/>` +
        `<line x1="350" y1="140" x2="350" y2="440" stroke="#fff" stroke-width="12"/><line x1="160" y1="290" x2="540" y2="290" stroke="#fff" stroke-width="12"/>` +
        `<rect x="120" y="120" width="60" height="360" fill="#d0675a"/><rect x="520" y="120" width="60" height="360" fill="#d0675a"/>` +
        `<rect x="1040" y="380" width="380" height="240" rx="20" fill="#6d4c3d"/><rect x="1060" y="400" width="340" height="40" fill="#8a6350"/>` +
        `<rect x="1100" y="180" width="140" height="180" fill="#fff8e6" stroke="#8a5d3b" stroke-width="10"/><circle cx="1170" cy="260" r="40" fill="#f2b632"/>` +
        `<ellipse cx="800" cy="800" rx="420" ry="70" fill="#c9534a" opacity="0.8"/>` +
        `<rect x="740" y="70" width="120" height="30" rx="10" fill="#fff"/><line x1="800" y1="0" x2="800" y2="70" stroke="#555" stroke-width="5"/>`
    ),
  classroom: () =>
    svg(
      `<rect width="${W}" height="650" fill="#e7efe3"/><rect y="650" width="${W}" height="250" fill="#c49a6c"/>` +
        `<rect x="300" y="110" width="1000" height="380" rx="10" fill="#2f5d46" stroke="#8a5d3b" stroke-width="22"/>` +
        `<text x="380" y="220" font-family="Comic Sans MS, cursive" font-size="64" fill="#f4f4f4" opacity="0.9">a² + b² = c²</text>` +
        `<path d="M380 380 l120 -80 l120 80 z" stroke="#f4f4f4" stroke-width="6" fill="none" opacity="0.8"/>` +
        `<text x="900" y="400" font-family="Comic Sans MS, cursive" font-size="56" fill="#ffe08a" opacity="0.9">Hallo!</text>` +
        `<rect x="380" y="490" width="840" height="20" fill="#8a5d3b"/>` +
        `<circle cx="1450" cy="160" r="70" fill="#fff" stroke="#555" stroke-width="10"/><line x1="1450" y1="160" x2="1450" y2="115" stroke="#333" stroke-width="8"/><line x1="1450" y1="160" x2="1485" y2="175" stroke="#333" stroke-width="8"/>` +
        `<rect x="40" y="200" width="160" height="260" fill="#cde8ff" stroke="#fff" stroke-width="12"/>` +
        Array.from({ length: 4 }, (_, i) => `<rect x="${150 + i * 360}" y="740" width="260" height="30" fill="#9b6b43"/><rect x="${170 + i * 360}" y="770" width="16" height="130" fill="#6b4a2b"/><rect x="${374 + i * 360}" y="770" width="16" height="130" fill="#6b4a2b"/>`).join('')
    ),
  beach: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="1300" cy="170" r="80" fill="#fff3b0"/>${cloud(400, 130, 1)}` +
        `<rect y="470" width="${W}" height="200" fill="url(#w)"/>` +
        `<path d="M0 620 Q400 580 800 620 T1600 610 L1600 900 L0 900 Z" fill="#f2d49b"/>` +
        `<path d="M0 640 Q400 600 800 640 T1600 630" stroke="#fff" stroke-width="10" fill="none" opacity="0.7"/>` +
        `<path d="M220 900 Q240 700 300 560" stroke="#8a5d3b" stroke-width="26" fill="none"/>` +
        `<g fill="#3f9a4d"><ellipse cx="240" cy="540" rx="130" ry="30" transform="rotate(-20 300 560)"/><ellipse cx="360" cy="540" rx="130" ry="30" transform="rotate(25 300 560)"/><ellipse cx="300" cy="520" rx="30" ry="110" transform="rotate(5 300 560)"/></g>` +
        `<circle cx="1180" cy="800" r="50" fill="#e8556d"/><path d="M1130 800 a50 50 0 0 1 100 0" fill="#fff"/>`,
      sky('s', '#5fc3ff', '#d8f3ff') + sky('w', '#3aa0d8', '#7fd0f0')
    ),
  city: () => {
    const r = rng(42)
    let b = ''
    for (let i = 0; i < 16; i++) {
      const w = 90 + r() * 80
      const h = 220 + r() * 380
      const x = i * 100 + r() * 30 - 30
      b += `<rect x="${x}" y="${720 - h}" width="${w}" height="${h}" fill="${['#53627c', '#64738f', '#47546b'][i % 3]}"/>`
      for (let wy = 720 - h + 25; wy < 690; wy += 45)
        for (let wx = x + 14; wx < x + w - 24; wx += 30)
          if (r() > 0.35) b += `<rect x="${wx}" y="${wy}" width="14" height="22" fill="#ffe9a8" opacity="0.85"/>`
    }
    return svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
        b +
        `<rect y="720" width="${W}" height="180" fill="#3a3f48"/><rect y="700" width="${W}" height="24" fill="#9aa3ad"/>` +
        Array.from({ length: 8 }, (_, i) => `<rect x="${i * 220 + 40}" y="805" width="110" height="12" fill="#f4f4f4"/>`).join(''),
      sky('s', '#ffb37a', '#ffe3c2')
    )
  },
  mountains: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>${cloud(1200, 120, 1.2)}` +
        `<polygon points="0,700 300,250 520,520 800,180 1100,560 1300,330 1600,640 1600,900 0,900" fill="#7d8fb3"/>` +
        `<polygon points="300,250 360,330 330,320 300,360 270,320 240,330" fill="#fff"/>` +
        `<polygon points="800,180 880,290 840,280 800,320 760,280 720,290" fill="#fff"/>` +
        `<polygon points="1300,330 1360,410 1300,430 1250,400" fill="#fff"/>` +
        hills(700, 120, '#6aa95a', 77) +
        `<rect y="790" width="${W}" height="110" fill="#5b9a4d"/>`,
      sky('s', '#a6d8ff', '#f0f8ff')
    ),
  space: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
        stars(260, 9, H) +
        `<circle cx="1250" cy="260" r="150" fill="url(#p)"/><ellipse cx="1250" cy="260" rx="250" ry="40" fill="none" stroke="#f3c98b" stroke-width="14" opacity="0.8" transform="rotate(-15 1250 260)"/>` +
        `<circle cx="300" cy="700" r="60" fill="#c9d4e5"/><circle cx="280" cy="690" r="12" fill="#a5b3c9"/><circle cx="320" cy="720" r="8" fill="#a5b3c9"/>`,
      sky('s', '#05060f', '#1b2050') +
        `<radialGradient id="p" cx="0.35" cy="0.35"><stop offset="0" stop-color="#ffcf8a"/><stop offset="1" stop-color="#c0602f"/></radialGradient>`
    ),
  night: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
        stars(160, 5, 520) +
        `<circle cx="1250" cy="170" r="70" fill="#fff8d6"/><circle cx="1280" cy="150" r="62" fill="#1b2a52"/>` +
        hills(620, 130, '#1d3a37', 31) +
        `<rect y="720" width="${W}" height="180" fill="#15302b"/>` +
        house(250, 760, 240, 180, '#3a3550', '#24203a') +
        roundTree(1100, 780, 1.2, '#173b30'),
      sky('s', '#0b1430', '#2c3f73')
    ),
  sky: () =>
    svg(
      `<rect width="${W}" height="${H}" fill="url(#s)"/>${cloud(250, 200, 1.4)}${cloud(900, 120, 1)}${cloud(1350, 330, 1.6)}${cloud(600, 600, 1.8)}${cloud(1300, 760, 1.2)}`,
      sky('s', '#62b6ff', '#d7efff')
    ),
  white: () => svg(`<rect width="${W}" height="${H}" fill="#ffffff"/>`),
  black: () => svg(`<rect width="${W}" height="${H}" fill="#000000"/>`),
}

const cache: Record<string, string> = {}

export const BACKGROUNDS = Object.keys(BUILDERS)

/** the SVG data url of a builtin background, or null */
export function background(name: string): string | null {
  const key = name.toLowerCase()
  if (!BUILDERS[key]) return null
  if (!cache[key]) cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BUILDERS[key]())
  return cache[key]
}
