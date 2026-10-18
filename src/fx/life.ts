/**
 * Small helpers that make image and spritesheet characters feel alive: which
 * frame to show (expression, talking, blinking) and a subtle idle motion.
 * They do not use PixiJS, so they can be tested without a browser.
 *
 *   char k "Khadija" img/k.png sad=img/k-sad.png sad.talk=img/k-sad-talk.png
 *        talk=img/k-talk.png blink=img/k-blink.png sad.blink=img/k-sad-blink.png idle=breathe
 */

export type Frame = 'talk' | 'blink'
export type Idle = 'none' | 'breathe' | 'fidget'

/** `talk`, `blink`, `sad.talk`, `sad.blink`, `walk`, `act.wave` – extra frames, not expressions */
export function isFrameKey(key: string): boolean {
  return key === 'talk' || key === 'blink' || key === 'walk' || /\.(talk|blink)$/.test(key) || /^act\./.test(key)
}

/** `a.png, b.png` → the images of an animation (`walk=`, `act.wave=`), data urls keep their comma */
export function frameList(value: string): string[] {
  const list: string[] = []
  for (const part of value.split(',').map((s) => s.trim())) {
    const i = list.length - 1
    if (i >= 0 && /^data:[^,]*$/.test(list[i])) list[i] += ',' + part
    else list.push(part)
  }
  return list.filter(Boolean)
}

/** the frame of a looping animation after `ms` milliseconds (8 frames per second) */
export function frameAt(count: number, ms: number, fps = 8): number {
  return count ? Math.floor((ms * fps) / 1000) % count : 0
}

/**
 * The key of the image to show for an expression.
 * - mouth open: `<expr>.talk`, else `talk`
 * - eyes closed: `<expr>.blink`; `blink` only if the expression has no image of its own
 *   (a neutral blink would flash the wrong face)
 * - else the expression image, else the base image `''`
 * `frame` tells which extra frame was found ('' if none).
 */
export function pickFrame(
  has: (key: string) => boolean,
  expr: string | undefined,
  o: { open?: boolean; blink?: boolean }
): { key: string; frame: Frame | '' } {
  const base = expr && has(expr) ? expr : ''
  if (o.open) {
    if (expr && has(expr + '.talk')) return { key: expr + '.talk', frame: 'talk' }
    if (has('talk')) return { key: 'talk', frame: 'talk' }
  } else if (o.blink) {
    if (expr && has(expr + '.blink')) return { key: expr + '.blink', frame: 'blink' }
    if (!base && has('blink')) return { key: 'blink', frame: 'blink' }
  }
  return { key: base, frame: '' }
}

/** the animation of a spritesheet: `<name>_talk` while speaking, if it exists */
export function sheetAnimation(has: (name: string) => boolean, name: string, speaking: boolean): string {
  return speaking && has(name + '_talk') ? name + '_talk' : name
}

/** blinks every 2.5 – 6 s for 130 ms (like the builtin figures) */
export class Blinker {
  private next: number
  private closed = 0
  constructor(private random: () => number = Math.random) {
    this.next = 2000 + random() * 2000
  }
  /** advances the time, returns true while the eyes are closed; `allowed = false` keeps them open */
  tick(ms: number, allowed = true): boolean {
    if (this.closed > 0) {
      this.closed = allowed ? this.closed - ms : 0
    } else if ((this.next -= ms) <= 0 && allowed) {
      this.closed = 130
      this.next = 2500 + this.random() * 3500
    }
    return this.closed > 0
  }
}

/**
 * The mouth flaps open and closed while a line is spoken. This keeps "speaking"
 * true for a moment after the last open mouth, so the gaps between two flaps do
 * not count as silence (no blinking, the talking animation keeps running).
 */
export class Speaking {
  static HOLD = 350
  open = false
  private hold = 0
  set(open: boolean) {
    this.open = open
    if (open) this.hold = Speaking.HOLD
  }
  tick(ms: number) {
    if (this.hold > 0) this.hold -= ms
  }
  get active() {
    return this.open || this.hold > 0
  }
}

/** `breathe`, `fidget`, `none`/`off`/`no` → mode; null if unknown, undefined if not given */
export function idleMode(v: string | undefined): Idle | null | undefined {
  if (v === undefined) return undefined
  const w = v.trim().toLowerCase()
  if (w === 'breathe' || w === 'fidget') return w
  if (/^(none|off|no|false|0)$/.test(w)) return 'none'
  return null
}

/** `x` and `y` are fractions of the height of the character, y < 0 is up */
export type Pose = { sx: number; sy: number; x: number; y: number; rotation: number }

export const REST: Pose = { sx: 1, sy: 1, x: 0, y: 0, rotation: 0 }

