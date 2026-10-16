import { commands, emit } from './registry'
import { evaluate, interpolate, assign } from './expr'
import type { Ctx, Node, Presenter, Script, Snapshot, Visual } from './types'

export function emptyVisual(): Visual {
  return { bg: null, actors: {}, music: null, tint: null, blur: 0, zoom: 1 }
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

const HISTORY = 100

export type StoryOptions = {
  /** called at every checkpoint and at the end */
  save?: (snapshot: Snapshot, story: Story) => void
  /** endings that were reached in earlier runs */
  endings?: string[]
  /** extra values for expressions */
  helpers?: Record<string, any>
}

/**
 * Runs a parsed story line by line. Everything visible goes through the
 * Presenter, so the runtime works without PixiJS (tests use a mock).
 */
export class Story {
  pc = 0
  label = ''
  vars: Record<string, any> = {}
  visual: Visual = emptyVisual()
  path: string[] = []
  choices: { label: string; text: string }[] = []
  stack: number[] = []
  ended: string | null = null
  endings: Set<string>
  history: Snapshot[] = []
  running = false
  private token = 0
  readonly ctx: Ctx

  constructor(
    readonly script: Script,
    readonly view: Presenter,
    readonly options: StoryOptions = {}
  ) {
    this.endings = new Set(options.endings || [])
    const story = this
    this.ctx = {
      story,
      view,
      script,
      get vars() {
        return story.vars
      },
      get visual() {
        return story.visual
      },
      eval: (expr: string) => evaluate(expr, story.vars, story.helpers()),
      text: (t: string) => interpolate(t, story.vars, story.helpers()),
      assign: (expr: string) => assign(expr, story.vars, story.helpers()),
      jump: (label: string) => story.jump(label),
      call: (label: string) => story.call(label),
      back: () => story.ret(),
      finish: (name?: string, text?: string) => story.finish(name, text),
      emit: (event: string, data: any = {}) => emit(event, story, data),
      ...(view.extras ? view.extras() : {}),
    }
  }

  get id() {
    return this.script.id
  }

  get done() {
    return this.ended !== null
  }

  helpers() {
    return {
      ending: this.ended,
      done: this.done,
      endings: [...this.endings],
      visited: (label: string) => this.path.includes(label),
      chosen: (text: string) => this.choices.some((c) => c.text === text),
      random: (a = 1, b?: number) => {
        if (b === undefined) return Math.floor(Math.random() * a) + 1
        return Math.floor(Math.random() * (b - a + 1)) + a
      },
      ...(this.options.helpers || {}),
    }
  }

  /** initial variables from the `var` lines */
  private initVars() {
    this.vars = {}
    for (const v of this.script.vars) {
      try {
        this.vars[v.name] = evaluate(v.expr, this.vars, this.helpers())
      } catch (e: any) {
        console.warn(`LiaPixi: var ${v.name} (line ${v.line}): ${e.message}`)
      }
    }
  }

  /** starts from the beginning */
  async start() {
    const token = ++this.token
    this.initVars()
    this.visual = emptyVisual()
    this.path = []
    this.choices = []
    this.stack = []
    this.ended = null
    this.history = []
    await this.view.restore(this.visual)
    if (token !== this.token) return
    emit('start', this, {})
    this.jump(this.script.start)
    return this.loop(token)
  }

  /** continues from a stored checkpoint */
  async resume(snap: Snapshot) {
    const token = ++this.token
    this.apply(snap)
    await this.view.restore(this.visual)
    if (token !== this.token) return
    emit('resume', this, {})
    return this.loop(token)
  }

  /** goes back to the previous checkpoint */
  async back() {
    if (this.history.length < 2) return false
    this.history.pop()
    const snap = this.history.pop()!
    await this.resume(snap)
    return true
  }

  canGoBack() {
    return this.history.length >= 2
  }

  /** stops the story, pending view promises are ignored */
  stop() {
    this.token++
    this.running = false
  }

  jump(label: string) {
    if (label.toLowerCase() === 'end' && !(label in this.script.labels)) {
      this.pc = this.script.nodes.length
      this.label = 'end'
      return
    }
    const index = this.script.labels[label]
    if (index === undefined) throw new Error(`there is no label "${label}"`)
    this.pc = index + 1
    this.label = label
    this.path.push(label)
    emit('label', this, { label })
  }

  call(label: string) {
    this.stack.push(this.pc)
    this.jump(label)
  }

  ret() {
    if (!this.stack.length) {
      this.pc = this.script.nodes.length
      return
    }
    this.pc = this.stack.pop()!
  }

  /** the end of the story; the view shows an end card */
  async finish(name?: string, text?: string) {
    this.ended = name || 'end'
    this.endings.add(this.ended)
    this.pc = this.script.nodes.length
    this.save()
    emit('end', this, { ending: this.ended })
    await this.view.end(this.ended, text || '')
  }

  snapshot(pc = this.pc): Snapshot {
    return clone({
      pc,
      label: this.label,
      vars: this.vars,
      visual: this.visual,
      path: this.path,
      choices: this.choices,
      stack: this.stack,
      ended: this.ended,
    })
  }

  private apply(snap: Snapshot) {
    const s = clone(snap)
    this.pc = s.pc
    this.label = s.label
    this.vars = s.vars
    this.visual = s.visual
    this.path = s.path
    this.choices = s.choices
    this.stack = s.stack
    this.ended = s.ended
  }

  save(pc = this.pc) {
    if (this.options.save) this.options.save(this.snapshot(pc), this)
  }

  private async loop(token: number) {
    this.running = true
    try {
      while (token === this.token) {
        const node = this.script.nodes[this.pc]
        if (!node || node.cmd === 'label') {
          // the end of a label ends the story – use -> to continue somewhere else
          if (!this.ended) await this.finish()
          break
        }
        this.pc++
        await this.exec(node, token)
      }
    } finally {
      if (token === this.token) this.running = false
    }
  }

  /** runs one node; also used by `if … : <line>` */
  async exec(node: Node, token = this.token) {
    const def = commands[node.cmd]
    if (!def) throw new Error(`line ${node.line}: unknown command ${node.cmd}`)
    if (def.checkpoint) {
      const snap = this.snapshot(this.pc - 1)
      this.history.push(snap)
      if (this.history.length > HISTORY) this.history.shift()
      this.save(this.pc - 1)
    }
    try {
      await def.run(this.ctx, node.args, node)
    } catch (e: any) {
      if (token !== this.token) return
      const msg = `line ${node.line}: ${e.message || e}`
      console.error('LiaPixi', msg)
      emit('error', this, { line: node.line, message: e.message || String(e) })
    }
  }

  /** the state that is reported to quizzes and LiaPixi.get */
  state() {
    return {
      id: this.id,
      title: this.script.title,
      label: this.label,
      done: this.done,
      ending: this.ended,
      endings: [...this.endings],
      vars: clone(this.vars),
      path: [...this.path],
      choices: clone(this.choices),
    }
  }
}
