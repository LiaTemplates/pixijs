import type { CommandDef } from './types'

/** All commands of the story language – built-in and those added with LiaPixi.defineCommand. */
export const commands: Record<string, CommandDef> = {}

/** Actor types for `char … type=<name>` – added with LiaPixi.defineActor. */
export const actorTypes: Record<string, (ctx: any, def: any) => any> = {}

type Listener = (story: any, data: any) => void
const listeners: Record<string, Listener[]> = {}
const changes: (() => void)[] = []

export function defineCommand(name: string, def: CommandDef) {
  if (!/^[a-z][\w-]*$/i.test(name)) throw new Error(`invalid command name: ${name}`)
  if (typeof def?.run !== 'function') throw new Error(`command ${name} needs a run function`)
  commands[name.toLowerCase()] = def
  changes.forEach((fn) => fn())
}

export function defineActor(type: string, factory: (ctx: any, def: any) => any) {
  actorTypes[type.toLowerCase()] = factory
  changes.forEach((fn) => fn())
}

/** called when commands or actor types change, so stories with errors can be parsed again */
export function onChange(fn: () => void): () => void {
  changes.push(fn)
  return () => {
    const i = changes.indexOf(fn)
    if (i >= 0) changes.splice(i, 1)
  }
}

export function on(event: string, fn: Listener): () => void {
  ;(listeners[event] ??= []).push(fn)
  return () => {
    const list = listeners[event] || []
    const i = list.indexOf(fn)
    if (i >= 0) list.splice(i, 1)
  }
}

export function emit(event: string, story: any, data: any) {
  for (const fn of [...(listeners[event] || []), ...(listeners['*'] || [])]) {
    try {
      fn(story, { event, ...data })
    } catch (e) {
      console.error('LiaPixi listener for', event, e)
    }
  }
}
