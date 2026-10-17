/**
 * <lia-pixi-story> – one stage with one story. The element builds itself
 * when LiaScript inserts it and destroys PixiJS (and its WebGL context) when
 * the slide is left, because LiaScript removes the DOM of hidden slides.
 */
import { parse } from './dsl/parser'
import { Story } from './runtime/story'
import { on, onChange } from './runtime/registry'
import { Stage } from './stage'
import { Overlay, injectStyle } from './ui'
import { forStory, lineText, watch } from './i18n'
import { available as ttsAvailable } from './tts'
import * as persist from './persist'
import type { ParseError, Script, Snapshot } from './runtime/types'

export const stories = new Map<string, LiaPixiStory>()

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** line and column of an error in code that was run with new Function */
export function location(e: any, offset = 2) {
  const stack = String(e?.stack || '')
  const m = stack.match(/(?:<anonymous>|Function|eval):(\d+):(\d+)/)
  if (m) return { line: Math.max(1, Number(m[1]) - offset), column: Math.max(0, Number(m[2]) - 1) }
  if (e?.lineNumber) return { line: Math.max(1, e.lineNumber - offset), column: e.columnNumber || 0 }
  return null
}

export class LiaPixiStory extends HTMLElement {
  source = ''
  mode: 'story' | 'js' = 'story'
  script: Script | null = null
  errors: ParseError[] = []
  story: Story | null = null
  stage: Stage | null = null
  private wrapper: HTMLDivElement | null = null
  private built = false
  private observers: (ResizeObserver | IntersectionObserver)[] = []
  private off: (() => void)[] = []
  private endingNames: string[] = []

  connectedCallback() {
    if (this.built) return
    this.built = true
    injectStyle()
    if (!this.source) {
      const raw = this.getAttribute('data-src') || ''
      try {
        this.source = decodeURIComponent(raw)
      } catch (e) {
        this.source = raw
      }
      this.mode = this.getAttribute('data-mode') === 'js' ? 'js' : 'story'
    }
    this.build()
  }

  disconnectedCallback() {
    // LiaScript sometimes moves elements while rendering; only clean up if it is really gone
    setTimeout(() => {
      if (!this.isConnected) this.teardown()
    }, 0)
  }

  /** builds (or rebuilds) the stage */
  private async build() {
    this.teardown(false)
    const wrapper = document.createElement('div')
    wrapper.className = 'lia-pixi'
    wrapper.tabIndex = 0
    this.wrapper = wrapper
    this.replaceChildren(wrapper)

    if (this.mode === 'js') return this.buildJS(wrapper)

    const { script, errors } = parse(this.source)
    this.script = script
    this.errors = errors
    wrapper.style.setProperty('--lp-ratio', `${script.stage.width} / ${script.stage.height}`)
    wrapper.setAttribute('role', 'application')
    wrapper.setAttribute('aria-label', script.title || 'Story')

    if (errors.length) {
      const lang = forStory(script.options, script.lang)
      wrapper.setAttribute('dir', lang.dir)
      const ui = new Overlay(wrapper, lang.t, noActions)
      ui.errors(errors)
      // an extension that is loaded later can fix unknown commands
      this.off.push(onChange(() => this.isConnected && this.build()))
      this.off.push(watch(() => this.isConnected && this.build()))
      return
    }

    const stage = new Stage(script, wrapper, {
      toolbar: () => this.toolbar(),
      error: (msg) => {
        console.warn('LiaPixi:', msg)
        stage.ui?.toast(msg)
      },
      end: (name, text) => this.showEnd(name, text),
    })
    this.stage = stage
    stage.ui = new Overlay(wrapper, stage.t, {
      back: () => this.back(),
      restart: () => this.restart(),
      sound: () => {
        stage.settings.sound = !stage.settings.sound
        stage.audio.setMuted(!stage.settings.sound)
        this.toolbar()
      },
      voice: () => {
        stage.settings.tts = !stage.settings.tts
        if (!stage.settings.tts) stage.speech.cancel()
        this.toolbar()
      },
      auto: () => {
        stage.settings.auto = !stage.settings.auto
        this.toolbar()
        if (stage.settings.auto) stage.next()
      },
      fullscreen: () => this.fullscreen(),
    })
    stage.ui.setLanguage(stage.t, stage.dir)
    stage.ui.loading(true)
    // the course can be translated later: change the texts of the stage too
    this.off.push(
      watch(() => {
        if (this.stage === stage && stage.relabel()) this.relabel()
      })
    )

    await stage.init()
    if (!this.wrapper || this.stage !== stage) return
    stage.ui.loading(false)
    this.observe(wrapper, stage)
    this.listen(wrapper, stage)

    this.endingNames = [...new Set(script.nodes.filter((n) => n.cmd === 'end').map((n) => n.args.name || 'end'))]

    const saved = persist.load(script.id)
    const version = hash(this.source)
    const snapshot = saved && saved.version === version ? saved.snapshot : null
    const story = new Story(script, stage, {
      endings: saved?.endings,
      save: (snap) => persist.store(script.id, { snapshot: snap, endings: [...story.endings], version, time: Date.now() }),
    })
    this.story = story
    const previous = stories.get(script.id)
    stories.set(script.id, this)
    if (previous && previous !== this && !previous.isConnected) previous.teardown()

    this.off.push(
      on('error', (s, data) => {
        if (s === story) stage.ui.toast(`${lineText(stage.t, data.line)}: ${data.message}`)
      })
    )

    stage.preload()
    this.startScreen(snapshot)
  }

