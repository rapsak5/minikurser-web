#!/usr/bin/env node
/* Automatisk gennemspilning i en hovedløs Chrome.

   Tjekker at spillet starter uden fejl, at alle skærme kan åbnes, og at en simpel
   robot kan gennemføre alle baner. Gemmer skærmbilleder i tools/shots/.

   Kræver:  npm i puppeteer-core   og en Chrome (sti i CHROME, ellers /usr/bin/google-chrome)
   Kør:     node deloitte/tools/test_play.cjs      (starter selv en lille webserver i repoets rod)
            ONLY=1,4 node ...  spiller kun de baner
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(__dirname, 'shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.xml': 'application/xml' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (p.endsWith(path.sep) || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, 'index.html');
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Køres inde på siden: stepper spillet manuelt (hurtigere end realtid) og lader robotten styre.
async function simulate(maxMs) {
  const game = window.__game;
  game.loop.stop();
  let t = game.loop.now || performance.now();
  const log = { frames: 0, hurt: 0, events: [] };
  const step = (render) => { t += 1000 / 60; if (render) game.step(t, 1000 / 60); else game.headlessStep(t, 1000 / 60); };
  const active = (k) => game.scene.isActive(k);
  let lastHearts = null;
  for (let ms = 0; ms < maxMs; ms += 1000 / 60) {
    step(false);
    log.frames++;
    if (active('Result')) { log.result = game.scene.getScene('Result').sys.settings.data; break; }
    const L = game.scene.getScene('Level');
    if (!active('Level') || L.ended) continue;
    const p = L.player;
    if (lastHearts == null) lastHearts = L.st.hearts;
    if (L.st.hearts < lastHearts) {
      log.hurt += lastHearts - L.st.hearts;
      const near = L.ents.filter((e) => e.alive && e.def.kind === 'enemy').map((e) => ({ e, d: Math.abs(e.s.x - p.x) })).sort((a, b) => a.d - b.d)[0];
      log.events.push(`mistede hjerte ved x=${Math.round(p.x)} (${near ? near.e.sp.type + ':' + (near.e.def.anim || near.e.def.frame) + ' ' + (p.onGround ? 'jord' : 'luft') + (p.sliding ? ' slide' : '') : 'hul'})`);
    }
    lastHearts = L.st.hearts;
    const speed = L.speed;
    const lead = speed * 0.12;
    // huller
    for (const pit of L.built.pits) { if (p.onGround && p.x > pit.x0 - 34 - lead * 0.2 && p.x < pit.x0 - 4) L.command(L.shotActive() ? 'down' : 'up'); }
    // ting forude
    for (const e of L.ents) {
      if (!e.alive || e.def.kind !== 'enemy') continue;
      const r = L.entRect(e);
      const dx = r.x - (p.x + 11);
      if (dx < -r.w - 20 || dx > 140) continue;
      if (e.def.low && !e.def.hittable) { if (dx < 40 + lead && !p.sliding && p.onGround) L.command(L.shotActive() ? 'up' : 'down'); }
      else if (e.def.hittable) { if (dx < 56 && !p.holdSlide) L.command('tap'); }
      else if (dx < 28 + lead * 0.5 && dx > 0 && p.onGround) L.command(L.shotActive() ? 'down' : 'up');
    }
  }
  step(true);
  const L = game.scene.getScene('Level');
  log.hearts = L.st.hearts; log.score = L.st.score; log.picked = L.st.picked; log.total = L.pickupTotal; log.lost = L.st.lost;
  log.x = Math.round(L.player.x); log.width = L.built.width; log.sec = Math.round(L.clock / 1000);
  game.loop.start(game.step.bind(game));
  return log;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/deloitte/`;
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const errors = [];
  const open = async (query = '', setup = null) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    // topscorerserveren kaldes ikke i testen
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (r.url().includes('workers.dev')) r.abort(); else r.continue(); });
    page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`[${query}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${query}] pageerror: ${e.message}`));
    if (setup) await page.evaluateOnNewDocument(setup);
    await page.goto(base + query, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((s) => s.sys.settings.key !== 'Boot'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2600));
    return page;
  };
  const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
  // en spiller, der har klaret alt, så kortet og slutskærmen kan ses
  const saved = () => {
    localStorage.setItem('late-for-the-party-v1', JSON.stringify({
      v: 1, pid: 'test-robot-0001', runner: 'r3', country: 'SE', name: 'Robot', tutorialDone: true,
      progress: { best: { cykelsti: 41200, julemarked: 38900, straek: 44100, openspace: 39500, printrum: 42800, gangen: 40100, garderobe: 47300, dansegulv: 51200, baren: 49800 },
        lost: { cykelsti: 0, julemarked: 1, straek: 2, openspace: 0, printrum: 1, gangen: 0, garderobe: 1, dansegulv: 1, baren: 0 }, unlocked: 9, done: true },
    }));
  };

  // 1) skærmene
  if (!process.env.ONLY) {
    for (const [name, q, setup] of [['title', '', null], ['select', '?scene=Select', null], ['map', '?scene=Map', saved], ['scores', '?scene=Scores', saved],
      ['cut_taxi', '?scene=Cut&kind=taxi', saved], ['cut_suit', '?scene=Cut&kind=suit', saved], ['cut_bar', '?scene=Cut&kind=bar', saved]]) {
      const page = await open(q, setup);
      await shot(page, `skaerm_${name}`);
      await page.close();
    }
  }

  // 2) alle baner med robot
  const levels = await (async () => { const page = await open(''); const n = await page.evaluate(async () => (await import('./src/data/levels.js')).LEVELS.length); await page.close(); return n; })();
  let ok = true;
  const only = (process.env.ONLY || '').split(',').filter(Boolean).map(Number);
  for (let i = 1; i <= (process.env.SCREENS ? 0 : levels); i++) {
    if (only.length && !only.includes(i)) continue;
    const page = await open(`?level=${i}`, saved);
    await page.evaluate(simulate.toString() + '; window.__sim = simulate;');
    const mid = await page.evaluate(() => window.__sim(14000));
    await new Promise((r) => setTimeout(r, 300));
    await shot(page, `bane${i}_a`);
    const res = await page.evaluate(() => window.__sim(400000));
    await new Promise((r) => setTimeout(r, 400));
    await shot(page, `bane${i}_slut`);
    const mode = res.result ? res.result.mode : 'ikke færdig';
    if (mode !== 'complete') ok = false;
    console.log(`bane ${i}: ${mode}  tid=${res.sec}s  hjerter=${res.hearts}  tabt=${res.lost}  point=${res.result?.total ?? res.score}  samlet=${res.picked}/${res.total}  x=${res.x}/${res.width}`, [...mid.events, ...res.events].slice(0, 8).join('; '));
    await page.close();
  }

  await browser.close();
  srv.close();
  if (errors.length) { console.log('\nFEJL I KONSOLLEN:\n' + [...new Set(errors)].slice(0, 30).join('\n')); ok = false; }
  console.log(ok ? '\nALT OK' : '\nNOGET FEJLEDE');
  process.exit(ok ? 0 : 1);
})();
