import { describe, it, expect } from 'vitest'
// @ts-ignore vitest runs in node, the project has no @types/node
import { readFileSync } from 'node:fs'
import { parse } from '../src/dsl/parser'
import { Story } from '../src/runtime/story'
import { evaluate, interpolate, assign } from '../src/runtime/expr'
import { defineCommand, defineCharacter } from '../src/runtime/registry'
import type { Presenter, MenuItem, Snapshot } from '../src/runtime/types'
import { tokenize } from '../src/dsl/args'
import { expressions } from '../src/actors'
import { armPose, figureStyle } from '../src/base/figures'
import { Blinker, GESTURES, REST, Speaking, bodyGesture, frameAt, frameList, gesturePose, idleMode, idlePose, isFrameKey, pickFrame, sheetAnimation, stepPose } from '../src/fx/life'

/** a view that records everything and picks choices from a list */
function mock(picks: (number | string)[] = [], inputs: string[] = []) {
  const log: string[] = []
  const view: Presenter = {
    background: async (ref) => void log.push(`bg ${ref}`),
    show: async (id, o) => void log.push(`show ${id} ${o.state.expr ?? ''} ${o.state.x}`.trim()),
    hide: async (id) => void log.push(`hide ${id}`),
    move: async (id, o) => void log.push(`move ${id} ${o.state.x}`),
    act: async (id, name) => void log.push(`act ${id} ${name}`),
    hold: async (id, o) => void log.push(`${o.kind} ${id} ${o.from ?? '-'} ${o.state.held ?? o.state.x}`),
    say: async (speaker, text) => void log.push(`${speaker ?? ''}: ${text}`),
    menu: async (items: MenuItem[]) => {
      log.push(`menu ${items.map((i) => i.text).join(' | ')}`)
      const p = picks.shift()
      const item = typeof p === 'string' ? items.find((i) => i.text === p) : items[p ?? 0]
      return item!.index
    },
    input: async (q) => {
      log.push(`input ${q}`)
      return inputs.shift() ?? ''
    },
    title: async (t) => void log.push(`title ${t}`),
    wait: async () => {},
    effect: async (name) => void log.push(`fx ${name}`),
    sound: (ref) => void log.push(`sound ${ref}`),
    music: async (ref) => void log.push(`music ${ref}`),
    end: async (name, text) => void log.push(`end ${name}${text ? ' ' + text : ''}`),
    restore: async () => {},
  }
  return { view, log }
}

const STORY = `
story trip "The trip"
stage 16:9 #223344
bg forest base:forest
char anna "Anna" base:girl color=#e55
char bot "Robo" emoji=🤖
var courage = 0

# start
bg forest fade 1
show anna happy at left
anna: Hello {name ?? "you"}!
bot: Where to?
? To the river -> river [courage += 1]
? Back home    -> home
? Secret       -> river [if courage > 5]

# river
anna sad: Cold!
  Really cold.
if courage > 0 -> brave
-> home

# brave
: You are brave.
end good "Well done"

# home
end home
`

