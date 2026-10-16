/**
 * Built-in characters, drawn with PixiJS Graphics, so they can change their
 * expression and move the mouth while speaking: `char anna "Anna" base:girl`.
 */
import { Container, Graphics } from 'pixi.js'

export type FigureStyle = {
  skin: string
  hair: string
  shirt: string
  eyes: string
  hairstyle: 'short' | 'long' | 'bun' | 'ponytail' | 'curly' | 'spiky' | 'bald' | 'bob' | 'none'
  glasses?: boolean
  beard?: boolean
  mustache?: boolean
  earrings?: boolean
  size?: number
  kind?: 'human' | 'robot'
}

export const FIGURES: Record<string, FigureStyle> = {
  girl: { skin: '#f2c7a5', hair: '#8b4a2b', shirt: '#e8556d', eyes: '#2f6b3a', hairstyle: 'long' },
  boy: { skin: '#e9b68f', hair: '#2d1e14', shirt: '#3d7be0', eyes: '#3b2a1a', hairstyle: 'short' },
  woman: { skin: '#c98e66', hair: '#1b1b1b', shirt: '#2bb39b', eyes: '#2a1a10', hairstyle: 'bun', earrings: true },
  man: { skin: '#f0c9a8', hair: '#b07a3c', shirt: '#555f7a', eyes: '#2b4f8a', hairstyle: 'spiky', beard: true },
  teacher: { skin: '#f3d2b8', hair: '#6b4a32', shirt: '#7d5ba6', eyes: '#3b2a1a', hairstyle: 'bob', glasses: true },
  grandma: { skin: '#f1cfb6', hair: '#d9d9d9', shirt: '#b06aa5', eyes: '#4a5a6a', hairstyle: 'bun', glasses: true },
  grandpa: { skin: '#e8bf9f', hair: '#cfcfcf', shirt: '#6f8b4c', eyes: '#3b2a1a', hairstyle: 'bald', mustache: true, glasses: true },
  kid: { skin: '#a8714f', hair: '#2a1a12', shirt: '#f2b632', eyes: '#2a1a10', hairstyle: 'curly', size: 0.8 },
  student: { skin: '#f6d5bd', hair: '#e0a33a', shirt: '#2f9e5b', eyes: '#2b4f8a', hairstyle: 'ponytail' },
  robot: { skin: '#b8c4d0', hair: '#4fd1ff', shirt: '#6d7d8f', eyes: '#4fd1ff', hairstyle: 'none', kind: 'robot' },
}

export const EXPRESSIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking', 'wink', 'scared', 'laugh', 'sleepy']

const color = (c: string) => c

/** a darker variant of a hex color */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)))
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const HEAD_Y = -440
const HEAD_RX = 100
const HEAD_RY = 118

export class Figure extends Container {
  private back = new Graphics()
  private body = new Graphics()
  private head = new Graphics()
  private face = new Graphics()
  private front = new Graphics()
  private expr = 'neutral'
  private open = false
  private blink = false

  constructor(readonly style: FigureStyle) {
    super()
    this.addChild(this.back, this.body, this.head, this.face, this.front)
    this.drawStatic()
    this.drawFace()
  }

  /** the height in local units (used to scale the figure on the stage) */
  static readonly HEIGHT = 600

  setExpression(expr?: string) {
    if (this.destroyed) return
    const e = expr && EXPRESSIONS.includes(expr) ? expr : 'neutral'
    if (e === this.expr) return
    this.expr = e
    this.drawFace()
  }

  setMouth(open: boolean) {
    if (this.destroyed) return
    if (open === this.open) return
    this.open = open
    this.drawFace()
  }

  setBlink(closed: boolean) {
    if (this.destroyed) return
    if (closed === this.blink) return
    this.blink = closed
    this.drawFace()
  }

