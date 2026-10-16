import { describe, it, expect } from 'vitest'
import { parse } from '../src/dsl/parser'
import { Story } from '../src/runtime/story'
import { evaluate, interpolate, assign } from '../src/runtime/expr'
import { defineCommand } from '../src/runtime/registry'
import type { Presenter, MenuItem, Snapshot } from '../src/runtime/types'

/** a view that records everything and picks choices from a list */
function mock(picks: (number | string)[] = [], inputs: string[] = []) {
  const log: string[] = []
  const view: Presenter = {
    background: async (ref) => void log.push(`bg ${ref}`),
    show: async (id, o) => void log.push(`show ${id} ${o.state.expr ?? ''} ${o.state.x}`.trim()),
    hide: async (id) => void log.push(`hide ${id}`),
    move: async (id, o) => void log.push(`move ${id} ${o.state.x}`),
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