  /** the start or end screen that is shown, to draw it again in another language */
  private screen: (() => void) | null = null

  private relabel() {
    this.toolbar()
    this.screen?.()
  }

  private startScreen(snapshot: Snapshot | null, preview = true) {
    const stage = this.stage!
    const script = this.script!
    this.screen = () => this.startScreen(snapshot, false)
    // a preview of the scene behind the start screen
    if (preview) {
      if (snapshot && !snapshot.ended) stage.restore(snapshot.visual)
      else {
        const first = script.nodes.find((n) => n.cmd === 'bg')
        if (first) stage.background(first.args.ref, { fade: 0 })
      }
    }
    const buttons: { label: string; primary?: boolean; action: () => void }[] = []
    const begin = (fn: () => void) => () => {
      this.screen = null
      stage.audio.unlock()
      stage.ui.clearLayer()
      this.toolbar()
      this.wrapper?.focus({ preventScroll: true })
      fn()
    }
    if (snapshot && !snapshot.ended) {
      buttons.push({ label: '⏵ ' + stage.t.continue, primary: true, action: begin(() => this.story!.resume(snapshot)) })
      buttons.push({ label: '↺ ' + stage.t.restart, action: begin(() => this.story!.start()) })
    } else {
      buttons.push({ label: '▶ ' + stage.t.start, primary: true, action: begin(() => this.story!.start()) })
    }
    stage.ui.screen(script.title, '', buttons)
  }

  private showEnd(name: string, text: string) {
    const stage = this.stage!
    const story = this.story!
    this.screen = () => this.showEnd(name, text)
    stage.ui.toolbar(null)
    const title = name && name !== 'end' && this.endingNames.length > 1 ? `${stage.t.end}: ${name}` : stage.t.end
    let info = text
    if (this.endingNames.length > 1) {
      const found = this.endingNames.filter((n) => story.endings.has(n)).length
      info += (info ? '\n' : '') + `${stage.t.endings}: ${found} / ${this.endingNames.length}`
    }
    stage.ui.announce(info ? `${title}. ${info}` : title)
    const buttons = [{ label: '↺ ' + stage.t.restart, primary: true, action: () => this.restart() }]
    const arrow = stage.dir === 'rtl' ? '↷ ' : '↶ '
    if (story.canGoBack()) buttons.push({ label: arrow + stage.t.back, primary: false, action: () => this.back() })
    stage.ui.screen(title, info, buttons)
  }

  private toolbar() {
    const s = this.stage
    if (!s || this.screen) return
    s.ui.toolbar({
      back: !!this.story?.canGoBack(),
      sound: s.settings.sound,
      voice: s.settings.tts,
      auto: s.settings.auto,
      voiceAvailable: ttsAvailable(),
    })
  }

  back() {
    if (!this.story?.canGoBack()) return false
    this.screen = null
    this.stage?.ui.clearLayer()
    this.story.back().then(() => this.toolbar())
    this.toolbar()
    return true
  }

  restart() {
    if (!this.story || !this.stage) return
    this.screen = null
    this.stage.audio.unlock()
    this.stage.ui.clearLayer()
    this.toolbar()
    this.story.start()
    this.wrapper?.focus({ preventScroll: true })
  }

  fullscreen() {
    const w = this.wrapper
    if (!w) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else if (w.classList.contains('lp-fake-fullscreen')) {
      w.classList.remove('lp-fake-fullscreen')
    } else if (w.requestFullscreen) {
      w.requestFullscreen().catch(() => w.classList.add('lp-fake-fullscreen'))
    } else {
      // iPhone Safari has no element fullscreen
      w.classList.add('lp-fake-fullscreen')
    }
  }