  private drawStatic() {
    const s = this.style
    const { back, body, head, front } = this
    back.clear()
    body.clear()
    head.clear()
    front.clear()

    if (s.kind === 'robot') return this.drawRobot()

    // hair behind the head
    if (s.hairstyle === 'long') {
      back.roundRect(-128, HEAD_Y - 105, 256, 330, 110).fill(color(s.hair))
    } else if (s.hairstyle === 'bob') {
      back.roundRect(-124, HEAD_Y - 110, 248, 210, 100).fill(color(s.hair))
    } else if (s.hairstyle === 'ponytail') {
      back.ellipse(118, HEAD_Y + 10, 42, 95).fill(color(s.hair))
    } else if (s.hairstyle === 'bun') {
      back.circle(0, HEAD_Y - 130, 55).fill(color(s.hair))
    }

    // body
    body.roundRect(-160, -300, 320, 330, 120).fill(color(s.shirt))
    body.roundRect(-30, -335, 60, 60, 20).fill(color(shade(s.skin, 0.9)))
    body
      .moveTo(-45, -300)
      .quadraticCurveTo(0, -240, 45, -300)
      .stroke({ width: 8, color: shade(s.shirt, 0.75), cap: 'round' })

    // head
    head.ellipse(-HEAD_RX + 4, HEAD_Y + 10, 18, 26).fill(color(shade(s.skin, 0.95)))
    head.ellipse(HEAD_RX - 4, HEAD_Y + 10, 18, 26).fill(color(shade(s.skin, 0.95)))
    head.ellipse(0, HEAD_Y, HEAD_RX, HEAD_RY).fill(color(s.skin))
    if (s.earrings) {
      head.circle(-HEAD_RX + 2, HEAD_Y + 40, 9).fill('#f5c542')
      head.circle(HEAD_RX - 2, HEAD_Y + 40, 9).fill('#f5c542')
    }
    if (s.beard) {
      head
        .moveTo(-HEAD_RX + 6, HEAD_Y + 10)
        .quadraticCurveTo(-90, HEAD_Y + 125, 0, HEAD_Y + 135)
        .quadraticCurveTo(90, HEAD_Y + 125, HEAD_RX - 6, HEAD_Y + 10)
        .quadraticCurveTo(60, HEAD_Y + 80, 0, HEAD_Y + 85)
        .quadraticCurveTo(-60, HEAD_Y + 80, -HEAD_RX + 6, HEAD_Y + 10)
        .fill(color(s.hair))
    }

    // hair in front
    const h = color(s.hair)
    switch (s.hairstyle) {
      case 'short':
      case 'ponytail':
      case 'bun':
        front
          .moveTo(-HEAD_RX - 4, HEAD_Y - 10)
          .bezierCurveTo(-HEAD_RX - 10, HEAD_Y - 172, HEAD_RX + 10, HEAD_Y - 172, HEAD_RX + 4, HEAD_Y - 10)
          .quadraticCurveTo(40, HEAD_Y - 95, -30, HEAD_Y - 70)
          .quadraticCurveTo(-70, HEAD_Y - 60, -HEAD_RX - 4, HEAD_Y - 10)
          .fill(h)
        break
      case 'long':
      case 'bob':
        front
          .moveTo(-HEAD_RX - 10, HEAD_Y + 30)
          .bezierCurveTo(-HEAD_RX - 20, HEAD_Y - 186, HEAD_RX + 20, HEAD_Y - 186, HEAD_RX + 10, HEAD_Y + 30)
          .quadraticCurveTo(HEAD_RX - 20, HEAD_Y - 60, 10, HEAD_Y - 75)
          .quadraticCurveTo(-HEAD_RX + 20, HEAD_Y - 60, -HEAD_RX - 10, HEAD_Y + 30)
          .fill(h)
        break
      case 'curly':
        for (let a = Math.PI * 1.05; a <= Math.PI * 1.95; a += Math.PI / 9) {
          front.circle(Math.cos(a) * 95, HEAD_Y - 20 + Math.sin(a) * 105, 38).fill(h)
        }
        break
      case 'spiky': {
        front.moveTo(-HEAD_RX - 4, HEAD_Y - 10)
        const n = 12
        for (let i = 1; i < n; i++) {
          const a = Math.PI + (Math.PI * i) / n
          const r = i % 2 ? 135 : 112
          front.lineTo(Math.cos(a) * (r - 6), HEAD_Y - 18 + Math.sin(a) * r)
        }
        front
          .lineTo(HEAD_RX + 4, HEAD_Y - 10)
          .quadraticCurveTo(50, HEAD_Y - 80, 0, HEAD_Y - 72)
          .quadraticCurveTo(-50, HEAD_Y - 80, -HEAD_RX - 4, HEAD_Y - 10)
          .fill(h)
        break
      }
      case 'bald':
        front.ellipse(-HEAD_RX + 8, HEAD_Y - 20, 20, 40).fill(h)
        front.ellipse(HEAD_RX - 8, HEAD_Y - 20, 20, 40).fill(h)
        break
    }
  }

