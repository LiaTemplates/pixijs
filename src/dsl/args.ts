/** Helpers to read the arguments of a story line. */

export type Args = {
  /** positional words (quotes removed) */
  pos: string[]
  /** key=value pairs */
  kv: Record<string, string>
}

// keys may have umlauts like the expressions in a speaker line (`überrascht=…`, `k überrascht: …`)
const TOKEN = /([\p{L}_][\p{L}\p{N}_.-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))|"([^"]*)"|'([^']*)'|(\S+)/gu

/** `anna "Anna Lee" base:girl color=#e55 voice="de-DE Female"` → pos + kv */
export function tokenize(rest: string): Args {
  const pos: string[] = []
  const kv: Record<string, string> = {}
  for (const m of rest.matchAll(TOKEN)) {
    if (m[1] !== undefined) {
      kv[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
    } else {
      pos.push(m[5] ?? m[6] ?? m[7])
    }
  }
  return { pos, kv }
}

/** `1s`, `0.5`, `500ms` → seconds; null if it is not a duration */
export function duration(word: string | undefined): number | null {
  if (word === undefined) return null
  const m = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)?$/.exec(word.trim())
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] === 'ms' ? n / 1000 : n
}

export const POSITIONS: Record<string, number> = {
  offleft: -0.25,
  farleft: 0.12,
  left: 0.27,
  centerleft: 0.38,
  center: 0.5,
  middle: 0.5,
  centerright: 0.62,
  right: 0.73,
  farright: 0.88,
  offright: 1.25,
}

/** `left`, `far-left`, `30%`, `0.3` → fraction of the stage width; null if unknown */
export function position(word: string | undefined): number | null {
  if (word === undefined) return null
  const w = word.toLowerCase().replace(/[-_]/g, '')
  if (w in POSITIONS) return POSITIONS[w]
  let m = /^(-?\d+(?:\.\d+)?)%$/.exec(w)
  if (m) return parseFloat(m[1]) / 100
  m = /^(-?\d+(?:\.\d+)?|-?\.\d+)$/.exec(w)
  if (m) return parseFloat(m[1])
  return null
}

/** reads `[ … ]` groups out of a line: `? Go -> river [if x > 1] [x += 1]` */
export function brackets(line: string): { rest: string; groups: string[] } {
  const groups: string[] = []
  const rest = line.replace(/\[([^\]]*)\]/g, (_, g) => {
    groups.push(g.trim())
    return ' '
  })
  return { rest: rest.trim(), groups }
}

/** `0.1,0.2,0.3,0.4` → rectangle; null if it is not one */
export function rect(word: string): [number, number, number, number] | null {
  const parts = word.split(',').map((s) => s.trim())
  if (parts.length !== 4) return null
  const nums = parts.map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p)))
  if (nums.some((n) => isNaN(n))) return null
  return nums as [number, number, number, number]
}
