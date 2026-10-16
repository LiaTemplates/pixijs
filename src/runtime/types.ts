/** One executable line of a story (after parsing). */
export type Node = {
  line: number
  cmd: string
  args: any
}

/** A definition from the head of a story: `bg forest base:forest`, `char anna "Anna" …` */
export type Def = {
  line: number
  id: string
  /** display name (characters) */
  name?: string
  /** first positional source after the id */
  src?: string
  /** further positional arguments */
  pos: string[]
  /** key=value options */
  kv: Record<string, string>
}

export type Script = {
  id: string
  title: string
  stage: { width: number; height: number; color: string }
  lang?: string
  base?: string
  options: Record<string, string>
  backgrounds: Record<string, Def>
  characters: Record<string, Def>
  images: Record<string, Def>
  sounds: Record<string, Def>
  music: Record<string, Def>
  vars: { name: string; expr: string; line: number }[]
  nodes: Node[]
  /** label name → index of the label node */
  labels: Record<string, number>
  start: string
}

export type ParseError = { line: number; message: string }

/** horizontal position as a fraction of the stage width, y as fraction of the height (bottom = 1) */
export type Pos = { x: number; y?: number }

export type ActorState = {
  expr?: string
  x: number
  y?: number
  flip?: boolean
  scale?: number
}

/** Everything that is visible or audible – stored with every checkpoint to restore a scene. */
export type Visual = {
  bg: string | null
  actors: Record<string, ActorState>
  music: { ref: string; volume: number } | null
  tint: { color: string; alpha: number } | null
  blur: number
  zoom: number
  /** the last line of dialog, shown again with a menu after continue or back */
  line?: { speaker: string | null; text: string } | null
}

export type Option = {
  text: string
  /** label to jump to, or null to continue */
  target: string | null
  cond?: string
  sets: string[]
  /** hotspot: a rectangle [x, y, w, h] as fractions of the stage, or an actor id */
  hotspot?: { rect?: [number, number, number, number]; actor?: string }
  line: number
}

export type MenuItem = {
  index: number
  text: string
  hotspot?: Option['hotspot']
}

/** The view a story talks to. The PixiJS stage implements it, tests use a mock. */
export interface Presenter {
  background(ref: string | null, o: { fade?: number }): Promise<void>
  show(id: string, o: { state: ActorState; fade?: number; from?: number; dur?: number }): Promise<void>
  hide(id: string, o: { fade?: number; to?: number; dur?: number }): Promise<void>
  move(id: string, o: { state: ActorState; dur: number; ease?: string }): Promise<void>
  /** shows a line of dialog and resolves when the reader moves on */
  say(speaker: string | null, text: string, o: { expr?: string }): Promise<void>
  /** resolves with the index of the chosen item */
  menu(items: MenuItem[], prompt?: string): Promise<number>
  input(question: string, value: string): Promise<string>
  title(text: string, sub: string, dur: number): Promise<void>
  wait(seconds: number | 'click'): Promise<void>
  effect(name: string, args: Record<string, any>): Promise<void>
  sound(ref: string, o: { volume?: number }): void
  music(ref: string | null, o: { volume?: number; fade?: number }): Promise<void>
  end(name: string, text: string): Promise<void>
  /** sets a scene instantly (restart, continue, back) */
  restore(visual: Visual): Promise<void>
  /** additional values for js: lines and extension commands (app, PIXI, layers, …) */
  extras?(): Record<string, any>
}

export type Snapshot = {
  pc: number
  label: string
  vars: Record<string, any>
  visual: Visual
  path: string[]
  choices: { label: string; text: string }[]
  stack: number[]
  ended: string | null
}

export type Ctx = {
  story: any
  view: Presenter
  vars: Record<string, any>
  visual: Visual
  script: Script
  /** evaluates an expression with the story variables */
  eval(expr: string): any
  /** replaces `{expr}` in a text */
  text(t: string): string
  jump(label: string): void
  [key: string]: any
}

export type CommandDef = {
  /**
   * Turns the rest of the line (after the command word) into arguments.
   * Throw an Error to report a problem in that line.
   */
  parse?: (rest: string, info: ParseInfo) => any
  run: (ctx: Ctx, args: any, node: Node) => void | Promise<void>
  /** checks the arguments after the whole story was read (throw an Error to report a problem) */
  validate?: (args: any, script: Script) => void
  /** the story waits for the reader here – a checkpoint is stored before it runs */
  checkpoint?: boolean
}

export type ParseInfo = {
  line: number
  script: Script
  /** parses another line (used by `if … : <line>`) */
  sub: (line: string) => Node
}
