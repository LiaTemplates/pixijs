/**
 * Texts of the stage (buttons, end screen, errors) in many languages.
 *
 * The language is taken from (first wins):
 *   1. `option ui=ar` in the story
 *   2. `lang ar` in the story
 *   3. the language of the course (LiaScript sets <html lang>, also when the
 *      course is translated later – the stage follows that change)
 *   4. the language of the browser
 *
 * Single texts can be changed in a story with `option label.continue="Weiter so"`,
 * or for all stories with `LiaPixi.translate("ar", { continue: "…" })`.
 */

export type Labels = {
  start: string
  continue: string
  restart: string
  back: string
  sound: string
  voice: string
  auto: string
  fullscreen: string
  end: string
  endings: string
  ok: string
  loading: string
  errors: string
  /** `{n}` is replaced by the line number */
  line: string
  /** for screen readers, `{name}` is the character or object */
  appears: string
  disappears: string
  /** for screen readers, `{name}` takes, gives or drops `{item}` (to `{to}`) */
  takes: string
  gives: string
  drops: string
  /** for screen readers: how the stage is used with keys */
  keys: string
}

const L = (
  start: string,
  continue_: string,
  restart: string,
  back: string,
  sound: string,
  voice: string,
  auto: string,
  fullscreen: string,
  end: string,
  endings: string,
  ok: string,
  loading: string,
  errors: string,
  line: string
): Partial<Labels> => ({ start, continue: continue_, restart, back, sound, voice, auto, fullscreen, end, endings, ok, loading, errors, line })

