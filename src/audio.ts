/**
 * Sound effects and music. Builtin sounds (`base:pop`) are synthesized with
 * Web Audio, files are played with <audio> elements (no CORS needed).
 */

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function noise(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  return src
}

function tone(ac: AudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, t0: number, d: number, v = 0.4) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t0)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + d)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  o.connect(g).connect(out)
  o.start(t0)
  o.stop(t0 + d + 0.05)
}

function burst(ac: AudioContext, out: AudioNode, t0: number, d: number, filter: BiquadFilterType, f0: number, f1: number, v = 0.5) {
  const n = noise(ac, d + 0.1)
  const bf = ac.createBiquadFilter()
  const g = ac.createGain()
  bf.type = filter
  bf.frequency.setValueAtTime(f0, t0)
  bf.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + d)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  n.connect(bf).connect(g).connect(out)
  n.start(t0)
  n.stop(t0 + d + 0.1)
}

const SYNTH: Record<string, (ac: AudioContext, out: AudioNode, t: number) => void> = {
  pop: (ac, o, t) => tone(ac, o, 'sine', 400, 1200, t, 0.12),
  click: (ac, o, t) => tone(ac, o, 'square', 1800, 900, t, 0.04, 0.2),
  ding: (ac, o, t) => {
    tone(ac, o, 'sine', 1320, 1320, t, 1.2, 0.35)
    tone(ac, o, 'sine', 2640, 2640, t, 0.6, 0.1)
  },
  bell: (ac, o, t) => {
    tone(ac, o, 'sine', 880, 880, t, 1.6, 0.35)
    tone(ac, o, 'sine', 1760 * 1.01, 1760, t, 1.0, 0.15)
  },
  success: (ac, o, t) => [523, 659, 784, 1046].forEach((f, i) => tone(ac, o, 'triangle', f, f, t + i * 0.11, 0.35, 0.3)),
  fail: (ac, o, t) => [392, 330, 262].forEach((f, i) => tone(ac, o, 'sawtooth', f, f * 0.97, t + i * 0.16, 0.3, 0.15)),
  magic: (ac, o, t) => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(ac, o, 'sine', f, f, t + i * 0.07, 0.5, 0.18)),
  whoosh: (ac, o, t) => burst(ac, o, t, 0.5, 'bandpass', 300, 3000, 0.4),
  splash: (ac, o, t) => {
    burst(ac, o, t, 0.6, 'lowpass', 4000, 300, 0.7)
    tone(ac, o, 'sine', 300, 80, t, 0.3, 0.3)
  },
  knock: (ac, o, t) => [0, 0.18, 0.36].forEach((d) => {
    tone(ac, o, 'sine', 180, 90, t + d, 0.12, 0.6)
    burst(ac, o, t + d, 0.06, 'lowpass', 1200, 400, 0.4)
  }),
  step: (ac, o, t) => [0, 0.35].forEach((d) => burst(ac, o, t + d, 0.1, 'lowpass', 900, 200, 0.5)),
  thunder: (ac, o, t) => {
    burst(ac, o, t, 2.5, 'lowpass', 900, 60, 0.9)
    burst(ac, o, t + 0.2, 1.8, 'lowpass', 400, 40, 0.7)
  },
  door: (ac, o, t) => {
    tone(ac, o, 'sawtooth', 120, 260, t, 0.6, 0.06)
    burst(ac, o, t + 0.6, 0.15, 'lowpass', 700, 100, 0.8)
  },
  boing: (ac, o, t) => tone(ac, o, 'sine', 150, 600, t, 0.35, 0.4),
  beep: (ac, o, t) => [0, 0.15].forEach((d) => tone(ac, o, 'square', 880, 880, t + d, 0.1, 0.12)),
  coin: (ac, o, t) => {
    tone(ac, o, 'square', 988, 988, t, 0.08, 0.15)
    tone(ac, o, 'square', 1319, 1319, t + 0.08, 0.35, 0.15)
  },
}

export const SOUNDS = Object.keys(SYNTH)

export class Audio {
  muted = false
  private musicEl: HTMLAudioElement | null = null
  private musicVolume = 0.5
  private fadeTimer: any = null
  private playing = new Set<HTMLAudioElement>()

  constructor(private resolve: (ref: string, kind: 'sound' | 'music') => string | null) {}

  /** must be called in a user gesture (start button), so browsers allow sound */
  unlock() {
    audio()
  }

  sound(ref: string, volume = 1) {
    if (this.muted) return
    const name = ref.replace(/^base:/, '').toLowerCase()
    if (ref.startsWith('base:') || (SYNTH[name] && !ref.includes('.'))) {
      const ac = audio()
      const fn = SYNTH[name]
      if (!ac || !fn) return
      const g = ac.createGain()
      g.gain.value = volume
      g.connect(ac.destination)
      fn(ac, g, ac.currentTime + 0.01)
      return
    }
    const url = this.resolve(ref, 'sound')
    if (!url) return
    const el = new window.Audio(url)
    el.volume = Math.max(0, Math.min(1, volume))
    this.playing.add(el)
    el.onended = () => this.playing.delete(el)
    el.play().catch(() => this.playing.delete(el))
  }

  async music(ref: string | null, volume = 0.5, fade = 0) {
    const old = this.musicEl
    if (old) {
      this.musicEl = null
      this.fade(old, 0, fade).then(() => old.pause())
    }
    if (!ref) return
    const url = this.resolve(ref, 'music')
    if (!url) return
    const el = new window.Audio(url)
    el.loop = true
    el.volume = 0
    this.musicEl = el
    this.musicVolume = volume
    if (!this.muted) {
      el.play().catch(() => {})
      await this.fade(el, volume, fade)
    }
  }

  private fade(el: HTMLAudioElement, to: number, seconds: number): Promise<void> {
    if (!seconds) {
      el.volume = Math.max(0, Math.min(1, to))
      return Promise.resolve()
    }
    const from = el.volume
    const start = performance.now()
    return new Promise((resolve) => {
      const step = () => {
        const t = Math.min(1, (performance.now() - start) / (seconds * 1000))
        el.volume = Math.max(0, Math.min(1, from + (to - from) * t))
        if (t < 1) setTimeout(step, 30)
        else resolve()
      }
      step()
    })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.musicEl) {
      if (muted) this.musicEl.pause()
      else {
        this.musicEl.volume = this.musicVolume
        this.musicEl.play().catch(() => {})
      }
    }
    if (muted) this.playing.forEach((el) => el.pause())
  }

  pause() {
    this.musicEl?.pause()
  }

  resume() {
    if (this.musicEl && !this.muted) this.musicEl.play().catch(() => {})
  }

  destroy() {
    clearTimeout(this.fadeTimer)
    this.musicEl?.pause()
    this.musicEl = null
    this.playing.forEach((el) => el.pause())
    this.playing.clear()
  }
}
