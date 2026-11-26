// Alt, der kan stå i en bane. Bogstavet er det tegn, der bruges i src/data/levels.js.
//
// kind:      pickup | quiz | enemy | checkpoint | goal | boss
// frame/anim: grafik fra atlasset (anim-nøgler oprettes i BootScene)
// box:       [bredde, højde] på kollisionskassen i spilpixels
// anchor:    'bottom' = står på sin y-linje, 'center' = svæver omkring den
// vx:        egen fart i px/sek. (negativ = mod fiskeren)
// hittable:  kan slås væk med pokalen
// low:       noget man slider under. Sliden holdes, til fiskeren er fri af den
// spin:      grader pr. sekund (ting der ruller eller flyver)
// bounce:    hopper hen ad jorden med denne startfart opad (bolde)
// bonk:      tekst, der vises, hvis man slår på noget, der ikke kan slås væk
// THEMES kan overskrive hver enkelt ting pr. bane (fx at x er en ko på Fælleden og en rocker på bodegaen).
// midFrames: 2 betyder, at banen har to udgaver af mellemgrunden, som skifter (publikum der hepper).

import { GROUND_Y } from '../config.js';

// Det, der går på jorden (d), er ikke længere duer. Hver d bliver en af disse fire, skiftevis
// efter placering i banen. vx på selve d er den hurtigste, så banens luft-beregning er på den sikre side.
const WALKERS = [
  { anim: 'cat_walk', box: [40, 26], vx: -45, score: 200 },
  { anim: 'dog_walk', box: [46, 30], vx: -60, score: 250 },
  { anim: 'scooter', box: [30, 44], vx: -75, score: 250 },
  { anim: 'bike', box: [48, 40], vx: -90, score: 300 },
];

// Ved vandet flyver der måger i stedet for duer.
const GULL = { anim: 'gull_fly', box: [40, 20] };

export const ENTITIES = {
  b: { kind: 'pickup', effect: 'beer', frame: 'item/beer', box: [18, 28], bob: 3 },
  s: { kind: 'pickup', effect: 'shot', frame: 'item/shot', box: [28, 28], bob: 3 },
  h: { kind: 'pickup', effect: 'heart', frame: 'item/heart', box: [32, 28], bob: 3 },
  q: { kind: 'quiz', frame: 'item/quiz', box: [46, 42], bob: 2 },

  d: { kind: 'enemy', anim: 'cat_walk', box: [40, 26], vx: -90, variants: WALKERS, hittable: true, hp: 1, score: 200, fx: 'fx/puff' },
  f: { kind: 'enemy', anim: 'due_fly', box: [36, 20], vx: -70, wave: 6, low: true, hittable: true, hp: 1, score: 300, fx: 'fx/feather' },
  k: { kind: 'enemy', frame: 'obst/crate', box: [30, 24], hittable: true, hp: 1, score: 100, fx: 'fx/puff' },
  m: { kind: 'enemy', anim: 'dozer', box: [70, 44], vx: -45, hittable: true, hp: 2, score: 500, fx: 'fx/puff' },
  // x = noget man ikke kan slå væk og skal hoppe over. Udseendet bestemmes af banen.
  x: { kind: 'enemy', frame: 'obst/cone', box: [22, 26], hittable: false },
  // o = bold, der hopper hen mod fiskeren. Kan slås væk.
  o: { kind: 'enemy', frame: 'obst/ball', box: [24, 24], anchor: 'center', vx: -70, bounce: 520, spin: -360, hittable: true, hp: 1, score: 150, fx: 'fx/puff' },
  l: { kind: 'enemy', frame: 'obst/lowbar', box: [78, 28], anchor: 'bottom', y: GROUND_Y - 46, low: true, hittable: false },

  c: { kind: 'checkpoint', frame: 'obj/flag0' },
  g: { kind: 'goal', frame: 'obj/goal' },
  B: { kind: 'boss' },
};

const ROLL_Y = GROUND_Y - 16;   // ting der ruller på jorden, tegnes omkring deres midte