// prettier-ignore
export const translations: Record<string, Partial<Labels>> = {
  en: L('Start', 'Continue', 'Start again', 'Back', 'Sound', 'Read aloud', 'Auto play', 'Fullscreen', 'The End', 'Endings found', 'OK', 'loading …', 'This story contains errors:', 'line {n}'),
  de: L('Start', 'Weiter', 'Neu beginnen', 'Zurück', 'Ton', 'Vorlesen', 'Automatisch weiter', 'Vollbild', 'Ende', 'Gefundene Enden', 'OK', 'lädt …', 'Diese Geschichte enthält Fehler:', 'Zeile {n}'),
  ar: L('ابدأ', 'متابعة', 'البدء من جديد', 'رجوع', 'الصوت', 'القراءة بصوت عالٍ', 'تشغيل تلقائي', 'ملء الشاشة', 'النهاية', 'النهايات المكتشفة', 'موافق', 'جارٍ التحميل …', 'تحتوي هذه القصة على أخطاء:', 'السطر {n}'),
  fa: L('شروع', 'ادامه', 'شروع دوباره', 'بازگشت', 'صدا', 'خواندن با صدا', 'پخش خودکار', 'تمام‌صفحه', 'پایان', 'پایان‌های یافته‌شده', 'تأیید', 'در حال بارگذاری …', 'این داستان خطا دارد:', 'خط {n}'),
  he: L('התחלה', 'המשך', 'להתחיל מחדש', 'חזרה', 'צליל', 'הקראה', 'הפעלה אוטומטית', 'מסך מלא', 'הסוף', 'סופים שנמצאו', 'אישור', 'טוען …', 'בסיפור זה יש שגיאות:', 'שורה {n}'),
  ur: L('شروع کریں', 'جاری رکھیں', 'دوبارہ شروع کریں', 'واپس', 'آواز', 'بلند آواز سے پڑھیں', 'خودکار چلائیں', 'پوری اسکرین', 'اختتام', 'ملے ہوئے اختتام', 'ٹھیک ہے', 'لوڈ ہو رہا ہے …', 'اس کہانی میں غلطیاں ہیں:', 'سطر {n}'),
  fr: L('Commencer', 'Continuer', 'Recommencer', 'Retour', 'Son', 'Lecture à voix haute', 'Lecture automatique', 'Plein écran', 'Fin', 'Fins trouvées', 'OK', 'chargement …', 'Cette histoire contient des erreurs :', 'ligne {n}'),
  es: L('Empezar', 'Continuar', 'Empezar de nuevo', 'Atrás', 'Sonido', 'Leer en voz alta', 'Reproducción automática', 'Pantalla completa', 'Fin', 'Finales encontrados', 'Aceptar', 'cargando …', 'Esta historia contiene errores:', 'línea {n}'),
  it: L('Inizia', 'Continua', 'Ricomincia', 'Indietro', 'Audio', 'Lettura ad alta voce', 'Riproduzione automatica', 'Schermo intero', 'Fine', 'Finali trovati', 'OK', 'caricamento …', 'Questa storia contiene errori:', 'riga {n}'),
  pt: L('Começar', 'Continuar', 'Recomeçar', 'Voltar', 'Som', 'Ler em voz alta', 'Reprodução automática', 'Ecrã inteiro', 'Fim', 'Finais encontrados', 'OK', 'a carregar …', 'Esta história contém erros:', 'linha {n}'),
  'pt-br': L('Começar', 'Continuar', 'Recomeçar', 'Voltar', 'Som', 'Ler em voz alta', 'Reprodução automática', 'Tela cheia', 'Fim', 'Finais encontrados', 'OK', 'carregando …', 'Esta história contém erros:', 'linha {n}'),
  nl: L('Start', 'Verder', 'Opnieuw beginnen', 'Terug', 'Geluid', 'Voorlezen', 'Automatisch afspelen', 'Volledig scherm', 'Einde', 'Gevonden eindes', 'OK', 'laden …', 'Dit verhaal bevat fouten:', 'regel {n}'),
  pl: L('Start', 'Dalej', 'Zacznij od nowa', 'Wstecz', 'Dźwięk', 'Czytaj na głos', 'Autoodtwarzanie', 'Pełny ekran', 'Koniec', 'Znalezione zakończenia', 'OK', 'ładowanie …', 'Ta historia zawiera błędy:', 'wiersz {n}'),
  cs: L('Začít', 'Pokračovat', 'Začít znovu', 'Zpět', 'Zvuk', 'Předčítat', 'Automatické přehrávání', 'Celá obrazovka', 'Konec', 'Nalezené konce', 'OK', 'načítání …', 'Tento příběh obsahuje chyby:', 'řádek {n}'),
  sk: L('Začať', 'Pokračovať', 'Začať znova', 'Späť', 'Zvuk', 'Čítať nahlas', 'Automatické prehrávanie', 'Celá obrazovka', 'Koniec', 'Nájdené konce', 'OK', 'načítava sa …', 'Tento príbeh obsahuje chyby:', 'riadok {n}'),
  hr: L('Početak', 'Nastavi', 'Počni ispočetka', 'Natrag', 'Zvuk', 'Čitaj naglas', 'Automatska reprodukcija', 'Cijeli zaslon', 'Kraj', 'Pronađeni završeci', 'U redu', 'učitavanje …', 'Ova priča sadrži pogreške:', 'redak {n}'),
  hu: L('Indítás', 'Folytatás', 'Újrakezdés', 'Vissza', 'Hang', 'Felolvasás', 'Automatikus lejátszás', 'Teljes képernyő', 'Vége', 'Megtalált befejezések', 'OK', 'betöltés …', 'Ez a történet hibákat tartalmaz:', '{n}. sor'),
  ro: L('Începe', 'Continuă', 'Ia-o de la capăt', 'Înapoi', 'Sunet', 'Citește cu voce tare', 'Redare automată', 'Ecran complet', 'Sfârșit', 'Finaluri găsite', 'OK', 'se încarcă …', 'Această poveste conține erori:', 'linia {n}'),
  bg: L('Старт', 'Продължи', 'Започни отначало', 'Назад', 'Звук', 'Четене на глас', 'Автоматично възпроизвеждане', 'Цял екран', 'Край', 'Открити краища', 'OK', 'зареждане …', 'Тази история съдържа грешки:', 'ред {n}'),
  uk: L('Почати', 'Продовжити', 'Почати знову', 'Назад', 'Звук', 'Читати вголос', 'Автовідтворення', 'Повний екран', 'Кінець', 'Знайдені фінали', 'Гаразд', 'завантаження …', 'Ця історія містить помилки:', 'рядок {n}'),
  ru: L('Начать', 'Продолжить', 'Начать заново', 'Назад', 'Звук', 'Читать вслух', 'Автовоспроизведение', 'Полный экран', 'Конец', 'Найденные концовки', 'ОК', 'загрузка …', 'В этой истории есть ошибки:', 'строка {n}'),
  el: L('Έναρξη', 'Συνέχεια', 'Από την αρχή', 'Πίσω', 'Ήχος', 'Ανάγνωση φωναχτά', 'Αυτόματη αναπαραγωγή', 'Πλήρης οθόνη', 'Τέλος', 'Τέλη που βρέθηκαν', 'OK', 'φόρτωση …', 'Αυτή η ιστορία περιέχει σφάλματα:', 'γραμμή {n}'),
  tr: L('Başla', 'Devam', 'Yeniden başla', 'Geri', 'Ses', 'Sesli oku', 'Otomatik oynat', 'Tam ekran', 'Son', 'Bulunan sonlar', 'Tamam', 'yükleniyor …', 'Bu hikâye hatalar içeriyor:', 'satır {n}'),
  sv: L('Starta', 'Fortsätt', 'Börja om', 'Tillbaka', 'Ljud', 'Läs upp', 'Spela automatiskt', 'Helskärm', 'Slut', 'Hittade slut', 'OK', 'laddar …', 'Den här berättelsen innehåller fel:', 'rad {n}'),
  da: L('Start', 'Fortsæt', 'Start forfra', 'Tilbage', 'Lyd', 'Læs højt', 'Automatisk afspilning', 'Fuld skærm', 'Slut', 'Fundne slutninger', 'OK', 'indlæser …', 'Denne historie indeholder fejl:', 'linje {n}'),
  nb: L('Start', 'Fortsett', 'Start på nytt', 'Tilbake', 'Lyd', 'Les høyt', 'Automatisk avspilling', 'Fullskjerm', 'Slutt', 'Funne slutter', 'OK', 'laster …', 'Denne historien inneholder feil:', 'linje {n}'),
  fi: L('Aloita', 'Jatka', 'Aloita alusta', 'Takaisin', 'Ääni', 'Lue ääneen', 'Automaattinen toisto', 'Koko näyttö', 'Loppu', 'Löydetyt loput', 'OK', 'ladataan …', 'Tässä tarinassa on virheitä:', 'rivi {n}'),
  zh: L('开始', '继续', '重新开始', '返回', '声音', '朗读', '自动播放', '全屏', '结束', '已发现的结局', '确定', '加载中…', '这个故事包含错误：', '第 {n} 行'),
  'zh-tw': L('開始', '繼續', '重新開始', '返回', '聲音', '朗讀', '自動播放', '全螢幕', '結束', '已發現的結局', '確定', '載入中…', '這個故事包含錯誤：', '第 {n} 行'),
  ja: L('スタート', '続ける', '最初から', '戻る', 'サウンド', '読み上げ', '自動再生', '全画面', 'おしまい', '見つけたエンディング', 'OK', '読み込み中…', 'この物語にはエラーがあります：', '{n} 行目'),
  ko: L('시작', '계속', '처음부터', '뒤로', '소리', '소리 내어 읽기', '자동 재생', '전체 화면', '끝', '찾은 결말', '확인', '불러오는 중…', '이 이야기에는 오류가 있습니다:', '{n}행'),
  hi: L('शुरू करें', 'जारी रखें', 'फिर से शुरू करें', 'पीछे', 'ध्वनि', 'ज़ोर से पढ़ें', 'स्वचालित चलाएँ', 'पूर्ण स्क्रीन', 'समाप्त', 'मिले अंत', 'ठीक है', 'लोड हो रहा है …', 'इस कहानी में त्रुटियाँ हैं:', 'पंक्ति {n}'),
  id: L('Mulai', 'Lanjut', 'Mulai lagi', 'Kembali', 'Suara', 'Bacakan', 'Putar otomatis', 'Layar penuh', 'Tamat', 'Akhir yang ditemukan', 'OK', 'memuat …', 'Cerita ini berisi kesalahan:', 'baris {n}'),
  vi: L('Bắt đầu', 'Tiếp tục', 'Bắt đầu lại', 'Quay lại', 'Âm thanh', 'Đọc to', 'Tự động phát', 'Toàn màn hình', 'Hết', 'Các kết thúc đã tìm thấy', 'OK', 'đang tải …', 'Câu chuyện này có lỗi:', 'dòng {n}'),
}