  private drawRobot() {
    const s = this.style
    const { back, body, head } = this
    back.moveTo(0, HEAD_Y - 120).lineTo(0, HEAD_Y - 175).stroke({ width: 10, color: shade(s.skin, 0.6) })
    back.circle(0, HEAD_Y - 185, 18).fill(color(s.hair))
    body.roundRect(-150, -300, 300, 330, 40).fill(color(s.shirt))
    body.roundRect(-70, -240, 140, 90, 16).fill(shade(s.shirt, 0.7))
    for (let i = 0; i < 3; i++) body.circle(-40 + i * 40, -195, 12).fill(['#ff5d5d', '#ffd23f', '#4fd1ff'][i])
    body.roundRect(-35, -335, 70, 50, 10).fill(shade(s.skin, 0.7))
    head.roundRect(-125, HEAD_Y - 115, 250, 220, 50).fill(color(s.skin))
    head.roundRect(-105, HEAD_Y - 85, 210, 150, 34).fill('#1d2433')
    head.roundRect(-140, HEAD_Y - 30, 20, 60, 8).fill(shade(s.skin, 0.7))
    head.roundRect(120, HEAD_Y - 30, 20, 60, 8).fill(shade(s.skin, 0.7))
  }

  private drawFace() {
    const s = this.style
    const f = this.face
    f.clear()
    if (s.kind === 'robot') return this.drawRobotFace()

    const e = this.expr
    const ink = '#2b1d16'
    const ey = HEAD_Y - 5
    const ex = 40

    // brows
    const brow: Record<string, [number, number, number]> = {
      // [height, inner tilt, outer tilt]
      neutral: [0, 0, 0],
      happy: [-6, 0, 0],
      laugh: [-8, 0, 0],
      sad: [-4, -14, 6],
      angry: [6, 14, -6],
      surprised: [-18, 0, 0],
      scared: [-14, -10, 4],
      thinking: [0, 0, 0],
      wink: [-4, 0, 0],
      sleepy: [6, 0, 0],
    }
    const [bh, inner, outer] = brow[e] || brow.neutral
    for (const side of [-1, 1]) {
      let lift = bh
      if (e === 'thinking' && side === 1) lift = -16
      f.moveTo(side * (ex + 26), ey - 42 + lift + outer)
        .lineTo(side * (ex - 20), ey - 42 + lift + inner)
        .stroke({ width: 9, color: shade(s.hair, 0.8), cap: 'round' })
    }

    // eyes
    for (const side of [-1, 1]) {
      const x = side * ex
      const closed = this.blink || e === 'laugh' || (e === 'wink' && side === 1)
      if (closed || e === 'happy') {
        f.moveTo(x - 18, ey + 2)
          .quadraticCurveTo(x, ey - 18, x + 18, ey + 2)
          .stroke({ width: 7, color: ink, cap: 'round' })
      } else if (e === 'sleepy') {
        f.moveTo(x - 18, ey).lineTo(x + 18, ey).stroke({ width: 7, color: ink, cap: 'round' })
      } else {
        const wide = e === 'surprised' || e === 'scared'
        const ry = wide ? 22 : e === 'angry' ? 12 : 17
        f.ellipse(x, ey, wide ? 19 : 16, ry).fill('#ffffff')
        const look = e === 'thinking' ? 6 : 0
        f.circle(x + look, ey + 2 - (e === 'thinking' ? 5 : 0), wide ? 8 : 10).fill(s.eyes)
        f.circle(x + look + 3, ey - 2, 3).fill('#ffffff')
      }
    }

    // cheeks
    if (e === 'happy' || e === 'laugh' || e === 'wink') {
      f.ellipse(-68, ey + 38, 18, 10).fill({ color: '#ff7a7a', alpha: 0.45 })
      f.ellipse(68, ey + 38, 18, 10).fill({ color: '#ff7a7a', alpha: 0.45 })
    }

    // nose
    f.moveTo(-4, ey + 18)
      .quadraticCurveTo(-12, ey + 42, 2, ey + 44)
      .stroke({ width: 5, color: shade(s.skin, 0.8), cap: 'round' })

    if (s.mustache) {
      f.moveTo(-40, ey + 66)
        .quadraticCurveTo(0, ey + 40, 40, ey + 66)
        .quadraticCurveTo(0, ey + 58, -40, ey + 66)
        .fill(color(s.hair))
    }

    // mouth
    const my = ey + 72
    if (this.open) {
      const big = e === 'surprised' || e === 'scared' || e === 'laugh'
      f.ellipse(0, my + 2, big ? 24 : 20, big ? 22 : 13).fill('#7a2230')
      f.ellipse(0, my + (big ? 12 : 8), big ? 12 : 10, 5).fill('#e46a7a')
    } else if (e === 'surprised') {
      f.ellipse(0, my + 2, 13, 16).fill('#7a2230')
    } else if (e === 'scared') {
      f.moveTo(-26, my + 4)
        .quadraticCurveTo(-13, my - 6, 0, my + 4)
        .quadraticCurveTo(13, my + 14, 26, my + 4)
        .stroke({ width: 6, color: ink, cap: 'round' })
    } else if (e === 'sad' || e === 'angry') {
      f.moveTo(-26, my + 10)
        .quadraticCurveTo(0, my - 12, 26, my + 10)
        .stroke({ width: 7, color: ink, cap: 'round' })
    } else if (e === 'laugh' || e === 'happy') {
      f.moveTo(-34, my - 6)
        .quadraticCurveTo(0, my + 40, 34, my - 6)
        .closePath()
        .fill('#7a2230')
      f.moveTo(-30, my - 4).lineTo(30, my - 4).stroke({ width: 5, color: '#ffffff' })
    } else if (e === 'thinking' || e === 'sleepy') {
      f.moveTo(-18, my + 2).lineTo(16, my - 2).stroke({ width: 6, color: ink, cap: 'round' })
    } else {
      f.moveTo(-26, my)
        .quadraticCurveTo(0, my + 18, 26, my)
        .stroke({ width: 7, color: ink, cap: 'round' })
    }

    if (s.glasses) {
      for (const side of [-1, 1]) f.circle(side * ex, ey, 30).stroke({ width: 6, color: '#333333' })
      f.moveTo(-ex + 30, ey).lineTo(ex - 30, ey).stroke({ width: 6, color: '#333333' })
    }
  }

