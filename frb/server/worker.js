// Fælles topscorerliste med afdelingskamp til Nå julefrokosten (FRB+ julespillet).
// Kopi af serveren til Late for the Party. Feltet country er afdelingen.
// Cloudflare Worker med D1-databasen frb-julespil-scores bundet som DB.
// Bygger på serveren til Julefrokost på Amager (amager-spillet/server/worker-public.js).
// Variabler: ALLOWED_ORIGIN (fx https://minikurser.dk) og ADMIN_TOKEN (secret).
//
// Point kan kun komme ind gennem et løb, som serveren selv har startet og taget tid på:
//   POST /run/start   { pid, level }               -> { ok, run }
//   POST /run/finish  { pid, run, score, lost }    -> { ok, score, rank } eller { ok: false, error }
// Serveren afviser et løb, der er klaret hurtigere, end banen kan løbes, og point over det,
// banen kan give (se LIMITS). Kun ét åbent løb pr. spiller ad gangen.
// lost er tabte julehjerter på banen. Hvert koster 20 sekunder på uret. Serveren gemmer det laveste tal pr. bane.
// Har man klaret alle ni baner, lægger serveren selv bonussen for at nå festen til tiden oveni.
//
//   GET  /top?me=<pid>&n=8  -> { players: [{ name, runner, country, score, reached, lost, me }],
//                                countries: [{ country, avg, players, best }], me: { rank, score, reached, lost } | null, count }
//   POST /sync              { pid, name, runner, country }  -> { ok, score, rank }   (aldrig point)
//
// Admin (kræver header Authorization: Bearer <ADMIN_TOKEN>). Uden ADMIN_TOKEN er admin slået fra.
//   GET  /admin/players                 -> alle spillere med pid, også skjulte
//   POST /admin/hide   { pid, hidden }  -> skjul (hidden: true) eller vis igen (hidden: false)
//   GET  /admin/rejected                -> de seneste afviste løb (mistanke om snyd)

const RUNNERS = ['r1', 'r2', 'r3', 'r4', 'r5'];
const COUNTRIES = ['BYG', 'FIN', 'HR', 'IT', 'KOM', 'UDD', 'OKO', 'KU'];
const LEVELS = ['cykelsti', 'julemarked', 'straek', 'openspace', 'printrum', 'gangen', 'garderobe', 'dansegulv', 'baren'];
const NAME_MAX = 12;
const CUP_TOP = 10;   // afdelingskampen: gennemsnittet af de 10 bedste i hver afdeling

// Regnet ud af tools/limits.mjs ud fra banerne i src/data/levels.js.
// max:  højeste point en bane kan give (alt samlet, combo x5 hele vejen, alle bonusser) plus 10% luft.
// sec:  hvor mange sekunder banen tager. Et løb skal mindst tage 80% af det.
const LIMITS = {
  cykelsti: { max: 120000, sec: 124 },
  julemarked: { max: 124100, sec: 119 },
  straek: { max: 143300, sec: 134 },
  openspace: { max: 121100, sec: 110 },
  printrum: { max: 132300, sec: 114 },
  gangen: { max: 133100, sec: 124 },
  garderobe: { max: 159000, sec: 139 },
  dansegulv: { max: 283000, sec: 142 },
  baren: { max: 306700, sec: 143 },
};
const MIN_SHARE = 0.8;
const RUN_TTL = 2 * 3600 * 1000;

// Uret: samme regler som CLOCK i src/config.js
const CLOCK = { startMin: 14 * 60, perLevelMin: 3, hitSec: 20, deadlineMin: 14 * 60 + 30, onTimeBonus: 5000, earlyBonus: 1000 };
function timeBonus(lost) {
  const arrival = (CLOCK.startMin + CLOCK.perLevelMin * LEVELS.length) * 60 + CLOCK.hitSec * lost;
  const early = Math.floor((CLOCK.deadlineMin * 60 - arrival) / CLOCK.hitSec);
  return early >= 0 ? CLOCK.onTimeBonus + early * CLOCK.earlyBonus : 0;
}

