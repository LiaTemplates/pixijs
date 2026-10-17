/**
 * The PixiJS stage: implements the Presenter interface of the story runtime.
 * Everything is drawn in a fixed logical size (default 1600 × 900) and the
 * canvas is scaled by CSS, so stories look the same on every screen.
 */
import * as PIXI from 'pixi.js'
// bundled statically, so PixiJS does not load extra chunks at runtime
import 'pixi.js/browser'
import { Application, Assets, BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { Tweens } from './fx/tween'
import { calm } from './fx/life'
import { Audio } from './audio'
import { Speech, parseVoice, available as ttsAvailable } from './tts'
import { createActor, loadTexture, type Actor } from './actors'
import { backgroundUrl, backgroundSource, gradient, isColor, absolute } from './assets'
import { Overlay } from './ui'
import { forStory, type Labels } from './i18n'
import type { ActorState, MenuItem, Presenter, Script, Visual } from './runtime/types'

export type Settings = {
  auto: boolean
  tts: boolean
  sound: boolean
  textspeed: number
  dim: boolean
  hint: boolean
}

const yes = (v: string | undefined, def: boolean) => (v === undefined ? def : !/^(off|no|false|0)$/i.test(v))

/** the default for reading aloud follows the sound switch of LiaScript */
function liaSound(): boolean {
  try {
    const s = (window as any).LIA?.settings
    if (s && typeof s.sound === 'boolean') return s.sound
  } catch (e) {}
  return false
}

export class Stage implements Presenter {
  readonly app = new Application()
  readonly W: number
  readonly H: number
  readonly world = new Container()
  readonly layers = { bg: new Container(), actors: new Container(), fx: new Container() }
  readonly tweens = new Tweens()
  readonly speech = new Speech()
  readonly audio: Audio
  t: Labels
  dir: 'ltr' | 'rtl'
  readonly settings: Settings
  ui!: Overlay
  private actors = new Map<string, Actor>()
  private pending = new Map<string, Promise<Actor | null>>()
  private bg: Container | null = null
  private bgRef: string | null = null
  private tintRect = new Graphics()
  private flashRect = new Graphics()
  private fadeRect = new Graphics()
  private blur = new BlurFilter({ strength: 0, quality: 4 })
  private advance: (() => void) | null = null
  private menuCleanup: (() => void) | null = null
  private destroyed = false
  private initialized = false
  private zoomState = { factor: 1, x: 0, y: 0 }
  /** timers of the running line, stopped when the stage is destroyed */
  private timers = new Set<() => void>()

  constructor(
    readonly script: Script,
    readonly host: HTMLElement,
    readonly hooks: { toolbar: () => void; error: (msg: string) => void; end: (name: string, text: string) => void }
  ) {
    this.W = script.stage.width
    this.H = script.stage.height
    const o = script.options
    const lang = forStory(o, script.lang)
    this.t = lang.t
    this.dir = lang.dir
    this.settings = {
      auto: yes(o.auto, false),
      tts: ttsAvailable() && yes(o.tts, liaSound()),
      sound: yes(o.sound, true),
      textspeed: o.textspeed !== undefined ? parseFloat(o.textspeed) || 0 : 45,
      dim: yes(o.dim, true),
      hint: yes(o.hint, true),
    }
    this.audio = new Audio((ref, kind) => {
      const def = kind === 'music' ? script.music[ref] : script.sounds[ref]
      const src = def?.src || ref
      return absolute(src, script)
    })
    this.audio.muted = !this.settings.sound
  }

  async init() {
    await this.app.init({
      width: this.W,
      height: this.H,
      background: isColor(this.script.stage.color) ? this.script.stage.color : '#1d2433',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      preference: 'webgl',
      skipExtensionImports: true,
    })
    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }
    this.initialized = true
    this.host.prepend(this.app.canvas)
    this.app.canvas.setAttribute('aria-hidden', 'true')

    const { world, layers } = this
    world.addChild(layers.bg, layers.actors, this.tintRect, layers.fx)
    world.pivot.set(this.W / 2, this.H / 2)
    world.position.set(this.W / 2, this.H / 2)
    layers.bg.filters = [this.blur]
    this.blur.enabled = false
    this.tintRect.rect(0, 0, this.W, this.H).fill('#ffffff')
    this.tintRect.alpha = 0
    for (const r of [this.flashRect, this.fadeRect]) {
      r.rect(-10, -10, this.W + 20, this.H + 20).fill('#ffffff')
      r.alpha = 0
    }
    this.app.stage.addChild(world, this.flashRect, this.fadeRect)

    this.app.ticker.add((ticker) => {
      this.tweens.tick(ticker.deltaMS)
      for (const a of this.actors.values()) if (a.view.visible) a.update?.(ticker.deltaMS)
    })
  }

  /** adapts the render resolution to the displayed size */
  resize(cssWidth: number) {
    if (!this.initialized || !cssWidth) return
    const res = Math.max(0.5, Math.min(3, (cssWidth / this.W) * (window.devicePixelRatio || 1)))
    if (Math.abs(res - this.app.renderer.resolution) > 0.05) this.app.renderer.resize(this.W, this.H, res)
  }

  pause() {
    if (!this.initialized) return
    this.app.ticker.stop()
    this.speech.pause()
    this.audio.pause()
  }

  resume() {
    if (!this.initialized || this.destroyed) return
    this.app.ticker.start()
    this.speech.resume()
    this.audio.resume()
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.advance = null
    this.menuCleanup?.()
    this.timers.forEach((stop) => stop())
    this.timers.clear()
    this.speech.cancel()
    this.audio.destroy()
    this.ui?.destroy()
    this.tweens.finish()
    if (this.initialized) {
      // textures are shared through the Assets cache, so they are kept
      this.app.destroy({ removeView: true }, { children: true })
    }
  }

  /** the reader clicked, tapped or pressed space/enter */
  next() {
    if (this.ui.isTyping) {
      this.ui.completeTyping()
      return
    }
    const fn = this.advance
    if (fn) {
      this.advance = null
      fn()
    }
  }

  private waitAdvance(): Promise<void> {
    return new Promise((resolve) => (this.advance = resolve))
  }

  /** follows a change of the course language, unless the story fixes its own language */
  relabel(): boolean {
    const lang = forStory(this.script.options, this.script.lang)
    if (JSON.stringify(lang.t) === JSON.stringify(this.t) && lang.dir === this.dir) return false
    this.t = lang.t
    this.dir = lang.dir
    this.ui?.setLanguage(this.t, this.dir)
    return true
  }

  private nameOf(id: string) {
    return this.script.characters[id]?.name ?? this.script.images[id]?.kv.alt ?? id
  }

  /** tells screen readers that a character or object appears or disappears */
  private tell(what: 'appears' | 'disappears', id: string) {
    this.ui.announce(this.t[what].replace('{name}', this.nameOf(id)))
  }

  extras() {
    return {
      app: this.app,
      PIXI,
      stage: this.world,
      layers: this.layers,
      tweens: this.tweens,
      tween: this.tweens.to.bind(this.tweens),
      W: this.W,
      H: this.H,
      audio: this.audio,
      actor: (id: string) => this.actors.get(id),
      ui: this.ui,
    }
  }

  // --- background -----------------------------------------------------------

  private async makeBackground(ref: string): Promise<Container> {
    const src = backgroundSource(ref, this.script)
    const g = gradient(src)
    if (g || isColor(src)) {
      if (!g) return new Graphics().rect(0, 0, this.W, this.H).fill(src)
      const c = document.createElement('canvas')
      c.width = 2
      c.height = 256
      const cx = c.getContext('2d')!
      const grad = cx.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0, g[0])
      grad.addColorStop(1, g[1])
      cx.fillStyle = grad
      cx.fillRect(0, 0, 2, 256)
      const s = new Sprite(Texture.from(c))
      s.width = this.W
      s.height = this.H
      return s
    }
    const url = backgroundUrl(ref, this.script)!
    let texture: Texture
    if (/\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(url)) {
      texture = await Assets.load<Texture>({ src: url, data: { autoPlay: true, loop: true, muted: true, playsinline: true } })
    } else {
      texture = await loadTexture(url)
    }
    const s = new Sprite(texture)
    // cover the stage
    const scale = Math.max(this.W / texture.width, this.H / texture.height)
    s.anchor.set(0.5)
    s.scale.set(scale)
    s.position.set(this.W / 2, this.H / 2)
    return s
  }

  async background(ref: string | null, o: { fade?: number }) {
    if (ref === this.bgRef && this.bg) return
    this.bgRef = ref
    const old = this.bg
    let next: Container | null = null
    if (ref) {
      try {
        next = await this.makeBackground(ref)
      } catch (e: any) {
        this.hooks.error(`bg ${ref}: ${e?.message || 'could not be loaded'}`)
        return
      }
    }
    if (this.destroyed || this.bgRef !== ref) {
      next?.destroy()
      return
    }
    this.bg = next
    const def = ref ? this.script.backgrounds[ref] : undefined
    if (def) this.ui.announce(def.kv.alt ?? def.id)
    if (o.fade) this.ui.hideDialog()
    if (next) {
      next.alpha = o.fade ? 0 : 1
      this.layers.bg.addChild(next)
      await this.tweens.to(next, { alpha: 1 }, o.fade || 0)
    } else if (old) {
      await this.tweens.to(old, { alpha: 0 }, o.fade || 0)
    }
    if (old && old !== this.bg) old.destroy()
  }

  // --- actors ---------------------------------------------------------------

  private async actor(id: string): Promise<Actor | null> {
    const existing = this.actors.get(id)
    if (existing) return existing
    if (!this.pending.has(id)) {
      const def = this.script.characters[id] || this.script.images[id]
      if (!def) return null
      const p = createActor(def, this.script, this.extras())
        .then((a) => {
          if (this.destroyed) {
            a.destroy()
            return null
          }
          a.view.visible = false
          a.view.alpha = 0
          this.actors.set(id, a)
          this.layers.actors.addChild(a.view)
          return a
        })
        .catch((e) => {
          this.hooks.error(`${id}: ${e?.message || 'could not be loaded'}`)
          return null
        })
      this.pending.set(id, p)
    }
    return this.pending.get(id)!
  }

  /** scale of an actor in stage units */
  private scaleOf(id: string, a: Actor, state: ActorState) {
    const def = this.script.characters[id] || this.script.images[id]
    const isChar = !!this.script.characters[id]
    const own = parseFloat(def?.kv.scale ?? '1') || 1
    let base: number
    if (def?.kv.height) base = (this.H * parseFloat(def.kv.height)) / a.height
    else if (isChar) base = (this.H * 0.78) / a.height
    else base = Math.min(1, (this.H * 0.9) / a.height)
    return base * own * (state.scale ?? 1)
  }

  private yOf(id: string, state: ActorState) {
    const def = this.script.characters[id] || this.script.images[id]
    return (state.y ?? (def?.kv.y !== undefined ? parseFloat(def.kv.y) : 1)) * this.H
  }

  private place(id: string, a: Actor, state: ActorState) {
    const s = this.scaleOf(id, a, state)
    const def = this.script.characters[id] || this.script.images[id]
    const flip = state.flip ?? yes(def?.kv.flip, false)
    a.view.position.set(state.x * this.W, this.yOf(id, state))
    a.view.scale.set(flip ? -s : s, s)
    a.setExpression(state.expr)
    a.setIdle?.(state.idle)
  }

  async show(id: string, o: { state: ActorState; fade?: number; from?: number; dur?: number }) {
    const a = await this.actor(id)
    if (!a || this.destroyed) return
    const state = o.state
    a.setExpression(state.expr)
    a.setIdle?.(state.idle)
    if (!a.view.visible || a.view.alpha === 0) {
      this.place(id, a, state)
      if (o.from !== undefined) a.view.x = o.from * this.W
      a.view.visible = true
      a.view.tint = 0xffffff
      this.layers.actors.addChild(a.view) // on top
      this.tell('appears', id)
      a.view.alpha = o.fade ? 0 : 1
      await Promise.all([
        this.tweens.to(a.view, { alpha: 1 }, o.fade || 0),
        o.from !== undefined ? this.tweens.to(a.view, { x: state.x * this.W }, o.dur ?? 0.8, 'out') : null,
      ])
    } else {
      await this.move(id, { state, dur: o.dur ?? 0.5 })
    }
  }

  async move(id: string, o: { state: ActorState; dur: number; ease?: string }) {
    const a = await this.actor(id)
    if (!a || this.destroyed) return
    const state = o.state
    const s = this.scaleOf(id, a, state)
    const def = this.script.characters[id] || this.script.images[id]
    const flip = state.flip ?? yes(def?.kv.flip, false)
    a.setExpression(state.expr)
    a.setIdle?.(state.idle)
    if (!a.view.visible) {
      this.place(id, a, state)
      return
    }
    if (Math.sign(a.view.scale.x) !== (flip ? -1 : 1)) a.view.scale.x = -a.view.scale.x
    const x = state.x * this.W
    const y = this.yOf(id, state)
    const same = (p: number, q: number) => Math.abs(p - q) < 0.5
    // only the expression changed: nothing to animate
    if (same(a.view.x, x) && same(a.view.y, y) && Math.abs(Math.abs(a.view.scale.y) - s) < 1e-4) return
    await this.tweens.to(
      a.view,
      { x, y, 'scale.x': flip ? -s : s, 'scale.y': s },
      o.dur,
      o.ease || 'inout'
    )
  }

  async hide(id: string, o: { fade?: number; to?: number; dur?: number }) {
    const a = this.actors.get(id) || (this.pending.has(id) ? await this.pending.get(id) : null)
    if (!a || !a.view.visible) return
    this.tell('disappears', id)
    await Promise.all([
      this.tweens.to(a.view, { alpha: 0 }, o.fade || (o.to !== undefined ? o.dur ?? 0.8 : 0)),
      o.to !== undefined ? this.tweens.to(a.view, { x: o.to * this.W }, o.dur ?? 0.8, 'in') : null,
    ])
    a.view.visible = false
  }

  // --- dialog ---------------------------------------------------------------

  async say(speaker: string | null, text: string, o: { expr?: string }) {
    const def = speaker ? this.script.characters[speaker] : undefined
    const name = speaker ? (def?.name ?? speaker) : null
    const actor = speaker ? this.actors.get(speaker) : undefined
    const onStage = !!actor && actor.view.visible
    if (actor && o.expr) actor.setExpression(o.expr)

    if (this.settings.dim) {
      for (const [id, a] of this.actors) a.view.tint = !onStage || id === speaker ? 0xffffff : 0xb4b4b4
    }

    let speaking = false
    let open = false
    let flap: any = null
    const mouth = (on: boolean) => {
      open = on
      if (!this.destroyed) actor?.talk(on)
    }
    const startFlap = () => {
      if (!actor || flap) return
      flap = setInterval(() => mouth(!open && Math.random() > 0.15), 95 + Math.random() * 40)
    }
    const stopFlap = () => {
      clearInterval(flap)
      flap = null
      mouth(false)
    }
    let auto: any = null
    const stopTimers = () => {
      clearInterval(flap)
      clearTimeout(auto)
      flap = null
    }
    this.timers.add(stopTimers)

    const typed = this.ui.dialog(name, def?.kv.color, text, this.settings.textspeed)
    startFlap()
    let spoken: Promise<void> = Promise.resolve()
    if (this.settings.tts && text.trim()) {
      speaking = true
      const voice = parseVoice(def?.kv.voice, def?.kv || {}, this.script.lang)
      spoken = this.speech.speak(text, voice).then(() => {
        speaking = false
      })
    }
    typed.then(() => {
      if (!speaking) stopFlap()
    })
    spoken.then(() => {
      if (!this.ui.isTyping) stopFlap()
    })

    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(auto)
        resolve()
      }
      this.advance = () => {
        // a click while reading aloud skips the rest of the line
        this.speech.cancel()
        finish()
      }
      if (this.settings.auto) {
        Promise.all([typed, spoken]).then(() => {
          if (!this.settings.auto || this.destroyed) return
          const ms = speaking ? 400 : Math.max(1200, Array.from(text).length * 45)
          auto = setTimeout(() => {
            if (this.advance) {
              this.advance = null
              finish()
            }
          }, ms)
        })
      }
    })
    this.timers.delete(stopTimers)
    stopFlap()
    this.speech.cancel()
  }

  async menu(items: MenuItem[]): Promise<number> {
    this.menuCleanup?.()
    this.ui.showNext(false)
    return new Promise((resolve) => {
      const cleanups: (() => void)[] = []
      const pick = (index: number) => {
        cleanup()
        resolve(index)
      }
      const cleanup = () => {
        this.menuCleanup = null
        cleanups.forEach((f) => f())
        this.ui.clearChoices()
      }
      this.menuCleanup = cleanup

      const buttons = items.filter((i) => !i.hotspot)
      this.ui.choices(buttons.map((i) => ({ text: i.text, pick: () => pick(i.index) })))
      const spots: Parameters<Overlay['hotspots']>[0] = items
        .filter((i) => i.hotspot?.rect)
        .map((i) => {
          const [x, y, w, h] = i.hotspot!.rect!
          // pixels or fractions
          const r: [number, number, number, number] =
            Math.max(x, y, w, h) > 1.5 ? [x / this.W, y / this.H, w / this.W, h / this.H] : [x, y, w, h]
          return { rect: r, text: i.text, pick: () => pick(i.index) }
        })
      for (const i of items.filter((i) => i.hotspot?.actor)) {
        const id = i.hotspot!.actor!
        const a = this.actors.get(id)
        if (!a) continue
        const v = a.view
        if (v.visible) {
          const b = v.getBounds()
          const rect: [number, number, number, number] = [b.x / this.W, b.y / this.H, b.width / this.W, b.height / this.H]
          spots.push({ rect, text: i.text || this.nameOf(id), pick: () => pick(i.index), actor: true })
        }
        const sx = v.scale.x
        const sy = v.scale.y
        v.eventMode = 'static'
        v.cursor = 'pointer'
        const over = () => v.scale.set(sx * 1.04, sy * 1.04)
        const out = () => v.scale.set(sx, sy)
        const tap = (e: any) => {
          e.stopPropagation?.()
          pick(i.index)
        }
        v.on('pointerover', over).on('pointerout', out).on('pointertap', tap)
        if (this.settings.hint) this.tweens.to(v, { alpha: 0.75 }, 0.3).then(() => this.tweens.to(v, { alpha: 1 }, 0.3))
        cleanups.push(() => {
          v.off('pointerover', over).off('pointerout', out).off('pointertap', tap)
          v.eventMode = 'passive'
          v.cursor = 'default'
          if (!v.destroyed) v.scale.set(sx, sy)
        })
      }
      this.ui.hotspots(spots, this.settings.hint, items.some((i) => i.hotspot))
    })
  }

  input(question: string, value: string) {
    this.ui.showNext(false)
    return this.ui.input(question, value)
  }

  async title(text: string, sub: string, dur: number) {
    this.ui.hideDialog()
    const done = this.waitAdvance()
    this.ui.title(text, sub, () => this.next())
    if (dur > 0) {
      await Promise.race([done, this.tweens.wait(dur)])
      this.advance = null
    } else await done
    this.ui.clearLayer()
  }

  async wait(seconds: number | 'click') {
    if (seconds === 'click') {
      this.ui.showNext(true)
      await this.waitAdvance()
      return
    }
    this.ui.hideDialog()
    await this.tweens.wait(seconds)
  }

  // --- effects --------------------------------------------------------------

  async effect(name: string, a: Record<string, any>) {
    const { world, tweens } = this
    // shaking and flashing can make people sick or cause seizures
    if ((name === 'shake' || name === 'flash') && calm()) return
    switch (name) {
      case 'shake': {
        const base = { x: world.position.x, y: world.position.y }
        await tweens.to({ t: 0 }, { t: 1 }, a.dur, 'linear', (t) => {
          const s = a.strength * (1 - t)
          world.position.set(base.x + (Math.random() - 0.5) * 2 * s, base.y + (Math.random() - 0.5) * 2 * s)
        })
        world.position.set(base.x, base.y)
        break
      }
      case 'flash':
        this.flashRect.clear().rect(-10, -10, this.W + 20, this.H + 20).fill(a.color)
        this.flashRect.alpha = 1
        await tweens.to(this.flashRect, { alpha: 0 }, a.dur, 'out')
        break
      case 'fade':
        this.ui.hideDialog()
        if (a.dir === 'out') {
          this.fadeRect.clear().rect(-10, -10, this.W + 20, this.H + 20).fill(a.color)
          await tweens.to(this.fadeRect, { alpha: 1 }, a.dur)
        } else await tweens.to(this.fadeRect, { alpha: 0 }, a.dur)
        break
      case 'zoom': {
        let x = this.W / 2
        let y = this.H / 2
        if (a.on && a.factor !== 1) {
          const actor = this.actors.get(a.on)
          if (actor?.view.visible) {
            const b = actor.view.getLocalBounds()
            x = actor.view.x
            y = actor.view.y + (b.y + b.height * 0.25) * Math.abs(actor.view.scale.y)
          }
        }
        // keep the zoomed view inside the stage
        const f = Math.max(1, a.factor)
        const hw = this.W / (2 * f)
        const hh = this.H / (2 * f)
        x = Math.min(this.W - hw, Math.max(hw, x))
        y = Math.min(this.H - hh, Math.max(hh, y))
        this.zoomState = { factor: a.factor, x, y }
        await tweens.to(world, { 'scale.x': a.factor, 'scale.y': a.factor, 'pivot.x': x, 'pivot.y': y }, a.dur)
        break
      }
      case 'tint':
        if (a.color) {
          const alpha = this.tintRect.alpha
          this.tintRect.clear().rect(0, 0, this.W, this.H).fill(a.color)
          this.tintRect.alpha = alpha
        }
        await tweens.to(this.tintRect, { alpha: a.color ? a.alpha : 0 }, a.dur)
        break
      case 'blur':
        this.blur.enabled = true
        await tweens.to(this.blur, { strength: a.amount }, a.dur)
        if (!a.amount) this.blur.enabled = false
        break
      case 'option':
        if (a.auto !== undefined) this.settings.auto = a.auto
        if (a.tts !== undefined) this.settings.tts = a.tts && ttsAvailable()
        this.hooks.toolbar()
        break
      default:
        console.warn('LiaPixi: unknown effect', name)
    }
  }

  sound(ref: string, o: { volume?: number }) {
    this.audio.sound(this.script.sounds[ref]?.src || ref, o.volume ?? 1)
  }

  music(ref: string | null, o: { volume?: number; fade?: number }) {
    return this.audio.music(ref, o.volume ?? 0.5, o.fade ?? 0)
  }

  async end(name: string, text: string) {
    this.speech.cancel()
    this.ui.hideDialog()
    this.ui.clearChoices()
    this.hooks.end(name, text)
  }

  /** sets the whole scene at once (start, continue, back) */
  async restore(v: Visual) {
    this.menuCleanup?.()
    this.advance = null
    this.speech.cancel()
    this.tweens.finish()
    this.ui.hideDialog()
    this.ui.clearChoices()
    this.ui.clearLayer()
    this.fadeRect.alpha = 0
    this.flashRect.alpha = 0

    await this.background(v.bg, { fade: 0 })
    await Promise.all(Object.keys(v.actors).map((id) => this.actor(id)))
    for (const [id, a] of this.actors) {
      const state = v.actors[id]
      if (!state !== !a.view.visible) this.tell(state ? 'appears' : 'disappears', id)
      if (!state) {
        a.view.visible = false
        a.view.alpha = 0
        continue
      }
      this.place(id, a, state)
      a.view.visible = true
      a.view.alpha = 1
      a.view.tint = 0xffffff
    }
    if (v.tint) {
      this.tintRect.clear().rect(0, 0, this.W, this.H).fill(v.tint.color)
      this.tintRect.alpha = v.tint.alpha
    } else this.tintRect.alpha = 0
    this.blur.strength = v.blur || 0
    this.blur.enabled = !!v.blur
    this.zoomState = { factor: v.zoom || 1, x: this.W / 2, y: this.H / 2 }
    this.world.scale.set(v.zoom || 1)
    this.world.pivot.set(this.W / 2, this.H / 2)
    if (v.line) {
      const def = v.line.speaker ? this.script.characters[v.line.speaker] : undefined
      this.ui.dialog(v.line.speaker ? (def?.name ?? v.line.speaker) : null, def?.kv.color, v.line.text, 0)
      this.ui.showNext(false)
    }
    const music = v.music
    await this.audio.music(music ? music.ref : null, music?.volume ?? 0.5, 0)
  }

  /** loads all images of the story in the background, so scenes change without delay */
  preload() {
    const urls = new Set<string>()
    for (const id of Object.keys(this.script.backgrounds)) {
      const u = backgroundUrl(id, this.script)
      if (u && !u.startsWith('data:') && !/\.(mp4|webm|ogv|mov)/i.test(u)) urls.add(u)
    }
    urls.forEach((u) => loadTexture(u).catch(() => {}))
    for (const id of Object.keys(this.script.characters)) this.actor(id)
    for (const id of Object.keys(this.script.images)) this.actor(id)
  }
}