  private drawRobotFace() {
    const f = this.face
    const e = this.expr
    const c = this.style.eyes
    const ey = HEAD_Y - 20
    for (const side of [-1, 1]) {
      const x = side * 45
      if (this.blink || e === 'laugh' || (e === 'wink' && side === 1) || e === 'sleepy') {
        f.roundRect(x - 24, ey - 3, 48, 8, 4).fill(c)
      } else if (e === 'happy') {
        f.moveTo(x - 22, ey + 8).lineTo(x, ey - 12).lineTo(x + 22, ey + 8).stroke({ width: 9, color: c, cap: 'round', join: 'round' })
      } else if (e === 'angry') {
        f.moveTo(x - 22, ey - 12 * -side).lineTo(x + 22, ey + 12 * -side).stroke({ width: 9, color: '#ff5d5d', cap: 'round' })
        f.circle(x, ey + 8, 10).fill('#ff5d5d')
      } else if (e === 'sad') {
        f.circle(x, ey + 4, 14).fill(c)
        f.roundRect(x - 22, ey - 18, 44, 10, 4).fill('#1d2433')
      } else {
        const r = e === 'surprised' || e === 'scared' ? 22 : 16
        f.circle(x, ey, r).fill(c)
      }
    }
    const my = ey + 52
    if (this.open) {
      for (let i = 0; i < 5; i++) {
        const h = 8 + ((i * 7) % 4) * 6
        f.roundRect(-40 + i * 17, my - h / 2, 11, h, 4).fill(c)
      }
    } else if (e === 'surprised' || e === 'scared') {
      f.circle(0, my, 10).stroke({ width: 6, color: c })
    } else if (e === 'sad' || e === 'angry') {
      f.moveTo(-30, my + 6).quadraticCurveTo(0, my - 12, 30, my + 6).stroke({ width: 6, color: c, cap: 'round' })
    } else {
      f.moveTo(-30, my - 4).quadraticCurveTo(0, my + 12, 30, my - 4).stroke({ width: 6, color: c, cap: 'round' })
    }
  }
}

export function figureStyle(name: string, kv: Record<string, string> = {}): FigureStyle | null {
  const base = FIGURES[name.toLowerCase()]
  if (!base) return null
  const s: FigureStyle = { ...base }
  if (kv.skin) s.skin = kv.skin
  if (kv.hair) s.hair = kv.hair
  if (kv.shirt) s.shirt = kv.shirt
  if (kv.eyes) s.eyes = kv.eyes
  if (kv.hairstyle) s.hairstyle = kv.hairstyle as FigureStyle['hairstyle']
  const yes = (v?: string) => (v === undefined ? undefined : !/^(no|false|off|0)$/i.test(v))
  if (kv.glasses !== undefined) s.glasses = yes(kv.glasses)
  if (kv.beard !== undefined) s.beard = yes(kv.beard)
  if (kv.mustache !== undefined) s.mustache = yes(kv.mustache)
  return s
}