describe('parser', () => {
  it('reads definitions, labels and nodes', () => {
    const { script, errors } = parse(STORY)
    expect(errors).toEqual([])
    expect(script.id).toBe('trip')
    expect(script.title).toBe('The trip')
    expect(script.stage).toEqual({ width: 1600, height: 900, color: '#223344' })
    expect(script.characters.anna.name).toBe('Anna')
    expect(script.characters.anna.src).toBe('base:girl')
    expect(script.characters.anna.kv.color).toBe('#e55')
    expect(script.characters.bot.kv.emoji).toBe('🤖')
    expect(Object.keys(script.labels)).toEqual(['start', 'river', 'brave', 'home'])
    const menu = script.nodes.find((n) => n.cmd === 'menu')!
    expect(menu.args.options.map((o: any) => o.target)).toEqual(['river', 'home', 'river'])
    expect(menu.args.options[0].sets).toEqual(['courage += 1'])
    expect(menu.args.options[2].cond).toBe('courage > 5')
    const sad = script.nodes.find((n) => n.cmd === 'say' && n.args.expr === 'sad')!
    expect(sad.args.text).toBe('Cold!\nReally cold.')
  })

  it('reports errors with line numbers', () => {
    const { errors } = parse(`char anna "Anna" base:girl
# start
anna: hi
shwo anna
-> nowhere
show bob
move anna
? -> start
wait forever`)
    expect(errors.map((e) => e.line)).toEqual([4, 5, 6, 7, 8, 9])
    expect(errors[0].message).toContain('did you mean "show"')
    expect(errors[1].message).toContain('no label "# nowhere"')
    expect(errors[2].message).toContain('"bob" is not defined')
  })

  it('starts without labels', () => {
    const { script, errors } = parse(`: Hello\n: World`)
    expect(errors).toEqual([])
    expect(script.start).toBe('start')
    expect(script.nodes.filter((n) => n.cmd === 'say')).toHaveLength(2)
  })

  it('collects multi-line js code', () => {
    const { script, errors } = parse(`# start
js: if (vars.x) {
      vars.y = 1
    }
: done`)
    expect(errors).toEqual([])
    expect(script.nodes[1].args.code).toContain('vars.y = 1')
  })

  it('uses a stable hash as id without a story line', () => {
    expect(parse(': a').script.id).toBe(parse(': a').script.id)
    expect(parse(': a').script.id).not.toBe(parse(': b').script.id)
  })
})

describe('expressions', () => {
  it('evaluates with variables and words', () => {
    expect(evaluate('a > 1 and not b', { a: 2, b: false })).toBe(true)
    expect(evaluate('x or "or"', { x: 0 })).toBe('or')
    expect(evaluate('Math.max(a, 3)', { a: 1 })).toBe(3)
    expect(evaluate('unknown', {})).toBe(undefined)
  })
  it('assigns', () => {
    const v: any = {}
    assign('n += 2', v)
    assign('n *= 3', v)
    assign('s = "a"', v)
    assign('s += "b"', v)
    expect(v).toEqual({ n: 6, s: 'ab' })
  })
  it('interpolates', () => {
    expect(interpolate('Hi {name}, {n + 1} \\{x}', { name: 'Ann', n: 1 })).toBe('Hi Ann, 2 {x}')
  })
})

describe('runtime', () => {
  it('follows choices, variables and conditions', async () => {
    const { script } = parse(STORY)
    const { view, log } = mock([0])
    const story = new Story(script, view)
    await story.start()
    expect(log).toEqual([
      'bg null',
      'bg forest',
      'show anna happy 0.27',
      'anna: Hello you!',
      'bot: Where to?',
      'menu To the river | Back home',
      'anna: Cold!\nReally cold.',
      ': You are brave.',
      'end good Well done',
    ].filter((l) => l !== 'bg null'))
    expect(story.vars.courage).toBe(1)
    expect(story.ended).toBe('good')
    expect(story.path).toEqual(['start', 'river', 'brave'])
    expect(story.state().choices).toEqual([{ label: 'start', text: 'To the river' }])
  })

  it('ends at the next label without a jump', async () => {
    const { script } = parse(`# a\n: one\n# b\n: two`)
    const { view, log } = mock()
    const story = new Story(script, view)
    await story.start()
    expect(log).toEqual([': one', 'end end'])
  })

  it('stores checkpoints and resumes', async () => {
    const { script } = parse(STORY)
    const saves: Snapshot[] = []
    const { view } = mock([1])
    const story = new Story(script, view, { save: (s) => saves.push(s) })
    await story.start()
    // the menu checkpoint
    const atMenu = saves.find((s) => script.nodes[s.pc].cmd === 'menu')!
    expect(atMenu.visual.bg).toBe('forest')
    expect(atMenu.visual.actors.anna).toEqual({ x: 0.27, expr: 'happy' })

    const second = mock([0])
    const again = new Story(script, second.view)
    await again.resume(atMenu)
    expect(second.log[0]).toBe('menu To the river | Back home')
    expect(again.ended).toBe('good')
  })

  it('goes back to the previous line', async () => {
    const { script } = parse(`# s\n: one\n: two\n: three`)
    const log: string[] = []
    let release: () => void = () => {}
    const { view } = mock()
    view.say = (_, text) => {
      log.push(text)
      return new Promise<void>((r) => (release = r))
    }
    const story = new Story(script, view)
    story.start()
    await Promise.resolve()
    release()
    await new Promise((r) => setTimeout(r, 0))
    expect(log).toEqual(['one', 'two'])
    story.back()
    await new Promise((r) => setTimeout(r, 0))
    expect(log).toEqual(['one', 'two', 'one'])
  })

  it('runs inline if, call/return, input and js', async () => {
    const { script, errors } = parse(`var n = 1
# start
input name "Name?"
if n == 1: : one {name}
call sub
js: vars.n = vars.n * 10
: {n}
end
# sub
set n += 1
return`)
    expect(errors).toEqual([])
    const { view, log } = mock([], ['Ada'])
    const story = new Story(script, view)
    await story.start()
    expect(log).toEqual(['input Name?', ': one Ada', ': 20', 'end end'])
  })

  it('supports custom commands', async () => {
    defineCommand('confetti', {
      parse: (rest) => ({ n: Number(rest) || 10 }),
      run: (ctx, a) => ctx.view.effect('confetti', a),
    })
    const { script, errors } = parse(`confetti 50\n: yay`)
    expect(errors).toEqual([])
    expect(script.nodes[1].args).toEqual({ n: 50 })
    const { view, log } = mock()
    await new Story(script, view).start()
    expect(log).toEqual(['fx confetti', ': yay', 'end end'])
  })

  it('hides choices with false conditions and records endings', async () => {
    const { script } = parse(`var k = false
? Door -> door [if k]
? Wait -> stay
# door
end door
# stay
end stay`)
    const { view, log } = mock([0])
    const story = new Story(script, view, { endings: ['door'] })
    await story.start()
    expect(log[0]).toBe('menu Wait')
    expect(story.state().endings.sort()).toEqual(['door', 'stay'])
  })
})

