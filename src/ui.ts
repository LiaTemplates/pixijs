/**
 * The HTML layer above the canvas: dialog box, choices, hotspots, titles,
 * input, start/end screens and the toolbar. HTML keeps text sharp, readable
 * by screen readers and styled by the course.
 */

import { lineText, type Labels } from './i18n'

const CSS = `
.lia-pixi{position:relative;width:100%;max-width:calc(85vh * var(--lp-ratio));margin:0.5rem auto;aspect-ratio:var(--lp-ratio);
  container-type:inline-size;overflow:hidden;border-radius:var(--lp-radius,0.6rem);background:var(--lp-bg,#1d2433);
  user-select:none;-webkit-user-select:none;touch-action:manipulation;outline:none;font-family:inherit;line-height:1.35}
.lia-pixi:focus-visible{box-shadow:0 0 0 3px rgb(var(--color-highlight,11,95,255))}
.lia-pixi canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}
.lia-pixi:fullscreen{max-width:none;width:min(100vw,calc(100vh * var(--lp-ratio)));height:auto;margin:auto;border-radius:0}
.lia-pixi::backdrop{background:#000}
.lia-pixi.lp-fake-fullscreen{position:fixed;inset:0;z-index:10000;max-width:none;width:100vw;height:100dvh;aspect-ratio:auto;margin:0;border-radius:0}
.lp-ui{position:absolute;inset:0;pointer-events:none;font-size:clamp(11px,2.2cqw,40px);color:#fff}
.lp-ui button{font:inherit;cursor:pointer}
.lp-dialog{position:absolute;left:3%;right:3%;bottom:3.5%;min-height:22%;padding:1.1em 1.4em 1em;box-sizing:border-box;
  background:rgba(14,18,30,.82);border:2px solid rgba(255,255,255,.18);border-radius:.7em;pointer-events:auto;cursor:pointer;
  backdrop-filter:blur(3px);box-shadow:0 .4em 1.2em rgba(0,0,0,.35);white-space:pre-line}
.lp-text,.lp-choices button,.lp-title,.lp-screen,.lp-input label{unicode-bidi:plaintext}
.lp-dialog.lp-narration{font-style:italic;background:rgba(14,18,30,.7)}
.lp-name{position:absolute;top:0;inset-inline-start:1.2em;transform:translateY(-60%);padding:.15em .8em;border-radius:.45em;font-weight:700;
  background:var(--lp-name,#3d7be0);color:#fff;box-shadow:0 .15em .4em rgba(0,0,0,.35);text-shadow:0 1px 2px rgba(0,0,0,.4)}
.lp-next{position:absolute;inset-inline-end:.8em;bottom:.4em;opacity:.8;animation:lp-bounce 1s infinite}
@keyframes lp-bounce{50%{transform:translateY(.2em)}}
.lp-choices{position:absolute;inset:0 0 28% 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5em;pointer-events:none}
.lp-choices.lp-aside{inset:auto;inset-block-start:12%;inset-inline-end:2%;align-items:flex-end;justify-content:flex-start}
.lp-choices.lp-aside button{min-width:0;font-size:.8em;padding:.4em .9em;white-space:nowrap}
.lp-choices button{pointer-events:auto;min-width:45%;max-width:80%;padding:.55em 1.2em;border-radius:.6em;border:2px solid rgba(255,255,255,.35);
  background:rgba(30,40,70,.88);color:#fff;text-align:center;box-shadow:0 .25em .7em rgba(0,0,0,.35);transition:transform .12s,background .12s}
.lp-choices button:hover,.lp-choices button:focus-visible{background:rgba(61,123,224,.95);transform:scale(1.03);outline:none}
.lp-choices button .lp-key{opacity:.6;margin-inline-end:.6em;font-size:.8em}
.lp-hotspot{position:absolute;pointer-events:auto;border:2px dashed transparent;border-radius:.5em;background:transparent;padding:0}
.lp-hotspot:hover,.lp-hotspot:focus-visible{border-color:rgba(255,255,255,.8);background:rgba(255,255,255,.12);outline:none}
.lp-hint .lp-hotspot:not(.lp-actor){animation:lp-pulse 1.6s infinite}
.lp-hotspot.lp-actor{pointer-events:none}
@keyframes lp-pulse{50%{border-color:rgba(255,255,255,.7);background:rgba(255,255,255,.08)}}
.lp-tip{position:absolute;left:50%;bottom:-0.2em;transform:translate(-50%,100%);white-space:nowrap;font-size:.75em;padding:.1em .5em;
  border-radius:.3em;background:rgba(0,0,0,.7);color:#fff;opacity:0;transition:opacity .15s;pointer-events:none}
.lp-hotspot:hover .lp-tip,.lp-hotspot:focus-visible .lp-tip{opacity:1}
.lp-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:rgba(0,0,0,.55);pointer-events:auto;cursor:pointer;animation:lp-in .5s}
.lp-title h2{margin:0;font-size:2.2em;line-height:1.1;text-shadow:0 .1em .4em rgba(0,0,0,.6);color:#fff;border:none}
.lp-title p{margin:.4em 0 0;font-size:1.1em;opacity:.85}
@keyframes lp-in{from{opacity:0}}
.lp-input{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);pointer-events:auto}
.lp-input form{display:flex;flex-direction:column;gap:.6em;padding:1em 1.4em;border-radius:.7em;background:rgba(14,18,30,.92);min-width:50%}
.lp-input input{font:inherit;padding:.35em .6em;border-radius:.4em;border:2px solid rgba(255,255,255,.4);background:#fff;color:#111}
.lp-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6em;text-align:center;
  background:radial-gradient(ellipse at center,rgba(0,0,0,.35),rgba(0,0,0,.75));pointer-events:auto;animation:lp-in .4s}
.lp-screen h2{margin:0 0 .2em;font-size:2em;color:#fff;border:none;text-shadow:0 .1em .4em rgba(0,0,0,.6)}
.lp-screen p{margin:0 0 .4em;opacity:.9;white-space:pre-line;max-width:85%}
.lp-screen .lp-buttons{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}
.lp-btn{padding:.5em 1.3em;border-radius:2em;border:2px solid rgba(255,255,255,.5);background:rgba(255,255,255,.12);color:#fff}
.lp-btn.lp-primary{background:#3d7be0;border-color:#3d7be0;font-weight:700;font-size:1.15em}
.lp-btn:hover,.lp-btn:focus-visible{filter:brightness(1.15);outline:2px solid #fff;outline-offset:2px}
.lp-toolbar{position:absolute;top:2%;inset-inline-end:1.5%;display:flex;gap:.3em;pointer-events:auto;opacity:.35;transition:opacity .2s}
.lia-pixi:hover .lp-toolbar,.lp-toolbar:focus-within{opacity:1}
.lp-toolbar button{display:flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;min-width:26px;min-height:26px;padding:0;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;line-height:1}
.lp-toolbar button[aria-pressed=false]{opacity:.5}
.lp-toolbar button[aria-pressed=true]{background:rgba(61,123,224,.85)}
.lp-toolbar button:disabled{opacity:.3;cursor:default}
.lia-pixi[dir=rtl] .lp-mirror svg{transform:scaleX(-1)}
.lp-toast{position:absolute;left:50%;top:3%;transform:translateX(-50%);max-width:80%;padding:.3em .8em;border-radius:.4em;
  background:rgba(200,40,40,.92);color:#fff;font-size:.75em;pointer-events:auto;animation:lp-in .3s}
.lp-errors{position:absolute;inset:0;overflow:auto;padding:1em 1.4em;background:#2a1215;color:#ffd7d7;font-family:monospace;font-size:.7em;pointer-events:auto;white-space:pre-wrap}
.lp-errors b{color:#fff}
.lp-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.7}
.lp-hidden{display:none!important}
.lp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.lia-pixi *{animation:none!important;transition:none!important}}
`

