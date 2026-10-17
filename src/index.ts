/**
 * LiaPixi – interactive picture stories for LiaScript, rendered with PixiJS.
 * The macros in README.md call the functions of window.LiaPixi.
 */
import * as PIXI from 'pixi.js'
import { parse } from './dsl/parser'
import { evaluate } from './runtime/expr'
import { defineCommand, defineActor, defineCharacter, on, commands } from './runtime/registry'
import { define, stories, location, LiaPixiStory } from './element'
import { BACKGROUNDS } from './base/backgrounds'
import { FIGURES, EXPRESSIONS } from './base/figures'
import { SOUNDS } from './audio'
import * as persist from './persist'
import { translate, translations } from './i18n'
import type { ParseError } from './runtime/types'

const VERSION = '0.4.0'

type Send = { lia: (...args: any[]) => void } | undefined

/** waits until the container of a macro is in the DOM, then mounts a story element into it */
function mount(id: string, source: string, mode: 'story' | 'js', send: Send, attrs: Record<string, string> = {}) {
  const make = (box: HTMLElement) => {
    const el = document.createElement('lia-pixi-story') as LiaPixiStory
    el.source = source
    el.mode = mode
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    box.replaceChildren(el)
    return el
  }
  const box = document.getElementById(id)
  if (box) {
    make(box)
    return 'LIA: stop'
  }
  let tries = 0
  const retry = () => {
    const box = document.getElementById(id)
    if (box) {
      make(box)
      send?.lia('LIA: stop')
    } else if (tries++ < 100) setTimeout(retry, 50)
    else send?.lia('LIA: stop')
  }
  setTimeout(retry, 0)
  return 'LIA: wait'
}

/** an error that the macros turn into a LiaError with editor annotations */
class StoryError extends Error {
  constructor(readonly liaErrors: ParseError[]) {
    super(liaErrors.map((e) => `line ${e.line}: ${e.message}`).join('\n'))
  }
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

const LiaPixi = {
  version: VERSION,
  PIXI,

  /** a fixed story (macro @Pixi.story): errors are shown inside the stage */
  story(id: string, source: string, send?: Send) {
    return mount(id, source, 'story', send)
  },

  /** an editable story (macro @Pixi.run): errors are thrown for the editor */
  run(id: string, source: string, send?: Send) {
    const { errors } = parse(source)
    if (errors.length) throw new StoryError(errors)
    return mount(id, source, 'story', send)
  },

  /** loads a story from a file (macro @Pixi.load) */
  load(id: string, url: string, send?: Send) {
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${r.statusText}`))))
      .then((text) => {
        const base = url.replace(/[^/]*([?#].*)?$/, '')
        // relative files in the story are next to the story file
        const source = /^\s*base\s/m.test(text) ? text : `base ${base}\n${text}`
        mount(id, source, 'story', send)
        send?.lia('LIA: stop')
      })
      .catch((e) => {
        console.error(`LiaPixi: could not load ${url}: ${e.message}`)
        send?.lia(`HTML: <span style="color:red">LiaPixi: could not load ${url}: ${e.message}</span>`)
      })
    return 'LIA: wait'
  },

  /** developer mode (macro @Pixi.js): a PixiJS app for your own code */
  js(id: string, code: string, send?: Send, ratio = '16:9') {
    try {
      new AsyncFunction('PIXI', 'app', 'stage', 'W', 'H', 'tween', 'tweens', 'wait', 'sound', 'onFrame', 'LiaPixi', code)
    } catch (e: any) {
      const loc = location(e)
      const err: any = new Error(e.message)
      err.liaErrors = [{ line: loc?.line ?? 1, message: e.message }]
      throw err
    }
    return mount(id, code, 'js', send, { 'data-ratio': ratio })
  },

  /** parses a story without running it: { script, errors } */
  parse,

  /** the state of a story: { done, ending, endings, vars, path, choices } or null */
  get(id: string) {
    const live = stories.get(id)
    if (live?.story) return live.story.state()
    const saved = persist.load(id)
    if (!saved) return null
    const s = saved.snapshot
    return {
      id,
      title: '',
      label: s?.label ?? '',
      done: !!s?.ended,
      ending: s?.ended ?? null,
      endings: saved.endings || [],
      vars: s?.vars ?? {},
      path: s?.path ?? [],
      choices: s?.choices ?? [],
    }
  },

  /**
   * Checks an expression against a story, for quizzes:
   * LiaPixi.check("trip", 'ending == "good" and courage > 1')
   */
  check(id: string, expr: string): boolean {
    const s = LiaPixi.get(id)
    if (!s) return false
    try {
      return !!evaluate(expr || 'done', { ...s.vars }, {
        ending: s.ending,
        done: s.done,
        endings: s.endings,
        visited: (label: string) => s.path.includes(label),
        chosen: (text: string) => s.choices.some((c: any) => c.text === text),
      })
    } catch (e: any) {
      console.warn('LiaPixi.check:', e.message)
      return false
    }
  },

  /** a small HTML table with the state of a story (macro @Pixi.state) */
  stateHTML(id: string): string {
    const s = LiaPixi.get(id)
    const esc = (v: any) =>
      String(typeof v === 'string' ? v : JSON.stringify(v))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    if (!s) return `<em>${esc(id)}: –</em>`
    const rows: [string, any][] = [
      ['done', s.done],
      ['ending', s.ending ?? '–'],
      ['endings', s.endings.join(', ') || '–'],
      ...Object.entries(s.vars),
      ['path', s.path.join(' → ')],
    ]
    return (
      '<table class="lia-table"><tbody>' +
      rows.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`).join('') +
      '</tbody></table>'
    )
  },

  /** deletes the stored progress of a story */
  reset(id: string) {
    persist.clear(id)
    const live = stories.get(id)
    live?.restart()
  },

  defineCommand,
  defineActor,
  defineCharacter,
  on,

  /** texts of the stage in other languages: LiaPixi.translate("ar", { continue: "متابعة" }) */
  translate,
  translations,

  /** what is built in, e.g. for documentation */
  builtins: {
    get commands() {
      return Object.keys(commands).filter((c) => c !== 'label')
    },
    backgrounds: BACKGROUNDS,
    figures: Object.keys(FIGURES),
    expressions: EXPRESSIONS,
    sounds: SOUNDS,
  },

  stories,
}

export type LiaPixiAPI = typeof LiaPixi

declare global {
  interface Window {
    LiaPixi: LiaPixiAPI
    LiaPixiPlugins?: any
    PIXI: typeof PIXI
  }
}

define()
window.PIXI = window.PIXI || PIXI
window.LiaPixi = LiaPixi

// extensions that were registered before the bundle was loaded:
//   window.LiaPixiPlugins = (window.LiaPixiPlugins || []).concat(LiaPixi => { … })
const queued = Array.isArray(window.LiaPixiPlugins) ? window.LiaPixiPlugins : []
window.LiaPixiPlugins = { push: (fn: (api: LiaPixiAPI) => void) => fn(LiaPixi) }
for (const fn of queued) {
  try {
    fn(LiaPixi)
  } catch (e) {
    console.error('LiaPixi plugin:', e)
  }
}
window.dispatchEvent(new CustomEvent('lia-pixi-ready', { detail: LiaPixi }))