  private observe(wrapper: HTMLElement, stage: Stage) {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) stage.resize(e.contentRect.width)
    })
    ro.observe(wrapper)
    // pause everything while the stage cannot be seen
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? stage.resume() : stage.pause()
    })
    io.observe(wrapper)
    this.observers.push(ro, io)
    stage.resize(wrapper.clientWidth)
  }

  private listen(wrapper: HTMLElement, stage: Stage) {
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, input, a, form, .lp-errors')
    wrapper.addEventListener('click', (e) => {
      if (interactive(e.target)) return
      stage.next()
      this.toolbar()
    })
    // LiaScript changes slides on swipes – not inside the story
    for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'wheel']) {
      wrapper.addEventListener(type, (e) => e.stopPropagation(), { passive: true })
    }
    wrapper.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return
      let handled = true
      // in right-to-left languages the story goes on to the left
      let key = e.key
      if (stage.dir === 'rtl' && (key === 'ArrowLeft' || key === 'ArrowRight')) key = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'
      switch (key) {
        case ' ':
        case 'Enter':
        case 'ArrowRight':
        case 'ArrowDown':
          // on the start and end screen the keys still belong to the course (next slide …)
          if (this.screen || (interactive(e.target) && (key === ' ' || key === 'Enter'))) {
            handled = false
            break
          }
          stage.next()
          this.toolbar()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'Backspace':
          // nothing to go back to: LiaScript gets the key and can go to the previous slide
          handled = this.back()
          break
        case 'f':
          this.fullscreen()
          break
        case 'Escape':
          // leaves the fake fullscreen, or else the stage, so the keys belong to the course again
          if (this.wrapper?.classList.contains('lp-fake-fullscreen')) this.wrapper.classList.remove('lp-fake-fullscreen')
          else (document.activeElement as HTMLElement | null)?.blur()
          break
        default:
          if (/^[1-9]$/.test(e.key)) handled = stage.ui.pickChoice(Number(e.key) - 1)
          else handled = false
      }
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    })
  }

  /** developer mode: a PixiJS app and the code of the code block */
  private async buildJS(wrapper: HTMLDivElement) {
    const ratio = /^(\d+(?:\.\d+)?)[:/x](\d+(?:\.\d+)?)$/.exec(this.getAttribute('data-ratio') || '16:9')
    const width = parseFloat(this.getAttribute('data-width') || '1600')
    const height = ratio ? Math.round((width * parseFloat(ratio[2])) / parseFloat(ratio[1])) : Math.round((width * 9) / 16)
    const { script } = parse(`stage ${width}:${height} width=${width} #1d2433`)
    script.stage.width = width
    script.stage.height = height
    this.script = script
    wrapper.style.setProperty('--lp-ratio', `${width} / ${height}`)
    const stage = new Stage(script, wrapper, {
      toolbar: () => {},
      error: (msg) => stage.ui?.toast(msg),
      end: () => {},
    })
    this.stage = stage
    stage.ui = new Overlay(wrapper, stage.t, noActions)
    await stage.init()
    if (this.stage !== stage) return
    this.observe(wrapper, stage)
    wrapper.addEventListener('keydown', (e) => e.stopPropagation())
    for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown']) {
      wrapper.addEventListener(type, (e) => e.stopPropagation(), { passive: true })
    }
    const x = stage.extras()
    const LiaPixi = (window as any).LiaPixi
    const names = ['PIXI', 'app', 'stage', 'W', 'H', 'tween', 'tweens', 'wait', 'sound', 'onFrame', 'LiaPixi']
    const values = [
      x.PIXI,
      x.app,
      x.stage,
      x.W,
      x.H,
      x.tween,
      x.tweens,
      (s: number) => x.tweens.wait(s),
      (ref: string, volume?: number) => stage.audio.sound(ref, volume),
      (fn: (ms: number) => void) => x.app.ticker.add((t: any) => fn(t.deltaMS)),
      LiaPixi,
    ]
    stage.audio.unlock()
    try {
      await new AsyncFunction(...names, this.source)(...values)
      this.dispatchEvent(new CustomEvent('lia-pixi-done'))
    } catch (e: any) {
      const loc = location(e)
      const msg = (loc ? `line ${loc.line}: ` : '') + (e?.message || e)
      stage.ui.toast(msg)
      console.error('LiaPixi:', msg)
      this.dispatchEvent(new CustomEvent('lia-pixi-done', { detail: { error: msg, line: loc?.line } }))
    }
  }

  teardown(all = true) {
    this.observers.forEach((o) => o.disconnect())
    this.observers = []
    this.off.forEach((f) => f())
    this.off = []
    this.story?.stop()
    this.stage?.destroy()
    if (this.script && stories.get(this.script.id) === this) stories.delete(this.script.id)
    this.story = null
    this.stage = null
    this.wrapper = null
    if (all) this.built = false
  }

  /** the state of the story for quizzes */
  state() {
    return this.story?.state() ?? null
  }
}

const noActions = { back() {}, restart() {}, sound() {}, voice() {}, auto() {}, fullscreen() {} }

export function define() {
  if (!customElements.get('lia-pixi-story')) customElements.define('lia-pixi-story', LiaPixiStory)
}