function minMs(level) { return Math.max(20000, Math.round(LIMITS[level].sec * MIN_SHARE * 1000) - 4000); }

// Grænser mod bots og spam: [antal, sekunder]
const RATE = {
  newPlayerIp: [80, 3600],
  syncPid: [120, 600],
  runPid: [40, 600],
  runIp: [800, 600],
  finishPid: [60, 600],
  topIp: [600, 60],
};

// Samme navneregler som src/systems/names.js
const ALLOWED = /[^A-Za-z0-9ÆØÅæøåÉé .\-_!']/g;
const SUB = ['fuck', 'fisse', 'kusse', 'luder', 'neger', 'nigger', 'nigga', 'perker', 'hitler', 'nazi', 'cunt', 'whore', 'retard', 'spasser', 'kneppe', 'porno', 'bøsserøv'];
const WORD = ['pik', 'sex', 'lort', 'røv', 'bøsse', 'dick', 'cock', 'ass', 'shit'];

function cleanName(raw) {
  let s = String(raw || '').normalize('NFC');
  s = s.replace(/[^\u0000-\u007fÆØÅæøåÉé]/g, (ch) => ch.normalize('NFD').replace(/\p{M}/gu, ''));
  return s.replace(ALLOWED, '').replace(/\s{2,}/g, ' ').trim().slice(0, NAME_MAX).trim();
}

function isBlocked(name) {
  const leet = (s) => s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
  const low = leet(name.toLowerCase());
  const flat = low.replace(/[^a-zæøåé]/g, '');
  const words = low.split(/[^a-zæøåé]+/).filter(Boolean);
  return SUB.some((w) => flat.includes(w)) || WORD.some((w) => flat === w || words.includes(w));
}

// ---------- HTTP ----------

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function cors(env, request) {
  const list = allowedOrigins(env);
  const origin = request?.headers.get('Origin') || '';
  const allow = !list.length ? '*' : (list.includes(origin) ? origin : list[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function makeJson(env, request) {
  return (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(env, request) },
  });
}

/** Spillets egne kald kommer fra spillets side. Andre sider må ikke sende på vegne af spillerne. */
function originOk(request, env) {
  const list = allowedOrigins(env);
  if (!list.length) return true;
  return list.includes(request.headers.get('Origin') || '');
}

async function readBody(request) {
  const len = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (len > 4096) return null;
  const text = await request.text();
  if (text.length > 4096) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

const validPid = (pid) => typeof pid === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(pid);
const validRun = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(id);

function randomId(bytes = 18) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function ipKey(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'ukendt';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`party:${ip}`));
  return [...new Uint8Array(d)].slice(0, 10).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------- Databasen ----------

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS players (pid TEXT PRIMARY KEY, name TEXT NOT NULL, runner TEXT NOT NULL, country TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, reached INTEGER NOT NULL DEFAULT 0, lost INTEGER, hidden INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS players_rank ON players (hidden, score DESC, updated ASC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS players_country ON players (country, hidden, score DESC)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS scores (pid TEXT NOT NULL, level TEXT NOT NULL, score INTEGER NOT NULL, lost INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (pid, level))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, pid TEXT NOT NULL, level TEXT NOT NULL, started INTEGER NOT NULL, state INTEGER NOT NULL DEFAULT 0, score INTEGER, finished INTEGER, note TEXT)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS runs_pid ON runs (pid, state)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS runs_state ON runs (state, finished)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS hits (k TEXT NOT NULL, w INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (k, w))'),
  ]);
  schemaReady = true;
}

// Run states
const OPEN = 0;
const DONE = 1;
const REPLACED = 2;
const REJECTED = 3;

