#!/usr/bin/env node
/* Tjekker navnefeltet, når spillet er gået i fuldskærm på en Android-telefon (START låser til bredformat).
   Feltet skal ligge inde i fuldskærmen, være øverst, hvor man trykker, og kunne få fokus, så tastaturet kommer op.
   Kør:  node frb/tools/test_fullscreen.cjs   (kræver puppeteer-core, se test_play.cjs)
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.xml': 'application/xml' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FEJL'} ${name} ${extra}`); if (!ok) failed++; };

(async () => {
  const srv = http.createServer((req, res) => {
    let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith(path.sep) || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, 'index.html');
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.setUserAgent(ANDROID);
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => { if (r.url().includes('workers.dev')) r.abort(); else r.continue(); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/frb/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Title'), { timeout: 20000 });
  await sleep(2400);
  const pt = (gx, gy) => page.evaluate((x, y) => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 640, y: r.top + (y * r.height) / 360 };
  }, gx, gy);
  let p = await pt(96, 172);
  await page.touchscreen.tap(p.x, p.y);
  await sleep(900);
  const st = await page.evaluate(() => {
    const el = document.getElementById('name-field');
    const fsEl = document.fullscreenElement;
    if (!el) return { field: false, fs: !!fsEl };
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { field: true, fs: !!fsEl, inside: !!fsEl && fsEl.contains(el), onTop: top === el, w: Math.round(r.width) };
  });
  check('START går i fuldskærm på Android', st.fs);
  check('navnefeltet findes', st.field);
  check('navnefeltet ligger inde i fuldskærmen', st.inside);
  check('navnefeltet er øverst, hvor man trykker', st.onTop, `(bredde ${st.w}px)`);
  const f = await page.$('#name-field');
  if (f) {
    await f.tap();
    await sleep(200);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id === 'name-field');
    check('tryk på feltet giver det fokus (tastaturet kommer op)', focused);
    await f.type('Kasper');
    check('man kan skrive i feltet', (await page.evaluate(() => document.getElementById('name-field').value)) === 'Kasper');
  }
  // fuldskærm forlades (fx med tilbage-knappen): feltet skal stadig virke
  await page.evaluate(() => document.exitFullscreen && document.exitFullscreen());
  await sleep(600);
  const after = await page.evaluate(() => {
    const el = document.getElementById('name-field');
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
  });
  check('uden fuldskærm er feltet stadig øverst', after);
  await page.screenshot({ path: path.join(__dirname, 'shots', 'fullscreen_select.png') });
  await browser.close();
  srv.close();
  console.log(failed ? `\n${failed} TJEK FEJLEDE` : '\nALT OK');
  process.exit(failed ? 1 : 0);
})();
