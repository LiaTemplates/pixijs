/**
 * The built-in commands of the story language. They use the same API as
 * commands added with LiaPixi.defineCommand.
 */
import { defineCommand, commands } from './registry'
import { tokenize, duration, position } from '../dsl/args'
import { check, assignment } from './expr'
import type { ActorState, Ctx, MenuItem, Option, ParseInfo } from './types'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

function num(word: string | undefined, name: string): number {
  const n = parseFloat(word ?? '')
  if (isNaN(n)) throw new Error(`${name} needs a number, got "${word ?? ''}"`)
  return n
}

function dur(word: string | undefined, name: string): number {
  const d = duration(word)
  if (d === null) throw new Error(`${name}: "${word ?? ''}" is not a duration like 1s, 0.5 or 300ms`)
  return d
}

function pos(word: string | undefined, name: string): number {
  const p = position(word)
  if (p === null)
    throw new Error(`${name}: "${word ?? ''}" is not a position – use left, center, right, far-left, far-right, 30% or 0.3`)
  return p
}

function actor(id: string | undefined, info: ParseInfo, cmd: string) {
  if (!id) throw new Error(`${cmd} needs the name of a character or image`)
  if (cmd !== 'hide' || id !== 'all') {
    if (!info.script.characters[id] && !info.script.images[id]) {
      const known = [...Object.keys(info.script.characters), ...Object.keys(info.script.images)]
      throw new Error(
        `"${id}" is not defined – add a line like: char ${id} "${id}" base:girl` +
          (known.length ? ` (known: ${known.join(', ')})` : '')
      )
    }
  }
  return id
}

/** reads `at left fade 0.5 from right to center over 2s scale=1.2 y=0.9 flip ease=out` */
function stageArgs(words: string[], kv: Record<string, string>, cmd: string) {
  const o: Record<string, any> = { words: [] as string[] }
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase()
    switch (w) {
      case 'at':
      case 'to':
        o.x = pos(words[++i], `${cmd} ${w}`)
        break
      case 'from':
        o.from = pos(words[++i], `${cmd} from`)
        break
      case 'fade':
        o.fade = duration(words[i + 1]) ?? 0.4
        if (duration(words[i + 1]) !== null) i++
        break
      case 'over':
      case 'in':
        o.dur = dur(words[++i], `${cmd} ${w}`)
        break
      case 'flip':
        o.flip = true
        break
      case 'noflip':
      case 'unflip':
        o.flip = false
        break
      default:
        if (/^(\d+(\.\d+)?|\.\d+)(s|ms)$/.test(w)) o.dur = duration(w)
        else if (/^[a-z-]+$|%$/.test(w) && position(w) !== null) o.x = position(w)
        else if (duration(w) !== null) o.dur = duration(w)
        else o.words.push(words[i])
    }
  }
  if (kv.x !== undefined) o.x = pos(kv.x, `${cmd} x`)
  if (kv.y !== undefined) o.y = num(kv.y, `${cmd} y`)
  if (kv.scale !== undefined) o.scale = num(kv.scale, `${cmd} scale`)
  if (kv.fade !== undefined) o.fade = dur(kv.fade, `${cmd} fade`)
  if (kv.ease !== undefined) o.ease = kv.ease
  if (kv.flip !== undefined) o.flip = !/^(false|no|off|0)$/i.test(kv.flip)
  return o
}

function assignments(rest: string): string[] {
  const list = rest
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!list.length) throw new Error('set needs an assignment: set courage += 1')
  for (const a of list) {
    const m = assignment(a)
    if (!m) throw new Error(`"${a}" is not an assignment like x = 1 or x += 1`)
    const err = check(m[2])
    if (err) throw new Error(`"${a}": ${err}`)
  }
  return list
}

// --- flow -------------------------------------------------------------------

defineCommand('label', { run: () => {} })

defineCommand('jump', {
  parse: (rest) => ({ target: rest.trim() }),
  run: (ctx, a) => ctx.jump(a.target),
})

defineCommand('call', {
  parse: (rest) => {
    if (!rest.trim()) throw new Error('call needs the name of a label')
    return { target: rest.trim() }
  },
  run: (ctx, a) => ctx.call(a.target),
})

defineCommand('return', { run: (ctx) => ctx.back() })

