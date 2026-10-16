/** Story progress in localStorage, one entry per course and story id. */
import type { Snapshot } from './runtime/types'

export type Saved = {
  snapshot: Snapshot | null
  endings: string[]
  /** a hash of the story source; a changed story is not continued */
  version: string
  time: number
}

/** the url of the course (LiaScript puts it into the query: …/course/?https://…/README.md) */
export function courseKey(): string {
  try {
    const q = decodeURIComponent(location.search.slice(1))
    if (/^https?:\/\//i.test(q)) return q.split('#')[0]
  } catch (e) {}
  return location.origin + location.pathname
}

const key = (id: string) => `lia-pixi:${courseKey()}:${id}`

export function load(id: string): Saved | null {
  try {
    const raw = localStorage.getItem(key(id))
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch (e) {
    return null
  }
}

export function store(id: string, data: Saved) {
  try {
    localStorage.setItem(key(id), JSON.stringify(data))
  } catch (e) {
    // private mode or full storage: progress is not kept
  }
}

export function clear(id: string) {
  try {
    localStorage.removeItem(key(id))
  } catch (e) {}
}