const wave = (t: number, period: number, phase = 0) => Math.sin((2 * Math.PI * t) / period + phase)

/**
 * A subtle idle motion at time `t` (ms). `x` is a fraction of the height of the
 * character (it is anchored bottom-center, so it scales and turns around the feet).
 * - breathe: scale.y ± 0.25 %, scale.x ± 0.08 %, period 4 s
 * - fidget: faster breathing plus irregular weight shifts – a small sway to the
 *   sides (± 0.6 % of the height) and a tiny tilt (± 0.7°)
 */
export function idlePose(mode: Idle, t: number): Pose {
  if (mode === 'breathe') {
    const b = wave(t, 4000)
    return { sx: 1 + 0.0008 * b, sy: 1 + 0.0025 * b, x: 0, y: 0, rotation: 0 }
  }
  if (mode === 'fidget') {
    const b = wave(t, 3000)
    // incommensurable periods: the shifts never repeat exactly, with calm moments in between
    const w = 0.6 * wave(t, 2300) + 0.4 * wave(t, 3700, 1.3) * wave(t, 9100, 0.4)
    const r = 0.5 * wave(t, 2900, 2.1) + 0.5 * wave(t, 1700, 0.7) * wave(t, 6100)
    return { sx: 1 + 0.0015 * b, sy: 1 + 0.004 * b, x: 0.006 * w, y: 0, rotation: 0.012 * r }
  }
  return REST
}

/** both poses at once: scales multiply, offsets and rotations add up */
export function combine(a: Pose, b: Pose): Pose {
  return { sx: a.sx * b.sx, sy: a.sy * b.sy, x: a.x + b.x, y: a.y + b.y, rotation: a.rotation + b.rotation }
}

/**
 * Gestures (`act mia nod`) and their default length in seconds. The first ones
 * move the whole body and work with every character, the others need arms
 * (`arms=on`, `act.wave=` images or a spritesheet animation) – without arms
 * they become the body motion in BODY.
 */
export const GESTURES: Record<string, number> = {
  nod: 0.8,
  shake: 0.9,
  jump: 0.7,
  hop: 0.8,
  bow: 1.2,
  shiver: 0.8,
  wave: 1.6,
  point: 1.2,
  shrug: 1,
  cross: 1.6,
  hips: 1.6,
  think: 1.6,
  cheer: 1.2,
  take: 0.6,
  give: 0.6,
}

const BODY: Record<string, string> = { wave: 'hop', point: 'nod', shrug: 'nod', cheer: 'jump', take: 'bow', give: 'bow' }

/** the body motion for a gesture of a character without arms ('' = none) */
export function bodyGesture(name: string): string {
  return BODY[name] ?? (name in GESTURES && !['cross', 'hips', 'think'].includes(name) ? name : '')
}

/** 0 → 1 → 0 between a and b, 0 outside */
const bump = (t: number, a: number, b: number) => (t > a && t < b ? Math.sin((Math.PI * (t - a)) / (b - a)) : 0)

/**
 * A body gesture at `t` (0 … 1 of its length), REST at the start and the end.
 * Characters are anchored at their feet, so squashing lowers the head (nod, bow).
 */
export function gesturePose(name: string, t: number): Pose {
  if (t <= 0 || t >= 1) return REST
  const env = Math.sin(Math.PI * t)
  switch (name) {
    case 'nod':
      return { ...REST, sy: 1 - 0.03 * Math.abs(Math.sin(2 * Math.PI * t)) }
    case 'shake':
      return { ...REST, rotation: 0.04 * Math.sin(6 * Math.PI * t) * env }
    case 'jump': {
      // crouch, fly, land
      const fly = bump(t, 0.15, 0.85)
      return { ...REST, sy: 1 - 0.06 * bump(t, 0, 0.15) - 0.05 * bump(t, 0.85, 1) + 0.03 * fly, y: -0.14 * fly }
    }
    case 'hop':
      return { ...REST, y: -0.05 * Math.abs(Math.sin(2 * Math.PI * t)) }
    case 'bow':
      // down, hold, up
      return { ...REST, sy: 1 - 0.09 * Math.min(1, 2.5 * env) }
    case 'shiver':
      return { ...REST, x: 0.006 * Math.sin(28 * Math.PI * t) * env }
  }
  return REST
}

/** bobbing while walking, `ms` since the first step: up and down every step, a little tilt to each side */
export function stepPose(ms: number, step = 450): Pose {
  const s = Math.sin((Math.PI * ms) / step)
  return { ...REST, y: -0.015 * Math.abs(s), rotation: 0.02 * s }
}

let query: MediaQueryList | null | undefined

/** true if the reader prefers reduced motion (system setting) */
export function calm(): boolean {
  if (query === undefined) {
    query = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  }
  return !!query?.matches
}
