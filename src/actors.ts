/**
 * Characters and images on the stage. A character can be
 * - a builtin figure      `char anna "Anna" base:girl`
 * - an image              `char anna "Anna" img/anna.png happy=img/anna-happy.png talk=img/anna-talk.png`
 *                           with talking and blinking frames per expression and an idle motion
 *                           `happy.talk=… happy.blink=… blink=… idle=breathe` (see fx/life.ts)
 * - an emoji              `char bot "Robo" emoji=🤖 happy=😀`
 * - a spritesheet         `char cat "Cat" sheet=cat.json anim=idle`
 * - a custom type         `char x "X" type=spine …` (LiaPixi.defineActor)
 */
import { AnimatedSprite, Assets, Container, Sprite, Spritesheet, Text, Texture } from 'pixi.js'
import { Figure, figureStyle } from './base/figures'
import { actorTypes } from './runtime/registry'
import { absolute } from './assets'
import { Blinker, Speaking, calm, idleMode, idlePose, isFrameKey, pickFrame, sheetAnimation, type Idle } from './fx/life'
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
])

export function expressions(def: Def) {
  return Object.keys(def.kv).filter((k) => !RESERVED.has(k) && !isFrameKey(k))
}

/** the idle motion of a definition (`idle=breathe`), none by default */
function ownIdle(def: Def): Idle {
  return idleMode(def.kv.idle) || 'none'
}

/** moves a child of an actor view a little (the view itself is placed by the stage) */
class Idler {
  private time = Math.random() * 10000 // not all characters breathe in step
  mode: Idle
  constructor(readonly own: Idle) {
    this.mode = own
  }
  set(mode?: string) {
    this.mode = idleMode(mode) || this.own
  }
  tick(ms: number) {
    this.time += ms
  }
  apply(target: Container, height: number, stretch = 1) {
    const p = idlePose(calm() ? 'none' : this.mode, this.time)
    target.scale.set(p.sx, p.sy * stretch)
    target.position.set(p.x * height, 0)
    target.rotation = p.rotation
  }
}

class FigureActor implements Actor {
  height: number
  private blinker = new Blinker()
  private blinking = false
  constructor(readonly view: Figure) {
    // smaller figures (kid) get a larger reference height, so they are scaled down
    this.height = Figure.HEIGHT / (view.style.size || 1)
  }
  setExpression(e?: string) {
    this.view.setExpression(e)
  }
  talk(open: boolean) {
    this.view.setMouth(open)
  }
  update(ms: number) {
    // blink every few seconds
    const b = this.blinker.tick(ms)
    if (b !== this.blinking) this.view.setBlink((this.blinking = b))
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

/**
 * An image with optional images per expression (`sad=`), talking (`talk=`, `sad.talk=`)
 * and blinking frames (`blink=`, `sad.blink=`) and an idle motion (`idle=breathe`).
 */
class SpriteActor implements Actor {
  view = new Container()
  height: number
  private expr?: string
  private speaking = new Speaking()
  private blinker = new Blinker()
  private blinking = false
  /** no talking image for this expression: the image is stretched a little instead */
  private stretch = false
  private idle: Idler
  constructor(
    private sprite: Sprite,
    private textures: Record<string, Texture>,
    idle: Idle = 'none'
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
  update(ms: number) {
    this.speaking.tick(ms)
    // no blinking while speaking: the talking frames have open eyes
    const b = this.blinker.tick(ms, !this.speaking.active)
    if (b !== this.blinking) {
      this.blinking = b
      this.apply()
    }
    this.idle.tick(ms)
    this.idle.apply(this.sprite, this.height, this.stretch ? 1.015 : 1)
  }
  private apply() {
    const open = this.speaking.open
    const { key, frame } = pickFrame((k) => !!this.textures[k], this.expr, { open, blink: this.blinking })
    this.stretch = open && frame !== 'talk'
    const t = this.textures[key] || this.textures['']
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
  constructor(private emoji: Record<string, string>) {
    this.text = new Text({ text: emoji[''], style: { fontSize: 320, fontFamily: 'Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif' } })
    this.text.anchor.set(0.5, 1)
    this.view.addChild(this.text)
  }
  setExpression(e?: string) {
    this.text.text = (e && this.emoji[e]) || this.emoji['']
  }
  talk(open: boolean) {
    this.text.scale.set(open ? 1.04 : 1, open ? 0.96 : 1)
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

/** a spritesheet, expressions are animations; `<name>_talk` is played while speaking */
class SheetActor implements Actor {
  view = new Container()
  height: number
  private anim: AnimatedSprite
  /** the animation without talking */
  private name: string
  private speaking = new Speaking()
  private idle: Idler
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
  update(ms: number) {
    const was = this.speaking.active
    this.speaking.tick(ms)
    if (was !== this.speaking.active) this.play() // back to the normal animation
    this.idle.tick(ms)
    this.idle.apply(this.anim, this.height)
  }
  private play() {
    const name = sheetAnimation((n) => !!this.sheet.animations[n], this.name, this.speaking.active)
    const frames = this.sheet.animations[name]
    if (frames && this.anim.textures !== frames) {
      this.anim.textures = frames
      this.anim.play()
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

async function texture(src: string, script: Script): Promise<Texture> {
  return loadTexture(absolute(src, script))
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
      destroy: () => (x.destroy ? x.destroy() : x.view.destroy({ children: true })),
      view: x.view,
    }
  }
  const view = x as Container
  return { view, height: view.height || 400, setExpression() {}, talk() {}, destroy: () => view.destroy({ children: true }) }
}

export async function createActor(def: Def, script: Script, ctx: any): Promise<Actor> {
  const kv = def.kv
  const type = kv.type?.toLowerCase()
  if (type && actorTypes[type]) return wrap(await actorTypes[type](ctx, def))
  if (type && !actorTypes[type]) console.warn(`LiaPixi: unknown actor type "${type}" for ${def.id}`)

  if (kv.emoji) {
    const map: Record<string, string> = { '': kv.emoji }
    for (const e of expressions(def)) map[e] = kv[e]
    return new EmojiActor(map)
  }

  if (kv.sheet) {
    const sheet = await Assets.load<Spritesheet>(absolute(kv.sheet, script))
    return new SheetActor(sheet, def)
  }

  const src = def.src || 'base:' + (/^(base:)?\w+$/.test(def.id) && figureStyle(def.id) ? def.id : 'student')
  if (src.startsWith('base:') || (!/[./]/.test(src) && figureStyle(src))) {
    const style = figureStyle(src.replace(/^base:/, ''), kv)
    if (style) return new FigureActor(new Figure(style))
    console.warn(`LiaPixi: there is no builtin figure "${src}"`)
    return new FigureActor(new Figure(figureStyle('student', kv)!))
  }

  // an image with optional expression, talking and blinking images
  const textures: Record<string, Texture> = { '': await texture(src, script) }
  const frames = Object.keys(kv).filter(isFrameKey)
  await Promise.all(
    [...expressions(def), ...frames].map(async (e) => {
      try {
        textures[e] = await texture(kv[e], script)
      } catch (err) {
        console.warn(`LiaPixi: could not load ${kv[e]} for ${def.id} ${e}`)
      }
    })
  )
  return new SpriteActor(new Sprite(textures['']), textures, ownIdle(def))
}