import { labels, direction, forStory, lineText, translate } from '../src/i18n'

describe('i18n', () => {
  it('picks texts by language, region and fallback', () => {
    expect(labels('ar').continue).toBe('متابعة')
    expect(labels('de-DE').restart).toBe('Neu beginnen')
    expect(labels('pt-BR').fullscreen).toBe('Tela cheia')
    expect(labels('pt').fullscreen).toBe('Ecrã inteiro')
    expect(labels('xx').start).toBe('Start')
  })
  it('knows right-to-left languages', () => {
    expect(direction('ar')).toBe('rtl')
    expect(direction('he-IL')).toBe('rtl')
    expect(direction('de')).toBe('ltr')
    expect(direction('ar', { dir: 'ltr' })).toBe('ltr')
  })
  it('takes the language and single texts from the story', () => {
    const { script } = parse('option ui=fr label.continue="Allez !" dir=rtl\n: hi')
    const lang = forStory(script.options, script.lang)
    expect(lang.lang).toBe('fr')
    expect(lang.t.continue).toBe('Allez !')
    expect(lang.t.restart).toBe('Recommencer')
    expect(lang.dir).toBe('rtl')
    expect(forStory({}, 'ja').t.start).toBe('スタート')
  })
  it('formats line numbers and accepts new translations', () => {
    expect(lineText(labels('ja'), 3)).toBe('3 行目')
    translate('eo', { start: 'Komenci' })
    expect(labels('eo').start).toBe('Komenci')
    expect(labels('eo').restart).toBe('Start again')
  })
})