// texts for screen readers: appears, disappears, keys
// (nouns where a verb would need the gender of the character)
// prettier-ignore
const spoken: Record<string, [string, string, string]> = {
  en: ['{name} appears', '{name} disappears', 'Space: continue, arrow keys: forward and back, 1–9: choose, Escape: leave the story'],
  de: ['{name} erscheint', '{name} verschwindet', 'Leertaste: weiter, Pfeiltasten: vor und zurück, 1–9: auswählen, Escape: Geschichte verlassen'],
  ar: ['دخول: {name}', 'خروج: {name}', 'المسافة: متابعة، الأسهم: للأمام وللخلف، 1–9: اختيار، Escape: مغادرة القصة'],
  fa: ['{name} ظاهر می‌شود', '{name} ناپدید می‌شود', 'فاصله: ادامه، کلیدهای جهت: جلو و عقب، 1–9: انتخاب، Escape: خروج از داستان'],
  he: ['כניסה: {name}', 'יציאה: {name}', 'רווח: המשך, חיצים: קדימה ואחורה, 1–9: בחירה, Escape: יציאה מהסיפור'],
  ur: ['داخلہ: {name}', 'رخصت: {name}', 'اسپیس: جاری رکھیں، تیر والی کلیدیں: آگے اور پیچھے، 1–9: انتخاب، Escape: کہانی سے باہر نکلیں'],
  fr: ['{name} apparaît', '{name} disparaît', 'Espace : continuer, flèches : avancer et reculer, 1–9 : choisir, Échap : quitter l’histoire'],
  es: ['{name} aparece', '{name} desaparece', 'Espacio: continuar, flechas: avanzar y retroceder, 1–9: elegir, Escape: salir de la historia'],
  it: ['{name} appare', '{name} scompare', 'Spazio: continua, frecce: avanti e indietro, 1–9: scegli, Esc: esci dalla storia'],
  pt: ['{name} aparece', '{name} desaparece', 'Espaço: continuar, setas: avançar e recuar, 1–9: escolher, Esc: sair da história'],
  'pt-br': ['{name} aparece', '{name} desaparece', 'Espaço: continuar, setas: avançar e voltar, 1–9: escolher, Esc: sair da história'],
  nl: ['{name} verschijnt', '{name} verdwijnt', 'Spatie: verder, pijltjestoetsen: vooruit en terug, 1–9: kiezen, Escape: verhaal verlaten'],
  pl: ['{name} pojawia się', '{name} znika', 'Spacja: dalej, strzałki: naprzód i wstecz, 1–9: wybór, Escape: opuść historię'],
  cs: ['{name} se objevuje', '{name} mizí', 'Mezerník: pokračovat, šipky: vpřed a zpět, 1–9: vybrat, Escape: opustit příběh'],
  sk: ['{name} sa objavuje', '{name} mizne', 'Medzerník: pokračovať, šípky: dopredu a späť, 1–9: vybrať, Escape: opustiť príbeh'],
  hr: ['{name} se pojavljuje', '{name} nestaje', 'Razmaknica: nastavi, strelice: naprijed i natrag, 1–9: odaberi, Escape: napusti priču'],
  hu: ['{name} megjelenik', '{name} eltűnik', 'Szóköz: tovább, nyilak: előre és vissza, 1–9: választás, Escape: kilépés a történetből'],
  ro: ['{name} apare', '{name} dispare', 'Spațiu: continuă, săgeți: înainte și înapoi, 1–9: alege, Escape: ieși din poveste'],
  bg: ['{name} се появява', '{name} изчезва', 'Интервал: напред, стрелки: напред и назад, 1–9: избор, Escape: изход от историята'],
  uk: ['{name} з’являється', '{name} зникає', 'Пробіл: далі, стрілки: вперед і назад, 1–9: вибір, Escape: вийти з історії'],
  ru: ['{name} появляется', '{name} исчезает', 'Пробел: дальше, стрелки: вперёд и назад, 1–9: выбор, Escape: выйти из истории'],
  el: ['{name} εμφανίζεται', '{name} εξαφανίζεται', 'Διάστημα: συνέχεια, βέλη: εμπρός και πίσω, 1–9: επιλογή, Escape: έξοδος από την ιστορία'],
  tr: ['{name} görünüyor', '{name} kayboluyor', 'Boşluk: devam, ok tuşları: ileri ve geri, 1–9: seç, Escape: hikâyeden çık'],
  sv: ['{name} dyker upp', '{name} försvinner', 'Mellanslag: fortsätt, piltangenter: framåt och bakåt, 1–9: välj, Escape: lämna berättelsen'],
  da: ['{name} dukker op', '{name} forsvinder', 'Mellemrum: fortsæt, piletaster: frem og tilbage, 1–9: vælg, Escape: forlad historien'],
  nb: ['{name} dukker opp', '{name} forsvinner', 'Mellomrom: fortsett, piltaster: fram og tilbake, 1–9: velg, Escape: forlat historien'],
  fi: ['{name} ilmestyy', '{name} katoaa', 'Välilyönti: jatka, nuolinäppäimet: eteen ja taakse, 1–9: valitse, Esc: poistu tarinasta'],
  zh: ['{name} 出现', '{name} 消失', '空格：继续，方向键：前进和后退，1–9：选择，Esc：离开故事'],
  'zh-tw': ['{name} 出現', '{name} 消失', '空白鍵：繼續，方向鍵：前進和後退，1–9：選擇，Esc：離開故事'],
  ja: ['{name} が登場', '{name} が退場', 'スペース：次へ、矢印キー：進む・戻る、1～9：選ぶ、Esc：物語から出る'],
  ko: ['{name} 등장', '{name} 퇴장', '스페이스: 계속, 화살표 키: 앞으로/뒤로, 1–9: 선택, Esc: 이야기 나가기'],
  hi: ['प्रवेश: {name}', 'प्रस्थान: {name}', 'स्पेस: आगे, तीर कुंजियाँ: आगे और पीछे, 1–9: चुनें, Escape: कहानी से बाहर निकलें'],
  id: ['{name} muncul', '{name} menghilang', 'Spasi: lanjut, tombol panah: maju dan mundur, 1–9: pilih, Escape: keluar dari cerita'],
  vi: ['{name} xuất hiện', '{name} biến mất', 'Phím cách: tiếp tục, phím mũi tên: tới và lui, 1–9: chọn, Escape: rời câu chuyện'],
}
for (const [k, [appears, disappears, keys]] of Object.entries(spoken)) Object.assign(translations[k], { appears, disappears, keys })

