// Selve banen. Bygger verden ud fra src/data/levels.js, flytter løberen og holder styr på
// forhindringer, ting, julehjerter, combo, point, ur, checkpoints og mål.
//
// Vigtige værdier at kende:
//   this.clock     banens egen tid i ms (står stille, når banen er på pause)
//   this.st        tilstand til HUD: hearts, meter, picked, score, streak, lost
//   lost           tabte julehjerter i hele løbet (også før et checkpoint). Hvert koster 20 sekunder på uret

import { CHECKPOINTS, GAME_W, GAME_H, GROUND_Y, COL, PLAYER_SCREEN_X, ROW_Y, TUNING, SCORE, COMBO, CLOCK, DEPTH, runnerId } from '../config.js';
import { LEVELS, TUTORIAL, buildLevel, levelLabel } from '../data/levels.js';
import { entityDef, THEMES } from '../data/entities.js';
import Player from '../game/Player.js';
import Gestures, { HUD_BUTTON_ZONE } from '../systems/input.js';
import * as Save from '../systems/save.js';
import * as Scores from '../systems/scores.js';
import { sfx } from '../systems/audio.js';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export default class LevelScene extends Phaser.Scene {
  constructor() { super('Level'); }

  init(data) {
    this.tutorial = !!data.tutorial;
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, LEVELS.length - 1);
    this.resumeFrom = data.checkpoint || null;
    this.run = data.run || null;       // løbets id på serveren. Følger med, når man prøver igen
    this.lostBefore = data.lost || 0;  // tabte hjerter fra tidligere forsøg i samme løb
  }

  create() {
    this.runnerId = runnerId(Save.load().runner);
    this.level = this.tutorial ? TUTORIAL : LEVELS[this.levelIndex];
    this.outfit = !this.tutorial && this.level.world === 2 ? 'xmas' : 'office';   // julejakkesættet kommer på efter kontoret
    this.frozen = null;      // øvebanen: det trin, spillet venter på
    this.stepIdx = 0;
    this.theme = THEMES[this.level.theme] || {};
    this.bg = this.theme.bg || this.level.theme;
    this.built = buildLevel(this.level);
    this.pickupTotal = this.built.spawns.filter((s) => s.type === 'b').length;
    const sp = Array.isArray(this.level.speed) ? this.level.speed : [this.level.speed, this.level.speed];
    this.speedStart = sp[0];
    this.speedEnd = sp[1];
    this.speed = sp[0];
    this.clock = 0;
    this.ended = false;
    this.ents = [];
    this.spawnIdx = 0;
    this.hintIdx = 0;
    this.shotUntil = 0;
    this.checkpoint = this.resumeFrom;
    this.st = {
      hearts: TUNING.maxHearts,
      meter: this.resumeFrom?.meter ?? 0,
      picked: this.resumeFrom?.picked ?? 0,
      score: this.resumeFrom?.score ?? 0,
      streak: 0,
      bestMult: this.resumeFrom?.bestMult ?? 1,
      lost: this.lostBefore,
    };

    this.buildWorld();

    // Serveren tager tid på løbet fra nu. Uden forbindelse tæller banen kun på enheden.
    if (!this.tutorial && !this.run) {
      const runFor = this.levelIndex;
      Scores.startRun(runFor).then((id) => { if (id && !this.run && this.levelIndex === runFor) this.run = id; });
    }

    const startX = this.resumeFrom ? this.resumeFrom.x : 100;
    this.player = new Player(this, startX, GROUND_Y, this.runnerId, this.outfit);
    this.physics.add.collider(this.player, this.groundBodies);
    while (this.spawnIdx < this.built.spawns.length && this.built.spawns[this.spawnIdx].x <= startX + 40) this.spawnIdx++;
    while (this.hintIdx < this.built.hints.length && this.built.hints[this.hintIdx].x <= startX) this.hintIdx++;

    const g = new Gestures(this, HUD_BUTTON_ZONE);
    g.on('up', () => this.command(this.shotActive() ? 'down' : 'up'));
    g.on('down', () => this.command(this.shotActive() ? 'up' : 'down'));
    g.on('tap', () => this.command('tap'));

    this.events.once('shutdown', () => { this.scene.stop('Hud'); });

    this.cameras.main.scrollX = Math.round(startX - PLAYER_SCREEN_X);
    this.scene.launch('Hud', { level: this });
    this.banner(this.tutorial ? 'ØVEBANE' : `${levelLabel(this.levelIndex)}  ${this.level.name.toUpperCase()}`, 1800, 2);
  }

  // =====================================================================
  // Verden
  // =====================================================================
  buildWorld() {
    const t = this.bg;
    const fixed = (o, depth) => o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    fixed(this.add.image(0, 0, `${t}_sky`), DEPTH.sky);
    this.far = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_far`), DEPTH.far);
    // Byen: domicilet står i baggrunden og kommer tættere på bane for bane. Festen: banneret hænger over salen.
    this.landmark = null;
    if (this.theme.landmark === 'hq') {
      const step = this.tutorial ? 0 : LEVELS.filter((l, i) => l.world === this.level.world && i <= this.levelIndex).length - 1;
      this.hqFrom = { x: 470 - step * 40, y: GROUND_Y + 96 - step * 48 };
      this.landmark = this.add.image(this.hqFrom.x, this.hqFrom.y, 'hq').setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH.landmark);
    } else if (this.theme.landmark === 'banner') {
      this.landmark = this.add.image(GAME_W / 2, 52, 'banner').setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.landmark);
    }
    this.mid = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_mid`), DEPTH.mid);
    this.groundTs = fixed(this.add.tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, `${t}_ground`), DEPTH.ground);
    this.midFrame = 0;
    if (this.theme.snow) this.snow = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow'), DEPTH.snow).setAlpha(0.8);

    // jord med huller
    this.groundBodies = [];
    let x = -800;
    const runs = [];
    for (const p of this.built.pits) {
      runs.push([x, p.x0]);
      x = p.x1;
      this.add.tileSprite(p.x0, GROUND_Y, p.x1 - p.x0, GAME_H - GROUND_Y, `${t}_pit`).setOrigin(0).setDepth(DEPTH.pit);
    }
    runs.push([x, this.built.width + 6000]);
    for (const [a, b] of runs) {
      const z = this.add.zone((a + b) / 2, GROUND_Y + 100, b - a, 200);
      this.physics.add.existing(z, true);
      this.groundBodies.push(z);
    }
  }

  // =====================================================================
  // Kommandoer
  // =====================================================================
  shotActive() { return this.clock < this.shotUntil; }

  command(cmd) {
    if (this.ended) return;
    if (this.frozen) {
      if (cmd !== this.frozen.expect) { sfx('wrong'); return; }
      this.unfreeze();
    }
    const p = this.player;
    if (cmd === 'up') p.jump(this.clock);
    else if (cmd === 'down') p.slide(this.clock);
    else if (cmd === 'tap' && p.swing(this.clock) && this.st.meter >= TUNING.beersForSuper) this.superSwing();
  }

  /** Fuld måler: alt, der kan flytte sig, flytter sig. */
  superSwing() {
    this.st.meter = 0;
    sfx('super');
    this.cameras.main.flash(220, 255, 240, 180);
    const cam = this.cameras.main;
    for (const e of this.ents) {
      if (e.alive && e.def.kind === 'enemy' && e.def.hittable && e.s.x < cam.scrollX + GAME_W + 20) this.killEnemy(e);
    }
    this.banner('SUPER UNDSKYLD!', 900, 2);
    this.emitHud();
  }

  // =====================================================================
  // Update
  // =====================================================================
  update(time, delta) {
    if (this.ended || this.frozen) return;
    delta = Math.min(delta, 50);
    this.clock += delta;
    const now = this.clock;
    const dt = delta / 1000;
    const p = this.player;
    const cam = this.cameras.main;

    this.progress = Phaser.Math.Clamp(p.x / this.built.width, 0, 1);
    this.speed = this.speedStart + (this.speedEnd - this.speedStart) * this.progress;
    p.setVelocityX(this.speed);
    p.rainbow = this.shotActive();
    p.tick(now);

    cam.scrollX = Math.round(p.x - PLAYER_SCREEN_X);
    const scroll = cam.scrollX;
    this.far.tilePositionX = Math.floor(scroll * 0.15);
    this.mid.tilePositionX = Math.floor(scroll * 0.45);
    this.groundTs.tilePositionX = Math.floor(scroll);
    if (this.hqFrom) {
      this.landmark.x = Math.round(this.hqFrom.x - 40 * this.progress);
      this.landmark.y = Math.round(this.hqFrom.y - 48 * this.progress);
    }
    if (this.theme.midFrames === 2) {
      const f = Math.floor(now / 320) % 2;
      if (f !== this.midFrame) { this.midFrame = f; this.mid.setTexture(`${this.bg}_mid${f ? '2' : ''}`); }
    }
    if (this.snow) { this.snow.tilePositionX = Math.floor(scroll * 0.7); this.snow.tilePositionY = -Math.floor(now * 0.03); }

    // snaps: dobbelt point, men styringen er byttet om, og verden sejler lidt
    if (this.shotActive()) { cam.setZoom(1.05); cam.setRotation(Math.sin(now / 280) * 0.014); }
    else if (cam.zoom !== 1) { cam.setZoom(1); cam.setRotation(0); this.emitHud(); }

    this.spawnAhead(cam.scrollX);
    this.updateEnts(now, dt, cam.scrollX);
    this.checkHints(p.x);
    this.checkPit(now);
    if (this.tutorial) this.checkTutorial();
  }

  // =====================================================================
  // Ting i banen
  // =====================================================================
  spawnAhead(scrollX) {
    const s = this.built.spawns;
    while (this.spawnIdx < s.length && s[this.spawnIdx].x < scrollX + GAME_W + 120) this.spawn(s[this.spawnIdx++]);
  }

  spawn(sp, over = null) {
    let def = entityDef(sp.type, this.level.theme);
    if (over) def = { ...def, ...over };
    // flere udgaver af samme ting: skiftevis efter placering, så banen er den samme hver gang
    if (def.variants) def = { ...def, ...def.variants[(sp.v ?? Math.floor(sp.x / COL)) % def.variants.length] };
    if (def.kind === 'checkpoint' && !CHECKPOINTS) return null;
    if (def.kind === 'goal' && this.level.goal) def = { ...def, frame: this.level.goal };
    const floating = def.kind === 'pickup';
    const bottom = def.anchor ? def.anchor === 'bottom' : (sp.row === 'lo' && !floating);
    let y = def.y ?? ROW_Y[sp.row];
    if (floating && sp.row === 'lo') y = GROUND_Y - 24;
    const s = this.add.sprite(sp.x, y, 'atlas', def.frame).setDepth(DEPTH.ent).setOrigin(0.5, bottom ? 1 : 0.5);
    if (def.anim) s.play(def.anim);
    const e = { sp, def, s, bottom, baseY: y, hp: def.hp ?? 1, alive: true, lastSwingId: -1, phase: sp.x * 0.7 };
    if (def.sway) { s.setOrigin(0.5, 0); s.y = y - s.height; }   // ophænget er øverst
    this.ents.push(e);
    return e;
  }

  entRect(e) {
    const [w, h] = e.def.box || [e.s.width, e.s.height];
    if (e.def.sway) {
      const bx = e.s.x - Math.sin(e.s.rotation) * e.s.height;
      const by = e.s.y + Math.cos(e.s.rotation) * e.s.height;
      return { x: bx - w / 2, y: by - h, w, h };
    }
    return e.bottom ? { x: e.s.x - w / 2, y: e.s.y - h, w, h } : { x: e.s.x - w / 2, y: e.s.y - h / 2, w, h };
  }

  updateEnts(now, dt, scrollX) {
    const p = this.player;
    const hurt = p.hurtRect();
    const swing = p.isSwingActive(now) ? p.swingRect() : null;
    let hold = false;
    for (const e of this.ents) {
      if (!e.alive) continue;
      const d = e.def;
      const own = now < (e.stunUntil || 0) ? 0 : (d.vx || 0);     // lige efter et tap står tunge ting stille
      e.s.x += own * dt;
      if (d.bob) e.s.y = e.baseY + Math.round(Math.sin((now + e.phase) / 260) * d.bob);
      if (d.wave) e.s.y = e.baseY + Math.sin((now + e.phase) / 220) * d.wave;
      if (d.spin) e.s.angle += d.spin * dt;
      if (d.sway) e.s.rotation = Math.sin((now + e.phase) / (d.swayMs || 450)) * d.sway;
      if (e.s.x < scrollX - 160) { this.removeEnt(e); continue; }

      const r = this.entRect(e);
      if (d.low && r.x < p.x + 44 && r.x + r.w > p.x - 14) hold = true;
      switch (d.kind) {
        case 'pickup':
          if (overlap(hurt, r)) this.collect(e);
          break;
        case 'enemy':
          if (swing && e.lastSwingId !== p.swingId && overlap(swing, r)) {
            e.lastSwingId = p.swingId;
            if (d.hittable) { this.hitEnemy(e); break; }
            if (d.bonk && !e.bonked) { e.bonked = true; this.popup(d.bonk, e.s.x, r.y - 10, 0xffffff); }
          }
          if (overlap(hurt, r)) {
            if (this.isStomp(p, hurt, r, d, dt)) { this.stomp(e, now); break; }
            this.hurt();
          }
          break;
        case 'checkpoint':
          if (!e.done && p.x >= e.s.x) this.reachCheckpoint(e);
          break;
        case 'goal':
          if (p.x >= e.s.x - 20) this.complete();
          break;
        default:
      }
      if (this.ended) return;
    }
    p.holdSlide = hold;
    if (this.ents.length > 60) this.ents = this.ents.filter((e) => e.alive);
  }

  removeEnt(e) { e.alive = false; e.s.destroy(); }

  // ---------- combo ----------
  mult() { return Math.min(COMBO.max, 1 + Math.floor(this.st.streak / COMBO.step)); }

  /** Én ting mere i træk uden at blive ramt. */
  chain() {
    const before = this.mult();
    this.st.streak++;
    const m = this.mult();
    if (m > before) {
      this.st.bestMult = Math.max(this.st.bestMult, m);
      sfx('flag');
      this.popup(`COMBO X${m}`, this.player.x + 30, this.player.y - 96, 0x8af0a0);
    }
  }

  breakChain() {
    if (this.mult() > 1) this.popup('COMBO TABT', this.player.x + 30, this.player.y - 96, 0xff8a8a);
    this.st.streak = 0;
  }

  collect(e) {
    const { x, y } = e.s;
    this.removeEnt(e);
    const st = this.st;
    if (e.def.effect === 'pickup') {
      st.picked++;
      st.meter = Math.min(TUNING.beersForSuper, st.meter + 1);
      this.chain();
      this.addScore(SCORE.pickup, x, y - 10);
      sfx('beer');
      if (st.meter === TUNING.beersForSuper && !this.tutorial) this.banner('MÅLEREN ER FULD: TAP FOR SUPER UNDSKYLD', 1400);
    } else if (e.def.effect === 'shot') {
      this.shotUntil = this.clock + TUNING.shotMs;
      sfx('shot');
      this.banner('SNAPS! DOBBELT POINT, MEN OP OG NED BYTTER', 1800);
    } else if (e.def.effect === 'heart') {
      if (st.hearts < TUNING.maxHearts) { st.hearts++; this.popup('+1 HJERTE', x, y - 10, 0xff9aa0); } else this.addScore(500, x, y - 10);
      sfx('heart');
    }
    this.burst(x, y, 'fx/star', 4);
    this.emitHud();
  }

  /**
   * Hop på hovedet: lander løberen oven på noget, der kan flyttes, tæller det som et tap.
   * Kræver at han er på vej ned, og at fødderne var over tingens top i forrige billede.
   */
  isStomp(p, hurt, r, d, dt) {
    if (!d.hittable || p.onGround) return false;
    const vy = p.body.velocity.y;
    if (vy <= 0) return false;
    const feetBefore = hurt.y + hurt.h - vy * dt;
    return feetBefore <= r.y + 10;
  }

  stomp(e, now) {
    const p = this.player;
    this.hitEnemy(e);
    p.body.setVelocityY(TUNING.jumpV * 0.72);   // lille hop op igen
    p.onGround = false;
    p.invulnUntil = Math.max(p.invulnUntil || 0, now + 160);
  }

  hitEnemy(e) {
    e.hp--;
    sfx('hit');
    if (e.hp <= 0) { this.killEnemy(e); return; }
    this.burst(e.s.x, e.s.y - 20, e.def.fx || 'fx/puff', 4);
    e.s.x += Math.max(48, this.speed * 0.32);   // skubbes tilbage, så der er tid til næste tap
    e.stunUntil = this.clock + 450;
    e.s.setTint(0xff8a8a);
    this.time.delayedCall(120, () => { if (e.alive) e.s.clearTint(); });
  }

  killEnemy(e) {
    const r = this.entRect(e);
    this.burst(r.x + r.w / 2, r.y + r.h / 2, e.def.fx || 'fx/puff', 8);
    this.chain();
    this.addScore(e.def.score || 100, r.x + r.w / 2, r.y - 6);
    this.removeEnt(e);
  }

  /** Et julehjerte ryger: combo'en nulstilles, og uret går 20 sekunder frem. */
  loseHeart() {
    this.st.hearts--;
    this.st.lost++;
    this.breakChain();
    sfx('hurt');
    this.cameras.main.shake(130, 0.007);
    this.popup(`+${CLOCK.hitSec} SEK`, this.player.x - 10, this.player.y - 80, 0xffd27a);
    this.emitHud();
  }

  hurt() {
    const now = this.clock;
    const p = this.player;
    if (this.ended || this.tutorial || p.isInvulnerable(now)) return;
    p.invulnUntil = now + TUNING.invulnMs;
    this.loseHeart();
    if (this.st.hearts <= 0) this.die();
  }

  checkPit(now) {
    const p = this.player;
    if (p.y < GROUND_Y + 90) return;
    const pit = this.built.pits.find((q) => p.x >= q.x0 - 30 && p.x <= q.x1 + 60) || { x1: p.x };
    this.loseHeart();
    if (this.st.hearts <= 0) { this.die(); return; }
    p.body.reset(pit.x1 + 40, GROUND_Y);
    p.invulnUntil = now + TUNING.invulnMs + 300;
    p.sliding = false;
  }

  reachCheckpoint(e) {
    e.done = true;
    e.s.setFrame('obj/flag1');
    const gain = this.st.hearts < TUNING.maxHearts;
    if (gain) this.st.hearts++;
    this.checkpoint = { x: e.s.x, score: this.st.score, picked: this.st.picked, meter: this.st.meter, bestMult: this.st.bestMult };
    sfx('flag');
    this.popup(gain ? 'CHECKPOINT +1 HJERTE' : 'CHECKPOINT', e.s.x, GROUND_Y - 110, 0x8af0a0);
    this.emitHud();
  }

  checkHints(px) {
    const h = this.built.hints;
    while (this.hintIdx < h.length && px > h[this.hintIdx].x - 260) this.banner(h[this.hintIdx++].text, 2200);
  }

  // =====================================================================
  // Øvebanen
  // =====================================================================
  /** Stopper spillet lige før næste ting og venter på den rigtige bevægelse. */
  checkTutorial() {
    const step = this.level.steps[this.stepIdx];
    if (!step) return;
    const p = this.player;
    const e = this.ents.find((q) => q.alive && q.sp.type === step.type && q.s.x > p.x);
    if (!e || !p.onGround) return;
    if (this.entRect(e).x - (p.x + 11) > step.dist) return;
    this.frozen = step;
    this.physics.world.pause();
    p.anims.pause();
    for (const q of this.ents) if (q.alive) q.s.anims?.pause();
    this.banner(step.text, 3600000);
    this.events.emit('gesture', step.expect);
  }

  unfreeze() {
    this.frozen = null;
    this.stepIdx++;
    this.physics.world.resume();
    this.player.anims.resume();
    for (const q of this.ents) if (q.alive) q.s.anims?.resume();
    this.banner('FLOT!', 700, 2);
    this.events.emit('gesture', null);
  }

  finishTutorial() {
    this.ended = true;
    Save.load().tutorialDone = true;
    Save.persist();
    sfx('win');
    this.scene.start('Map');
  }

  // =====================================================================
  // Slut på banen
  // =====================================================================
  complete() {
    if (this.ended) return;
    if (this.tutorial) { this.finishTutorial(); return; }
    this.ended = true;
    this.player.setVelocity(0, 0);
    this.shotUntil = 0;
    const st = this.st;
    const lostHere = st.lost;
    const bonus = {
      hearts: st.hearts * SCORE.heartBonus,
      perfect: lostHere === 0 ? SCORE.perfect : 0,
      all: st.picked >= this.pickupTotal ? SCORE.allPickups : 0,
    };
    const total = st.score + bonus.hearts + bonus.perfect + bonus.all;
    const res = Scores.recordLevel(this.levelIndex, total, this.run, lostHere);
    sfx('win');
    this.resetCamera();
    this.scene.pause();
    this.scene.launch('Result', {
      mode: 'complete', levelIndex: this.levelIndex, last: this.levelIndex === LEVELS.length - 1, cut: this.level.cut || null,
      score: st.score, bonus, total, picked: st.picked, pickupTotal: this.pickupTotal, hearts: st.hearts, lost: lostHere,
      bestMult: st.bestMult, isBest: res.isBest,
    });
  }

  die() {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    sfx('lose');
    this.resetCamera();
    this.scene.pause();
    this.scene.launch('Result', { mode: 'dead', levelIndex: this.levelIndex, checkpoint: this.checkpoint, run: this.run, lost: this.st.lost });
  }

  pauseGame() {
    if (this.ended || this.sys.isPaused()) return;
    this.scene.pause();
    this.scene.launch('Result', { mode: 'pause', levelIndex: this.levelIndex });
  }

  resetCamera() { this.cameras.main.setZoom(1).setRotation(0); }

  // =====================================================================
  // Småting: point, tekst, effekter, HUD
  // =====================================================================
  /** Lægger point til. Combo'en ganger, og en snaps fordobler oveni. */
  addScore(n, x, y) {
    n *= this.mult();
    if (this.shotActive()) n *= 2;
    this.st.score += n;
    if (x != null) this.popup(`+${n}`, x, y, 0xffe08a);
    this.emitHud();
  }

  popup(text, x, y, tint = 0xffffff) {
    const t = this.add.bitmapText(x, y, 'small_o', text, 16).setOrigin(0.5).setDepth(DEPTH.fx).setTint(tint);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  burst(x, y, frame, n) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, 'atlas', frame).setDepth(DEPTH.fx);
      const a = Math.random() * Math.PI * 2;
      const d = 24 + Math.random() * 38;
      this.tweens.add({
        targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 18, alpha: 0, angle: Math.random() * 360,
        duration: 450 + Math.random() * 300, ease: 'Quad.easeOut', onComplete: () => s.destroy(),
      });
    }
  }

  /** Besked midt på skærmen (vises af HUD'en). Huskes, hvis HUD'en ikke er startet endnu. */
  banner(text, ms = 1800, scale = 1) {
    this.pendingBanner = { text, ms, scale };
    this.events.emit('banner', text, ms, scale);
  }

  /** Klokken lige nu: banens tre minutter fordelt på vejen, plus 20 sekunder pr. tabt hjerte. */
  clockSec() {
    const base = (CLOCK.startMin + CLOCK.perLevelMin * (this.tutorial ? 0 : this.levelIndex)) * 60;
    return Math.floor(base + CLOCK.perLevelMin * 60 * (this.progress || 0) + CLOCK.hitSec * this.st.lost);
  }

  hudState() {
    return { ...this.st, mult: this.mult(), levelIndex: this.levelIndex, name: this.level.name, pickupTotal: this.pickupTotal };
  }

  emitHud() { this.events.emit('hud', this.hudState()); }
}
