/** Resolving the sources of a story: aliases, `base:` assets, colors and relative urls. */
import type { Script } from './runtime/types'
import { background } from './base/backgrounds'

/** the folder of the course, relative files in a story are loaded from there */
export function courseBase(script?: Script): string {
  if (script?.base) return new URL(script.base, document.baseURI).href
  try {
    const q = decodeURIComponent(location.search.slice(1)).split('#')[0]
    if (/^https?:\/\//i.test(q)) return q
  } catch (e) {}
  return document.baseURI
}

export function isColor(src: string) {
  return /^#([0-9a-f]{3,8})$/i.test(src) || /^(rgb|hsl)a?\(/i.test(src)
}

/** `#88f..#fff` → two colors of a vertical gradient */
export function gradient(src: string): [string, string] | null {
  const m = /^(#[0-9a-f]{3,8})\s*(?:\.\.|-|>)\s*(#[0-9a-f]{3,8})$/i.exec(src)
  return m ? [m[1], m[2]] : null
}

export function absolute(src: string, script?: Script): string {
  if (/^(data|blob|https?):/i.test(src)) return src
  try {
    return new URL(src, courseBase(script)).href
  } catch (e) {
    return src
  }
}

/** the image url of a background reference (alias, base:name, url); colors return null */
export function backgroundUrl(ref: string, script: Script): string | null {
  const src = script.backgrounds[ref]?.src || ref
  if (isColor(src) || gradient(src)) return null
  if (src.startsWith('base:')) return background(src.slice(5))
  const builtin = !/[./]/.test(src) ? background(src) : null
  return builtin || absolute(src, script)
}

export function backgroundSource(ref: string, script: Script): string {
  return script.backgrounds[ref]?.src || ref
}