// objects – the other languages read the English text, a story can change it: option label.takes="…"
Object.assign(translations.en, { takes: '{name} takes {item}', gives: '{name} gives {item} to {to}', drops: '{name} puts down {item}' })
Object.assign(translations.de, { takes: '{name} nimmt {item}', gives: '{name} gibt {item} an {to}', drops: '{name} legt {item} ab' })

// the same language under another code
translations.no = translations.nb
translations.iw = translations.he
translations['zh-hk'] = translations['zh-tw']

// languages written from right to left
const RTL = new Set(['ar', 'fa', 'he', 'iw', 'ur', 'ps', 'yi', 'dv', 'ckb', 'ug', 'sd'])

/** `de-DE` → `de-de`, `Deutsch` stays as it is */
function norm(lang: string) {
  return lang.trim().replace('_', '-').toLowerCase()
}

/** the language of the page (LiaScript sets it from `language:` of the course) */
export function pageLang(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return 'en'
}

/** a language the story fixes itself (`option ui=…` or `lang …`), or null to follow the page */
export function storyLang(options: Record<string, string> = {}, lang?: string): string | null {
  return options.ui || lang || null
}

/** adds or changes texts of a language, missing texts come from English */
export function translate(lang: string, texts: Partial<Labels>) {
  const key = norm(lang)
  translations[key] = { ...(translations[key] || {}), ...texts }
}

