// Topscorerlisten med landekamp (Country Cup).
//
// Hver enhed gemmer altid sine egne point (save.js). Til den fælles liste (server/worker.js)
// kommer point kun gennem et løb, som serveren selv har startet og taget tid på:
//   POST /run/start  { pid, level }             -> { ok, run }
//   POST /run/finish { pid, run, score, lost }  -> { ok, score, rank }
// Serveren afviser løb, der er for hurtige, og point, som banen ikke kan give.
// Er man offline ved målet, gemmes resultatet og sendes, næste gang der er forbindelse.
//
//   GET  /top?me=<pid>  -> { players: [{ name, runner, country, score, reached, lost, me }], countries: [{ country, avg, players, best }], me, count }
//   POST /sync          { pid, name, runner, country }  -> { ok, score, rank }

import { SCORES_URL, CLOCK } from '../config.js';
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
export function recordLevel(levelIndex, score, run = null, lost = 0) {
  const p = Save.player();
  const id = LEVELS[levelIndex].id;
  p.unlocked = Math.min(LEVELS.length, Math.max(p.unlocked, levelIndex + 2));
  if (levelIndex === LEVELS.length - 1) p.done = true;
  const isBest = score > (p.best[id] || 0);
  if (isBest) p.best[id] = score;
  p.lost[id] = p.lost[id] == null ? lost : Math.min(p.lost[id], lost);
  if (run && SCORES_URL) {
    const s = Save.load();
    s.pending = [...(s.pending || []).filter((x) => x.run !== run), { run, score, lost }].slice(-20);
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
      const r = await post('/run/finish', { pid: s.pid, run: item.run, score: item.score, lost: item.lost | 0 });
      if (r.status === 429 || r.status >= 500) break;   // prøv igen senere
      s.pending = (s.pending || []).filter((x) => x.run !== item.run);
      Save.persist();
    }
  });
}

// ---------- uret ----------

/** Sekunder efter midnat for ankomsten med et givet antal tabte hjerter i alt. */
export function arrivalSec(lost) {
  return (CLOCK.startMin + CLOCK.perLevelMin * LEVELS.length) * 60 + CLOCK.hitSec * lost;
}

export function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Bonus for at nå festen til tiden. Samme regel som på serveren. */
export function timeBonus(lost) {
  const early = Math.floor((CLOCK.deadlineMin * 60 - arrivalSec(lost)) / CLOCK.hitSec);
  return early >= 0 ? CLOCK.onTimeBonus + early * CLOCK.earlyBonus : 0;
}

export function reached(best = Save.player().best) {
  return LEVELS.reduce((max, l, i) => (best[l.id] != null ? i + 1 : max), 0);
}

export function allDone(p = Save.player()) { return LEVELS.every((l) => p.best[l.id] != null); }

/** Tabte hjerter i alt på de bedste gennemløb. null, før alle baner er klaret. */
export function totalLost(p = Save.player()) {
  if (!allDone(p)) return null;
  return LEVELS.reduce((s, l) => s + (p.lost[l.id] || 0), 0);
}

export function total() {
  const p = Save.player();
  const sum = Object.values(p.best).reduce((a, b) => a + b, 0);
  const lost = totalLost(p);
  return sum + (lost == null ? 0 : timeBonus(lost));
}

function meRow() {
  const s = Save.load();
  return { me: true, name: s.name || 'DIG', runner: s.runner, country: s.country, score: total(), reached: reached(), lost: totalLost() };
}

/** Listen fra denne enhed alene: kun en selv. */
export function localBoard() {
  const me = meRow();
  const countries = me.score > 0 && me.country ? [{ country: me.country, avg: me.score, players: 1, best: me.name }] : [];
  return { rows: [me], countries, me: { rank: 1, ...me }, count: 1, shared: false };
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
    const rows = (data.players || []).map((r) => ({
      name: String(r.name || '?'), runner: r.runner, country: r.country, score: r.score | 0, reached: r.reached | 0,
      lost: r.lost == null ? null : r.lost | 0, me: !!r.me,
    }));
    const countries = (data.countries || []).map((c) => ({ country: c.country, avg: c.avg | 0, players: c.players | 0, best: c.best ? String(c.best) : '' }));
    const s = Save.load();
    return { rows, countries, me: data.me ? { ...data.me, name: s.name, runner: s.runner, country: s.country } : null, count: data.count || rows.length, shared: true };
  } catch (e) {
    return null;
  }
}

/** Sender navn, løber og land, og derefter ventende resultater. Gør intet, før spilleren har et navn. */
export function sync() {
  if (!SCORES_URL) return Promise.resolve(null);
  const s = Save.load();
  if (!s.name) return Promise.resolve(null);
  queue(() => post('/sync', { pid: s.pid, name: s.name, runner: s.runner, country: s.country }));
  return flush();
}
