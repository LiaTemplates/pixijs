<!--
author:   André Dietrich
email:    LiaScript@web.de
version:  0.3.1
language: en
narrator: US English Female
comment:  Interactive, branching picture stories for LiaScript, rendered with
          PixiJS. Write scenes, characters, dialog, choices, point & click
          hotspots, effects, sound and speech line by line in a code block,
          grade the endings in quizzes, and extend everything with JavaScript.

script:   dist/index.js

attribute: [PixiJS](https://pixijs.com) by Mat Groves and contributors
           is licensed under [MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE)


@Pixi.story: @Pixi.story_(@uid,```@0```)

@Pixi.story_
<script modify="false">
if (window.LiaPixi) {
  LiaPixi.story("pixi-@0", "@'1", send)
} else {
  // the bundle is still loading
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    if (LiaPixi.story("pixi-@0", "@'1", send) !== "LIA: wait") send.lia("LIA: stop")
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.run: @Pixi.run_(@uid)

@Pixi.run_
<script>
function annotate(e) {
  if (e.liaErrors && typeof LiaError !== "undefined") {
    let err = new LiaError(e.message, 1)
    for (const d of e.liaErrors) err.add_detail(0, d.message, "error", d.line - 1, 0)
    throw err
  }
  console.error(e.message)
  return "LIA: stop"
}

if (window.LiaPixi) {
  try {
    LiaPixi.run("pixi-@0", "@'input", send)
  } catch (e) {
    annotate(e)
  }
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    try {
      if (LiaPixi.run("pixi-@0", "@'input", send) !== "LIA: wait") send.lia("LIA: stop")
    } catch (e) {
      console.error(e.message)
      send.lia("LIA: stop")
    }
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>

@Pixi.autorun(@0)
@end


@Pixi.load: @Pixi.load_(@uid,@0)

@Pixi.load_
<script modify="false">
if (window.LiaPixi) {
  LiaPixi.load("pixi-@0", "@1", send)
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    LiaPixi.load("pixi-@0", "@1", send)
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.js: @Pixi.js_(@uid,16:9)

@Pixi.js.ratio: @Pixi.js_(@uid,@0)

@Pixi.js_
<script>
function annotate(e) {
  if (e.liaErrors && typeof LiaError !== "undefined") {
    let err = new LiaError(e.message, 1)
    for (const d of e.liaErrors) err.add_detail(0, d.message, "error", d.line - 1, 0)
    throw err
  }
  console.error(e.message)
  return "LIA: stop"
}

if (window.LiaPixi) {
  try {
    LiaPixi.js("pixi-@0", "@'input", send, "@1")
  } catch (e) {
    annotate(e)
  }
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    try {
      if (LiaPixi.js("pixi-@0", "@'input", send, "@1") !== "LIA: wait") send.lia("LIA: stop")
    } catch (e) {
      console.error(e.message)
      send.lia("LIA: stop")
    }
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>

@Pixi.autorun(@0)
@end


@Pixi.scene: @Pixi.scene_(@uid,```@0```)

@Pixi.scene_
<script modify="false">
function run() {
  try {
    return LiaPixi.js("pixi-@0", "@'1", send, "16:9")
  } catch (e) {
    console.error(e.message)
    return "LIA: stop"
  }
}
if (window.LiaPixi) {
  run()
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    if (run() !== "LIA: wait") send.lia("LIA: stop")
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.autorun
<script modify="false">
// runs the code block once when the slide is shown
let tries = 0
function autorun() {
  let el = document.getElementById("pixi-@0")
  if (!el) {
    if (tries++ < 50) setTimeout(autorun, 50)
    return
  }
  if (el.querySelector("lia-pixi-story")) return
  while (el && !(el.classList && el.classList.contains("lia-code--block"))) {
    el = el.previousElementSibling
  }
  const button = el && el.querySelector("button[aria-keyshortcuts]")
  if (button) button.click()
}
setTimeout(autorun, 50)
"LIA: stop"
</script>
@end


@Pixi.check
[[!]]
<script>
window.LiaPixi ? LiaPixi.check("@0", "@'1") : false
</script>
@end


@Pixi.state
<script modify="false" style="display: block">
window.__liaPixiState = window.__liaPixiState || {}
function show() {
  send.lia("HTML: " + LiaPixi.stateHTML("@0"))
}
function init() {
  if (window.__liaPixiState["@0"]) window.__liaPixiState["@0"]()
  window.__liaPixiState["@0"] = LiaPixi.on("*", (story) => {
    if (story.id === "@0") show()
  })
  show()
}
if (window.LiaPixi) init()
else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    init()
  }, 50)
}
"LIA: wait"
</script>
@end


@Pixi.plugin: @Pixi.plugin_(```@0```)

@Pixi.plugin_
<script run-once modify="false">
window.LiaPixiPlugins = window.LiaPixiPlugins || []
window.LiaPixiPlugins.push(function (LiaPixi) {
  try {
    new Function("LiaPixi", "PIXI", "@'0")(LiaPixi, LiaPixi.PIXI)
  } catch (e) {
    console.error("LiaPixi plugin: " + e.message)
  }
})
"LIA: stop"
</script>
@end
-->

# PixiJS Stories – Template

    --{{0}}--
This template turns a code block into an interactive picture story: a stage
with backgrounds and characters, dialog, choices and endings – rendered with
[PixiJS](https://pixijs.com).

Write a story line by line, like a screenplay. The stage, the dialog box, the
choices, speech and the saved progress are taken care of. Teachers need no
JavaScript, developers can extend everything with it.

```text @Pixi.story
story welcome "Welcome to the PixiJS stories"
bg   park  base:village
char mia   "Mia"  base:girl   color=#e8556d voice="en-US Female"
char robo  "Robo" base:robot  color=#4fa3d1 voice="en-US Male"

# start
bg park fade 1
show mia happy at left from offleft
mia: Hi! I am Mia. This whole scene is written in a code block.
show robo at right fade 0.6
robo: And I am Robo. Shall we show them what we can do?
? Yes, show me!          -> demo
? No, I just want to read -> bye

# demo
move mia to center 0.8s
mia surprised: Characters move, change their faces …
shake small
robo laugh: … the stage shakes, flashes, zooms and plays sounds!
sound base:magic
flash #ffffff
zoom 1.4 on mia 1s
mia wink: And every decision changes the story.
zoom 1 0.6s
end demo "Scroll down to learn how it works."

# bye
robo sad: Okay … see you later!
hide robo to offright 1s
end bye
```

- __Try it on LiaScript:__
  https://liascript.github.io/course/?https://raw.githubusercontent.com/LiaTemplates/pixijs/main/README.md
- __See the project on GitHub:__ https://github.com/LiaTemplates/pixijs

---

                         {{1}}
<section>

There are three ways to use this template. The easiest is to import it into
your course with the `import:` statement in the header:

`import: https://raw.githubusercontent.com/LiaTemplates/pixijs/main/README.md`

or use a fixed version, so that later changes cannot break your course:

`import: https://raw.githubusercontent.com/LiaTemplates/pixijs/0.3.1/README.md`

You can also copy the macros from the [Implementation](#implementation) section
into your own header, or load only the bundle with
`script: https://raw.githubusercontent.com/LiaTemplates/pixijs/main/dist/index.js`
and use the JavaScript API.

</section>

## Quick start

    --{{0}}--
A story has two parts. The head defines what appears on the stage. After the
first label (a line starting with `#`) follows what happens.

```text @Pixi.story
// the head: backgrounds, characters and variables
bg   forest base:forest
char ben    "Ben" base:boy color=#3d7be0

// the story
# start
bg forest
show ben happy
ben: Hello! Click, tap or press space to continue.
: Lines without a name are narration.
? Click me        -> clicked
? Or click me     -> clicked

# clicked
ben laugh: That was easy!
```

```text
bg   forest base:forest              ← name and source of a background
char ben "Ben" base:boy color=#3d7be0 ← id, displayed name, figure, options

# start                              ← a label: the story begins here
bg forest                            ← show the background
show ben happy                       ← show Ben with a happy face
ben: Hello! …                        ← Ben speaks
: Lines without a name …             ← narration
? Click me -> clicked                ← a choice that jumps to # clicked
```

Put the story into a code block and add `@Pixi.story` behind the three
backticks. To let learners change the story, use `@Pixi.run` below the code
block instead (see [Editable stories](#editable-stories)).

## The head

    --{{0}}--
The lines before the first label define the story. Everything can be given a
short name, which is then used in the story.

```text
story  trip "The class trip"   ← an id (to save progress, for quizzes) and a title
stage  16:9 #203040            ← aspect ratio (16:9, 4:3, 1:1, …) and background color
lang   en-US                   ← language for reading aloud (default: the course)
base   https://example.org/img/ ← where relative files are loaded from (optional)

bg     forest base:forest      ← builtin background
bg     beach  img/beach.jpg  alt="A sunny beach" ← an image, alt= is read by screen readers
bg     intro  video/intro.mp4  ← a looping video
bg     dusk   #ff9966..#334   ← a color or a gradient

char   mia  "Mia"  base:girl  color=#e8556d voice="en-US Female"
char   bot  "Bot"  emoji=🤖   happy=😀 sad=😢
char   anna "Anna" img/anna.png happy=img/anna-happy.png talk=img/anna-talk.png
                               ← + happy.talk=… blink=… idle=breathe, see "Image characters that feel alive"
char   cat  "Cat"  sheet=img/cat.json anim=idle

image  key   img/key.png  scale=0.3   ← an object that can be shown like a character
sound  bell  sounds/bell.mp3
music  theme sounds/theme.mp3

var    courage = 0             ← variables with a start value
var    name    = "friend"

option textspeed=45 auto=off tts=on dim=on hint=on
```

| option      | meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `textspeed` | letters per second of the typewriter effect, `0` shows the text at once |
| `auto`      | continue automatically after each line                          |
| `tts`       | read the dialog aloud (default: the sound setting of LiaScript) |
| `sound`     | sound effects and music                                         |
| `dim`       | darken the characters that do not speak                         |
| `hint`      | let hotspots pulse, so they can be found                        |
| `ui`        | language of the buttons, e.g. `ui=ar` (see [Languages](#languages)) |
| `dir`       | `rtl` or `ltr`, normally taken from the language               |
| `label.…`   | an own text for a button, e.g. `label.continue="Go on"`         |

Characters accept `scale=`, `y=` (1 = bottom of the stage), `flip=yes`,
`height=` (fraction of the stage height) and `voice=`, `pitch=`, `rate=`.

Backgrounds and images accept `alt="…"`, a short description for screen
readers. Without it, their id is read (`forest`, `key`).

## Dialog

    --{{0}}--
A line with a name and a colon is spoken by that character. An expression in
front of the colon changes the face. Indented lines continue the text.

```text @Pixi.story
char mia  "Mia"  base:girl    color=#e8556d
char leo  "Leo"  base:student color=#2f9e5b

# start
show mia at left
show leo at right
mia: A line of dialog.
leo happy: With an expression: happy, sad, angry, surprised …
mia thinking: Long texts can continue
  on the next indented lines.
: Narration has no name.
> This is narration too.
Narrator: Names that are not defined are shown as they are.
mia: Variables are inserted with braces: 1 + 2 = {1 + 2}.
```

Text in braces is an expression: `{name}`, `{courage * 10}`,
`{courage > 2 ? "brave" : "careful"}`. Write `\{` for a brace.

## Choices and labels

    --{{0}}--
Choices are lines that start with a question mark. Consecutive choices form one
menu. The arrow points to the label where the story continues.

```text @Pixi.story
char mia "Mia" base:girl color=#e8556d
var courage = 0

# start
show mia
mia: Where shall we go?
? Into the dark forest -> forest [courage += 2]
? Along the river      -> river  [courage += 1]
? Secret path          -> secret [if courage > 5]
? Stay here
mia: Then we stay here. (A choice without arrow just continues.)
-> start

# forest
mia scared: It is so dark here … courage: {courage}
-> finish

# river
mia happy: The water is so clear! courage: {courage}
-> finish

# secret
: Nobody finds this.
-> finish

# finish
if courage > 1 -> brave
end careful "You were careful."

# brave
end brave "You were brave!"
```

| line                          | meaning                                              |
| ----------------------------- | ---------------------------------------------------- |
| `# name`                      | a label; the story starts at the first one           |
| `-> name`                     | continue at a label                                  |
| `-> end`                      | end the story                                        |
| `? text -> name`              | a choice                                             |
| `? text -> name [x += 1]`     | … that changes variables (several: `[x += 1; y = 2]`) |
| `? text -> name [if x > 2]`   | … that is only shown if the condition is true        |
| `call name` / `return`        | run a label like a subroutine and come back          |
| `end name "text"`             | an ending with a name and a text                     |

> __Important:__ When a label is reached without a jump, the story ends. Use
> `-> next` to continue with the next part.

## Variables and conditions

    --{{0}}--
Variables count points, remember decisions or store names. Conditions use them
to choose a path.

```text @Pixi.story
var apples = 0
var name = ""

# start
input name "What is your name?"
: Hello {name}! Let's collect apples.
? Take an apple -> take
? Stop          -> count

# take
set apples += 1
sound base:pop
: You have {apples} apple{apples == 1 ? "" : "s"}.
if apples >= 3: : That's a lot, {name}!
? Take another one -> take
? Stop             -> count

# count
if apples == 0 -> none
end full "{name} collected {apples} apples."

# none
end empty "No apples at all?"
```

| line                       | meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| `set x = 1`, `set x += 1`  | change a variable (`=`, `+=`, `-=`, `*=`, `/=`)          |
| `if cond -> label`         | jump, if the condition is true (`else -> other` is possible) |
| `if cond: <line>`          | run one line, if the condition is true                   |
| `input name "Question?"`   | ask the reader, numbers are stored as numbers            |

Conditions are JavaScript expressions. `and`, `or` and `not` can be used as
words. There are some helpers: `visited("forest")`, `chosen("Stay here")`,
`random(6)` (1 to 6), `random(2, 5)`, `ending` and `endings`.

## Stage and characters

    --{{0}}--
Characters enter, move and leave the stage. Positions are names or fractions of
the stage width.

```text @Pixi.story
bg   room base:room
char mia "Mia" base:girl    color=#e8556d
char tom "Tom" base:boy     color=#3d7be0
char ted "Ted" base:grandpa color=#6f8b4c

# start
bg room fade 1
show mia at left fade 1
show tom at right from offright
tom: I came in from the right.
move mia to center 1.5s ease=bounce
mia surprised: Boing!
show ted at far-left fade 0.5 flip
ted: And I look the other way.
move ted to far-right 2s
move tom to left 0.6s flip
tom: Now I look back.
show mia scale=1.3 y=1.1
mia: I am bigger now.
hide all fade 1
: Empty stage.
```

| line                                     | meaning                                     |
| ---------------------------------------- | ------------------------------------------- |
| `bg forest fade 1`                       | change the background (cross-fade in seconds) |
| `bg none`                                | remove the background                       |
| `show mia happy at left fade 0.5`        | show with expression, position and fade     |
| `show mia from offleft at center 1s`     | slide in from a position                    |
| `show mia sad`                           | change the expression only                  |
| `move mia to right 2s ease=out`          | move (`ease=` linear, in, out, inout, back, bounce, elastic) |
| `show mia flip`, `scale=1.2`, `y=0.9`    | mirror, size, height (1 = bottom)           |
| `show anna unsure idle=fidget`           | change the idle motion of an image or spritesheet character (`breathe`, `fidget`, `none`) |
| `hide mia fade 1` / `hide mia to offright` / `hide all` | leave the stage              |

Positions: `offleft`, `far-left`, `left`, `center-left`, `center`,
`center-right`, `right`, `far-right`, `offright`, or `30%`, `0.3`.

## Effects

    --{{0}}--
Effects underline what happens: a shaking stage, a flash, a zoom, a colored
light or a fade to black.

```text @Pixi.story
bg   town base:village
char mia "Mia" base:girl color=#e8556d

# start
bg town
show mia
mia: Watch this!
shake big 0.8s
mia surprised: An earthquake!
flash #ffff88 0.5s
sound base:thunder
mia scared: Lightning!
tint night 2s
mia: Now it is night.
tint sunset 2s
mia happy: … and now sunset.
tint none 1s
zoom 1.6 on mia 1s
mia wink: Close-up!
zoom 1 1s
blur 8 1s
mia sleepy: Everything gets blurry …
blur 0 1s
fade out black 1s
wait 1s
fade in 1s
mia laugh: Back again!
```

| line                              | meaning                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `shake [small/medium/big/huge] 0.5s` | shake the stage                                           |
| `flash [#color] 0.4s`             | a short flash                                                |
| `zoom 1.5 [on mia] 1s`, `zoom 1`  | zoom in (on a character) and back                            |
| `tint night/evening/sunset/dawn/sepia/fog/dark 1s`, `tint #ff0000 0.3`, `tint none` | colored light |
| `blur 8 1s`, `blur 0`             | blur the background                                          |
| `fade out [#color] 1s`, `fade in 1s` | fade the whole stage                                     |
| `wait 1s`, `wait click`           | pause                                                        |
| `title "Chapter 1" "subtitle" [3s]` | a title card (click or wait)                               |

## Sound

    --{{0}}--
Sound effects can be your own files or one of the builtin sounds, which are
synthesized in the browser and need no files.

```text @Pixi.story
# start
: Click through the builtin sounds.
sound base:pop
: pop
sound base:ding
: ding
sound base:success
: success
sound base:fail
: fail
sound base:magic
: magic
sound base:splash
: splash
sound base:knock
: knock
sound base:door
: door
sound base:coin
: coin
sound base:thunder
: thunder
```

| line                                | meaning                                          |
| ----------------------------------- | ------------------------------------------------ |
| `sound base:pop`                    | builtin: pop, click, ding, bell, success, fail, magic, whoosh, splash, knock, step, thunder, door, boing, beep, coin |
| `sound bell volume=0.5`             | a sound from the head or a file `sound img/bell.mp3` |
| `music theme volume=0.4 fade 2s`    | looping background music                         |
| `stop music fade 2s`                | stop the music                                   |

The ♪ button on the stage switches sound and music off and on.

## Reading aloud

    --{{0}}--
Every line can be read aloud by the speech synthesis of the browser. Each
character can have an own voice. If the browser has no fitting voice, the
pitch is changed instead.

```text @Pixi.story
lang en-US
option tts=on
char mia  "Mia"  base:girl    voice="en-US Female" color=#e8556d
char robo "Robo" base:robot   voice="en-GB Male" pitch=0.6 rate=0.9 color=#4fa3d1
char opa  "Opa"  base:grandpa voice="Deutsch Male" color=#6f8b4c

# start
show mia at left
show robo at center
show opa at right
mia: Hello, I speak with a female English voice.
robo: I am a robot. My voice is deeper and slower.
opa: Und ich spreche Deutsch.
```

`voice=` accepts a language (`de-DE`, `en-GB`), the voice names of the
LiaScript narrator (`Deutsch Female`, `UK English Male`) or a part of the name
of an installed voice (`Google Deutsch`). Use `pitch=` and `rate=` (0.5 – 2)
to fine-tune. The 🗣 button switches reading aloud off and on; by default it
follows the sound setting of LiaScript. The mouths of the characters move
while they speak.

## Point and click

    --{{0}}--
Hotspots are invisible buttons on the stage. They turn a scene into a small
adventure game. Hotspots and choices that follow each other form one menu.

```text @Pixi.story
bg   room base:room
char mia "Mia" base:girl color=#e8556d

# start
bg room
show mia at center
mia: I lost my key! Can you find it? Click on the room.
-> search

# search
hotspot 0.10,0.15,0.25,0.38 -> window  "Window"
hotspot 0.65,0.40,0.24,0.30 -> desk    "Desk"
hotspot 0.25,0.80,0.50,0.18 -> carpet  "Carpet"
hotspot mia                 -> mia     "Mia"
? I give up -> giveup

# window
: Only birds outside.
-> search

# desk
: Papers, pens … no key.
-> search

# mia
mia thinking: Don't look at me!
-> search

# carpet
sound base:coin
mia laugh: You found it! Under the carpet!
end found

# giveup
mia sad: Oh no …
end lost
```

| line                                   | meaning                                          |
| -------------------------------------- | ------------------------------------------------ |
| `hotspot x,y,w,h -> label "tooltip"`   | a rectangle; fractions (0 – 1) or pixels of the stage |
| `hotspot mia -> label`                 | a character or image on the stage is clickable   |

Rectangles start at the top left corner. With the `stage` size of 1600 × 900
you can also use pixels: `hotspot 160,135,400,340 -> window`.

## Languages

    --{{0}}--
The buttons and messages of the stage follow the language of the course. For
right-to-left languages like Arabic, Persian or Hebrew the stage is mirrored:
the name plate, the toolbar and the arrow keys change sides.

```text @Pixi.story
lang ar
char layla "ليلى" base:girl color=#e8556d voice="ar-SA Female"
char omar  "عمر"  base:boy  color=#3d7be0 voice="ar-SA Male"

# start
bg base:village
show layla happy at right
show omar at left
layla: مرحبا! هذه قصة باللغة العربية.
omar: كل الأزرار تظهر بالعربية أيضًا.
? إلى السوق -> market
? إلى البيت -> home

# market
layla laugh: هيا بنا إلى السوق!
end market

# home
omar: سنعود إلى البيت.
end home
```

The language is taken from (first wins):

1. `option ui=ar` – only the buttons
2. `lang ar` – the language of the story (also used for reading aloud)
3. `language: ar` in the header of the course – the stage also follows when
   the course is translated later
4. the language of the browser

Builtin are English, German, Arabic, Persian, Hebrew, Urdu, French, Spanish,
Italian, Portuguese (also `pt-BR`), Dutch, Polish, Czech, Slovak, Croatian,
Hungarian, Romanian, Bulgarian, Ukrainian, Russian, Greek, Turkish, Swedish,
Danish, Norwegian, Finnish, Chinese (also `zh-TW`), Japanese, Korean, Hindi,
Indonesian and Vietnamese. Missing texts are shown in English.

Single texts can be changed in a story, other languages can be added for all
stories of a course:

``` text
option label.continue="Go on" label.restart="Once more"
```

``` js
LiaPixi.translate('eo', {
  start: 'Komenci', continue: 'Daŭrigi', restart: 'Rekomenci', back: 'Reen',
  sound: 'Sono', voice: 'Laŭtlegi', auto: 'Aŭtomate', fullscreen: 'Plenekrane',
  end: 'Fino', endings: 'Trovitaj finoj', ok: 'Bone', loading: 'ŝargante …',
  errors: 'Ĉi tiu rakonto enhavas erarojn:', line: 'linio {n}'
})
```

Texts of a line are written in their own direction, so an Arabic sentence in an
English course or an English word in an Arabic sentence is shown correctly.

## Builtin characters

    --{{0}}--
The builtin characters are drawn by the template, so they can change their face
and move their mouths. Colors and hair can be changed.

```text @Pixi.story
char a "girl"    base:girl
char b "boy"     base:boy
char c "woman"   base:woman
char d "man"     base:man
char e "teacher" base:teacher
char f "grandma" base:grandma
char g "grandpa" base:grandpa
char h "kid"     base:kid
char i "student" base:student
char j "robot"   base:robot
char k "custom"  base:girl skin=#8d5524 hair=#d23 shirt=#222 hairstyle=curly glasses=yes

# start
show a at 8%
show b at 17%
show c at 26%
show d at 35%
show e at 44%
show f at 53%
show g at 62%
show h at 71%
show i at 80%
show j at 89%
: Ten builtin characters. Click to see their expressions.
show a happy
show b happy
show c happy
show d happy
show e happy
show f happy
show g happy
show h happy
show i happy
show j happy
: happy
show a sad
show b angry
show c surprised
show d thinking
show e wink
show f scared
show g laugh
show h sleepy
show i sad
show j angry
: sad, angry, surprised, thinking, wink, scared, laugh, sleepy …
hide all
show k at center fade 0.5
k: Change skin, hair, shirt, eyes, hairstyle (short, long, bun, ponytail, curly,
  spiky, bald, bob), glasses, beard and mustache.
```

Expressions: `neutral`, `happy`, `sad`, `angry`, `surprised`, `thinking`,
`wink`, `scared`, `laugh`, `sleepy`.

Characters can also be images (`char anna "Anna" img/anna.png`) with one image
per expression (`happy=img/anna-happy.png`) and a speaking image
(`talk=img/anna-talk.png`), an emoji (`emoji=🦊 happy=😺`), or a spritesheet
(`sheet=cat.json`, expressions are animation names).

### Image characters that feel alive

Image characters can speak and blink with every face and breathe while they
wait. All of it is optional, a character with one image still works.

```text
char khadija "Khadija" img/k/neutral.png talk=img/k/neutral-talk.png blink=img/k/neutral-blink.png sad=img/k/sad.png sad.talk=img/k/sad-talk.png sad.blink=img/k/sad-blink.png unsure=img/k/unsure.png unsure.talk=img/k/unsure-talk.png idle=breathe

# start
show khadija at left fade 0.5
khadija: Hello, I am Khadija.
khadija sad: This is my sad face – and it talks with a sad mouth.
show khadija unsure idle=fidget
khadija: I am not so sure about it …
show khadija idle=breathe
```

The `char` definition must stay on one line.

| key             | meaning                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `talk=`         | mouth open, used while speaking for every expression without its own `.talk` |
| `<expr>.talk=`  | mouth open for this expression, e.g. `sad.talk=img/k/sad-talk.png`           |
| `blink=`        | eyes closed, for the first image (and expressions without an image)          |
| `<expr>.blink=` | eyes closed for this expression, e.g. `sad.blink=img/k/sad-blink.png`        |
| `idle=`         | `breathe` (a slow, very small rise and fall), `fidget` (breathing plus small, irregular shifts of weight and a slight tilt – unsure, nervous) or `none` (default) |

* While a line is spoken, the mouth switches between the image of the
  expression and its talking image: `<expr>.talk`, else `talk`. Without any
  talking image the figure is stretched a tiny bit instead.
* The eyes close every 2.5 – 6 seconds for a moment, like the builtin
  characters, but never while the character speaks. An expression that has its
  own image only blinks with its own `<expr>.blink` – a neutral blink would
  flash the wrong face.
* `idle=` in the `char` line is the default, `show … idle=fidget` or
  `move … idle=none` changes it for the scene. It also works for spritesheet
  characters and `image` objects.
* Spritesheets: if there is an animation `<name>_talk` (e.g. `idle_talk` next
  to `idle`), it is played while the character speaks.
* With "reduce motion" in the system settings, there is no idle motion.
  Talking and blinking images still change.

__Recommended images__

* All images of a character have the __same canvas size__, e.g. 900 × 1200 px,
  as transparent PNG (or WebP).
* The figure stands __bottom-centered at the same baseline__ in every image:
  images are anchored at the bottom center, so a shifted figure jumps when the
  image changes. Leave a little room at the top and sides for the idle motion.
* Per expression three frames: __rest__ (mouth closed, eyes open), __talk__
  (mouth open) and __blink__ (eyes closed), which differ only in mouth and eyes.
  Easiest: draw the rest frame, copy it and change only the mouth or the eyes.

## Builtin backgrounds

```text @Pixi.story
# start
bg base:forest fade 0.5
: forest
bg base:river fade 0.5
: river
bg base:village fade 0.5
: village
bg base:room fade 0.5
: room
bg base:classroom fade 0.5
: classroom
bg base:beach fade 0.5
: beach
bg base:city fade 0.5
: city
bg base:mountains fade 0.5
: mountains
bg base:night fade 0.5
: night
bg base:space fade 0.5
: space
bg base:sky fade 0.5
: sky
bg #ffcc66..#cc3366 fade 0.5
: and any color or gradient: #ffcc66..#cc3366
```

## Editable stories

    --{{0}}--
With `@Pixi.run` below a code block, learners can change the story and run it
again. Errors are marked in the editor at the right line.

```text
bg   space base:space
char robo "Robo" base:robot color=#4fa3d1

# start
bg space fade 1
show robo happy
robo: Change my text and press the run button!
? Try an error -> error
? End          -> end

# error
robo: Remove the slashes in the next line to see an error.
// shwo robo
end
```
@Pixi.run

## Stories from files

    --{{0}}--
Long stories can be kept in their own file. Relative images and sounds in it
are loaded from the folder of that file.

``` markdown
@[Pixi.load](examples/lost-key.txt)
```

@[Pixi.load](examples/lost-key.txt)

## Quizzes and progress

    --{{0}}--
The progress of every story is saved in the browser. When the reader comes
back, the story can be continued. Endings, variables and the path through the
story can be checked in quizzes.

Give the story an id with the `story` line, here `quiz-demo`:

```text @Pixi.story
story quiz-demo "The bridge"
bg   river base:river
char mia "Mia" base:girl color=#e8556d
var points = 0

# start
bg river
show mia
mia: The bridge is broken. What do we do?
? Build a raft     -> raft  [points += 2]
? Swim             -> swim
? Go back          -> back

# raft
mia happy: Great idea, we made it!
end safe

# swim
mia scared: Brrr, it's cold – but we made it.
set points += 1
end wet

# back
mia sad: Then we never see the other side.
end back
```

__Did you reach the safe ending?__

@Pixi.check(quiz-demo, ending == "safe")

__The state of the story:__

@Pixi.state(quiz-demo)

``` markdown
@Pixi.check(quiz-demo, ending == "safe")

@Pixi.check(quiz-demo, `points >= 2 and visited("raft")`)

@Pixi.state(quiz-demo)
```

`@Pixi.check(id, condition)` creates a quiz that is solved when the condition
is true. Wrap conditions that contain commas in backticks. Available are all
variables and `done`, `ending`, `endings` (all endings that were ever
reached), `visited(label)` and `chosen(text)`.

In your own scripts use `LiaPixi.get("quiz-demo")` and
`LiaPixi.check("quiz-demo", 'ending == "safe"')`. `LiaPixi.reset(id)` deletes
the saved progress.

## Using the stage

The buttons at the top right of the stage:

| button | meaning                                          | keys                  |
| ------ | ------------------------------------------------ | --------------------- |
| ↶      | back to the previous line or choice              | ← / ↑ / Backspace     |
| ↺      | start again                                      |                       |
| ♪      | sound and music on/off                           |                       |
| 🗣     | reading aloud on/off                             |                       |
| ⏩     | continue automatically                           |                       |
| ⛶      | fullscreen                                       | f                     |
|        | continue                                         | click, space, enter, → |
|        | pick a choice                                    | 1 – 9                 |
|        | leave the stage (the keys belong to the course)  | Esc, Tab              |

On the start and end screen, and when there is nothing to go back to, the
arrow keys go to LiaScript and change the slide.

### Accessibility

* Screen readers hear every line once it is shown (not letter by letter), and
  what changes in the scene: the background (its `alt=`), who appears and who
  disappears, titles and the end. The stage also says which keys it uses.
* Choices and hotspots are buttons and can be reached with Tab. A hotspot on a
  character or image gets a button too, so it can be used without a mouse.
  Give hotspots a tooltip text, it is their name for screen readers.
* The stage only takes the focus when the reader is already in it, and gives it
  back to the stage when a focused button disappears. Esc leaves the stage.
* With "reduce motion" in the system settings, `shake` and `flash` are skipped,
  the bouncing and pulsing marks stand still and image characters do not
  breathe or fidget (`idle=`).

## Extending

    --{{0}}--
Everything the story language does is built from commands. You can add your
own commands, character types and react to events of all stories.

```js @Pixi.plugin
LiaPixi.defineCommand('confetti', {
  // the rest of the line → arguments (throw an Error to report a mistake)
  parse: (rest) => ({ count: parseInt(rest) || 80 }),
  // ctx: app, PIXI, stage, layers, tween, W, H, vars, view, actor(id), …
  run: async (ctx, args) => {
    const { PIXI, layers, W, H, tween } = ctx
    const colors = [0xe8556d, 0x3d7be0, 0xf2b632, 0x2bb39b]
    const jobs = []
    for (let i = 0; i < args.count; i++) {
      const p = new PIXI.Graphics().rect(-8, -4, 16, 8).fill(colors[i % 4])
      p.position.set(Math.random() * W, -20)
      p.rotation = Math.random() * 6
      layers.fx.addChild(p)
      jobs.push(
        tween(p, { y: H + 40, rotation: p.rotation + 6 }, 1.5 + Math.random(), 'in')
          .then(() => p.destroy())
      )
    }
    await Promise.all(jobs)
  }
})
```

```text @Pixi.story
char mia "Mia" base:girl color=#e8556d

# start
show mia happy
mia: My own command:
confetti 120
mia laugh: Yay!
```

The code block with `@Pixi.plugin` is not shown in the course, it is only
executed. Plugins can also be put into a file and loaded with
`script: my-plugin.js` after the import, or registered in the header before the
bundle is loaded:

``` html
@onload
window.LiaPixiPlugins = (window.LiaPixiPlugins || []).concat(LiaPixi => {
  LiaPixi.defineCommand('hello', { run: ctx => ctx.view.say(null, 'Hello!', {}) })
})
@end
```

__The JavaScript API__

| function                                  | meaning                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `LiaPixi.defineCommand(name, {parse, run, checkpoint})` | a new story command; `checkpoint: true` if it waits for the reader |
| `LiaPixi.defineActor(type, (ctx, def) => container)` | a new character type: `char x "X" type=<type>` |
| `LiaPixi.on(event, (story, data) => …)`   | `start`, `resume`, `label`, `say`, `choice`, `end`, `error` or `*` |
| `LiaPixi.get(id)` / `check(id, expr)` / `reset(id)` | state of a story                               |
| `LiaPixi.parse(source)`                   | `{ script, errors }` without running it                  |
| `LiaPixi.translate(lang, texts)`          | add or change the texts of the stage for a language      |
| `LiaPixi.PIXI`, `window.PIXI`             | the bundled PixiJS                                       |

Inside a story, `js:` runs JavaScript with the same `ctx` (and the variables
as `vars`):

```text @Pixi.story
var dice = 0

# start
: Let's roll a dice.
js: vars.dice = 1 + Math.floor(Math.random() * 6)
: You rolled a {dice}.
if dice == 6 -> six
end
# six
: A six!
```

## Pure PixiJS: `@Pixi.js`

    --{{0}}--
For your own animations and games you can use PixiJS directly. The code block
gets a stage of 1600 × 900 units that is scaled to the slide.

```js
// available: PIXI, app, stage, W, H, tween, wait, sound, onFrame
const sun = new PIXI.Graphics().circle(0, 0, 120).fill(0xffcc33)
sun.position.set(W / 2, H / 2)
stage.addChild(sun)

const label = new PIXI.Text({ text: 'Click the sun', style: { fill: 0xffffff, fontSize: 64 } })
label.anchor.set(0.5)
label.position.set(W / 2, H - 120)
stage.addChild(label)

sun.eventMode = 'static'
sun.cursor = 'pointer'
sun.on('pointertap', async () => {
  sound('base:boing')
  await tween(sun.scale, { x: 1.5, y: 1.5 }, 0.3, 'out')
  await tween(sun.scale, { x: 1, y: 1 }, 0.5, 'bounce')
})

onFrame((ms) => (sun.rotation += ms / 1000))
```
@Pixi.js

Use `@Pixi.js.ratio(4:3)` for another aspect ratio and the block macro
`@Pixi.scene` for code that should not be shown.

## Implementation

The template is a TypeScript project, bundled with
[Parcel](https://parceljs.org) into `dist/index.js` (PixiJS included):

```bash
npm install
npm run build       # bundle src/ → dist/index.js
npm test            # parser and story runtime
npm run typecheck
npm run serve       # live preview of this README
```

| file                    | content                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `src/dsl/parser.ts`     | the story language → list of commands, errors with lines   |
| `src/runtime/story.ts`  | runs a story: labels, variables, checkpoints, back, endings |
| `src/runtime/commands.ts` | all builtin commands (the same API as `defineCommand`)   |
| `src/stage.ts`          | the PixiJS stage: backgrounds, characters, effects         |
| `src/ui.ts`             | dialog, choices, hotspots and screens as HTML              |
| `src/i18n.ts`           | texts of the stage in 32 languages, right-to-left          |
| `src/element.ts`        | `<lia-pixi-story>`: lifecycle, keys, saving                |
| `src/base/`             | builtin characters and backgrounds                         |

The macros:

``` html
script:   dist/index.js

@Pixi.story: @Pixi.story_(@uid,```@0```)

@Pixi.story_
<script modify="false">
if (window.LiaPixi) {
  LiaPixi.story("pixi-@0", "@'1", send)
} else {
  // the bundle is still loading
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    if (LiaPixi.story("pixi-@0", "@'1", send) !== "LIA: wait") send.lia("LIA: stop")
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.run: @Pixi.run_(@uid)

@Pixi.run_
<script>
function annotate(e) {
  if (e.liaErrors && typeof LiaError !== "undefined") {
    let err = new LiaError(e.message, 1)
    for (const d of e.liaErrors) err.add_detail(0, d.message, "error", d.line - 1, 0)
    throw err
  }
  console.error(e.message)
  return "LIA: stop"
}

if (window.LiaPixi) {
  try {
    LiaPixi.run("pixi-@0", "@'input", send)
  } catch (e) {
    annotate(e)
  }
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    try {
      if (LiaPixi.run("pixi-@0", "@'input", send) !== "LIA: wait") send.lia("LIA: stop")
    } catch (e) {
      console.error(e.message)
      send.lia("LIA: stop")
    }
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>

@Pixi.autorun(@0)
@end


@Pixi.load: @Pixi.load_(@uid,@0)

@Pixi.load_
<script modify="false">
if (window.LiaPixi) {
  LiaPixi.load("pixi-@0", "@1", send)
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    LiaPixi.load("pixi-@0", "@1", send)
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.js: @Pixi.js_(@uid,16:9)

@Pixi.js.ratio: @Pixi.js_(@uid,@0)

@Pixi.js_
<script>
function annotate(e) {
  if (e.liaErrors && typeof LiaError !== "undefined") {
    let err = new LiaError(e.message, 1)
    for (const d of e.liaErrors) err.add_detail(0, d.message, "error", d.line - 1, 0)
    throw err
  }
  console.error(e.message)
  return "LIA: stop"
}

if (window.LiaPixi) {
  try {
    LiaPixi.js("pixi-@0", "@'input", send, "@1")
  } catch (e) {
    annotate(e)
  }
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    try {
      if (LiaPixi.js("pixi-@0", "@'input", send, "@1") !== "LIA: wait") send.lia("LIA: stop")
    } catch (e) {
      console.error(e.message)
      send.lia("LIA: stop")
    }
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>

@Pixi.autorun(@0)
@end


@Pixi.scene: @Pixi.scene_(@uid,```@0```)

@Pixi.scene_
<script modify="false">
function run() {
  try {
    return LiaPixi.js("pixi-@0", "@'1", send, "16:9")
  } catch (e) {
    console.error(e.message)
    return "LIA: stop"
  }
}
if (window.LiaPixi) {
  run()
} else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    if (run() !== "LIA: wait") send.lia("LIA: stop")
  }, 50)
  "LIA: wait"
}
</script>

<div id="pixi-@0"></div>
@end


@Pixi.autorun
<script modify="false">
// runs the code block once when the slide is shown
let tries = 0
function autorun() {
  let el = document.getElementById("pixi-@0")
  if (!el) {
    if (tries++ < 50) setTimeout(autorun, 50)
    return
  }
  if (el.querySelector("lia-pixi-story")) return
  while (el && !(el.classList && el.classList.contains("lia-code--block"))) {
    el = el.previousElementSibling
  }
  const button = el && el.querySelector("button[aria-keyshortcuts]")
  if (button) button.click()
}
setTimeout(autorun, 50)
"LIA: stop"
</script>
@end


@Pixi.check
[[!]]
<script>
window.LiaPixi ? LiaPixi.check("@0", "@'1") : false
</script>
@end


@Pixi.state
<script modify="false" style="display: block">
window.__liaPixiState = window.__liaPixiState || {}
function show() {
  send.lia("HTML: " + LiaPixi.stateHTML("@0"))
}
function init() {
  if (window.__liaPixiState["@0"]) window.__liaPixiState["@0"]()
  window.__liaPixiState["@0"] = LiaPixi.on("*", (story) => {
    if (story.id === "@0") show()
  })
  show()
}
if (window.LiaPixi) init()
else {
  let timer = setInterval(() => {
    if (!window.LiaPixi) return
    clearInterval(timer)
    init()
  }, 50)
}
"LIA: wait"
</script>
@end


@Pixi.plugin: @Pixi.plugin_(```@0```)

@Pixi.plugin_
<script run-once modify="false">
window.LiaPixiPlugins = window.LiaPixiPlugins || []
window.LiaPixiPlugins.push(function (LiaPixi) {
  try {
    new Function("LiaPixi", "PIXI", "@'0")(LiaPixi, LiaPixi.PIXI)
  } catch (e) {
    console.error("LiaPixi plugin: " + e.message)
  }
})
"LIA: stop"
</script>
@end
```