defineCommand('if', {
  parse: (rest, info) => {
    const jump = /^(.+?)\s*->\s*(\S+)(?:\s+else\s*->\s*(\S+))?\s*$/.exec(rest)
    if (jump && !/:\s/.test(jump[1])) {
      const err = check(jump[1])
      if (err) throw new Error(`condition "${jump[1]}": ${err}`)
      return { cond: jump[1], target: jump[2], targets: jump[3] ? [jump[3]] : [], otherwise: jump[3] }
    }
    const colon = /^(.+?):\s+(.+)$/.exec(rest)
    if (!colon) throw new Error('use: if courage > 2 -> brave   or   if courage > 2: anna: You are brave!')
    const err = check(colon[1])
    if (err) throw new Error(`condition "${colon[1]}": ${err}`)
    return { cond: colon[1], node: info.sub(colon[2]) }
  },
  run: async (ctx, a) => {
    if (ctx.eval(a.cond)) {
      if (a.node) await ctx.story.exec(a.node)
      else ctx.jump(a.target)
    } else if (a.otherwise) {
      ctx.jump(a.otherwise)
    }
  },
})

defineCommand('set', {
  parse: (rest) => ({ list: assignments(rest) }),
  run: (ctx, a) => a.list.forEach((s: string) => ctx.assign(s)),
})
commands['var'] = commands['set']

defineCommand('end', {
  parse: (rest) => {
    const { pos } = tokenize(rest)
    return { name: pos[0], text: pos.slice(1).join(' ') }
  },
  run: (ctx, a) => ctx.finish(a.name, a.text ? ctx.text(a.text) : ''),
})

defineCommand('menu', {
  checkpoint: true,
  run: async (ctx, a) => {
    const options: Option[] = a.options
    const items: MenuItem[] = []
    options.forEach((o, index) => {
      if (o.cond && !ctx.eval(o.cond)) return
      items.push({ index, text: ctx.text(o.text), hotspot: o.hotspot })
    })
    if (!items.length) return
    const index = await ctx.view.menu(items)
    const o = options[index]
    if (!o) return
    o.sets.forEach((s) => ctx.assign(s))
    ctx.story.choices.push({ label: ctx.story.label, text: ctx.text(o.text) })
    ctx.emit('choice', { text: ctx.text(o.text), target: o.target, index })
    if (o.target) ctx.jump(o.target)
  },
})

// --- dialog -----------------------------------------------------------------

defineCommand('say', {
  checkpoint: true,
  parse: (rest) => ({ speaker: null, text: rest }),
  run: async (ctx, a) => {
    const text = ctx.text(a.text)
    if (a.speaker && a.expr && ctx.visual.actors[a.speaker]) ctx.visual.actors[a.speaker].expr = a.expr
    ctx.emit('say', { speaker: a.speaker, text })
    const p = ctx.view.say(a.speaker, text, { expr: a.expr })
    ctx.visual.line = { speaker: a.speaker, text }
    await p
  },
})

defineCommand('title', {
  checkpoint: true,
  parse: (rest) => {
    const { pos } = tokenize(rest)
    let d: number | null = null
    if (pos.length && duration(pos[pos.length - 1]) !== null) d = duration(pos.pop())
    if (!pos.length) throw new Error('title needs a text: title "Chapter 1" "The river"')
    return { text: pos[0], sub: pos.slice(1).join(' '), dur: d }
  },
  run: (ctx, a) => ctx.view.title(ctx.text(a.text), ctx.text(a.sub), a.dur ?? 0),
})

defineCommand('input', {
  checkpoint: true,
  parse: (rest) => {
    const { pos } = tokenize(rest)
    if (!pos[0] || !/^[A-Za-z_$][\w$]*$/.test(pos[0])) throw new Error('input needs a variable: input name "What is your name?"')
    return { name: pos[0], question: pos[1] || pos[0] + '?', value: pos[2] || '' }
  },
  run: async (ctx, a) => {
    const value = await ctx.view.input(ctx.text(a.question), String(ctx.vars[a.name] ?? a.value))
    const n = Number(value)
    ctx.vars[a.name] = value.trim() !== '' && !isNaN(n) ? n : value
  },
})

defineCommand('wait', {
  parse: (rest) => {
    const w = rest.trim() || 'click'
    if (w === 'click') return { click: true }
    return { seconds: dur(w, 'wait') }
  },
  run: (ctx, a) => ctx.view.wait(a.click ? 'click' : a.seconds),
})

// --- scene ------------------------------------------------------------------

defineCommand('bg', {
  parse: (rest) => {
    const { pos: words, kv } = tokenize(rest)
    const ref = words.shift()
    if (!ref) throw new Error('bg needs a background: bg forest fade 1')
    const o = stageArgs(words, kv, 'bg')
    return { ref: /^(none|off|clear)$/i.test(ref) ? null : ref, fade: o.fade ?? o.dur ?? 0 }
  },
  run: async (ctx, a) => {
    ctx.visual.bg = a.ref
    await ctx.view.background(a.ref, { fade: a.fade })
  },
})

