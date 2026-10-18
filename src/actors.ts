/**
 * Characters and images on the stage. A character can be
 * - a builtin figure      `char anna "Anna" base:girl`
 * - an image              `char anna "Anna" img/anna.png happy=img/anna-happy.png talk=img/anna-talk.png`
 *                           with talking and blinking frames per expression and an idle motion
 *                           `happy.talk=… happy.blink=… blink=… idle=breathe` (see fx/life.ts)
 * - an emoji              `char bot "Robo" emoji=🤖 happy=😀`
 * - a spritesheet         `char cat "Cat" sheet=cat.json anim=idle`
 * - a custom type         `char x "X" type=spine …` (LiaPixi.defineActor)
 * - a defined character   `char k "Khadija" khadija` (LiaPixi.defineCharacter, merged by the parser)
 * All of them can walk (`move … walk`) and gesture (`act mia nod`), images and
 * spritesheets also with their own frames (`walk=a.png,b.png act.wave=…`).
 */
import { AnimatedSprite, Assets, Container, Sprite, Spritesheet, Text, Texture } from 'pixi.js'
import { Figure, figureStyle } from './base/figures'
import { actorTypes } from './runtime/registry'
import { absolute } from './assets'
import {
  Blinker,
  GESTURES,
  Speaking,
  bodyGesture,
  calm,
  combine,
  frameAt,
  frameList,
  gesturePose,
  idleMode,
  idlePose,
  isFrameKey,
  pickFrame,
  sheetAnimation,
  stepPose,
  type Idle,
} from './fx/life'
import type { Def, Script } from './runtime/types'

export interface Actor {
  view: Container
  /** height in local units, used to scale it to the stage */
  height: number
  setExpression(expr?: string): void
  /** opens or closes the mouth while speaking */
  talk(open: boolean): void
  update?(ms: number): void
  /** changes the idle motion (`breathe`, `fidget`, `none`); undefined = the one of the definition */
  setIdle?(mode?: string): void
  /** starts a gesture (`nod`, `wave` …), undefined stops it; may return its length in seconds */
  act?(name?: string, seconds?: number): number | void
  /** bobs (and shows walking frames) while true */
  walk?(on: boolean): void
  /** the part that moves (idle, gestures), objects are held relative to it; else the view */
  body?: Container
  /** where an object is held, in local units of `body` (else `hand=` of the definition is used) */
  hand?(): { x: number; y: number }
  destroy(): void
}

/** keys of a character definition that are not expressions */
const RESERVED = new Set([
  'name',
  'color',
  'voice',
  'pitch',
  'rate',
  'scale',
  'emoji',
  'sheet',
  'anim',
  'type',
  'talk',
  'blink',
  'idle',
  'base',
  'skin',
  'hair',
  'shirt',
  'eyes',
  'hairstyle',
  'glasses',
  'beard',
  'mustache',
  'y',
  'x',
  'flip',
  'height',
  'hand',
  'arms',
])

export function expressions(def: Def) {
  return Object.keys(def.kv).filter((k) => !RESERVED.has(k) && !isFrameKey(k))
}

/** the idle motion of a definition (`idle=breathe`), none by default */
function ownIdle(def: Def): Idle {
  return idleMode(def.kv.idle) || 'none'
}

/**
 * Moves a child of an actor view (the view itself is placed by the stage):
 * idle motion, bobbing while walking and body gestures.
 */
class Idler {
  private time = Math.random() * 10000 // not all characters breathe in step
  mode: Idle
  /** the running gesture; `body` = false: the actor shows it with its own frames */
  gesture?: { name: string; time: number; dur: number; body: boolean }
  /** milliseconds walked, -1 while standing */
  walked = -1
  constructor(readonly own: Idle) {
    this.mode = own
  }
  set(mode?: string) {
    this.mode = idleMode(mode) || this.own
  }
  act(name: string | undefined, seconds: number, body = true) {
    this.gesture = name ? { name, time: 0, dur: seconds * 1000, body } : undefined
  }
  walk(on: boolean) {
    this.walked = on ? 0 : -1
  }
  tick(ms: number) {
    this.time += ms
    if (this.walked >= 0) this.walked += ms
    const g = this.gesture
    if (g && (g.time += ms) >= g.dur) this.gesture = undefined
  }
  apply(target: Container, height: number, stretch = 1) {
    let p = idlePose(calm() ? 'none' : this.mode, this.time)
    if (!calm()) {
      if (this.walked >= 0) p = combine(p, stepPose(this.walked))
      const g = this.gesture
      if (g?.body) p = combine(p, gesturePose(bodyGesture(g.name), g.time / g.dur))
    }
    target.scale.set(p.sx, p.sy * stretch)
    target.position.set(p.x * height, p.y * height)
    target.rotation = p.rotation
  }
}