/** Tæller et kald. Returnerer true, hvis grænsen er nået. */
async function limited(env, name, id) {
  const [max, sec] = RATE[name];
  const w = Math.floor(Date.now() / 1000 / sec);
  const row = await env.DB.prepare(
    'INSERT INTO hits (k, w, n) VALUES (?, ?, 1) ON CONFLICT(k, w) DO UPDATE SET n = n + 1 RETURNING n'
  ).bind(`${name}:${id}`, w).first();
  return (row?.n || 0) > max;
}

function cleanup(env, ctx) {
  if (Math.random() > 0.02) return;
  const now = Date.now();
  ctx?.waitUntil?.(env.DB.batch([
    env.DB.prepare('DELETE FROM hits WHERE w < ?').bind(Math.floor(now / 1000 / 86400) - 3),
    env.DB.prepare('DELETE FROM runs WHERE state IN (?, ?) AND started < ?').bind(OPEN, REPLACED, now - 3 * 86400 * 1000),
    env.DB.prepare('DELETE FROM runs WHERE state = ? AND finished < ?').bind(DONE, now - 30 * 86400 * 1000),
  ]).catch(() => null));
}

async function rankOf(env, pid) {
  const me = await env.DB.prepare('SELECT score, reached, lost, updated, hidden FROM players WHERE pid = ?').bind(pid).first();
  if (!me) return null;
  const ahead = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM players WHERE hidden = 0 AND score > 0 AND (score > ? OR (score = ? AND updated < ?))'
  ).bind(me.score, me.score, me.updated).first();
  return { rank: (ahead?.c || 0) + 1, score: me.score, reached: me.reached, lost: me.lost, hidden: !!me.hidden };
}

/** Lægger spillerens godkendte point sammen (plus tidsbonus, når alle baner er klaret) og gemmer summen. */
async function recompute(env, pid) {
  const rows = (await env.DB.prepare('SELECT level, score, lost FROM scores WHERE pid = ?').bind(pid).all()).results || [];
  const byLevel = Object.fromEntries(rows.map((r) => [r.level, r]));
  const sum = LEVELS.reduce((s, l) => s + (byLevel[l]?.score || 0), 0);
  const reached = LEVELS.reduce((m, l, i) => (byLevel[l] != null ? i + 1 : m), 0);
  const done = LEVELS.every((l) => byLevel[l] != null);
  const lost = done ? LEVELS.reduce((s, l) => s + (byLevel[l].lost || 0), 0) : null;
  const total = sum + (done ? timeBonus(lost) : 0);
  // updated flyttes kun, når pointene stiger, så den der kom først står øverst ved lige point
  await env.DB.prepare(
    'UPDATE players SET score = ?, reached = ?, lost = ?, updated = CASE WHEN ? > score THEN ? ELSE updated END WHERE pid = ?'
  ).bind(total, reached, lost, total, Date.now(), pid).run();
  return total;
}

// ---------- Navn, løber og land ----------

async function sync(env, request, body, json) {
  const pid = body?.pid;
  if (!validPid(pid)) return json({ ok: false, error: 'bad pid' }, 400);
  if (await limited(env, 'syncPid', pid)) return json({ ok: false, error: 'slow down' }, 429);
  const name = cleanName(body?.name);
  if (name.length < 2 || isBlocked(name)) return json({ ok: false, error: 'bad name' }, 400);
  const runner = RUNNERS.includes(body?.runner) ? body.runner : 'r1';
  const country = COUNTRIES.includes(body?.country) ? body.country : 'KU';
  const now = Date.now();

  const old = await env.DB.prepare('SELECT pid FROM players WHERE pid = ?').bind(pid).first();
  if (!old) {
    if (await limited(env, 'newPlayerIp', await ipKey(request))) return json({ ok: false, error: 'slow down' }, 429);
    await env.DB.prepare(
      'INSERT INTO players (pid, name, runner, country, score, reached, hidden, created, updated) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?) ON CONFLICT(pid) DO NOTHING'
    ).bind(pid, name, runner, country, now, now).run();
  } else {
    await env.DB.prepare('UPDATE players SET name = ?, runner = ?, country = ? WHERE pid = ?').bind(name, runner, country, pid).run();
  }
  const total = await recompute(env, pid);
  const r = await rankOf(env, pid);
  return json({ ok: true, score: total, rank: total > 0 ? r?.rank || null : null });
}

