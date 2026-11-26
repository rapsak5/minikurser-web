// Tester serveren uden Cloudflare: workeren køres direkte i Node med en lille D1-efterligning oven på node:sqlite.
// Kør: node --experimental-sqlite frb/tools/test_server.mjs
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/worker.js';

const db = new DatabaseSync(':memory:');
function stmt(sql, args = []) {
  const run = () => {
    const s = db.prepare(sql);
    const isRead = /^\s*(SELECT|WITH)/i.test(sql) || /RETURNING/i.test(sql);
    if (isRead) return { results: s.all(...args) };
    s.run(...args);
    return { results: [] };
  };
  return {
    bind: (...a) => stmt(sql, a.map((v) => (v === undefined ? null : v))),
    first: async () => run().results[0] ?? null,
    all: async () => run(),
    run: async () => run(),
    _run: run,
  };
}
const env = { DB: { prepare: (sql) => stmt(sql), batch: async (list) => list.map((s) => s._run()) }, ALLOWED_ORIGIN: 'https://minikurser.dk', ADMIN_TOKEN: 'test-token-1234567890' };

let now = 1_800_000_000_000;
Date.now = () => now;
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FEJL'} ${name} ${extra}`); if (!ok) failed++; };
const call = async (method, path, body, headers = {}) => {
  const res = await worker.fetch(new Request(`https://x.test${path}`, {
    method, headers: { Origin: 'https://minikurser.dk', 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }), env, {});
  return { status: res.status, data: await res.json().catch(() => null) };
};
const LEVELS = ['cykelsti', 'julemarked', 'straek', 'openspace', 'printrum', 'gangen', 'garderobe', 'dansegulv', 'baren'];
const play = async (pid, level, score, lost, secs = 200) => {
  const a = await call('POST', '/run/start', { pid, level });
  now += secs * 1000;
  return call('POST', '/run/finish', { pid, run: a.data.run, score, lost });
};

let r = await call('POST', '/sync', { pid: 'spiller-maja-01', name: 'Maja', runner: 'r3', country: 'HR' });
check('sync opretter spiller', r.data.ok && r.data.score === 0);
r = await call('POST', '/sync', { pid: 'spiller-erik-01', name: 'Erik', runner: 'r1', country: 'IT' });
r = await call('POST', '/sync', { pid: 'spiller-aino-01', name: 'Aino', runner: 'r9', country: 'XX' });
check('ukendt land og løber falder tilbage', r.data.ok);
r = await call('POST', '/sync', { pid: 'spiller-grim-01', name: 'fuck', runner: 'r1', country: 'HR' });
check('grimt navn afvises', r.status === 400);
r = await call('POST', '/sync', { pid: 'spiller-maja-01', name: 'Maja', runner: 'r3', country: 'HR' }, { Origin: 'https://ond.example' });
check('fremmed side afvises', r.status === 403);

r = await play('spiller-maja-01', 'cykelsti', 60000, 1);
check('godkendt løb giver point', r.data.ok && r.data.score === 60000 && r.data.rank === 1, JSON.stringify(r.data));
r = await play('spiller-maja-01', 'cykelsti', 60000, 0, 30);
check('for hurtigt løb afvises', r.data.error === 'rejected');
r = await play('spiller-maja-01', 'cykelsti', 999999, 0);
check('for mange point afvises', r.data.error === 'rejected');
r = await play('spiller-maja-01', 'cykelsti', 50000, 0);
check('laveste antal tabte hjerter og højeste point gemmes', r.data.ok && r.data.score === 60000);
for (const l of LEVELS.slice(1)) r = await play('spiller-maja-01', l, 40000, 1);
// 60000 + 8*40000 = 380000. Tabte hjerter: 0 + 8 = 8, ankomst 17:59:40, én 20-sekunders blok foran: 5000 + 1000
check('alle baner giver tidsbonus', r.data.score === 380000 + 6000, String(r.data.score));
for (const l of LEVELS) r = await play('spiller-erik-01', l, 45000, 2);
check('for sent giver ingen bonus', r.data.score === 9 * 45000, String(r.data.score));
r = await play('spiller-aino-01', 'cykelsti', 30000, 0);

r = await call('GET', '/top?me=spiller-erik-01&n=8');
const t = r.data;
check('listen er sorteret', t.players[0].name === 'Erik' && t.players[1].name === 'Maja' && t.players[0].me === true, t.players.map((p) => `${p.name}:${p.score}:${p.country}:${p.lost}`).join(' '));
check('afdelingskampen har otte hold', t.countries.length === 8 && t.countries[0].country === 'IT' && t.countries[0].avg === 405000, JSON.stringify(t.countries));
check('ingen pid sendes ud', !JSON.stringify(t).includes('spiller-'));
check('min plads', t.me.rank === 1 && t.me.lost === 18 && t.count === 3, JSON.stringify(t.me));
r = await call('GET', '/admin/players');
check('admin kræver kodeord', r.status === 401);
r = await call('POST', '/admin/hide', { pid: 'spiller-erik-01' }, { Authorization: 'Bearer test-token-1234567890' });
r = await call('GET', '/top?n=8');
check('skjult spiller forsvinder fra listen og landekampen', r.data.players[0].name === 'Maja' && r.data.countries.find((c) => c.country === 'IT').avg === 0);
r = await call('GET', '/admin/rejected', null, { Authorization: 'Bearer test-token-1234567890' });
check('afviste løb kan ses', r.data.rejected.length === 2);

console.log(failed ? `\n${failed} TJEK FEJLEDE` : '\nALT OK');
process.exit(failed ? 1 : 0);