/** the length of a gesture: given, else its default, else `fallback` */
const gestureLength = (name: string, seconds?: number, fallback = 1) => seconds ?? GESTURES[name] ?? fallback

class FigureActor implements Actor {
  view = new Container()
  height: number
  private blinker = new Blinker()
  private blinking = false
  private idle = new Idler('none')
  get body() {
    return this.figure
  }
  constructor(readonly figure: Figure) {
    // smaller figures (kid) get a larger reference height, so they are scaled down
    this.height = Figure.HEIGHT / (figure.style.size || 1)
    this.view.addChild(figure)
  }
  setExpression(e?: string) {
    this.figure.setExpression(e)
  }
  talk(open: boolean) {
    this.figure.setMouth(open)
  }
  act(name?: string, seconds?: number) {
    const s = name ? gestureLength(name, seconds) : 0
    this.idle.act(name, s)
    return s
  }
  walk(on: boolean) {
    this.idle.walk(on)
  }
  update(ms: number) {
    // blink every few seconds
    const b = this.blinker.tick(ms)
    if (b !== this.blinking) this.figure.setBlink((this.blinking = b))
    this.idle.tick(ms)
    this.idle.apply(this.figure, Figure.HEIGHT)
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

/**
 * An image with optional images per expression (`sad=`), talking (`talk=`, `sad.talk=`)
 * and blinking frames (`blink=`, `sad.blink=`), an idle motion (`idle=breathe`) and
 * animations for walking and gestures (`walk=a.png,b.png`, `act.wave=…`).
 */
class SpriteActor implements Actor {
  view = new Container()
  height: number
  private expr?: string
  private speaking = new Speaking()
  private blinker = new Blinker()
  private blinking = false
  get body() {
    return this.sprite
  }
  /** no talking image for this expression: the image is stretched a little instead */
  private stretch = false
  private idle: Idler
  constructor(
    private sprite: Sprite,
    private textures: Record<string, Texture>,
    idle: Idle = 'none',
    private anims: Record<string, Texture[]> = {}
  ) {
    sprite.anchor.set(0.5, 1)
    this.view.addChild(sprite)
    this.height = sprite.texture.height
    this.idle = new Idler(idle)
  }
  setExpression(e?: string) {
    this.expr = e
    this.apply()
  }
  setIdle(mode?: string) {
    this.idle.set(mode)
    this.idle.apply(this.sprite, this.height, this.stretch ? 1.015 : 1)
  }
  talk(open: boolean) {
    this.speaking.set(open)
    this.apply()
  }
  act(name?: string, seconds?: number) {
    const frames = name && this.anims['act.' + name]
    const s = name ? gestureLength(name, seconds, frames ? frames.length / 8 : 1) : 0
    this.idle.act(name, s, !frames)
    this.apply()
    return s
  }
  walk(on: boolean) {
    this.idle.walk(on)
    this.apply()
  }
  update(ms: number) {
    this.speaking.tick(ms)
    // no blinking while speaking: the talking frames have open eyes
    this.blinking = this.blinker.tick(ms, !this.speaking.active)
    this.idle.tick(ms)
    this.apply()
  }
  /** the running animation of a gesture or of walking, and its time */
  private animation(): [Texture[], number] | null {
    const g = this.idle.gesture
    if (g && !g.body) return [this.anims['act.' + g.name], g.time]
    if (this.idle.walked >= 0 && this.anims.walk) return [this.anims.walk, this.idle.walked]
    return null
  }
  private apply() {
    const open = this.speaking.open
    const { key, frame } = pickFrame((k) => !!this.textures[k], this.expr, { open, blink: this.blinking })
    const anim = this.animation()
    // with reduced motion an animation stands still on its first frame
    const t = anim ? anim[0][frameAt(anim[0].length, calm() ? 0 : anim[1])] : this.textures[key] || this.textures['']
    this.stretch = open && (!!anim || frame !== 'talk')
    if (t && this.sprite.texture !== t) this.sprite.texture = t
    this.idle.apply(this.sprite, this.height, this.stretch ? 1.015 : 1)
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

class EmojiActor implements Actor {
  view = new Container()
  height = 400
  private text: Text
  private open = false
  private idle: Idler
  get body() {
    return this.text
  }
  constructor(
    private emoji: Record<string, string>,
    idle: Idle = 'none'
  ) {
    this.text = new Text({ text: emoji[''], style: { fontSize: 320, fontFamily: 'Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif' } })
    this.text.anchor.set(0.5, 1)
    this.view.addChild(this.text)
    this.idle = new Idler(idle)
  }
  setExpression(e?: string) {
    this.text.text = (e && this.emoji[e]) || this.emoji['']
  }
  setIdle(mode?: string) {
    this.idle.set(mode)
    this.apply()
  }
  talk(open: boolean) {
    this.open = open
    this.apply()
  }
  act(name?: string, seconds?: number) {
    const s = name ? gestureLength(name, seconds) : 0
    this.idle.act(name, s)
    return s
  }
  walk(on: boolean) {
    this.idle.walk(on)
  }
  update(ms: number) {
    this.idle.tick(ms)
    this.apply()
  }
  private apply() {
    this.idle.apply(this.text, this.height)
    if (this.open) this.text.scale.set(this.text.scale.x * 1.04, this.text.scale.y * 0.96)
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

/**
 * A spritesheet, expressions are animations; `<name>_talk` is played while speaking,
 * `walk` while walking and a gesture animation (`act cat wave`) once.
 */
class SheetActor implements Actor {
  view = new Container()
  height: number
  private anim: AnimatedSprite
  /** the animation without talking */
  private name: string
  private speaking = new Speaking()
  private idle: Idler
  get body() {
    return this.anim
  }
  constructor(
    private sheet: Spritesheet,
    private def: Def
  ) {
    const names = Object.keys(sheet.animations)
    const first =
      def.kv.anim && sheet.animations[def.kv.anim] ? def.kv.anim : names.find((n) => !n.endsWith('_talk')) || names[0]
    this.name = first
    this.anim = new AnimatedSprite(sheet.animations[first] || Object.values(sheet.textures))
    this.anim.anchor.set(0.5, 1)
    this.anim.animationSpeed = 0.15
    this.anim.play()
    this.view.addChild(this.anim)
    this.height = this.anim.height
    this.idle = new Idler(ownIdle(def))
  }
  setExpression(e?: string) {
    const name = e ? this.def.kv[e] || e : this.def.kv.anim
    if (name && this.sheet.animations[name]) this.name = name
    this.play()
  }
  setIdle(mode?: string) {
    this.idle.set(mode)
    this.idle.apply(this.anim, this.height)
  }
  talk(open: boolean) {
    this.speaking.set(open)
    this.play()
  }
  act(name?: string, seconds?: number) {
    const frames = name && this.sheet.animations[name]
    // one pass of the animation (animationSpeed frames per tick at 60 ticks per second)
    const s = name ? gestureLength(name, seconds, frames ? frames.length / (this.anim.animationSpeed * 60) : 1) : 0
    this.idle.act(name, s, !frames)
    this.play()
    return s
  }
  walk(on: boolean) {
    this.idle.walk(on)
    this.play()
  }
  update(ms: number) {
    const was = this.speaking.active
    const gesture = this.idle.gesture
    this.speaking.tick(ms)
    this.idle.tick(ms)
    if (was !== this.speaking.active || gesture !== this.idle.gesture) this.play() // back to the normal animation
    this.idle.apply(this.anim, this.height)
  }
  private play() {
    const g = this.idle.gesture
    const has = (n: string) => !!this.sheet.animations[n]
    let name = sheetAnimation(has, this.name, this.speaking.active)
    if (g && !g.body) name = g.name
    else if (this.idle.walked >= 0 && has('walk')) name = 'walk'
    const frames = this.sheet.animations[name]
    if (frames && this.anim.textures !== frames) {
      this.anim.textures = frames
      this.anim.loop = !(g && !g.body)
      this.anim.gotoAndPlay(0)
    }
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

/** loads an image, also from urls without a file extension */
export async function loadTexture(url: string): Promise<Texture> {
  if (/^data:image\/|\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i.test(url)) return Assets.load<Texture>(url)
  return Assets.load<Texture>({ src: url, parser: 'texture' })
}

/** wraps what a custom actor factory returned (a Container or an Actor-like object) */
function wrap(x: any): Actor {
  if (x && x.view) {
    return {
      height: x.height ?? x.view.height ?? 400,
      setExpression: (e) => x.setExpression?.(e),
      talk: (o) => x.talk?.(o),
      update: (ms) => x.update?.(ms),
      setIdle: (m) => x.setIdle?.(m),
      act: (n, s) => x.act?.(n, s),
      walk: (on) => x.walk?.(on),
      body: x.body,
      hand: x.hand && (() => x.hand()),
      destroy: () => (x.destroy ? x.destroy() : x.view.destroy({ children: true })),
      view: x.view,
    }
  }
  const view = x as Container
  return { view, height: view.height || 400, setExpression() {}, talk() {}, destroy: () => view.destroy({ children: true }) }
}

export async function createActor(def: Def, script: Script, ctx: any): Promise<Actor> {
  const kv = def.kv
  // files of a character are relative to its `base=` (e.g. from LiaPixi.defineCharacter)
  const url = (s: string) => absolute(kv.base ? new URL(s, absolute(kv.base, script)).href : s, script)
  const type = kv.type?.toLowerCase()
  if (type && actorTypes[type]) return wrap(await actorTypes[type](ctx, def))
  if (type && !actorTypes[type]) console.warn(`LiaPixi: unknown actor type "${type}" for ${def.id}`)

  if (kv.emoji) {
    const map: Record<string, string> = { '': kv.emoji }
    for (const e of expressions(def)) map[e] = kv[e]
    return new EmojiActor(map, ownIdle(def))
  }

  if (kv.sheet) {
    const sheet = await Assets.load<Spritesheet>(url(kv.sheet))
    return new SheetActor(sheet, def)
  }

  const src = def.src || 'base:' + (/^(base:)?\w+$/.test(def.id) && figureStyle(def.id) ? def.id : 'student')
  if (src.startsWith('base:') || (!/[./]/.test(src) && figureStyle(src))) {
    const style = figureStyle(src.replace(/^base:/, ''), kv)
    if (style) return new FigureActor(new Figure(style))
    console.warn(`LiaPixi: there is no builtin figure "${src}"`)
    return new FigureActor(new Figure(figureStyle('student', kv)!))
  }

  // an image with optional expression, talking and blinking images and animations
  const textures: Record<string, Texture> = { '': await loadTexture(url(src)) }
  const anims: Record<string, Texture[]> = {}
  const isAnim = (k: string) => k === 'walk' || k.startsWith('act.')
  const frames = Object.keys(kv).filter(isFrameKey)
  const load = async (key: string, file: string) => {
    try {
      return await loadTexture(url(file))
    } catch (err) {
      console.warn(`LiaPixi: could not load ${file} for ${def.id} ${key}`)
    }
  }
  await Promise.all(
    [...expressions(def), ...frames].map(async (e) => {
      if (!isAnim(e)) {
        const t = await load(e, kv[e])
        if (t) textures[e] = t
        return
      }
      const list = (await Promise.all(frameList(kv[e]).map((f) => load(e, f)))).filter((t): t is Texture => !!t)
      if (list.length) anims[e] = list
    })
  )
  return new SpriteActor(new Sprite(textures['']), textures, ownIdle(def), anims)
}