describe('image characters that feel alive', () => {
  const KHADIJA =
    'char khadija "Khadija" img/k/neutral.png sad=img/k/sad.png sad.talk=img/k/sad-talk.png ' +
    'talk=img/k/neutral-talk.png blink=img/k/blink.png sad.blink=img/k/sad-blink.png idle=breathe'

  it('reads talk and blink keys with a dot', () => {
    const { kv } = tokenize('x Sad.Talk=a.png sad.blink="b c.png" talk=t.png')
    expect(kv).toEqual({ 'sad.talk': 'a.png', 'sad.blink': 'b c.png', talk: 't.png' })
  })

  it('does not treat talk, blink and idle as expressions', () => {
    const { script, errors } = parse(KHADIJA)
    expect(errors).toEqual([])
    const def = script.characters.khadija
    expect(def.src).toBe('img/k/neutral.png')
    expect(def.kv['sad.talk']).toBe('img/k/sad-talk.png')
    expect(expressions(def)).toEqual(['sad'])
    expect(Object.keys(def.kv).filter(isFrameKey).sort()).toEqual(['blink', 'sad.blink', 'sad.talk', 'talk'])
  })

  it('picks the frame for expression, talking and blinking', () => {
    const all = new Set(['', 'sad', 'happy', 'sad.talk', 'talk', 'blink', 'sad.blink'])
    const has = (k: string) => all.has(k)
    expect(pickFrame(has, undefined, {})).toEqual({ key: '', frame: '' })
    expect(pickFrame(has, 'sad', {})).toEqual({ key: 'sad', frame: '' })
    expect(pickFrame(has, 'unknown', {})).toEqual({ key: '', frame: '' })
    // talking: <expr>.talk, else talk
    expect(pickFrame(has, 'sad', { open: true })).toEqual({ key: 'sad.talk', frame: 'talk' })
    expect(pickFrame(has, 'happy', { open: true })).toEqual({ key: 'talk', frame: 'talk' })
    expect(pickFrame(has, undefined, { open: true })).toEqual({ key: 'talk', frame: 'talk' })
    // blinking: <expr>.blink; blink only for the base image
    expect(pickFrame(has, 'sad', { blink: true })).toEqual({ key: 'sad.blink', frame: 'blink' })
    expect(pickFrame(has, undefined, { blink: true })).toEqual({ key: 'blink', frame: 'blink' })
    expect(pickFrame(has, 'neutral', { blink: true })).toEqual({ key: 'blink', frame: 'blink' })
    expect(pickFrame(has, 'happy', { blink: true })).toEqual({ key: 'happy', frame: '' })
    // an open mouth wins over closed eyes
    expect(pickFrame(has, 'sad', { open: true, blink: true })).toEqual({ key: 'sad.talk', frame: 'talk' })
    // no talking image at all: the expression stays (the actor stretches it a little)
    const plain = new Set(['', 'sad'])
    expect(pickFrame((k) => plain.has(k), 'sad', { open: true })).toEqual({ key: 'sad', frame: '' })
  })

  it('blinks every few seconds, but not while speaking', () => {
    const b = new Blinker(() => 0) // first blink after 2 s, then every 2.5 s
    expect(b.tick(1990)).toBe(false)
    expect(b.tick(20)).toBe(true)
    expect(b.tick(100)).toBe(true)
    expect(b.tick(40)).toBe(false)
    expect(b.tick(2600, false)).toBe(false) // due, but speaking
    expect(b.tick(16)).toBe(true) // blinks as soon as it may
    expect(b.tick(16, false)).toBe(false) // speaking opens the eyes at once
  })

  it('stays speaking between two mouth flaps', () => {
    const s = new Speaking()
    expect(s.active).toBe(false)
    s.set(true)
    s.set(false)
    s.tick(Speaking.HOLD - 50)
    expect(s.active).toBe(true)
    s.tick(100)
    expect(s.active).toBe(false)
  })

  it('plays <name>_talk of a spritesheet while speaking', () => {
    const anims = new Set(['idle', 'idle_talk', 'wave'])
    const has = (n: string) => anims.has(n)
    expect(sheetAnimation(has, 'idle', true)).toBe('idle_talk')
    expect(sheetAnimation(has, 'idle', false)).toBe('idle')
    expect(sheetAnimation(has, 'wave', true)).toBe('wave')
  })

  it('moves only a little when idle', () => {
    expect(idleMode(undefined)).toBeUndefined()
    expect(idleMode('Breathe')).toBe('breathe')
    expect(idleMode('off')).toBe('none')
    expect(idleMode('dance')).toBeNull()
    expect(idlePose('none', 1234)).toEqual({ sx: 1, sy: 1, x: 0, y: 0, rotation: 0 })
    for (let t = 0; t < 20000; t += 37) {
      const b = idlePose('breathe', t)
      expect(Math.abs(b.sy - 1)).toBeLessThanOrEqual(0.0025)
      expect(b.x).toBe(0)
      const f = idlePose('fidget', t)
      expect(Math.abs(f.sy - 1)).toBeLessThanOrEqual(0.005)
      expect(Math.abs(f.x)).toBeLessThanOrEqual(0.006)
      expect(Math.abs(f.rotation)).toBeLessThanOrEqual(0.012)
    }
    expect(idlePose('fidget', 500).x).not.toBe(0)
  })

  it('changes the idle motion with show and checks it', () => {
    const { script, errors } = parse(KHADIJA + '\n# start\nshow khadija sad idle=fidget\nmove khadija idle=none\n')
    expect(errors).toEqual([])
    const [show, move] = script.nodes.filter((n) => n.cmd === 'show' || n.cmd === 'move')
    expect(show.args).toMatchObject({ id: 'khadija', expr: 'sad', idle: 'fidget' })
    expect(move.args).toMatchObject({ id: 'khadija', idle: 'none' })

    const bad = parse('char k "K" img/k.png idle=dance\n' + KHADIJA + '\n# start\nshow khadija idle=jump\n')
    expect(bad.errors.map((e) => e.line)).toEqual([1, 4])
    expect(bad.errors.every((e) => /idle/.test(e.message))).toBe(true)
  })

  it('keeps the idle motion in the scene state', async () => {
    const { script } = parse(KHADIJA + '\n# start\nshow khadija idle=fidget\nshow khadija sad\nkhadija: Hm.\n')
    const { view } = mock()
    const states: any[] = []
    view.show = async (_id, o) => void states.push({ ...o.state })
    const story = new Story(script, view)
    await story.start()
    expect(states.map((s) => s.idle)).toEqual(['fidget', 'fidget'])
    expect(states[1].expr).toBe('sad')
  })
})