defineCommand('show', {
  parse: (rest, info) => {
    const { pos: words, kv } = tokenize(rest)
    const id = actor(words.shift(), info, 'show')
    const o = stageArgs(words, kv, 'show')
    return { id, expr: o.words[0], ...o, words: undefined }
  },
  run: async (ctx, a) => {
    const old: ActorState | undefined = ctx.visual.actors[a.id]
    const state: ActorState = { ...(old || {}), x: a.x ?? old?.x ?? 0.5 }
    if (a.expr !== undefined) state.expr = a.expr
    if (a.y !== undefined) state.y = a.y
    if (a.flip !== undefined) state.flip = a.flip
    if (a.scale !== undefined) state.scale = a.scale
    ctx.visual.actors[a.id] = state
    await ctx.view.show(a.id, {
      state,
      fade: a.fade ?? (old ? 0 : a.from !== undefined ? 0 : 0.35),
      from: old ? undefined : a.from,
      dur: a.dur,
    })
  },
})

defineCommand('hide', {
  parse: (rest, info) => {
    const { pos: words, kv } = tokenize(rest)
    const id = actor(words.shift(), info, 'hide')
    const o = stageArgs(words, kv, 'hide')
    return { id, fade: o.fade, to: o.x, dur: o.dur }
  },
  run: async (ctx, a) => {
    const ids = a.id === 'all' ? Object.keys(ctx.visual.actors) : [a.id]
    const jobs = ids.map((id) => {
      delete ctx.visual.actors[id]
      return ctx.view.hide(id, { fade: a.fade ?? (a.to !== undefined ? 0 : 0.35), to: a.to, dur: a.dur })
    })
    await Promise.all(jobs)
  },
})

defineCommand('move', {
  parse: (rest, info) => {
    const { pos: words, kv } = tokenize(rest)
    const id = actor(words.shift(), info, 'move')
    const o = stageArgs(words, kv, 'move')
    if (o.x === undefined && o.y === undefined && o.scale === undefined && o.flip === undefined)
      throw new Error('move needs a target: move anna to right 1s')
    return { id, ...o, words: undefined }
  },
  run: async (ctx, a) => {
    const old: ActorState = ctx.visual.actors[a.id] || { x: 0.5 }
    const state: ActorState = { ...old }
    if (a.x !== undefined) state.x = a.x
    if (a.y !== undefined) state.y = a.y
    if (a.scale !== undefined) state.scale = a.scale
    if (a.flip !== undefined) state.flip = a.flip
    ctx.visual.actors[a.id] = state
    await ctx.view.move(a.id, { state, dur: a.dur ?? 1, ease: a.ease })
  },
})

// --- sound ------------------------------------------------------------------

defineCommand('sound', {
  parse: (rest) => {
    const { pos: words, kv } = tokenize(rest)
    if (!words[0]) throw new Error('sound needs a sound: sound base:pop')
    return { ref: words[0], volume: kv.volume !== undefined ? num(kv.volume, 'volume') : undefined }
  },
  run: (ctx, a) => ctx.view.sound(a.ref, { volume: a.volume }),
})

defineCommand('music', {
  parse: (rest) => {
    const { pos: words, kv } = tokenize(rest)
    if (!words[0]) throw new Error('music needs a source or "stop": music theme volume=0.4')
    const o = stageArgs(words.slice(1), kv, 'music')
    return {
      ref: /^(stop|none|off)$/i.test(words[0]) ? null : words[0],
      volume: kv.volume !== undefined ? num(kv.volume, 'volume') : 0.5,
      fade: o.fade ?? o.dur ?? 0,
    }
  },
  run: async (ctx, a) => {
    ctx.visual.music = a.ref ? { ref: a.ref, volume: a.volume } : null
    await ctx.view.music(a.ref, { volume: a.volume, fade: a.fade })
  },
})

defineCommand('stop', {
  parse: (rest) => {
    const { pos: words, kv } = tokenize(rest)
    if (!/^music$/i.test(words[0] || '')) throw new Error('use: stop music fade 2s')
    const o = stageArgs(words.slice(1), kv, 'stop')
    return { fade: o.fade ?? o.dur ?? 0 }
  },
  run: async (ctx, a) => {
    ctx.visual.music = null
    await ctx.view.music(null, { fade: a.fade })
  },
})

// --- effects ----------------------------------------------------------------

const TINTS: Record<string, [string, number]> = {
  night: ['#0b1a4a', 0.55],
  evening: ['#5a2a6a', 0.35],
  sunset: ['#ff7a30', 0.3],
  dawn: ['#ffb0a0', 0.25],
  sepia: ['#704214', 0.35],
  fog: ['#dde3ea', 0.45],
  dark: ['#000000', 0.5],
  red: ['#ff0000', 0.3],
}