// ---------- Løb: start og mål ----------

async function runStart(env, request, body, json) {
  const pid = body?.pid;
  const level = body?.level;
  if (!validPid(pid) || !LEVELS.includes(level)) return json({ ok: false, error: 'bad run' }, 400);
  if (await limited(env, 'runPid', pid) || await limited(env, 'runIp', await ipKey(request))) {
    return json({ ok: false, error: 'slow down' }, 429);
  }
  const id = randomId();
  const now = Date.now();
  await env.DB.batch([
    // kun ét åbent løb pr. spiller, så man ikke kan køre alle baner på én gang
    env.DB.prepare('UPDATE runs SET state = ? WHERE pid = ? AND state = ?').bind(REPLACED, pid, OPEN),
    env.DB.prepare('INSERT INTO runs (id, pid, level, started, state) VALUES (?, ?, ?, ?, ?)').bind(id, pid, level, now, OPEN),
  ]);
  return json({ ok: true, run: id });
}

async function runFinish(env, request, body, json) {
  const pid = body?.pid;
  const id = body?.run;
  if (!validPid(pid) || !validRun(id)) return json({ ok: false, error: 'bad run' }, 400);
  if (await limited(env, 'finishPid', pid)) return json({ ok: false, error: 'slow down' }, 429);
  const run = await env.DB.prepare('SELECT * FROM runs WHERE id = ?').bind(id).first();
  if (!run || run.pid !== pid) return json({ ok: false, error: 'bad run' }, 400);
  if (run.state === DONE) return json({ ok: true, score: null, dup: true });
  if (run.state !== OPEN) return json({ ok: false, error: 'stale' });

  const now = Date.now();
  const elapsed = now - run.started;
  const score = Number(body?.score);
  const lost = Number(body?.lost ?? 0);
  const reject = async (note) => {
    await env.DB.prepare('UPDATE runs SET state = ?, score = ?, finished = ?, note = ? WHERE id = ?')
      .bind(REJECTED, Number.isFinite(score) ? Math.round(score) : null, now, note, id).run();
    return json({ ok: false, error: 'rejected' });
  };
  if (elapsed > RUN_TTL) return reject('for gammelt');
  if (elapsed < minMs(run.level)) return reject(`for hurtigt: ${Math.round(elapsed / 1000)} sek.`);
  if (!Number.isInteger(score) || score < 0) return reject('ugyldige point');
  if (!Number.isInteger(lost) || lost < 0 || lost > 999) return reject('ugyldigt antal hjerter');
  if (score > LIMITS[run.level].max) return reject(`for mange point: ${score}`);

  await env.DB.batch([
    env.DB.prepare('UPDATE runs SET state = ?, score = ?, finished = ? WHERE id = ?').bind(DONE, score, now, id),
    env.DB.prepare(
      'INSERT INTO scores (pid, level, score, lost) VALUES (?, ?, ?, ?) ON CONFLICT(pid, level) DO UPDATE SET score = MAX(score, excluded.score), lost = MIN(lost, excluded.lost)'
    ).bind(pid, run.level, score, lost),
  ]);
  const total = await recompute(env, pid);
  const r = await rankOf(env, pid);
  return json({ ok: true, score: total, rank: r && total > 0 ? r.rank : null });
}

// ---------- Listen og landekampen ----------

