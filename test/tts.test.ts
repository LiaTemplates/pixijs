import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Speech, parseVoice } from '../src/tts'

/** a minimal DOM element, enough for LiaScript to read text, pitch and rate */
function fakeDocument() {
  return {
    createElement: (tag: string) => {
      const attrs: Record<string, string> = {}
      return {
        tag,
        textContent: '',
        setAttribute: (k: string, v: string) => void (attrs[k] = v),
        getAttribute: (k: string) => attrs[k] ?? null,
      }
    },
  }
}

const g = globalThis as any
let calls: any[]
let cancelled: number

beforeEach(() => {
  calls = []
  cancelled = 0
  g.document = fakeDocument()
  g.window = {
    speechSynthesis: {
      speaking: false,
      pending: false,
      cancel: () => void cancelled++,
      getVoices: () => [],
    },
    LIA: {
      settings: { audio: { pitch: 1, rate: 1.2 } },
      playback: (event: any) => calls.push(event),
    },
  }
})

afterEach(() => {
  delete g.window
  delete g.document
})

describe('reading aloud inside LiaScript', () => {
  it('lets LiaScript pick the voice, with name, language and gender', async () => {
    const speech = new Speech()
    const v = parseVoice('Arabic Male', { pitch: '0.85' }, 'ar')
    const done = speech.speak('مرحبا', v)
    expect(calls).toHaveLength(1)
    const { message } = calls[0]
    expect(message.cmd).toBe('playback')
    expect(message.param.voice).toBe('Arabic Male')
    expect(message.param.lang).toBe('ar-SA')
    // LiaScript reads text, pitch and rate from an element, not from a string
    expect(message.param.text.textContent).toBe('مرحبا')
    expect(message.param.text.getAttribute('data-pitch')).toBe('0.85')
    // the rate of the character is combined with the setting of the learner
    expect(message.param.text.getAttribute('data-rate')).toBe('1.2')
    calls[0].handlers.onStart()
    calls[0].handlers.onStop()
    await done
    expect(speech.speaking).toBe(false)
  })

  it('passes the gender of a language code on, so LiaScript can match it', () => {
    new Speech().speak('Bonjour', parseVoice('fr-FR Female', {}, 'fr'))
    expect(calls[0].message.param.voice).toBe('fr-FR Female')
    expect(calls[0].message.param.lang).toBe('fr-FR')
  })

  it('uses the language of the story when the character has no voice', () => {
    new Speech().speak('Hello', parseVoice(undefined, {}, 'en-GB'))
    expect(calls[0].message.param.voice).toBe('en-GB')
    expect(calls[0].message.param.lang).toBe('en-GB')
  })

  it('finishes on an error and on cancel', async () => {
    const speech = new Speech()
    const first = speech.speak('one', parseVoice('de-DE', {}))
    calls[0].handlers.onError('synthesis-failed')
    await first

    const second = speech.speak('two', parseVoice('de-DE', {}))
    expect(speech.speaking).toBe(true)
    speech.cancel()
    await second
    expect(speech.speaking).toBe(false)
    expect(cancelled).toBeGreaterThan(0)
  })

  it('reads itself when LiaScript cannot speak yet', async () => {
    const spoken: any[] = []
    g.window.LIA.playback = () => {
      throw new Error('EasySpeech: not initialized. Run EasySpeech.init() first')
    }
    g.window.speechSynthesis.getVoices = () => [{ name: 'fr_FR-siwis-medium', lang: 'fr-FR', default: false }]
    g.window.speechSynthesis.speak = (u: any) => {
      spoken.push(u)
      u.onend?.()
    }
    g.SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    }
    await new Speech().speak('Bonjour', parseVoice('fr-FR Female', {}))
    expect(spoken[0].voice.name).toBe('fr_FR-siwis-medium')
    delete g.SpeechSynthesisUtterance
  })

  it('reads with its own voice choice outside of LiaScript', async () => {
    delete g.window.LIA
    const spoken: any[] = []
    g.window.speechSynthesis.getVoices = () => [{ name: 'ar_JO-kareem-medium', lang: 'ar', default: false }]
    g.window.speechSynthesis.speak = (u: any) => {
      spoken.push(u)
      u.onend?.()
    }
    g.SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    }
    await new Speech().speak('مرحبا', parseVoice('ar Male', {}))
    expect(spoken).toHaveLength(1)
    expect(spoken[0].voice.name).toBe('ar_JO-kareem-medium')
    expect(calls).toHaveLength(0)
    delete g.SpeechSynthesisUtterance
  })
})

describe('own voice choice knows free Piper voices', () => {
  it('treats kareem, alan and ryan as male, siwis, cori and lessac as female', async () => {
    const { pickVoice } = await import('../src/tts')
    const list = [
      { name: 'ar_MSA-dii-high', lang: 'ar', default: false },
      { name: 'ar_JO-kareem-medium', lang: 'ar', default: false },
    ]
    g.window.speechSynthesis.getVoices = () => list
    expect((await pickVoice(parseVoice('ar Male', {})))?.name).toBe('ar_JO-kareem-medium')
    expect((await pickVoice(parseVoice('ar Female', {})))?.name).toBe('ar_MSA-dii-high')
  })

  it('does not take Catalan or Paulina for male voices', async () => {
    const { pickVoice } = await import('../src/tts')
    g.window.speechSynthesis.getVoices = () => [
      { name: 'Microsoft Herena - Catalan', lang: 'ca-ES', default: false },
      { name: 'en_GB-alan-medium', lang: 'en-GB', default: false },
      { name: 'Paulina', lang: 'es-MX', default: false },
    ]
    expect((await pickVoice(parseVoice('en-GB Male', {})))?.name).toBe('en_GB-alan-medium')
    expect((await pickVoice(parseVoice('ca-ES Male', {})))?.name).toBe('Microsoft Herena - Catalan')
  })
})