/** all texts for a language: English ← base language ← region (pt-br) ← overrides */
export function labels(lang: string, overrides: Record<string, string> = {}): Labels {
  const l = norm(lang)
  const base = l.split('-')[0]
  const own: Partial<Labels> = {}
  for (const [k, v] of Object.entries(overrides)) {
    const m = /^label\.(\w+)$/.exec(k)
    if (m) (own as any)[m[1]] = v
  }
  return { ...(translations.en as Labels), ...(translations[base] || {}), ...(translations[l] || {}), ...own }
}

export function isRTL(lang: string) {
  return RTL.has(norm(lang).split('-')[0])
}

/** `option dir=rtl` wins, then the language */
export function direction(lang: string, options: Record<string, string> = {}): 'rtl' | 'ltr' {
  if (options.dir === 'rtl' || options.dir === 'ltr') return options.dir
  return isRTL(lang) ? 'rtl' : 'ltr'
}

/** language, texts and writing direction of a story */
export function forStory(options: Record<string, string> = {}, lang?: string) {
  const l = storyLang(options, lang) ?? pageLang()
  return { lang: l, t: labels(l, options), dir: direction(l, options) }
}

export function lineText(t: Labels, n: number) {
  return t.line.includes('{n}') ? t.line.replace('{n}', String(n)) : `${t.line} ${n}`
}

/** calls fn when the language or direction of the page changes (e.g. course translation) */
const watchers = new Set<() => void>()
let observer: MutationObserver | null = null

export function watch(fn: () => void): () => void {
  watchers.add(fn)
  if (!observer && typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    observer = new MutationObserver(() => watchers.forEach((w) => w()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] })
  }
  return () => watchers.delete(fn)
}
