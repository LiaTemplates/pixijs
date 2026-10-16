/** A small tween engine that runs on the PixiJS ticker. */

export type Ease = (t: number) => number

export const EASE: Record<string, Ease> = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => {
    const c = 1.70158
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
  },
  bounce: (t) => {
    const n = 7.5625
    const d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  },
  elastic: (t) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
}
EASE['ease-in'] = EASE.in
EASE['ease-out'] = EASE.out
EASE['ease-in-out'] = EASE.inout
EASE.smooth = EASE.inout

type Job = {
  target: any
  keys: string[]
  from: number[]
  to: number[]
  time: number
  dur: number
  ease: Ease
  update?: (t: number) => void
  resolve: () => void
}

function get(obj: any, path: string): number {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function set(obj: any, path: string, value: number) {
  const keys = path.split('.')
  const last = keys.pop()!
  const o = keys.reduce((o, k) => o?.[k], obj)
  if (o) o[last] = value
}

export class Tweens {
  private jobs: Job[] = []

  /** call every frame with the elapsed milliseconds */
  tick(ms: number) {
    if (!this.jobs.length) return
    for (const job of [...this.jobs]) {
      job.time += ms / 1000
      const t = job.dur <= 0 ? 1 : Math.min(1, job.time / job.dur)
      const e = job.ease(t)
      job.keys.forEach((k, i) => set(job.target, k, job.from[i] + (job.to[i] - job.from[i]) * e))
      job.update?.(e)
      if (t >= 1) this.done(job)
    }
  }

  private done(job: Job) {
    const i = this.jobs.indexOf(job)
    if (i >= 0) this.jobs.splice(i, 1)
    job.resolve()
  }

  /**
   * Animates numeric properties (also nested ones like "scale.x") to the
   * given values, resolves when finished. A running tween of the same
   * property on the same object is replaced.
   */
  to(target: any, props: Record<string, number>, seconds: number, ease: string | Ease = 'inout', update?: (t: number) => void): Promise<void> {
    const keys = Object.keys(props)
    for (const job of [...this.jobs]) {
      if (job.target === target && job.keys.some((k) => keys.includes(k))) this.done(job)
    }
    if (!seconds || seconds <= 0) {
      keys.forEach((k) => set(target, k, props[k]))
      update?.(1)
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.jobs.push({
        target,
        keys,
        from: keys.map((k) => get(target, k)),
        to: keys.map((k) => props[k]),
        time: 0,
        dur: seconds,
        ease: typeof ease === 'function' ? ease : EASE[ease] || EASE.inout,
        update,
        resolve,
      })
    })
  }

  /** waits on the ticker (stops while the stage is paused) */
  wait(seconds: number): Promise<void> {
    return this.to({ t: 0 }, { t: 1 }, seconds, 'linear')
  }

  /** jumps all running tweens to their end */
  finish() {
    for (const job of [...this.jobs]) {
      job.keys.forEach((k, i) => set(job.target, k, job.to[i]))
      job.update?.(1)
      this.done(job)
    }
  }

  /** stops all tweens of an object without finishing them */
  kill(target: any) {
    for (const job of [...this.jobs]) if (job.target === target) this.done(job)
  }

  get busy() {
    return this.jobs.length > 0
  }
}
