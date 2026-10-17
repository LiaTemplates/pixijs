import { tokenize, brackets, rect } from './args'
import { commands } from '../runtime/registry'
import '../runtime/commands'
import { check, assignment } from '../runtime/expr'
import { idleMode } from '../fx/life'
import type { Node, ParseError, Script, Def, Option } from '../runtime/types'

const LABEL = /^#+\s*([\p{L}\p{N}_.-]+)\s*$/u
const SPEAKER = /^([\p{L}_][\p{L}\p{N}_-]*)(?:\s+([\p{L}\p{N}_-]+))?\s*:(?:\s+(.*)|\s*)$/u

/** words that define things in the head of a story (before the first label) */
const HEAD_ONLY = new Set(['bg', 'sound', 'music'])
const DEFS = new Set(['story', 'stage', 'char', 'image', 'lang', 'base', 'option'])

export type ParseResult = { script: Script; errors: ParseError[] }

function emptyScript(): Script {
  return {
    id: '',
    title: '',
    stage: { width: 1600, height: 900, color: '#1d2433' },
    options: {},
    backgrounds: {},
    characters: {},
    images: {},
    sounds: {},
    music: {},
    vars: [],
    nodes: [],
    labels: {},
    start: '',
  }
}

/** a word that names a file, an url, a builtin asset or a color */
export function looksLikeSource(word: string | undefined): boolean {
  if (!word) return false
  return /[:/]|\.[a-z0-9]{2,5}$/i.test(word) || /^#[0-9a-f]{3,8}$/i.test(word)
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

function suggest(word: string, list: string[]): string {
  let best = ''
  let min = 3
  for (const w of list) {
    const n = distance(word, w)
    if (n < min) {
      min = n
      best = w
    }
  }
  return best ? ` – did you mean "${best}"?` : ''
}

/** a hash of the source, used as story id if there is no `story` line */
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return 's' + (h >>> 0).toString(36)
}

function definition(line: number, rest: string, named = false): Def {
  const { pos, kv } = tokenize(rest)
  const def: Def = { line, id: pos.shift() || '', pos: [], kv }
  if (named && pos.length && !looksLikeSource(pos[0])) def.name = pos.shift()
  if (pos.length) def.src = pos.shift()
  def.pos = pos
  if (named) def.name = kv.name ?? def.name ?? def.id
  return def
}

/** `? text -> label [if cond] [x += 1]` or `hotspot 0.1,0.2,0.3,0.4 -> label "tooltip"` */
export function option(raw: string, line: number, hotspot: boolean): Option {
  const { rest, groups } = brackets(raw)
  const [left, right] = splitArrow(rest)
  const opt: Option = { text: left.trim(), target: right ? right.trim() || null : null, sets: [], line }

  if (opt.target && /\s/.test(opt.target)) {
    // `-> label "tooltip"` for hotspots
    const { pos } = tokenize(opt.target)
    opt.target = pos[0] || null
    if (hotspot && pos[1]) opt.text = pos.slice(1).join(' ')
  }

  for (const g of groups) {
    if (/^if\s+/i.test(g)) {
      opt.cond = g.replace(/^if\s+/i, '')
      const err = check(opt.cond)
      if (err) throw new Error(`condition "${opt.cond}": ${err}`)
    } else {
      for (const part of g.split(';').map((s) => s.trim()).filter(Boolean)) {
        const a = part.replace(/^set\s+/i, '')
        if (!assignment(a)) throw new Error(`"${part}" is not an assignment like x = 1 or x += 1`)
        const err = check(assignment(a)![2])
        if (err) throw new Error(`"${part}": ${err}`)
        opt.sets.push(a)
      }
    }
  }

  if (hotspot) {
    const { pos } = tokenize(left)
    const target = pos.shift() || ''
    const r = rect(target)
    opt.hotspot = r ? { rect: r } : { actor: target }
    if (!opt.text || opt.text === left.trim()) opt.text = pos.join(' ')
    if (!target) throw new Error('hotspot needs a rectangle x,y,w,h or the id of a character or image')
  } else if (!opt.text) {
    throw new Error('a choice needs a text: ? Go to the river -> river')
  }
  return opt
}

