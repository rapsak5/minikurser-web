// Banerne. En bane er en liste af byggeklodser (CHUNKS), som lægges efter hinanden.
//
// Hver byggeklods er fire rækker tegn, hvor ét tegn er én kolonne (48 px):
//   hi   ting i hophøjde
//   mid  ting i hovedhøjde (slide under eller tap)
//   lo   ting på jorden
//   fl   gulvet:  # = jord,  _ = hul
//
// Tegn:
//   .  ingenting          b  noget at samle (memo, julekugle, julehjerte)
//   s  snaps (valgfri)    h  ekstra julehjerte (liv)
//   d  kommer imod en på jorden (tap eller hop)     f  flyver i hovedhøjde (slide eller tap)
//   k  står stille og flytter sig ved tap           x  flytter sig IKKE ved tap (hop)
//   m  tung maskine (to tap)                        l  noget lavt (slide)
//   c  checkpoint         g  mål
// Hvordan tingene ser ud på den enkelte bane, står i THEMES i entities.js.
//
// Rækker, der mangler, fyldes ud af sig selv. Mellem klodserne indsættes "gap" tomme kolonner.
// { hint: 'TEKST' } i en bane viser en besked på skærmen på det sted.

import { COL, GAME_W, PLAYER_SCREEN_X } from '../config.js';
import { entityDef } from './entities.js';

export const CHUNKS = {
  r4: { lo: '....' },
  r8: { lo: '........' },
  b3: { lo: 'b.b.b' },
  bhi: { hi: '.bbb.' },
  bwave: { hi: '...b.b...', lo: '.b.....b.' },
  // én ting ad gangen
  k: { hi: '..b..', lo: '..k..' },
  d: { lo: '...d.' },
  f: { mid: '...f.', lo: '...b.' },
  l: { mid: '...l.', lo: '..bbb' },
  x: { hi: '..b..', lo: '..x..' },
  m: { lo: '.....m.' },
  p: { hi: '..bb..', fl: '##__##' },
  // to ting i træk
  kk: { hi: '..b....b..', lo: '..k....k..' },
  dd: { lo: '...d....d.' },
  ff: { mid: '...f.....f.' },
  ll: { mid: '...l.....l.', lo: '..bb....bb.' },
  pp: { hi: '..bb......bb..', fl: '##__######__##' },
  kd: { lo: '..k...d.' },
  xd: { hi: '..b.......', lo: '..x......d' },
  df: { mid: '.......f..', lo: '..d.......' },
  kl: { hi: '..b.......', mid: '........l.', lo: '..k.....b.' },
  lk: { mid: '..l........', lo: '..b......k.' },
  pk: { hi: '..bb.....b..', lo: '.........k..', fl: '##__########' },
  pd: { hi: '..bb.....', lo: '.......d.', fl: '##__#####' },
  // tre ting i træk
  dfd: { mid: '......f....', lo: '..d......d.' },
  kfk: { hi: '..b.......b.', mid: '......f.....', lo: '..k.......k.' },
  // svære (afstandene er regnet ud, så de kan klares ved 380 px/sek.)
  xdx: { hi: '..b................', lo: '..x.......d.......x.' },
  lfl: { mid: '..l.......f.......l.', lo: '..bbb...............' },
  pkf: { hi: '..bb..............', mid: '..............f...', lo: '.........k........', fl: '##__##############' },
  ppp: { hi: '..bb......bb......bb..', fl: '##__######__######__##' },
  kfkf: { mid: '......f.......f.', lo: '..k.......k.....' },
  xx: { hi: '..b.......b..', lo: '..x.......x..' },
  dfdf: { mid: '........f.........f.', lo: '..d.........d.......' },
  xlx: { hi: '..b................', mid: '..........l........', lo: '..x...............x.' },
  pdp: { hi: '..bb..........bb..', lo: '.........d........', fl: '##__##########__##' },
  // brutale (25/11): flere forskellige bevægelser lige efter hinanden. spaceOut() holder dem mulige
  pxp: { hi: '..bb...b......bb..', lo: '.......x..........', fl: '##__##########__##' },
  fxf: { hi: '......b.....', mid: '..f.......f.', lo: '......x.....' },
  lxl: { hi: '.......b........', mid: '..l...........l.', lo: '.......x........' },
  dpd: { hi: '......bb.......', lo: '..d..........d.', fl: '######__#######' },
  kxkx: { hi: '......b.....b.', lo: '..k...x...k.x.' },
  pfp: { hi: '..bb.......bb..', mid: '.......f.......', fl: '##__#######__##' },
  dldl: { mid: '.......l.........l', lo: '..d.........d.....' },
  xpl: { hi: '..b...bb........', mid: '.............l..', lo: '..x.............', fl: '######__########' },
  ppd: { hi: '..bb.....bb......', lo: '...............d.', fl: '##__#####__######' },
  // kun baner med tunge maskiner (Fælleden og DR)
  mm: { lo: '.....m.........m.' },
  mx: { hi: '..........b.', lo: '.....m....x.' },
  // ting at samle op
  s: { hi: '.s.' },
  h: { hi: '.h.' },
  c: { lo: '..c..' },
  g: { lo: '......g...' },
};

