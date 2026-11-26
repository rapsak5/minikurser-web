// Alt, der kan stå i en bane. Bogstavet er det tegn, der bruges i src/data/levels.js.
//
// kind:      pickup | enemy | checkpoint | goal
// frame/anim: grafik fra atlasset (anim-nøgler oprettes i BootScene)
// box:       [bredde, højde] på kollisionskassen i spilpixels
// anchor:    'bottom' = står på sin y-linje, 'center' = svæver omkring den
// vx:        egen fart i px/sek. (negativ = mod løberen)
// hittable:  flytter sig, når man tapper ("Excuse me!")
// low:       noget man slider under
// spin:      grader pr. sekund
// bonk:      tekst, der vises, hvis man tapper på noget, der ikke flytter sig
// THEMES bestemmer, hvordan hver ting ser ud på den enkelte bane. bg er banens baggrund.

import { GROUND_Y } from '../config.js';

export const ENTITIES = {
  b: { kind: 'pickup', effect: 'pickup', frame: 'item/memo', box: [22, 26], bob: 3 },
  s: { kind: 'pickup', effect: 'shot', frame: 'item/snaps', box: [28, 30], bob: 3 },
  h: { kind: 'pickup', effect: 'heart', frame: 'item/life', box: [28, 28], bob: 3 },

  d: { kind: 'enemy', anim: 'bike', box: [50, 46], vx: -90, hittable: true, hp: 1, score: 250, fx: 'fx/puff', sorry: 'RING RING!' },
  f: { kind: 'enemy', frame: 'obst/snowball', box: [18, 18], vx: -150, spin: -420, low: true, hittable: true, hp: 1, score: 300, fx: 'fx/puff' },
  k: { kind: 'enemy', frame: 'obst/snowman', box: [28, 44], hittable: true, hp: 1, score: 150, fx: 'fx/puff' },
  m: { kind: 'enemy', anim: 'copier', box: [70, 50], vx: -45, hittable: true, hp: 2, score: 600, fx: 'fx/paper' },
  // x = noget, der ikke flytter sig, når man tapper. Hop over.
  x: { kind: 'enemy', anim: 'cargo', box: [80, 52], vx: -36, hittable: false, bonk: 'NO WAY!' },
  l: { kind: 'enemy', frame: 'obst/garland', box: [78, 28], anchor: 'bottom', y: GROUND_Y - 46, low: true, hittable: false },

  c: { kind: 'checkpoint', frame: 'obj/flag0' },
  g: { kind: 'goal', frame: 'obj/goal' },
};

const CARGO = { anim: 'cargo', box: [80, 52], vx: -36, bonk: 'NO WAY!' };
const DOGWALK = { anim: 'dogwalk', box: [64, 46], vx: -24, bonk: 'WOOF!' };
const BIKE = { anim: 'bike', box: [50, 46], vx: -90, score: 250, sorry: 'RING RING!' };
const BIKE_FAST = { anim: 'bike', box: [50, 46], vx: -125, score: 350, sorry: 'RING RING!' };
const DESK = { frame: 'obst/desk', anim: null, box: [58, 42], vx: 0, bonk: 'BUSY!' };
const COLLEAGUE = { anim: 'colleague', box: [26, 50], vx: -24, bonk: 'QUICK QUESTION?' };
const PRINTER = { anim: 'printer', box: [50, 48], vx: -95, score: 300, fx: 'fx/paper', sorry: 'PAPER JAM!' };
const CHAIR = { anim: 'chair', box: [34, 50], vx: -70, score: 250, fx: 'fx/puff', sorry: 'WHEEE!' };
const PLANE = { frame: 'obst/plane', anim: null, box: [26, 14], vx: -130, wave: 6, spin: 0, score: 300, fx: 'fx/paper' };
const BINDERS = { frame: 'obst/binders', box: [32, 28], score: 150, fx: 'fx/paper' };
const GIFTS = { frame: 'obst/gifts', box: [32, 32], score: 150, fx: 'fx/star' };
const WAITER = { anim: 'waiter', box: [28, 54], vx: -55, score: 300, fx: 'fx/star', sorry: 'AFTER YOU!' };
const CONGA = { anim: 'conga', box: [56, 50], vx: -26, bonk: 'CONGA!' };
const GUEST = { anim: 'guest', box: [26, 50], vx: -12, bonk: 'CHEERS!' };
const CORK = { frame: 'obst/cork', anim: null, box: [14, 16], vx: -170, spin: -600, score: 300, fx: 'fx/star' };
const MISTLETOE = { frame: 'obst/mistletoe', box: [30, 30], sway: 0.12, swayMs: 480 };

export const THEMES = {
  // Byen: memos, cyklister, ladcykler, hundeluftere, snemænd, snebolde og hjerteguirlander
  cykelsti: { bg: 'city', snow: true, landmark: 'hq', ents: { d: { ...BIKE, variants: [BIKE, BIKE_FAST] }, x: CARGO } },
  julemarked: { bg: 'city', snow: true, landmark: 'hq', ents: { d: BIKE, x: { ...CARGO, variants: [CARGO, DOGWALK] }, k: { ...GIFTS, variants: [GIFTS, { frame: 'obst/snowman', box: [28, 44], score: 150, fx: 'fx/puff' }] } } },
  straek: { bg: 'city', snow: true, landmark: 'hq', ents: { d: { ...BIKE_FAST, variants: [BIKE_FAST, BIKE] }, x: { ...DOGWALK, variants: [DOGWALK, CARGO] } } },
  // Kontoret: julekugler, skriveborde, kolleger, printere, kontorstole, papirflyvere og ringbind
  openspace: { bg: 'office', ents: { b: { frame: 'item/bauble' }, d: CHAIR, x: { ...DESK, variants: [DESK, COLLEAGUE] }, k: BINDERS, f: PLANE } },
  printrum: { bg: 'office', ents: { b: { frame: 'item/bauble' }, d: PRINTER, x: DESK, k: BINDERS, f: PLANE } },
  gangen: { bg: 'office', ents: { b: { frame: 'item/bauble' }, d: { ...PRINTER, variants: [PRINTER, CHAIR] }, x: { ...COLLEAGUE, variants: [COLLEAGUE, DESK] }, k: GIFTS, f: PLANE } },
  // Festen: julehjerter, tjenere, congarækker, gæster, gaver, propper og mistelten
  garderobe: { bg: 'party', midFrames: 2, landmark: 'banner', ents: { b: { frame: 'item/hjerte' }, d: WAITER, x: GUEST, k: GIFTS, f: CORK, l: MISTLETOE } },
  dansegulv: { bg: 'party', midFrames: 2, landmark: 'banner', ents: { b: { frame: 'item/hjerte' }, d: WAITER, x: { ...CONGA, variants: [CONGA, GUEST] }, k: GIFTS, f: CORK, l: MISTLETOE } },
  baren: { bg: 'party', midFrames: 2, landmark: 'banner', ents: { b: { frame: 'item/hjerte' }, d: { ...WAITER, vx: -75 }, x: { ...CONGA, variants: [CONGA, GUEST] }, k: GIFTS, f: CORK, l: MISTLETOE } },
};

export function entityDef(type, themeKey) {
  const base = ENTITIES[type];
  if (!base) throw new Error(`Ukendt tegn "${type}" i en bane`);
  const over = THEMES[themeKey]?.ents?.[type];
  return over ? { ...base, variants: undefined, ...over } : base;
}