function splitArrow(s: string): [string, string | undefined] {
  const i = s.indexOf('->')
  return i < 0 ? [s, undefined] : [s.slice(0, i), s.slice(i + 2)]
}

export function parse(source: string): ParseResult {
  const script = emptyScript()
  const errors: ParseError[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  let inHead = true
  let last: { node: Node; indent: number } | null = null
  let lastWasOption = false
  let explicitId = false

  const fail = (line: number, message: string) => errors.push({ line, message })

  const lineNode = (text: string, line: number): Node | null => {
    const t = text.trim()

    // jumps
    if (t.startsWith('->')) {
      const target = t.slice(2).trim()
      if (!target) throw new Error('-> needs the name of a label')
      return { line, cmd: 'jump', args: { target } }
    }

    // narration
    if (t.startsWith(':') || t.startsWith('>')) {
      return { line, cmd: 'say', args: { speaker: null, text: t.slice(1).trim() } }
    }

    const word = (/^[\p{L}_][\p{L}\p{N}_-]*/u.exec(t)?.[0] || '').toLowerCase()

    // `js: code`, `if cond: line`, `wait 1s` …
    if (word && commands[word] && !(SPEAKER.test(t) && script.characters[word])) {
      const def = commands[word]
      const rest = t.slice(word.length).replace(/^\s*:?\s?/, word === 'js' ? '' : ' ').trim()
      const args = def.parse ? def.parse(rest, { line, script, sub: (l) => must(lineNode(l, line), l) }) : { rest }
      return { line, cmd: word, args }
    }

    // dialog: `anna: text` or `anna happy: text`
    const m = SPEAKER.exec(t)
    if (m) {
      return { line, cmd: 'say', args: { speaker: m[1], expr: m[2], text: m[3] || '' } }
    }

    const known = Object.keys(commands).filter((c) => !c.startsWith('_'))
    throw new Error(`unknown command "${word || t.split(/\s/)[0]}"${suggest(word, known)}`)
  }

  const must = (n: Node | null, l: string): Node => {
    if (!n) throw new Error(`cannot read "${l}"`)
    return n
  }

  lines.forEach((raw, i) => {
    const line = i + 1
    const indent = raw.length - raw.trimStart().length
    const t = raw.trim()

    if (!t || t.startsWith('//')) return

    // continuation of a dialog line or js code
    if (last && indent > last.indent && !t.startsWith('?') && !LABEL.test(t)) {
      const a = last.node.args
      if (last.node.cmd === 'say') {
        a.text = a.text ? a.text + '\n' + t : t
        return
      }
      if (last.node.cmd === 'js') {
        a.code += '\n' + raw.slice(Math.min(indent, last.indent + 2))
        return
      }
    }

    try {
      const label = LABEL.exec(t)
      if (label) {
        inHead = false
        const name = label[1]
        if (name in script.labels) throw new Error(`label "${name}" is defined twice`)
        script.labels[name] = script.nodes.length
        script.nodes.push({ line, cmd: 'label', args: { name } })
        if (!script.start) script.start = name
        last = null
        lastWasOption = false
        return
      }

      const word = (/^[a-z]+/i.exec(t)?.[0] || '').toLowerCase()
      const rest = t.slice(word.length).trim()

      if ((inHead && HEAD_ONLY.has(word)) || DEFS.has(word) || (inHead && word === 'var')) {
        head(word, rest, line)
        last = null
        lastWasOption = false
        return
      }

      if (inHead) {
        // a story without labels starts right here
        inHead = false
        script.labels['start'] = script.nodes.length
        script.nodes.push({ line, cmd: 'label', args: { name: 'start' } })
        script.start = 'start'
      }

      // choices and hotspots are collected into one menu
      if (t.startsWith('?') || word === 'hotspot') {
        const opt = option(t.startsWith('?') ? t.slice(1) : rest, line, word === 'hotspot')
        const prev = script.nodes[script.nodes.length - 1]
        if (lastWasOption && prev?.cmd === 'menu') {
          prev.args.options.push(opt)
        } else {
          script.nodes.push({ line, cmd: 'menu', args: { options: [opt] } })
        }
        lastWasOption = true
        last = null
        return
      }

      lastWasOption = false
      const node = lineNode(t, line)!
      script.nodes.push(node)
      last = { node, indent }
    } catch (e: any) {
      fail(line, e.message)
      last = null
    }
  })

  function head(word: string, rest: string, line: number) {
    switch (word) {
      case 'story': {
        const { pos, kv } = tokenize(rest)
        script.id = kv.id || pos[0] || ''
        script.title = kv.title || pos[1] || pos[0] || ''
        explicitId = !!script.id
        break
      }
      case 'stage': {
        const { pos, kv } = tokenize(rest)
        for (const p of pos) {
          const ratio = /^(\d+(?:\.\d+)?)[:x/](\d+(?:\.\d+)?)$/.exec(p)
          if (ratio) {
            const w = parseFloat(kv.width || '1600')
            script.stage.width = w
            script.stage.height = Math.round((w * parseFloat(ratio[2])) / parseFloat(ratio[1]))
          } else if (/^#|^[a-z]+$/i.test(p)) {
            script.stage.color = p
          } else {
            throw new Error(`stage: unknown argument "${p}" – use e.g. stage 16:9 #203040`)
          }
        }
        if (kv.color) script.stage.color = kv.color
        if (kv.width && !pos.some((p) => /[:x/]/.test(p))) {
          const r = script.stage.height / script.stage.width
          script.stage.width = parseFloat(kv.width)
          script.stage.height = Math.round(script.stage.width * r)
        }
        Object.assign(script.options, kv)
        break
      }
      case 'bg':
      case 'image':
      case 'sound':
      case 'music': {
        const def = definition(line, rest)
        if (!def.id) throw new Error(`${word} needs a name and a source: ${word} forest base:forest`)
        def.src = def.src || def.id
        const table = { bg: 'backgrounds', image: 'images', sound: 'sounds', music: 'music' }[word] as
          | 'backgrounds'
          | 'images'
          | 'sounds'
          | 'music'
        script[table][def.id] = def
        break
      }
      case 'char': {
        const def = definition(line, rest, true)
        if (!def.id) throw new Error('char needs a name: char anna "Anna" base:girl')
        if (idleMode(def.kv.idle) === null)
          throw new Error(`char ${def.id}: idle="${def.kv.idle}" is not an idle motion – use breathe, fidget or none`)
        script.characters[def.id] = def
        break
      }
      case 'var': {
        const a = assignment(rest)
        if (!a || a[1] !== '=') throw new Error('var needs a value: var courage = 0')
        const err = check(a[2])
        if (err) throw new Error(`var ${a[0]}: ${err}`)
        script.vars.push({ name: a[0], expr: a[2], line })
        break
      }
      case 'lang':
        script.lang = rest.trim()
        break
      case 'base':
        script.base = rest.trim()
        break
      case 'option': {
        Object.assign(script.options, tokenize(rest).kv)
        break
      }
    }
  }

  if (!script.nodes.length) {
    script.labels['start'] = 0
    script.nodes.push({ line: lines.length, cmd: 'label', args: { name: 'start' } })
    script.start = 'start'
  }
  if (!explicitId) script.id = hash(source)
  if (!script.title) script.title = ''

  // all jump targets must exist
  const labels = Object.keys(script.labels)
  const target = (name: string | null | undefined, line: number) => {
    if (name && !(name in script.labels) && name.toLowerCase() !== 'end') {
      fail(line, `there is no label "# ${name}"${suggest(name, labels)}`)
    }
  }
  const visit = (node: Node) => {
    const v = commands[node.cmd]?.validate
    if (v) {
      try {
        v(node.args, script)
      } catch (e: any) {
        fail(node.line, e.message)
      }
    }
    if (node.cmd === 'menu') node.args.options.forEach((o: Option) => target(o.target, o.line))
    for (const t of node.args?.targets || []) target(t, node.line)
    if (node.args?.target && node.cmd !== 'menu') target(node.args.target, node.line)
    if (node.args?.node) visit(node.args.node)
  }
  script.nodes.forEach(visit)

  errors.sort((a, b) => a.line - b.line)
  return { script, errors }
}