// Øvebanen: tre ting, der hver stopper spillet, indtil man laver den rigtige bevægelse.
export const TUTORIAL = {
  id: 'tutorial', name: 'Practice', theme: 'cykelsti', speed: 160, gap: 4, tutorial: true,
  layout: ['r8', { lo: '..x..' }, 'r4', { mid: '..l..' }, 'r4', { lo: '..k..' }, 'r4', 'b3', { lo: '...g..' }],
  steps: [
    { type: 'x', expect: 'up', dist: 74, text: 'SWIPE UP TO JUMP' },
    { type: 'l', expect: 'down', dist: 84, text: 'SWIPE DOWN TO SLIDE' },
    { type: 'k', expect: 'tap', dist: 52, text: 'TAP TO SAY EXCUSE ME' },
  ],
};

// ---------------------------------------------------------------------------
// Banerne bygges af en kort indledning (intro), bølger og en afslutning (outro).
// Hver bølge trækker n byggeklodser fra en pulje, så banen bliver sværere hen ad vejen.
// Trækningen er fast pr. bane (samme bane hver gang), så man kan lære den.
// Mellem bølgerne kommer et checkpoint. shot: true lægger en snaps midt i bølgen,
// heart: true et ekstra julehjerte, hint viser en besked lige før bølgen.
// speed: [start, slut] i px/sek. Farten stiger jævnt gennem banen.
// noPits: true fjerner klodser med huller (kontoret og festen har gulv hele vejen).
// extra: banens egne klodser, der lægges i puljerne.
// world, goal og cut: verden (0 til 2), målets grafik og den scene, der vises efter banen.
// ---------------------------------------------------------------------------
export const POOLS = {
  easy: ['k', 'd', 'f', 'l', 'x', 'p', 'kk', 'dd', 'ff', 'kd', 'xd', 'bhi', 'bwave'],
  med: ['kd', 'xd', 'df', 'kl', 'lk', 'pk', 'pd', 'll', 'pp', 'dfd', 'kfk', 'xx', 'pdp', 'bwave'],
  hard: ['xdx', 'lfl', 'pkf', 'ppp', 'kfkf', 'xx', 'dfdf', 'xlx', 'pdp', 'dfd', 'kfk', 'pxp', 'fxf', 'lxl'],
  brutal: ['pxp', 'fxf', 'lxl', 'dpd', 'kxkx', 'pfp', 'dldl', 'xpl', 'ppd', 'xdx', 'lfl', 'ppp', 'xlx', 'dfdf'],
};
const MACHINES = { easy: ['m'], med: ['m', 'mx'], hard: ['mm', 'mx'], brutal: ['mm', 'mx'] };

export const WORLDS = [
  { name: 'The City', short: 'CITY', color: 0x6ec1ff },
  { name: 'The Office', short: 'OFFICE', color: 0x86bc25 },
  { name: 'The Party', short: 'PARTY', color: 0xff7a7a },
];