function effectArgs(rest: string) {
  const { pos: words, kv } = tokenize(rest)
  const o: Record<string, any> = { words: [] as string[] }
  for (const w of words) {
    if (duration(w) !== null && !('dur' in o) && /s$|ms$/.test(w)) o.dur = duration(w)
    else o.words.push(w)
  }
  Object.assign(o, kv)
  return o
}

defineCommand('shake', {
  parse: (rest) => {
    const o = effectArgs(rest)
    const size: Record<string, number> = { small: 8, medium: 20, big: 40, huge: 70 }
    const w = o.words[0]
    return { strength: w ? (size[w] ?? num(w, 'shake')) : 20, dur: o.dur ?? 0.5 }
  },
  run: (ctx, a) => ctx.view.effect('shake', a),
})

defineCommand('flash', {
  parse: (rest) => {
    const o = effectArgs(rest)
    return { color: o.words[0] || '#ffffff', dur: o.dur ?? 0.4 }
  },
  run: (ctx, a) => ctx.view.effect('flash', a),
})

defineCommand('zoom', {
  parse: (rest) => {
    const o = effectArgs(rest)
    const words: string[] = o.words
    const on = words.indexOf('on')
    const target = on >= 0 ? words[on + 1] : undefined
    const factor = words[0] && words[0] !== 'on' ? (words[0] === 'reset' ? 1 : num(words[0], 'zoom')) : 1
    return { factor, on: target, dur: o.dur ?? 1 }
  },
  run: async (ctx, a) => {
    ctx.visual.zoom = a.factor
    await ctx.view.effect('zoom', a)
  },
})

defineCommand('tint', {
  parse: (rest) => {
    const o = effectArgs(rest)
    const w = (o.words[0] || 'none').toLowerCase()
    if (/^(none|off|clear|reset)$/.test(w)) return { color: null, alpha: 0, dur: o.dur ?? 1 }
    const preset = TINTS[w]
    const alpha = o.words[1] !== undefined ? num(o.words[1], 'tint') : (preset?.[1] ?? 0.35)
    return { color: preset?.[0] ?? o.words[0], alpha, dur: o.dur ?? 1 }
  },
  run: async (ctx, a) => {
    ctx.visual.tint = a.color ? { color: a.color, alpha: a.alpha } : null
    await ctx.view.effect('tint', a)
  },
})

defineCommand('blur', {
  parse: (rest) => {
    const o = effectArgs(rest)
    const w = o.words[0] || '0'
    return { amount: /^(none|off|reset)$/i.test(w) ? 0 : num(w, 'blur'), dur: o.dur ?? 0.5 }
  },
  run: async (ctx, a) => {
    ctx.visual.blur = a.amount
    await ctx.view.effect('blur', a)
  },
})

defineCommand('fade', {
  parse: (rest) => {
    const o = effectArgs(rest)
    const dir = (o.words[0] || '').toLowerCase()
    if (dir !== 'in' && dir !== 'out') throw new Error('use: fade out black 1s   …   fade in 1s')
    return { dir, color: o.words[1] || '#000000', dur: o.dur ?? 1 }
  },
  run: (ctx, a) => ctx.view.effect('fade', a),
})

// --- settings ---------------------------------------------------------------

defineCommand('auto', {
  parse: (rest) => ({ on: !/^(off|no|false|0)$/i.test(rest.trim()) }),
  run: (ctx, a) => ctx.view.effect('option', { auto: a.on }),
})

defineCommand('tts', {
  parse: (rest) => ({ on: !/^(off|no|false|0)$/i.test(rest.trim()) }),
  run: (ctx, a) => ctx.view.effect('option', { tts: a.on }),
})

// --- javascript ---------------------------------------------------------------

defineCommand('js', {
  parse: (rest) => {
    if (!rest.trim()) throw new Error('js: needs code, e.g.  js: vars.score = Math.max(vars.score, 3)')
    return { code: rest }
  },
  // checked after the whole story is read, because the code can continue on indented lines
  validate: (a) => {
    try {
      new AsyncFunction('ctx', 'vars', a.code)
    } catch (e: any) {
      throw new Error(`js: ${e.message}`)
    }
  },
  run: async (ctx: Ctx, a) => {
    const names = Object.keys(ctx).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && !['vars', 'eval', 'arguments'].includes(k))
    const fn = new AsyncFunction('ctx', 'vars', ...names, a.code)
    await fn(ctx, ctx.vars, ...names.map((n) => ctx[n]))
  },
})