async function top(env, url, json) {
  const me = url.searchParams.get('me');
  const n = Math.max(1, Math.min(50, parseInt(url.searchParams.get('n') || '8', 10) || 8));
  const list = (await env.DB.prepare(
    'SELECT pid, name, runner, country, score, reached, lost FROM players WHERE hidden = 0 AND score > 0 ORDER BY score DESC, updated ASC LIMIT ?'
  ).bind(n).all()).results || [];
  const count = (await env.DB.prepare('SELECT COUNT(*) AS c FROM players WHERE hidden = 0 AND score > 0').first())?.c || 0;
  const players = list.map((p) => ({ name: p.name, runner: p.runner, country: p.country, score: p.score, reached: p.reached, lost: p.lost, me: p.pid === me }));

  const cup = await env.DB.batch(COUNTRIES.flatMap((c) => [
    env.DB.prepare('SELECT name, score FROM players WHERE hidden = 0 AND score > 0 AND country = ? ORDER BY score DESC, updated ASC LIMIT ?').bind(c, CUP_TOP),
    env.DB.prepare('SELECT COUNT(*) AS c FROM players WHERE hidden = 0 AND score > 0 AND country = ?').bind(c),
  ]));
  const countries = COUNTRIES.map((c, i) => {
    const rows = cup[i * 2].results || [];
    const total = cup[i * 2 + 1].results?.[0]?.c || 0;
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
    return { country: c, avg, players: total, best: rows[0]?.name || '' };
  }).sort((a, b) => b.avg - a.avg);

  let mine = null;
  if (validPid(me)) {
    const r = await rankOf(env, me);
    if (r && !r.hidden && r.score > 0) mine = { rank: r.rank, score: r.score, reached: r.reached, lost: r.lost };
  }
  return json({ players, countries, me: mine, count });
}

// ---------- Admin ----------

function isAdmin(request, env) {
  const token = env.ADMIN_TOKEN || '';
  if (token.length < 16) return false;
  const h = request.headers.get('Authorization') || '';
  const want = `Bearer ${token}`;
  if (h.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= h.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

async function admin(env, request, url, path, json) {
  if (request.method === 'GET' && path === '/admin/players') {
    const all = (await env.DB.prepare('SELECT pid, name, runner, country, score, reached, lost, hidden, created, updated FROM players ORDER BY score DESC').all()).results || [];
    return json({ players: all });
  }
  if (request.method === 'POST' && path === '/admin/hide') {
    const body = (await readBody(request)) || {};
    if (!validPid(body.pid)) return json({ ok: false, error: 'bad pid' }, 400);
    await env.DB.prepare('UPDATE players SET hidden = ? WHERE pid = ?').bind(body.hidden === false ? 0 : 1, body.pid).run();
    return json({ ok: true });
  }
  if (request.method === 'GET' && path === '/admin/rejected') {
    const rows = (await env.DB.prepare(
      'SELECT r.pid, p.name, r.level, r.score, r.started, r.finished, r.note FROM runs r LEFT JOIN players p ON p.pid = r.pid WHERE r.state = ? ORDER BY r.finished DESC LIMIT 200'
    ).bind(REJECTED).all()).results || [];
    return json({ rejected: rows });
  }
  return json({ ok: false, error: 'not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const json = makeJson(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, request) });
    try {
      await ensureSchema(env);
      cleanup(env, ctx);
      if (path.startsWith('/admin/')) {
        if (!isAdmin(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
        return await admin(env, request, url, path, json);
      }
      if (request.method === 'GET' && path === '/top') {
        if (await limited(env, 'topIp', await ipKey(request))) return json({ ok: false, error: 'slow down' }, 429);
        return await top(env, url, json);
      }
      if (request.method === 'POST') {
        if (!originOk(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
        const body = await readBody(request);
        if (!body || typeof body !== 'object') return json({ ok: false, error: 'bad json' }, 400);
        if (path === '/sync') return await sync(env, request, body, json);
        if (path === '/run/start') return await runStart(env, request, body, json);
        if (path === '/run/finish') return await runFinish(env, request, body, json);
      }
      if (path === '/') return json({ ok: true, name: 'late-for-the-party-scores' });
      return json({ ok: false, error: 'not found' }, 404);
    } catch (e) {
      return json({ ok: false, error: 'server error' }, 500);
    }
  },
};
