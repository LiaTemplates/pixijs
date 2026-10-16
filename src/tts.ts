/**
 * Reads dialog lines with the Web Speech API. Every character can have its
 * own voice: `voice="de-DE Female"`, `voice="Deutsch Male"`, `voice="Google UK English Male"`
 * plus `pitch=1.2 rate=0.9`.
 */

/** the voice names LiaScript uses for `narrator:` (ResponsiveVoice) → language */
const LANGS: Record<string, string> = {
  deutsch: 'de-DE',
  german: 'de-DE',
  'us english': 'en-US',
  'uk english': 'en-GB',
  'australian english': 'en-AU',
  english: 'en-US',
  french: 'fr-FR',
  français: 'fr-FR',
  spanish: 'es-ES',
  español: 'es-ES',
  italian: 'it-IT',
  dutch: 'nl-NL',
  polish: 'pl-PL',
  portuguese: 'pt-PT',
  brazilian: 'pt-BR',
  russian: 'ru-RU',
  ukrainian: 'uk-UA',
  turkish: 'tr-TR',
  arabic: 'ar-SA',
  chinese: 'zh-CN',
  japanese: 'ja-JP',
  korean: 'ko-KR',
  swedish: 'sv-SE',
  norwegian: 'nb-NO',
  danish: 'da-DK',
  finnish: 'fi-FI',
  czech: 'cs-CZ',
  greek: 'el-GR',
  hungarian: 'hu-HU',
  hindi: 'hi-IN',
}

/** names that hint at a female or male voice in the common TTS engines */
const FEMALE = /female|frau|woman|anna|helena|katja|petra|marlene|vicki|hedda|zira|susan|samantha|karen|moira|tessa|serena|kate|victoria|amelie|aurelie|monica|paulina|alice|joana|luciana|milena|sara|ellen|nora|zosia|yuna|ting|mei|kyoko|hazel|heera|elsa|ioana|catherine|google uk english female|libby|sonia|jenny|aria|seraphina|amala|conchita/i
const MALE = /male|mann|man\b|stefan|markus|yannick|hans|conrad|killian|david|mark|george|james|alex|daniel|fred|thomas|jorge|diego|luca|xander|maged|ryan|guy|rishi|oliver|florian|christoph|jonas|ralf|kasper/i

export type VoiceSpec = { lang?: string; gender?: 'female' | 'male'; name?: string; pitch: number; rate: number }

export function parseVoice(spec: string | undefined, kv: Record<string, string> = {}, fallbackLang?: string): VoiceSpec {
  const v: VoiceSpec = { pitch: parseFloat(kv.pitch ?? '1') || 1, rate: parseFloat(kv.rate ?? '1') || 1 }
  let s = (spec || '').trim()
  const g = /\b(female|male|woman|man|frau|mann)\b/i.exec(s)
  if (g) {
    v.gender = /^(female|woman|frau)$/i.test(g[1]) ? 'female' : 'male'
    s = s.replace(g[0], '').trim()
  }
  const code = /\b([a-z]{2,3}(?:[-_][A-Za-z]{2,4})?)\b/.exec(s)
  const lower = s.toLowerCase()
  if (LANGS[lower]) v.lang = LANGS[lower]
  else if (code && code[0] === s) v.lang = code[1].replace('_', '-')
  else if (s) v.name = s
  if (!v.lang) v.lang = fallbackLang
  return v
}

function voices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis
  const list = synth.getVoices()
  if (list.length) return Promise.resolve(list)
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices())
    synth.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1000)
  })
}

export async function pickVoice(v: VoiceSpec): Promise<SpeechSynthesisVoice | null> {
  const list = await voices()
  if (!list.length) return null
  if (v.name) {
    const byName = list.find((x) => x.name.toLowerCase().includes(v.name!.toLowerCase()))
    if (byName) return byName
  }
  let pool = list
  if (v.lang) {
    const lang = v.lang.toLowerCase()
    const exact = list.filter((x) => x.lang.toLowerCase().replace('_', '-') === lang)
    const prefix = list.filter((x) => x.lang.toLowerCase().startsWith(lang.slice(0, 2)))
    pool = exact.length ? exact : prefix.length ? prefix : list
  }
  if (v.gender) {
    const re = v.gender === 'female' ? FEMALE : MALE
    const other = v.gender === 'female' ? MALE : FEMALE
    const match = pool.find((x) => re.test(x.name) && !(v.gender === 'male' && FEMALE.test(x.name)))
    if (match) return match
    const notOther = pool.find((x) => !other.test(x.name))
    if (notOther) return notOther
  }
  return pool.find((x) => x.default) || pool[0]
}

export function available() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** removes things that should not be read aloud (emoji, markdown marks) */
export function clean(text: string) {
  return text
    .replace(/[*_~`#>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export class Speech {
  private current: SpeechSynthesisUtterance | null = null
  private finish: (() => void) | null = null

  /**
   * Speaks a text, resolves when it is finished or cancelled.
   * If the voice does not exist, the pitch is changed instead (female higher, male lower).
   */
  async speak(text: string, v: VoiceSpec, onBoundary?: () => void): Promise<void> {
    this.cancel()
    const t = clean(text)
    if (!available() || !t) return
    const voice = await pickVoice(v)
    const u = new SpeechSynthesisUtterance(t)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else if (v.lang) u.lang = v.lang
    let pitch = v.pitch
    if (v.gender && voice && !(v.gender === 'female' ? FEMALE : MALE).test(voice.name)) {
      pitch *= v.gender === 'female' ? 1.25 : 0.75
    }
    u.pitch = Math.max(0, Math.min(2, pitch))
    u.rate = Math.max(0.1, Math.min(4, v.rate))
    this.current = u
    return new Promise<void>((resolve) => {
      const done = () => {
        if (this.current === u) this.current = null
        this.finish = null
        clearInterval(watchdog)
        resolve()
      }
      this.finish = done
      u.onend = done
      u.onerror = done
      u.onboundary = (e) => {
        if (e.name === 'word' || !e.name) onBoundary?.()
      }
      // some engines never fire onend
      const watchdog = setInterval(() => {
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) done()
      }, 500)
      window.speechSynthesis.speak(u)
    })
  }

  get speaking() {
    return this.current !== null
  }

  cancel() {
    if (!available()) return
    if (this.current) {
      this.current = null
      window.speechSynthesis.cancel()
    }
    this.finish?.()
  }

  pause() {
    if (this.current) window.speechSynthesis.pause()
  }

  resume() {
    if (this.current) window.speechSynthesis.resume()
  }
}
