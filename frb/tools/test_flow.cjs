#!/usr/bin/env node
/* Tester betjeningen med rigtige berøringer i en hovedløs Chrome:
   startskærm, tjek ind (navn, løber og land), øvebanen med swipe op, swipe ned og tap,
   kortet, en bane, pause og telefonen på højkant.

   Kør:  node frb/tools/test_flow.cjs   (kræver puppeteer-core, se test_play.cjs)
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(__dirname, 'shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.xml': 'application/xml' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FEJL'} ${name} ${extra}`); if (!ok) failed++; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const srv = http.createServer((req, res) => {
    let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith(path.sep) || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, 'index.html');
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/frb/`;
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const errors = [];
  const newPage = async (query, vp = { width: 844, height: 390 }) => {
    const page = await browser.newPage();
    await page.setViewport({ ...vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await page.setRequestInterception(true);
    page.on('request', (r) => { if (r.url().includes('workers.dev')) r.abort(); else r.continue(); });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(base + query, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.scene.getScenes(true).some((s) => s.sys.settings.key !== 'Boot'), { timeout: 20000 });
    await sleep(2400);   // Minikursers logo skal være væk
    return page;
  };
  const pt = async (page, gx, gy) => page.evaluate((x, y) => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 640, y: r.top + (y * r.height) / 360 };
  }, gx, gy);
  const tap = async (page, gx, gy) => { const p = await pt(page, gx, gy); await page.touchscreen.tap(p.x, p.y); await sleep(350); };
  const swipe = async (page, gx, gy, dy) => {
    const a = await pt(page, gx, gy); const b = await pt(page, gx, gy + dy);
    await page.touchscreen.touchStart(a.x, a.y); await sleep(30);
    await page.touchscreen.touchMove(a.x, (a.y + b.y) / 2); await sleep(20);
    await page.touchscreen.touchMove(b.x, b.y); await sleep(20);
    await page.touchscreen.touchEnd();
  };
  const active = (page, key) => page.evaluate((k) => window.__game.scene.isActive(k), key);
  const lvl = (page, fn) => page.evaluate(`(() => { const L = window.__game.scene.getScene('Level'); const p = L.player; return (${fn}); })()`);
  const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('frb-julespil-v1') || '{}'));

  // ---------- A: første gang ----------
  let page = await newPage('');
  check('startskærmen vises', await active(page, 'Title'));
  await tap(page, 96, 172);
  check('START åbner tjek ind', await active(page, 'Select'));
  await tap(page, 30, 340);
  await tap(page, 488, 314);
  check('uden navn kan man ikke gå videre', await active(page, 'Select'));
  const f = await page.$('#name-field');
  await f.tap(); await f.type('Kasper');
  await tap(page, 62 + 2 * 62, 166);   // løber 3
  await tap(page, 48 + 4 * 39, 248);   // Kommunikation
  await page.screenshot({ path: path.join(SHOTS, 'flow_select.png') });
  await tap(page, 488, 314);
  check('LØB! starter øvebanen første gang', (await active(page, 'Level')) && (await lvl(page, 'L.tutorial')));
  const s1 = await save(page);
  check('navn, løber og afdeling er gemt', s1.name === 'Kasper' && s1.runner === 'r3' && s1.country === 'KOM', JSON.stringify({ n: s1.name, r: s1.runner, c: s1.country }));
  const frozen = () => page.waitForFunction(() => window.__game.scene.getScene('Level').frozen, { timeout: 15000 });
  await frozen();
  await page.screenshot({ path: path.join(SHOTS, 'flow_tutorial.png') });
  await tap(page, 320, 200);
  check('øvebanen venter ved forkert bevægelse', await lvl(page, '!!L.frozen && L.stepIdx === 0'));
  await swipe(page, 320, 220, -70); await sleep(150);
  check('øvebanen: swipe op godkendes', await lvl(page, '!L.frozen && L.stepIdx === 1'));
  await frozen();
  await swipe(page, 320, 180, 70); await sleep(150);
  check('øvebanen: swipe ned godkendes', await lvl(page, '!L.frozen && L.stepIdx === 2 && p.sliding'));
  await frozen();
  await tap(page, 320, 200);
  check('øvebanen: tap godkendes', await lvl(page, '!L.frozen && L.stepIdx === 3'));
  await page.waitForFunction(() => window.__game.scene.isActive('Map'), { timeout: 25000 });
  check('efter øvebanen åbner kortet', (await save(page)).tutorialDone === true);
  await sleep(400);
  await page.screenshot({ path: path.join(SHOTS, 'flow_map.png') });
  await tap(page, 556, 339);
  check('SPIL starter bane 1 med HUD', (await active(page, 'Level')) && (await active(page, 'Hud')) && (await lvl(page, 'L.levelIndex === 0 && !L.tutorial')));
  await sleep(700);
  await swipe(page, 320, 220, -70); await sleep(120);
  check('swipe op: løberen hopper', await lvl(page, 'p.body.velocity.y < 0 || !p.onGround'));
  await page.waitForFunction(() => window.__game.scene.getScene('Level').player.onGround, { timeout: 3000 });
  await swipe(page, 320, 180, 70); await sleep(60);
  check('swipe ned: løberen slider', await lvl(page, 'p.sliding'));
  await sleep(700);
  const before = await lvl(page, 'p.swingId');
  await tap(page, 320, 200);
  check('tap: Excuse me', (await lvl(page, 'p.swingId')) === before + 1);
  await page.screenshot({ path: path.join(SHOTS, 'flow_excuse.png') });
  await tap(page, 640 - 22, 20);
  check('pauseknappen sætter banen på pause', (await active(page, 'Result')) && (await page.evaluate(() => window.__game.scene.isPaused('Level'))));
  await tap(page, 320, 156);
  check('FORTSÆT genoptager banen', (await active(page, 'Level')) && !(await active(page, 'Result')));
  const clock = await page.evaluate(() => window.__game.scene.getScene('Hud').clockTxt.text);
  check('uret går fra 14:00', /^14:0\d$/.test(clock), clock);
  // lad løberen løbe uden hjælp, til hjerterne er brugt
  for (let i = 0; i < 300 && !(await active(page, 'Result')); i++) await sleep(300);
  const data = await page.evaluate(() => window.__game.scene.getScene('Result').sys.settings.data);
  check('uden styring ryger hjerterne', data.mode === 'dead' && data.lost >= 3, `(tabt: ${data.lost})`);
  await page.screenshot({ path: path.join(SHOTS, 'flow_dead.png') });
  await tap(page, 320, 220);
  await sleep(500);
  check('PRØV IGEN starter med tre hjerter, og de tabte tæller stadig på uret', (await active(page, 'Level')) && (await lvl(page, 'L.st.hearts === 3 && L.st.lost >= 3')));
  await page.close();

  // ---------- B: telefon på højkant ----------
  page = await newPage('', { width: 390, height: 844 });
  await page.screenshot({ path: path.join(SHOTS, 'flow_portrait.png') });
  check('på højkant vises spillet og beskeden om at dreje', await page.evaluate(() => document.querySelector('#game canvas').getBoundingClientRect().width > 300 && getComputedStyle(document.getElementById('rotate')).display === 'block'));
  await page.close();

  await browser.close();
  srv.close();
  if (errors.length) { console.log('\nFEJL I KONSOLLEN:\n' + [...new Set(errors)].join('\n')); failed++; }
  console.log(failed ? `\n${failed} TJEK FEJLEDE` : '\nALT OK');
  process.exit(failed ? 1 : 0);
})();