export function injectStyle() {
  if (document.getElementById('lia-pixi-style')) return
  const style = document.createElement('style')
  style.id = 'lia-pixi-style'
  style.textContent = CSS
  document.head.appendChild(style)
}

const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`

const ICONS: Record<string, string> = {
  back: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  restart: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  sound: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>'),
  mute: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>'),
  voice: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/>'),
  auto: svg('<path d="m6 4 8 8-8 8z"/><path d="M17 5v14"/>'),
  fullscreen: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'),
}

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}

let uid = 0

export type ToolbarState = { back: boolean; sound: boolean; voice: boolean; auto: boolean; voiceAvailable: boolean }

export class Overlay {
  readonly root = el('div', 'lp-ui')
  private dialogEl = el('div', 'lp-dialog lp-hidden')
  private nameEl = el('div', 'lp-name')
  private textEl = el('div', 'lp-text')
  private nextEl = el('div', 'lp-next', '▼')
  private choicesEl = el('div', 'lp-choices lp-hidden')
  private hotspotsEl = el('div', 'lp-hotspots')
  private layer = el('div', 'lp-layer')
  private toolbarEl = el('div', 'lp-toolbar')
  /** what screen readers hear: lines and scene changes, also a transcript to read again */
  private logEl = el('div', 'lp-sr')
  private keysEl = el('div', 'lp-sr')
  private typing: any = null
  private typingDone: (() => void) | null = null
  private full = ''

  constructor(
    readonly host: HTMLElement,
    public t: Labels,
    readonly actions: {
      back: () => void
      restart: () => void
      sound: () => void
      voice: () => void
      auto: () => void
      fullscreen: () => void
    }
  ) {
    // the typewriter would be read letter by letter, the log gets the whole line instead
    this.dialogEl.setAttribute('aria-hidden', 'true')
    this.dialogEl.append(this.nameEl, this.textEl, this.nextEl)
    this.logEl.setAttribute('role', 'log')
    this.keysEl.id = `lp-keys-${++uid}`
    this.root.append(this.logEl, this.keysEl, this.dialogEl, this.hotspotsEl, this.choicesEl, this.layer, this.toolbarEl)
    host.appendChild(this.root)
  }

  /** new texts and writing direction (the language of the course changed) */
  setLanguage(t: Labels, dir: 'ltr' | 'rtl') {
    this.t = t
    this.host.setAttribute('dir', dir)
    this.keysEl.textContent = t.keys
    this.host.setAttribute('aria-describedby', this.keysEl.id)
  }

  /** tells screen readers what happens (not behind the start and end screen) */
  announce(text: string) {
    if (!text.trim() || this.layer.querySelector('.lp-screen')) return
    this.logEl.append(el('p', '', text))
    while (this.logEl.childElementCount > 30) this.logEl.firstElementChild!.remove()
  }

  /** moves the focus only if the reader is already in the stage, never away from the page */
  private focus(e: HTMLElement | null) {
    if (e && this.host.contains(document.activeElement)) e.focus({ preventScroll: true })
  }

  /** a focused element that is removed hands the focus back to the stage, so the keys keep working */
  private replace(box: HTMLElement, ...nodes: Node[]) {
    const had = box.contains(document.activeElement)
    box.replaceChildren(...nodes)
    if (had) this.host.focus({ preventScroll: true })
  }

  // --- dialog ---------------------------------------------------------------

  /** shows a line, types it letter by letter; resolves when the text is complete */
  dialog(name: string | null, color: string | undefined, text: string, speed: number): Promise<void> {
    this.stopTyping()
    this.announce(name ? `${name}: ${text}` : text)
    this.dialogEl.classList.remove('lp-hidden')
    this.dialogEl.classList.toggle('lp-narration', !name)
    this.nameEl.classList.toggle('lp-hidden', !name)
    this.nameEl.textContent = name || ''
    this.dialogEl.style.setProperty('--lp-name', color || '#3d7be0')
    this.nextEl.classList.add('lp-hidden')
    this.full = text
    const chars = Array.from(text)
    if (!speed || speed <= 0 || chars.length < 2) {
      this.textEl.textContent = text
      this.nextEl.classList.remove('lp-hidden')
      return Promise.resolve()
    }
    let i = 0
    this.textEl.textContent = ''
    return new Promise((resolve) => {
      this.typingDone = () => {
        this.typingDone = null
        this.nextEl.classList.remove('lp-hidden')
        resolve()
      }
      this.typing = setInterval(() => {
        i += 1
        this.textEl.textContent = chars.slice(0, i).join('')
        if (i >= chars.length) this.completeTyping()
      }, 1000 / speed)
    })
  }

  get isTyping() {
    return this.typing !== null
  }

  /** shows the whole text at once */
  completeTyping() {
    if (this.typing === null) return
    clearInterval(this.typing)
    this.typing = null
    this.textEl.textContent = this.full
    this.typingDone?.()
  }

  private stopTyping() {
    if (this.typing !== null) clearInterval(this.typing)
    this.typing = null
    this.typingDone?.()
  }

  showNext(show: boolean) {
    this.nextEl.classList.toggle('lp-hidden', !show)
  }

  hideDialog() {
    this.stopTyping()
    this.dialogEl.classList.add('lp-hidden')
  }

  // --- choices --------------------------------------------------------------

  choices(items: { text: string; pick: () => void }[]) {
    this.replace(this.choicesEl)
    items.forEach((item, i) => {
      const b = el('button') as HTMLButtonElement
      b.type = 'button'
      if (items.length > 1 && i < 9) {
        const key = el('span', 'lp-key', String(i + 1))
        key.setAttribute('aria-hidden', 'true')
        b.setAttribute('aria-keyshortcuts', String(i + 1))
        b.append(key)
      }
      b.append(document.createTextNode(item.text))
      b.onclick = (e) => {
        e.stopPropagation()
        item.pick()
      }
      this.choicesEl.appendChild(b)
    })
    this.choicesEl.classList.toggle('lp-hidden', !items.length)
    this.focus(this.choicesEl.querySelector('button'))
  }

  /** hotspots on the stage; buttons that belong to the same menu move aside, so the scene stays visible */
  hotspots(
    items: { rect: [number, number, number, number]; text: string; pick: () => void; actor?: boolean }[],
    hint: boolean,
    aside = items.length > 0
  ) {
    this.choicesEl.classList.toggle('lp-aside', aside)
    this.replace(this.hotspotsEl)
    this.hotspotsEl.classList.toggle('lp-hint', hint)
    for (const item of items) {
      const [x, y, w, h] = item.rect
      // on actors the mouse goes through to PixiJS, the button is there for keys and screen readers
      const b = el('button', item.actor ? 'lp-hotspot lp-actor' : 'lp-hotspot') as HTMLButtonElement
      b.type = 'button'
      Object.assign(b.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` })
      if (item.text) {
        b.setAttribute('aria-label', item.text)
        b.append(el('span', 'lp-tip', item.text))
      }
      b.onclick = (e) => {
        e.stopPropagation()
        item.pick()
      }
      this.hotspotsEl.appendChild(b)
    }
    if (!this.choicesEl.childElementCount) this.focus(this.hotspotsEl.querySelector('button'))
  }

  clearChoices() {
    this.replace(this.choicesEl)
    this.choicesEl.classList.add('lp-hidden')
    this.replace(this.hotspotsEl)
  }

  /** picks the n-th visible choice (keyboard 1–9) */
  pickChoice(n: number) {
    const b = this.choicesEl.querySelectorAll('button')[n] as HTMLButtonElement | undefined
    b?.click()
    return !!b
  }

  get hasChoices() {
    return this.choicesEl.childElementCount > 0 || this.hotspotsEl.childElementCount > 0
  }

  // --- layers: title, input, screens ----------------------------------------

  clearLayer() {
    this.replace(this.layer)
  }

  title(text: string, sub: string, onClick: () => void) {
    const box = el('div', 'lp-title')
    box.append(el('h2', '', text))
    if (sub) box.append(el('p', '', sub))
    this.announce(sub ? `${text}. ${sub}` : text)
    box.onclick = (e) => {
      e.stopPropagation()
      onClick()
    }
    this.replace(this.layer, box)
  }

  input(question: string, value: string): Promise<string> {
    return new Promise((resolve) => {
      const box = el('div', 'lp-input')
      const form = el('form') as HTMLFormElement
      const label = el('label', '', question)
      const input = el('input') as HTMLInputElement
      input.value = value
      input.setAttribute('aria-label', question)
      const ok = el('button', 'lp-btn lp-primary', this.t.ok) as HTMLButtonElement
      ok.type = 'submit'
      form.append(label, input, ok)
      form.onsubmit = (e) => {
        e.preventDefault()
        this.clearLayer()
        resolve(input.value)
      }
      box.onclick = (e) => e.stopPropagation()
      input.onkeydown = (e) => e.stopPropagation()
      box.append(form)
      this.replace(this.layer, box)
      setTimeout(() => this.focus(input), 50)
    })
  }

  screen(title: string, text: string, buttons: { label: string; primary?: boolean; action: () => void }[]) {
    const box = el('div', 'lp-screen')
    if (title) box.append(el('h2', '', title))
    if (text) box.append(el('p', '', text))
    const row = el('div', 'lp-buttons')
    for (const b of buttons) {
      const btn = el('button', 'lp-btn' + (b.primary ? ' lp-primary' : ''), b.label) as HTMLButtonElement
      btn.type = 'button'
      btn.onclick = (e) => {
        e.stopPropagation()
        b.action()
      }
      row.append(btn)
    }
    box.append(row)
    box.onclick = (e) => e.stopPropagation()
    this.replace(this.layer, box)
    this.focus(row.querySelector('.lp-primary'))
  }

  loading(show: boolean) {
    if (show) this.replace(this.layer, el('div', 'lp-loading', this.t.loading))
    else if (this.layer.querySelector('.lp-loading')) this.clearLayer()
  }

  errors(list: { line: number; message: string }[]) {
    const box = el('div', 'lp-errors')
    box.append(el('b', '', this.t.errors + '\n\n'))
    for (const e of list) box.append(document.createTextNode(`${lineText(this.t, e.line)}: ${e.message}\n`))
    this.replace(this.layer, box)
  }

  toast(message: string) {
    const t = el('div', 'lp-toast', message)
    t.onclick = (e) => {
      e.stopPropagation()
      t.remove()
    }
    this.root.appendChild(t)
    setTimeout(() => t.remove(), 6000)
  }

  // --- toolbar --------------------------------------------------------------

  toolbar(state: ToolbarState | null) {
    // the toolbar is built again on every change: the focused button keeps the focus
    const focused = Array.prototype.indexOf.call(this.toolbarEl.children, document.activeElement)
    this.replace(this.toolbarEl)
    if (!state) return
    const button = (icon: string, label: string, action: () => void, pressed?: boolean, disabled = false) => {
      const b = el('button') as HTMLButtonElement
      b.innerHTML = ICONS[icon]
      // arrows point the other way in right-to-left languages
      if (icon === 'back' || icon === 'auto' || icon === 'restart') b.classList.add('lp-mirror')
      b.type = 'button'
      b.title = label
      b.setAttribute('aria-label', label)
      if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed))
      b.disabled = disabled
      b.onclick = (e) => {
        e.stopPropagation()
        action()
      }
      this.toolbarEl.append(b)
    }
    const a = this.actions
    button('back', this.t.back, a.back, undefined, !state.back)
    button('restart', this.t.restart, a.restart)
    button(state.sound ? 'sound' : 'mute', this.t.sound, a.sound, state.sound)
    if (state.voiceAvailable) button('voice', this.t.voice, a.voice, state.voice)
    button('auto', this.t.auto, a.auto, state.auto)
    button('fullscreen', this.t.fullscreen, a.fullscreen)
    if (focused >= 0) (this.toolbarEl.children[focused] as HTMLElement | undefined)?.focus({ preventScroll: true })
  }

  destroy() {
    this.stopTyping()
    this.root.remove()
  }
}
