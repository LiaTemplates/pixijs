/**
 * Characters and images on the stage. A character can be
 * - a builtin figure      `char anna "Anna" base:girl`
 * - an image              `char anna "Anna" img/anna.png happy=img/anna-happy.png talk=img/anna-talk.png`
 * - an emoji              `char bot "Robo" emoji=🤖 happy=😀`
 * - a spritesheet         `char cat "Cat" sheet=cat.json anim=idle`
 * - a custom type         `char x "X" type=spine …` (LiaPixi.defineActor)
 */
import { AnimatedSprite, Assets, Container, Sprite, Spritesheet, Text, Texture } from 'pixi.js'
import { Figure, figureStyle } from './base/figures'
import { actorTypes } from './runtime/registry'
import { absolute } from './assets'
import type { Def, Script } from './runtime/types'

export interface Actor {
  view: Container
  /** height in local units, used to scale it to the stage */
  height: number
  setExpression(expr?: string): void
  /** opens or closes the mouth while speaking */
  talk(open: boolean): void
  update?(ms: number): void
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

function expressions(def: Def) {
  return Object.keys(def.kv).filter((k) => !RESERVED.has(k))
}

class FigureActor implements Actor {
  height: number
  private next = 2000 + Math.random() * 2000
  private closed = 0
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
    if (this.closed > 0) {
      this.closed -= ms
      if (this.closed <= 0) this.view.setBlink(false)
    } else if ((this.next -= ms) <= 0) {
      this.view.setBlink(true)
      this.closed = 130
      this.next = 2500 + Math.random() * 3500
    }
  }
  destroy() {
    this.view.destroy({ children: true })
  }
}

class SpriteActor implements Actor {
  view = new Container()
  height: number
  private expr?: string
  private open = false
  constructor(
    private sprite: Sprite,
    private textures: Record<string, Texture>,
    private talking?: Texture
  ) {
    sprite.anchor.set(0.5, 1)
    this.view.addChild(sprite)
    this.height = sprite.texture.height
  }
  setExpression(e?: string) {
    this.expr = e
    this.apply()
  }
  talk(open: boolean) {
    this.open = open
    if (this.talking) this.apply()
    else this.sprite.scale.y = open ? 1.015 : 1
  }
  private apply() {
    const t = this.open && this.talking ? this.talking : (this.expr && this.textures[this.expr]) || this.textures['']
    if (t && this.sprite.texture !== t) this.sprite.texture = t
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

class SheetActor implements Actor {
  view = new Container()
  height: number
  private anim: AnimatedSprite
  constructor(
    private sheet: Spritesheet,
    private def: Def
  ) {
    const names = Object.keys(sheet.animations)
    const first = def.kv.anim && sheet.animations[def.kv.anim] ? def.kv.anim : names[0]
    this.anim = new AnimatedSprite(sheet.animations[first] || Object.values(sheet.textures))
    this.anim.anchor.set(0.5, 1)
    this.anim.animationSpeed = 0.15
    this.anim.play()
    this.view.addChild(this.anim)
    this.height = this.anim.height
  }
  setExpression(e?: string) {
    const name = e ? this.def.kv[e] || e : this.def.kv.anim
    const frames = name && this.sheet.animations[name]
    if (frames && this.anim.textures !== frames) {
      this.anim.textures = frames
      this.anim.play()
    }
  }
  talk() {}
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

  // an image with optional expression images
  const textures: Record<string, Texture> = { '': await texture(src, script) }
  await Promise.all(
    expressions(def).map(async (e) => {
      try {
        textures[e] = await texture(kv[e], script)
      } catch (err) {
        console.warn(`LiaPixi: could not load ${kv[e]} for ${def.id} ${e}`)
      }
    })
  )
  const talking = kv.talk ? await texture(kv.talk, script).catch(() => undefined) : undefined
  return new SpriteActor(new Sprite(textures['']), textures, talking)
}