describe('defined characters', () => {
  it('merges a defined character into the char line, the line wins', () => {
    defineCharacter('Khadija', { base: 'https://x.org/k/', src: 'neutral.png', sad: 'sad.png', 'sad.talk': 'sad-talk.png', color: '#111', scale: 0.8, idle: 'breathe' })
    const { script, errors } = parse('char k "Khadija" khadija color=#c0392b\n# start\nk sad: Hi.\n')
    expect(errors).toEqual([])
    const def = script.characters.k
    expect(def.src).toBe('neutral.png')
    expect(def.name).toBe('Khadija')
    expect(def.kv).toMatchObject({ base: 'https://x.org/k/', color: '#c0392b', scale: '0.8', idle: 'breathe' })
    expect(expressions(def)).toEqual(['sad'])
  })

  it('reports unknown character names, builtin figures still work', () => {
    defineCharacter('khadija', { src: 'neutral.png' })
    const { errors } = parse('char a "A" girl\nchar b "B" base:boy\nchar k "K" khadia\n')
    expect(errors.map((e) => e.line)).toEqual([3])
    expect(errors[0].message).toContain('did you mean "khadija"')
    expect(parse('char k "K" khadija idle=dance\n').errors[0].message).toContain('idle')
  })

  it('takes own expressions, also with umlauts', () => {
    defineCharacter('lea', { src: 'n.png', Freude: 'f.png', 'freude.talk': 'ft.png' })
    const { script, errors } = parse('char l "Lea" lea überrascht=ü.png überrascht.talk=üt.png\n# start\nl überrascht: Oh!\n')
    expect(errors).toEqual([])
    expect(expressions(script.characters.l).sort()).toEqual(['freude', 'überrascht'])
    expect(script.characters.l.kv['überrascht.talk']).toBe('üt.png')
    expect(isFrameKey('überrascht.talk')).toBe(true)
  })
})