export const THEMES = {
  dragoer: { snow: true, ents: { f: GULL } },
  lufthavn: {
    ents: {
      d: { anim: 'drone', box: [46, 22], anchor: 'center', y: GROUND_Y - 22, vx: -40, wave: 4, score: 250, fx: 'fx/puff' },
      f: { anim: 'drone', box: [46, 22], vx: -90, wave: 8, score: 350, fx: 'fx/puff' },
      k: { frame: 'obst/kuffert', box: [44, 36] },
    },
  },
  // Under vand er rækkerne svømmebaner. Hajer kan slås (to slag), gopler skal man svømme uden om.
  blaaplanet: {
    bubbles: true,
    ents: {
      d: { anim: 'shark', box: [72, 26], vx: -110, hp: 2, score: 400, fx: 'fx/puff' },
      f: { frame: 'enemy/ray', anim: null, box: [46, 16], vx: -170, wave: 0, low: false, score: 300, fx: 'fx/puff' },
      k: { frame: 'enemy/puffer', box: [26, 26], vx: -20, score: 200, fx: 'fx/puff' },
      x: { anim: 'jelly', box: [22, 32], vx: -12, wave: 10, bonk: 'AV!' },
    },
  },
  idraetspark: {
    midFrames: 2,
    ents: {
      d: { frame: 'obst/ball', anim: null, box: [24, 24], anchor: 'center', y: ROLL_Y, vx: -110, spin: -420, score: 150, fx: 'fx/puff' },
      f: { frame: 'obst/ball', anim: null, box: [24, 24], vx: -170, wave: 0, spin: -500, score: 250, fx: 'fx/puff' },
      k: { frame: 'obst/cone', box: [22, 26] },
      x: { frame: 'obst/hurdle', box: [44, 34] },
    },
  },
  faelled: {
    snow: true,
    ents: {
      d: { anim: 'goose_walk', box: [32, 38], score: 250 },
      k: { frame: 'obst/cone', box: [22, 26] },
      x: { frame: 'obst/cow', box: [58, 38], bonk: 'MUH!' },
    },
  },
  dr: {
    ents: {
      d: { frame: 'obst/spot', anim: null, box: [26, 30], vx: 0, fx: 'fx/puff' },
      f: { anim: 'drone', box: [46, 22], vx: -100, wave: 8, score: 350, fx: 'fx/puff' },
      k: { frame: 'obst/camera', box: [34, 48], score: 200 },
      m: { anim: 'dolly', box: [60, 46], vx: -50 },
      x: { frame: 'obst/cables', box: [64, 12] },
      l: { frame: 'obst/boom', box: [64, 28] },
    },
  },
  campus: { snow: true, ents: { k: { frame: 'obst/books', box: [34, 28] } } },
  center: { ents: { k: { frame: 'obst/cart', box: [40, 30], vx: -50 } } },
  jaguaren: {
    ents: {
      d: { frame: 'obst/barrel', anim: null, box: [26, 26], anchor: 'center', y: ROLL_Y, vx: -90, spin: -300, fx: 'fx/puff' },
      f: { frame: 'obst/flaske', anim: null, box: [20, 20], vx: -150, wave: 0, spin: -540, fx: 'fx/star' },
      k: { frame: 'obst/stool', box: [22, 30] },
      x: { anim: 'rocker_walk', box: [32, 54], vx: -26, bonk: "HVA' GLOR DU PÅ?" },
      l: { frame: 'obst/lamp', box: [60, 28] },
    },
  },
  // Islands Brygge (25/11): løse kamphunde, måger, boomblastere, rockere og folk, der fester i badetøj.
  // Rockere og festaber kan man ikke slå: hop over dem. Flagguirlanderne skal man slide under.
  brygge: {
    snow: true,
    midFrames: 2,
    ents: {
      d: { anim: 'dog_walk', box: [46, 30], vx: -85, variants: [{ anim: 'dog_walk', box: [46, 30], vx: -85, score: 250 }], score: 250 },
      f: { anim: 'gull_fly', box: [40, 20], vx: -80, score: 300 },
      k: { frame: 'obst/boombox', box: [40, 28], score: 250, fx: 'fx/star' },
      o: { frame: 'obst/beachball', box: [24, 24] },
      x: {
        anim: 'rocker_walk', box: [32, 54], vx: -26, bonk: "HVA' GLOR DU PÅ?",
        variants: [{ anim: 'rocker_walk', box: [32, 54], vx: -26, bonk: "HVA' GLOR DU PÅ?" }, { anim: 'bather_dance', box: [30, 64], vx: -20, bonk: 'SKÅÅÅL!' }],
      },
      l: { frame: 'obst/garland', box: [78, 28] },
    },
  },
  // Amager Bio: fadøl i stedet for flasker, flightcases der ruller, kastede krus og trommestikker,
  // monitorer på gulvet, en mikrofon der svinger fra loftet, og trommesæt og guitarister man skal hoppe over.
  amagerbio: {
    midFrames: 2,
    ents: {
      b: { frame: 'item/fadoel' },
      d: { frame: 'obst/flightcase', anim: null, box: [40, 30], vx: -90, score: 250, fx: 'fx/puff' },
      f: {
        frame: 'obst/cup', anim: null, box: [20, 22], vx: -160, wave: 0, spin: -540, score: 250, fx: 'fx/foam',
        variants: [{ frame: 'obst/cup', box: [20, 22], vx: -150, spin: -540, score: 250 }, { frame: 'obst/stick', box: [30, 10], vx: -160, spin: -720, score: 300 }],
      },
      k: { frame: 'obst/monitor', box: [40, 26], score: 150 },
      x: {
        frame: 'obst/drums', box: [50, 40], vx: -26, bonk: 'BOING!',
        variants: [{ frame: 'obst/drums', anim: null, box: [50, 40], vx: 0, bonk: 'BOING!' }, { anim: 'guitar_walk', box: [32, 56], vx: -26, bonk: "ROCK'N'ROLL!" }],
      },
      // sway: hvor langt (radianer) mikrofonen svinger, swayMs: hvor hurtigt
      l: { frame: 'obst/mic', box: [30, 30], sway: 0.14, swayMs: 450 },
    },
  },
  // Amager Strandpark: kitesurfere og måger i luften, redningskranse der ruller, badebolde der hopper,
  // sandslotte, håndklæder på snor og parasoller og nudister, man skal hoppe over.
  strandpark: {
    snow: true,
    ents: {
      d: { frame: 'obst/buoy', anim: null, box: [26, 26], anchor: 'center', y: ROLL_Y, vx: -100, spin: -360, score: 200, fx: 'fx/puff' },
      f: {
        anim: 'kite_fly', box: [46, 24], vx: -120, wave: 10, score: 350, fx: 'fx/puff',
        variants: [{ anim: 'kite_fly', box: [46, 24], vx: -120, score: 350 }, { anim: 'gull_fly', box: [40, 20], vx: -70, score: 300 }],
      },
      k: { frame: 'obst/sandcastle', box: [34, 28], score: 150 },
      o: { frame: 'obst/beachball', box: [24, 24] },
      x: {
        frame: 'obst/parasol', box: [40, 44], vx: -40, bonk: 'AV!',
        variants: [{ frame: 'obst/parasol', anim: null, box: [40, 44], vx: 0, bonk: 'AV!' }, { anim: 'nudist_run', box: [30, 60], vx: -40, bonk: 'HOV! TAG TØJ PÅ!' }],
      },
      l: { frame: 'obst/towels', box: [78, 28] },
    },
  },
  copenhill: { snow: true, ents: { k: { frame: 'obst/ski', box: [40, 44], vx: -110, score: 250 } } },
};

export function entityDef(type, themeKey) {
  const base = ENTITIES[type];
  if (!base) throw new Error(`Ukendt tegn "${type}" i en bane`);
  const over = THEMES[themeKey]?.ents?.[type];
  return over ? { ...base, variants: undefined, ...over } : base;
}