// Lange baner (cirka halvandet til to et halvt minut) med mange ting at samle, så der er noget at konkurrere om.
export const LEVELS = [
  {
    id: 'cykelsti', name: 'The Bike Lane', theme: 'cykelsti', world: 0, speed: [230, 290], gap: 1,
    intro: ['r8', 'b3', { hint: 'MEMOS! GRAB THEM ALL FOR A COMBO' }, 'bhi', { hint: 'CYCLISTS: TAP OR JUMP' }, 'd', { hint: 'CARGO BIKES: JUMP!' }, 'x', 'l', 'p'],
    waves: [{ n: 11, pool: 'easy' }, { n: 12, pool: 'med', heart: true, hint: 'DO NOT GET HIT: THE COMBO GOES UP TO X5' }, { n: 9, pool: 'hard' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'julemarked', name: 'The Christmas Market', theme: 'julemarked', world: 0, speed: [240, 305], gap: 1,
    intro: ['r8', 'b3', { hint: 'DOG WALKERS: JUMP!' }, 'x', 'k', { hint: 'SNOWBALLS: SLIDE OR TAP' }, 'f'],
    waves: [{ n: 9, pool: 'easy' }, { n: 14, pool: 'med', heart: true }, { n: 11, pool: 'hard' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'straek', name: 'The Last Stretch', theme: 'straek', world: 0, speed: [250, 320], gap: 1, goal: 'obj/taxi', cut: 'taxi',
    intro: ['r8', 'bwave', { hint: 'THE TAXI IS WAITING AT THE END' }, 'd', 'p'],
    waves: [{ n: 8, pool: 'easy' }, { n: 14, pool: 'med', heart: true }, { n: 14, pool: 'hard' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'openspace', name: 'Open Space', theme: 'openspace', world: 1, speed: [255, 325], gap: 1, noPits: true,
    intro: ['r8', 'b3', { hint: 'BAUBLES FOR THE PARTY' }, 'bhi', { hint: 'DESKS AND COLLEAGUES: JUMP!' }, 'x', { hint: 'OFFICE CHAIRS: TAP' }, 'd', 'f'],
    waves: [{ n: 8, pool: 'easy' }, { n: 15, pool: 'med', heart: true }, { n: 12, pool: 'hard' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'printrum', name: 'The Print Room', theme: 'printrum', world: 1, speed: [265, 335], gap: 1, noPits: true, extra: MACHINES,
    intro: ['r8', 'b3', { hint: 'ANGRY PRINTERS: TAP!' }, 'd', { hint: 'THE BIG COPIER: TWO TAPS OR A JUMP' }, 'm', 'k'],
    waves: [{ n: 7, pool: 'easy' }, { n: 15, pool: 'med', heart: true }, { n: 14, pool: 'hard' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'gangen', name: 'The Corridor', theme: 'gangen', world: 1, speed: [270, 345], gap: 1, noPits: true, extra: MACHINES, goal: 'obj/wardrobe', cut: 'suit',
    intro: ['r8', 'bwave', { hint: 'YOUR CHRISTMAS SUIT IS AT THE END' }, 'x', 'd'],
    waves: [{ n: 12, pool: 'med' }, { n: 14, pool: 'hard', heart: true }, { n: 8, pool: 'brutal' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'garderobe', name: 'The Cloakroom', theme: 'garderobe', world: 2, speed: [275, 350], gap: 1, noPits: true,
    intro: ['r8', { hint: 'CHRISTMAS HEARTS!' }, 'b3', 'bhi', { hint: 'WAITERS: TAP, AND THEY STEP ASIDE' }, 'd', { hint: 'MISTLETOE: SLIDE UNDER' }, 'l', 'x'],
    waves: [{ n: 12, pool: 'med' }, { n: 15, pool: 'hard', heart: true }, { n: 9, pool: 'brutal' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'dansegulv', name: 'The Dance Floor', theme: 'dansegulv', world: 2, speed: [285, 360], gap: 1, noPits: true,
    intro: ['r8', 'b3', { hint: 'CONGA LINES: JUMP!' }, 'x', 'f'],
    waves: [{ n: 11, pool: 'med' }, { n: 15, pool: 'hard', shot: true, heart: true, hint: 'SNAPS IS OPTIONAL: DOUBLE POINTS, BUT UP AND DOWN SWAP' }, { n: 12, pool: 'brutal' }],
    outro: ['b3', 'g'],
  },
  {
    id: 'baren', name: 'The Bar', theme: 'baren', world: 2, speed: [295, 375], gap: 0, noPits: true, goal: 'obj/bar', cut: 'bar',
    intro: ['r8', 'bwave', { hint: 'ALMOST THERE. THE BAR IS AT THE END' }, 'd', 'x'],
    waves: [{ n: 10, pool: 'med' }, { n: 15, pool: 'hard', shot: true, heart: true }, { n: 15, pool: 'brutal' }],
    outro: ['b3', 'g'],
  },
];

export function levelLabel(i) { const l = LEVELS[i]; return `${l.world + 1}-${LEVELS.filter((q, k) => q.world === l.world && k <= i).length}`; }

function rng(seedText) {
  let a = 0;
  for (const ch of seedText) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 0x6d2b79f5) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Banens fulde rækkefølge af klodser. Baner uden bølger bruger bare layout. */
export function expandLayout(level) {
  if (level.layout) return level.layout;
  const rand = rng(level.id);
  const out = [...level.intro];
  level.waves.forEach((w, wi) => {
    if (wi > 0) out.push('c');
    if (w.hint) out.push({ hint: w.hint });
    let pool = [...POOLS[w.pool], ...((level.extra && level.extra[w.pool]) || [])];
    if (level.noPits) pool = pool.filter((n) => !(CHUNKS[n].fl || '').includes('_'));
    let last = null;
    for (let i = 0; i < w.n; i++) {
      if (i === Math.floor(w.n / 2)) { if (w.shot) out.push('s'); if (w.heart) out.push('h'); }
      let pick;
      do { pick = pool[Math.floor(rand() * pool.length)]; } while (pick === last && pool.length > 1);
      out.push(pick);
      last = pick;
      if (i % 3 === 2) out.push(['b3', 'bhi', 'bwave'][Math.floor(i / 3) % 3]);   // ofte noget at samle op
    }
  });
  return [...out, ...level.outro];
}

// Hvor lang tid (sekunder) man skal have efter en ting, før den næste må komme.
// Afstanden regnes om til kolonner ud fra banens topfart, så banerne altid kan klares,
// uanset hvor hurtigt det går. Er to ting for tæt, indsættes der tomme kolonner.
const KIND = { x: 'jump', k: 'tap', d: 'tap', f: 'tap', m: 'heavy', l: 'slide' };
const NEED = { jump: 1.08, tap: 0.44, slide: 0.56, heavy: 0.96 };

function spaceOut(rows, level) {
  const v = Array.isArray(level.speed) ? level.speed[1] : level.speed;
  const ahead = GAME_W + 120 - PLAYER_SCREEN_X;   // hvor langt foran fiskeren ting dukker op
  const n = rows.lo.length;
  const cols = [];
  const map = [];
  let lastKind = null;
  let lastEff = -99;
  for (let i = 0; i < n; i++) {
    const cell = { hi: rows.hi[i], mid: rows.mid[i], lo: rows.lo[i], fl: rows.fl[i] };
    let kind = null;
    let drift = 0;   // ting, der selv bevæger sig mod fiskeren, når frem tidligere end deres kolonne
    for (const r of ['hi', 'mid', 'lo']) {
      const t = cell[r];
      if (!KIND[t]) continue;
      if (!kind || KIND[t] === 'jump') kind = KIND[t];
      const def = entityDef(t, level.theme);
      const vx = def.variants ? Math.max(...def.variants.map((q) => Math.abs(q.vx || 0))) : Math.abs(def.vx || 0);
      drift = Math.max(drift, (vx * (ahead / v)) / COL);
    }
    if (cell.fl === '_' && rows.fl[i - 1] !== '_') kind = 'jump';
    if (kind) {
      let eff = cols.length - drift;
      if (lastKind) {
        const need = (NEED[lastKind] * (v + 40)) / COL;
        const pad = Math.ceil(need - (eff - lastEff));
        for (let k = 0; k < pad; k++) cols.push({ hi: '.', mid: '.', lo: '.', fl: '#' });
        if (pad > 0) eff += pad;
      }
      lastKind = kind;
      lastEff = Math.max(lastEff, eff);
    }
    map[i] = cols.length;
    cols.push(cell);
  }
  map[n] = cols.length;
  const out = { hi: '', mid: '', lo: '', fl: '' };
  for (const c of cols) for (const r of ['hi', 'mid', 'lo', 'fl']) out[r] += c[r];
  return { rows: out, map };
}

/** Omsætter en banes layout til spawns, huller og hints i verdenskoordinater. */
export function buildLevel(level) {
  let rows = { hi: '', mid: '', lo: '', fl: '' };
  const hints = [];
  const push = (ch) => {
    const n = Math.max(...['hi', 'mid', 'lo', 'fl'].map((k) => (ch[k] || '').length));
    for (const k of ['hi', 'mid', 'lo']) rows[k] += (ch[k] || '').padEnd(n, '.');
    rows.fl += (ch.fl || '').padEnd(n, '#');
  };
  for (const item of expandLayout(level)) {
    if (typeof item === 'object' && item.hint) { hints.push({ col: rows.lo.length, text: item.hint }); continue; }
    const ch = typeof item === 'string' ? CHUNKS[item] : item;
    if (!ch) throw new Error(`Ukendt byggeklods "${item}" i banen ${level.id}`);
    push(ch);
    push({ lo: '.'.repeat(level.gap) });
  }
  let map = null;
  if (!level.tutorial) ({ rows, map } = spaceOut(rows, level));
  for (const h of hints) h.x = (map ? map[h.col] : h.col) * COL;
  const spawns = [];
  for (const row of ['hi', 'mid', 'lo']) {
    [...rows[row]].forEach((type, i) => { if (type !== '.') spawns.push({ type, row, x: i * COL + COL / 2 }); });
  }
  spawns.sort((a, b) => a.x - b.x);
  let walkers = 0;
  for (const s of spawns) if (s.type === 'd') s.v = walkers++;   // hvilken figur d bliver (se WALKERS i entities.js)
  const pits = [];
  let start = -1;
  [...rows.fl, '#'].forEach((c, i) => {
    if (c === '_' && start < 0) start = i;
    if (c !== '_' && start >= 0) { pits.push({ x0: start * COL, x1: i * COL }); start = -1; }
  });
  return { rows, spawns, pits, hints, width: rows.lo.length * COL };
}