describe('walking and gestures', () => {
  const HEAD = 'char mia "Mia" base:girl\nchar k "K" img/k.png act.wave=w1.png,w2.png walk=a.png,b.png\nchar cat "Cat" sheet=cat.json\n'

  it('moves the body only during a gesture and only a little', () => {
    for (const name of Object.keys(GESTURES)) {
      const body = bodyGesture(name)
      expect(gesturePose(body, 0)).toEqual(REST)
      expect(gesturePose(body, 1)).toEqual(REST)
      for (let t = 0; t <= 1; t += 0.01) {
        const p = gesturePose(body, t)
        expect(Math.abs(p.sy - 1)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(p.sx - 1)).toBeLessThanOrEqual(0.1)
        expect(p.y).toBeLessThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(-0.15)
        expect(Math.abs(p.rotation)).toBeLessThanOrEqual(0.05)
      }
    }
    expect(gesturePose('jump', 0.5).y).toBeLessThan(-0.1)
    expect(bodyGesture('wave')).toBe('hop')
    expect(bodyGesture('cross')).toBe('')
    for (let ms = 0; ms < 5000; ms += 23) {
      const p = stepPose(ms)
      expect(p.y).toBeLessThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(-0.015)
    }
  })

  it('reads walking and gesture frames, they are no expressions', () => {
    const { script, errors } = parse(HEAD)
    expect(errors).toEqual([])
    expect(isFrameKey('walk')).toBe(true)
    expect(isFrameKey('act.wave')).toBe(true)
    expect(expressions(script.characters.k)).toEqual([])
    expect(frameList(script.characters.k.kv['act.wave'])).toEqual(['w1.png', 'w2.png'])
    expect(frameList('data:image/png;base64,AAA, data:image/png;base64,BBB,c.png')).toEqual([
      'data:image/png;base64,AAA',
      'data:image/png;base64,BBB',
      'c.png',
    ])
    expect([0, 124, 125, 250, 375].map((ms) => frameAt(2, ms))).toEqual([0, 0, 1, 0, 1])
  })

  it('parses act, walk and gestures in dialog lines', () => {
    const { script, errors } = parse(
      HEAD +
        '# start\nact mia jump\nact k wave 2s alt="K waves"\nact cat dance\nmove mia to right walk\nmove mia to left 3s walk\n' +
        'mia happy wave: Hi!\nmia nod: Yes.\nmia sad: Oh.\ncat wave: Meow.\n'
    )
    expect(errors).toEqual([])
    const n = script.nodes
    expect(n[1].args).toMatchObject({ id: 'mia', name: 'jump' })
    expect(n[2].args).toMatchObject({ id: 'k', name: 'wave', dur: 2, alt: 'K waves' })
    expect(n[3].args).toMatchObject({ id: 'cat', name: 'dance' })
    expect(n[4].args).toMatchObject({ walk: true, x: 0.73 })
    expect(n[5].args).toMatchObject({ walk: true, dur: 3 })
    expect(n[6].args).toMatchObject({ speaker: 'mia', expr: 'happy', gesture: 'wave', text: 'Hi!' })
    expect(n[7].args).toMatchObject({ speaker: 'mia', gesture: 'nod' })
    expect(n[7].args.expr).toBeUndefined()
    expect(n[8].args).toMatchObject({ expr: 'sad' })
    expect(n[8].args.gesture).toBeUndefined()
    // a spritesheet animation of the same name stays an expression
    expect(n[9].args).toMatchObject({ expr: 'wave' })

    const bad = parse(HEAD + '# start\nact mia dance\nact mia\nmia happy dance: Hi\n')
    expect(bad.errors.map((e) => e.line)).toEqual([5, 6, 7])
    expect(bad.errors[0].message).toContain('nod, shake')
  })

  it('walks as long as the way is long and plays gestures', async () => {
    const { script } = parse(HEAD + '# start\nshow mia at left\nmove mia to right walk\nact mia nod\nmia wave: Hi\n')
    const { view, log } = mock()
    const moves: any[] = []
    view.move = async (_id, o) => void moves.push(o)
    await new Story(script, view).start()
    expect(moves[0].walk).toBe(true)
    expect(moves[0].dur).toBeCloseTo((0.73 - 0.27) / 0.3)
    expect(moves[0].ease).toBe('linear')
    expect(log).toContain('act mia nod')
    expect(log).toContain('act mia wave')
    expect(log.indexOf('act mia wave')).toBeLessThan(log.indexOf('mia: Hi'))
  })
})

