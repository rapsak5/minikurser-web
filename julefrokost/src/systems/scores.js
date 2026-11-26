// Topscorerlisten (offentlig udgave).
//
// Hver enhed gemmer altid sine egne point (save.js). Til den fælles liste (server/worker-public.js)
// kommer point kun gennem et løb, som serveren selv har startet og taget tid på:
//   POST /run/start  { pid, level }       -> { ok, run }      når en bane startes
//   POST /run/finish { pid, run, score }  -> { ok, score, rank }  når målet er nået
// Serveren afviser løb, der er for hurtige, og point, som banen ikke kan give.
// Er man offline ved målet, gemmes resultatet og sendes, næste gang der er forbindelse.
//
//   GET  /top?me=<pid>  -> { players: [{ name, fisher, score, reached, me }], me: { rank, score, reached } | null, count }
//   POST /sync          { pid, name, fisher }  -> { ok, score, rank }
// Der er intet login: spilleren kendes på et tilfældigt id på enheden og vises med sit navn.

import { SCORES_URL } from '../config.js';
import { LEVELS } from '../data/levels.js';
import * as Save from './save.js';

export const TOP_N = 8;

export function isShared() { return !!SCORES_URL; }

function post(path, data) {
  return fetch(`${SCORES_URL}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true,
  });
}

// Alle kald til serveren går i kø, så et resultat altid er sendt, før listen hentes.
let inflight = Promise.resolve();
function queue(fn) {
  const run = () => fn().catch(() => null);
  inflight = inflight.then(run, run);
  return inflight;
}

/** Beder serveren starte et løb på banen. Giver løbets id, eller null uden forbindelse. */
export async function startRun(levelIndex) {
  if (!SCORES_URL) return null;
  const s = Save.load();
  try {
    const r = await post('/run/start', { pid: s.pid, level: LEVELS[levelIndex].id });
    const data = r.ok ? await r.json() : null;
    return data?.ok ? data.run : null;
  } catch (e) {
    return null;
  }
}

/** Gemmer resultatet for en klaret bane og sender det til serveren, hvis løbet blev startet der. */
export function recordLevel(levelIndex, score, run = null) {
  const p = Save.player();
  const id = LEVELS[levelIndex].id;
  p.unlocked = Math.min(LEVELS.length, Math.max(p.unlocked, levelIndex + 2));
  if (levelIndex === LEVELS.length - 1) p.done = true;
  const isBest = score > (p.best[id] || 0);
  if (isBest) p.best[id] = score;
  if (run && SCORES_URL) {
    const s = Save.load();
    s.pending = [...(s.pending || []).filter((x) => x.run !== run), { run, score }].slice(-20);
  }
  Save.persist();
  flush();
  return { isBest, total: total() };
}

/** Sender resultater, der venter. Et resultat fjernes, når serveren har svaret (også ved afvisning). */
function flush() {
  return queue(async () => {
    const s = Save.load();
    for (const item of [...(s.pending || [])]) {
      const r = await post('/run/finish', { pid: s.pid, run: item.run, score: item.score });
      if (r.status === 429 || r.status >= 500) break;   // prøv igen senere
      s.pending = (s.pending || []).filter((x) => x.run !== item.run);
      Save.persist();
    }
  });
}

export function total() {
  return Object.values(Save.player().best).reduce((a, b) => a + b, 0);
}

export function reached(best = Save.player().best) {
  return LEVELS.reduce((max, l, i) => (best[l.id] != null ? i + 1 : max), 0);
}

function meRow() {
  const s = Save.load();
  return { me: true, name: s.name || 'DIG', fisher: s.fisher, score: total(), reached: reached() };
}

/** Listen fra denne enhed alene: kun en selv. */
export function localBoard() {
  return { rows: [meRow()], me: { rank: 1, ...meRow() }, count: 1, shared: false };
}

/** Den fælles liste. Sender først navn og ventende resultater. Returnerer null uden server. */
export async function fetchBoard() {
  if (!SCORES_URL) return null;
  try {
    await sync();
    const pid = encodeURIComponent(Save.load().pid);
    const res = await fetch(`${SCORES_URL}/top?me=${pid}&n=${TOP_N}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    // Serveren markerer ens egen række med me: true. Andres id'er sendes aldrig ud.
    const rows = (data.players || []).map((r) => ({ name: String(r.name || '?'), fisher: r.fisher, score: r.score | 0, reached: r.reached | 0, me: !!r.me }));
    return { rows, me: data.me ? { ...data.me, name: Save.load().name, fisher: Save.load().fisher } : null, count: data.count || rows.length, shared: true };
  } catch (e) {
    return null;
  }
}

/** Sender navn og fisker, og derefter ventende resultater. Gør intet, før spilleren har et navn. */
export function sync() {
  if (!SCORES_URL) return Promise.resolve(null);
  const s = Save.load();
  if (!s.name) return Promise.resolve(null);
  queue(() => post('/sync', { pid: s.pid, name: s.name, fisher: s.fisher }));
  return flush();
}
