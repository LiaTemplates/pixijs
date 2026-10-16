/**
 * Expressions in conditions, `set` and `{…}` in texts. They are JavaScript
 * with the story variables in scope, plus `and`, `or` and `not` as words.
 */

const SAFE = new Set([
  'Math',
  'Number',
  'String',
  'Boolean',
  'Array',
  'Object',
  'JSON',
  'Date',
  'parseInt',
  'parseFloat',
  'isNaN',
  'undefined',
  'NaN',
  'Infinity',
  'console',
])

const cache = new Map<string, Function>()

/** replaces `and`, `or`, `not` outside of strings */
export function translate(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
      continue
    }
    const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i))
    if (m) {
      const w = m[0]
      out += w === 'and' ? '&&' : w === 'or' ? '||' : w === 'not' ? '!' : w
      i += w.length
      continue
    }
    out += c
    i++
  }
  return out
}

function compile(src: string): Function {
  let fn = cache.get(src)
  if (!fn) {
    // new Function bodies are not strict, so `with` can put the variables in scope
    fn = new Function('__scope', `with (__scope) { return (${translate(src)}\n) }`)
    cache.set(src, fn)
  }
  return fn
}

/** checks an expression for syntax errors, returns the message or null */
export function check(src: string): string | null {
  try {
    compile(src)
    return null
  } catch (e: any) {
    return e.message
  }
}

function scope(vars: Record<string, any>, helpers: Record<string, any>) {
  return new Proxy(vars, {
    has: (_, key) => typeof key === 'string' && !SAFE.has(key),
    get: (target, key) => {
      if (key === Symbol.unscopables) return undefined
      if (typeof key !== 'string') return undefined
      if (key in helpers) return helpers[key]
      return target[key]
    },
    set: (target, key, value) => {
      target[key as string] = value
      return true
    },
  })
}

export function evaluate(src: string, vars: Record<string, any>, helpers: Record<string, any> = {}): any {
  return compile(src)(scope(vars, helpers))
}

/** `name = expr`, `name += expr`, … → [name, op, expr]; null if it is not an assignment */
export function assignment(src: string): [string, string, string] | null {
  const m = /^\s*([A-Za-z_$][\w$]*)\s*(=|\+=|-=|\*=|\/=)(?!=)\s*(.+)$/.exec(src)
  return m ? [m[1], m[2], m[3].trim()] : null
}

export function assign(src: string, vars: Record<string, any>, helpers: Record<string, any> = {}) {
  const a = assignment(src)
  if (!a) throw new Error(`not an assignment: ${src}`)
  const [name, op, expr] = a
  const value = evaluate(expr, vars, helpers)
  const old = vars[name] ?? (typeof value === 'string' ? '' : 0)
  switch (op) {
    case '=':
      vars[name] = value
      break
    case '+=':
      vars[name] = old + value
      break
    case '-=':
      vars[name] = old - value
      break
    case '*=':
      vars[name] = old * value
      break
    case '/=':
      vars[name] = old / value
      break
  }
}

/** replaces `{expr}` in a text; `\{` keeps a brace */
export function interpolate(text: string, vars: Record<string, any>, helpers: Record<string, any> = {}): string {
  return text
    .replace(/(^|[^\\])\{([^{}]+)\}/g, (_, pre, expr) => {
      let value: any
      try {
        value = evaluate(expr, vars, helpers)
      } catch (e) {
        value = `{${expr}}`
      }
      return pre + (value === undefined || value === null ? '' : String(value))
    })
    .replace(/\\\{/g, '{')
}