describe('objects', () => {
  const HEAD = 'char mia "Mia" base:girl\nchar tom "Tom" base:boy hand=0.2,0.5\nimage key img/key.png alt=key\n'

  it('takes, gives and drops and keeps it in the scene state', async () => {
    const { script, errors } = parse(
      HEAD +
        '# start\nshow mia at left\nshow tom at right\ntake mia key\nmia: Mine.\ngive mia key to tom\ntom: Thanks.\n' +
        'drop tom key at 40%\ntake tom key alt="Tom picks it up"\nhide tom\n: Gone.\n'
    )
    expect(errors).toEqual([])
    const saves: Snapshot[] = []
    const { view, log } = mock()
    await new Story(script, view, { save: (s) => saves.push(s) }).start()
    expect(log.filter((l) => /^(takes|gives|drops|hide)/.test(l))).toEqual([
      'takes key - mia',
      'gives key mia tom',
      'drops key tom 0.4',
      'takes key - tom',
      'hide tom',
      'hide key',
    ])
    const at = (text: string) => saves.find((s) => script.nodes[s.pc].args.text === text)!.visual.actors
    expect(at('Mine.').key).toEqual({ x: 0.27, held: 'mia' })
    expect(at('Thanks.').key).toEqual({ x: 0.73, held: 'tom' })
    expect(at('Gone.').key).toBeUndefined()
    expect(script.nodes.find((n) => n.cmd === 'take' && n.args.alt)!.args.alt).toBe('Tom picks it up')
  })

  it('lets go when the object is moved, checks the names', () => {
    const { errors } = parse(HEAD + '# start\ntake key mia\ngive mia key\ntake mia mia\ndrop mia key at nowhere\ntake mia door\n')
    expect(errors.map((e) => e.line)).toEqual([5, 6, 7, 8, 9])
  })

  it('a new position lets go of the object', async () => {
    const { script } = parse(HEAD + '# start\nshow mia at left\ntake mia key\nshow key at center\nmia: Hm.\n')
    const saves: Snapshot[] = []
    const { view } = mock()
    await new Story(script, view, { save: (s) => saves.push(s) }).start()
    expect(saves[saves.length - 1].visual.actors.key).toEqual({ x: 0.5 })
  })
})

describe('arms of builtin figures', () => {
  it('are only there with arms=on', () => {
    expect(figureStyle('girl')!.arms).toBeUndefined()
    expect(figureStyle('girl', { arms: 'on' })!.arms).toBe(true)
    expect(figureStyle('girl', { arms: 'no' })!.arms).toBe(false)
    expect(parse('char mia "Mia" base:girl arms=on\n').errors).toEqual([])
    expect(expressions(parse('char k "K" img/k.png hand=0.2,0.5 arms=on\n').script.characters.k)).toEqual([])
  })

  it('know a pose for every arm gesture and rest otherwise', () => {
    const rest = armPose(undefined)
    expect(armPose('nod')).toEqual(rest)
    expect(armPose(undefined, 0, true).r).not.toEqual(rest.r)
    for (const name of ['wave', 'point', 'shrug', 'cross', 'hips', 'think', 'cheer', 'take', 'give', 'walk']) {
      for (let ms = 0; ms < 2000; ms += 50) {
        const p = armPose(name, ms)
        for (const [s, e] of [p.l, p.r]) {
          expect(Math.abs(s)).toBeLessThanOrEqual(170)
          expect(Math.abs(e)).toBeLessThanOrEqual(150)
        }
      }
      if (name !== 'walk') expect(armPose(name)).not.toEqual(rest)
    }
  })
})

describe('README', () => {
  it('has stories without mistakes', () => {
    defineCommand('confetti', { run: () => {} }) // added by a plugin in the README
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    const stories = [...readme.matchAll(/```text @Pixi\.story\n([\s\S]*?)```/g)].map((m) => m[1])
    expect(stories.length).toBeGreaterThan(10)
    for (const story of stories) expect(parse(story).errors, story.slice(0, 80)).toEqual([])
  })
})
