// Selve banen. Bygger verden ud fra src/data/levels.js, flytter fiskeren og holder styr på
// fjender, ting, liv, point, quiz, checkpoints og mål.
//
// Vigtige værdier at kende:
//   this.clock     banens egen tid i ms (står stille, når banen er på pause)
//   this.st        tilstand til HUD: hearts, meter (ølmåler), bottles, score
//   this.treadmill ekstra rul under bosskampen, hvor fiskeren står stille på skærmen

import { CHECKPOINTS, GAME_W, GAME_H, GROUND_Y, COL, PLAYER_SCREEN_X, ROW_Y, SWIM_Y, TUNING, SCORE, DEPTH } from '../config.js';
import { LEVELS, TUTORIAL, buildLevel } from '../data/levels.js';
import { entityDef, THEMES } from '../data/entities.js';
import { QUIZ } from '../data/quiz.js';
import { fisherById } from '../data/fishers.js';
import Player from '../game/Player.js';
import Boss from '../game/Boss.js';
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
    this.run = data.run || null;   // løbets id på serveren. Følger med, når man starter forfra efter et nederlag
  }

  create() {
    this.fisherId = fisherById(Save.load().fisher).id;
    this.level = this.tutorial ? TUTORIAL : LEVELS[this.levelIndex];
    this.frozen = null;      // øvebanen: det trin, spillet venter på
    this.stepIdx = 0;
    this.theme = THEMES[this.level.theme] || {};
    this.built = buildLevel(this.level);
    this.swim = !!this.level.swim;     // undervandsbane: rækkerne er svømmebaner
    // speed er [start, slut]: farten stiger jævnt gennem banen
    const sp = Array.isArray(this.level.speed) ? this.level.speed : [this.level.speed, this.level.speed];
    this.speedStart = sp[0];
    this.speedEnd = sp[1];
    this.speed = sp[0];
    this.clock = 0;
    this.treadmill = 0;
    this.ended = false;
    this.ents = [];
    this.spawnIdx = 0;
    this.hintIdx = 0;
    this.boss = null;
    this.bossTriggerX = null;
    this.shotUntil = 0;
    this.checkpoint = this.resumeFrom;
    this.st = {
      hearts: TUNING.maxHearts,
      meter: this.resumeFrom?.meter ?? 0,
      bottles: this.resumeFrom?.bottles ?? 0,
      score: this.resumeFrom?.score ?? 0,
    };

    this.buildWorld();

    // Serveren tager tid på løbet fra nu. Uden forbindelse tæller banen kun på enheden.
    if (!this.tutorial && !this.run) {
      const runFor = this.levelIndex;
      Scores.startRun(runFor).then((id) => { if (id && !this.run && this.levelIndex === runFor) this.run = id; });
    }

    const startX = this.resumeFrom ? this.resumeFrom.x : 100;
    this.player = new Player(this, startX, GROUND_Y, this.fisherId);
    this.arenaPits = [];     // huller på løbebåndet under bosskampen (se Boss.js)
    this.pitFall = null;     // det hul, fiskeren er ved at falde ned i
    this.physics.add.collider(this.player, this.groundBodies, null, () => !this.overArenaPit());
    if (this.swim) this.player.enableSwim([SWIM_Y.hi, SWIM_Y.mid, SWIM_Y.lo]);
    while (this.spawnIdx < this.built.spawns.length && this.built.spawns[this.spawnIdx].x <= startX + 40) {
      // ting bag et checkpoint springes over, men bossen skal stadig kunne udløses
      const sp = this.built.spawns[this.spawnIdx++];
      if (sp.type === 'B') this.bossTriggerX = sp.x;
    }
    while (this.hintIdx < this.built.hints.length && this.built.hints[this.hintIdx].x <= startX) this.hintIdx++;

    const g = new Gestures(this, HUD_BUTTON_ZONE);
    g.on('up', () => this.command(this.shotActive() ? 'down' : 'up'));
    g.on('down', () => this.command(this.shotActive() ? 'up' : 'down'));
    g.on('tap', () => this.command('tap'));

    this.events.on('quiz-done', this.onQuizDone, this);
    this.events.once('shutdown', () => {
      this.events.off('quiz-done', this.onQuizDone, this);
      this.scene.stop('Hud');
    });

    this.cameras.main.scrollX = Math.round(startX - PLAYER_SCREEN_X);
    this.scene.launch('Hud', { level: this });
    this.banner(this.tutorial ? 'ØVEBANE' : `LEVEL ${this.levelIndex + 1}: ${this.level.name.toUpperCase()}`, 1800, 2);
  }

  // =====================================================================
  // Verden
  // =====================================================================
  buildWorld() {
    const t = this.level.theme;
    const fixed = (o, depth) => o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    fixed(this.add.image(0, 0, `${t}_sky`), DEPTH.sky);
    this.far = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_far`), DEPTH.far);
    this.mid = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_mid`), DEPTH.mid);
    this.groundTs = fixed(this.add.tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, `${t}_ground`), DEPTH.ground);
    this.midFrame = 0;
    if (this.theme.bubbles) this.bubbles = fixed(this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow'), DEPTH.snow).setAlpha(0.5);
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

  superSwing() {
    this.st.meter = 0;
    sfx('super');
    this.cameras.main.flash(220, 255, 240, 180);
    const cam = this.cameras.main;
    for (const e of this.ents) {
      if (e.alive && e.def.kind === 'enemy' && e.def.hittable && e.s.x < cam.scrollX + GAME_W + 20) this.killEnemy(e);
    }
    this.banner('SUPERSLAG!', 900, 2);
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
    const arena = !!this.boss?.arena;

    if (!arena) this.speed = this.speedStart + (this.speedEnd - this.speedStart) * Phaser.Math.Clamp(p.x / this.built.width, 0, 1);
    p.setVelocityX(arena ? 0 : this.speed);
    if (arena) this.treadmill += this.speed * dt;
    this.updateArenaPits(dt, arena, cam.scrollX);
    p.rainbow = this.shotActive();
    p.tick(now);

    cam.scrollX = Math.round(p.x - PLAYER_SCREEN_X);
    const scroll = cam.scrollX + this.treadmill;
    this.far.tilePositionX = Math.floor(scroll * 0.15);
    this.mid.tilePositionX = Math.floor(scroll * 0.45);
    this.groundTs.tilePositionX = Math.floor(scroll);
    if (this.theme.midFrames === 2) {
      const f = Math.floor(now / 320) % 2;
      if (f !== this.midFrame) { this.midFrame = f; this.mid.setTexture(`${this.level.theme}_mid${f ? '2' : ''}`); }
    }
    if (this.bubbles) { this.bubbles.tilePositionX = Math.floor(scroll * 0.8); this.bubbles.tilePositionY = Math.floor(now * 0.04); }
    if (this.snow) { this.snow.tilePositionX = Math.floor(scroll * 0.7); this.snow.tilePositionY = -Math.floor(now * 0.03); }

    // shot: dobbelt point, men styringen er byttet om, og verden sejler lidt
    if (this.shotActive()) { cam.setZoom(1.05); cam.setRotation(Math.sin(now / 280) * 0.014); }
    else if (cam.zoom !== 1) { cam.setZoom(1); cam.setRotation(0); this.emitHud(); }

    this.spawnAhead(cam.scrollX);
    this.updateEnts(now, dt, arena, cam.scrollX);
    this.checkHints(p.x);
    this.checkPit(now);
    if (this.tutorial) this.checkTutorial();

    if (this.bossTriggerX != null && !this.boss && p.x >= this.bossTriggerX) { this.boss = new Boss(this); this.boss.start(); }
    if (this.boss) {
      this.boss.update(now, dt);
      const swinging = p.isSwingActive(now);
      this.boss.collide(now, p.hurtRect(), swinging ? p.swingRect() : null, p.swingId, overlap);
    }
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
    // kat, kamphund, løbehjul eller cyklist: skiftevis efter placering, så banen er den samme hver gang
    if (def.variants) def = { ...def, ...def.variants[(sp.v ?? Math.floor(sp.x / COL)) % def.variants.length] };
    if (def.kind === 'boss') { this.bossTriggerX = sp.x; return null; }
    if (def.kind === 'checkpoint' && !CHECKPOINTS) return null;   // se CHECKPOINTS i config.js
    const floating = def.kind === 'pickup' || def.kind === 'quiz';
    let bottom = def.anchor ? def.anchor === 'bottom' : (sp.row === 'lo' && !floating);
    let y = def.y ?? ROW_Y[sp.row];
    if (floating && sp.row === 'lo') y = GROUND_Y - 24;
    if (this.swim) {
      // under vand svæver alt midt i sin svømmebane. Kun flag og mål står på bunden.
      bottom = def.kind === 'checkpoint' || def.kind === 'goal';
      y = bottom ? GROUND_Y : SWIM_Y[sp.row];
    }
    const s = this.add.sprite(sp.x, y, 'atlas', def.frame).setDepth(DEPTH.ent).setOrigin(0.5, bottom ? 1 : 0.5);
    if (def.anim) s.play(def.anim);
    const e = { sp, def, s, bottom, baseY: y, hp: def.hp ?? 1, alive: true, lastSwingId: -1, phase: sp.x * 0.7 };
    if (def.sway) { s.setOrigin(0.5, 0); s.y = y - s.height; }   // ophænget er øverst
    this.ents.push(e);
    return e;
  }

  /** Bossen sender små duer afsted fra højre kant. */
  spawnMinion(type) {
    const x = this.cameras.main.scrollX + GAME_W + 40;
    this.spawn({ type, row: type === 'f' ? 'mid' : 'lo', x });
  }

  entRect(e) {
    const [w, h] = e.def.box || [e.s.width, e.s.height];
    if (e.def.sway) {
      // bunden af det, der svinger: ophænget plus længden drejet med vinklen
      const bx = e.s.x - Math.sin(e.s.rotation) * e.s.height;
      const by = e.s.y + Math.cos(e.s.rotation) * e.s.height;
      return { x: bx - w / 2, y: by - h, w, h };
    }
    return e.bottom ? { x: e.s.x - w / 2, y: e.s.y - h, w, h } : { x: e.s.x - w / 2, y: e.s.y - h / 2, w, h };
  }

  updateEnts(now, dt, arena, scrollX) {
    const p = this.player;
    const hurt = p.hurtRect();
    const swing = p.isSwingActive(now) ? p.swingRect() : null;
    let hold = false;
    for (const e of this.ents) {
      if (!e.alive) continue;
      const d = e.def;
      const own = now < (e.stunUntil || 0) ? 0 : (d.vx || 0);     // lige efter et slag står tunge ting stille
      e.s.x += (own - (arena ? this.speed : 0)) * dt;
      if (d.bob) e.s.y = e.baseY + Math.round(Math.sin((now + e.phase) / 260) * d.bob);
      if (d.wave) e.s.y = e.baseY + Math.sin((now + e.phase) / 220) * d.wave;
      if (d.spin) e.s.angle += d.spin * dt;
      if (d.sway) e.s.rotation = Math.sin((now + e.phase) / (d.swayMs || 450)) * d.sway;
      if (d.bounce) {
        e.vy = (e.vy ?? 0) + 1300 * dt;
        e.s.y += e.vy * dt;
        const floor = GROUND_Y - (d.box ? d.box[1] : e.s.height) / 2;
        if (e.s.y >= floor) { e.s.y = floor; e.vy = -d.bounce; }
      }
      if (e.s.x < scrollX - 160) { this.removeEnt(e); continue; }

      const r = this.entRect(e);
      if (d.low && r.x < p.x + 44 && r.x + r.w > p.x - 14) hold = true;
      switch (d.kind) {
        case 'pickup':
          if (overlap(hurt, r)) this.collect(e);
          break;
        case 'quiz':
          if (overlap(hurt, r) || (swing && overlap(swing, r))) this.openQuiz(e);
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

  collect(e) {
    const { x, y } = e.s;
    this.removeEnt(e);
    const st = this.st;
    if (e.def.effect === 'beer') {
      st.bottles++;
      st.meter = Math.min(TUNING.beersForSuper, st.meter + 1);
      this.addScore(SCORE.beer, x, y - 10);
      sfx('beer');
      if (st.meter === TUNING.beersForSuper) this.banner('ØLMÅLEREN ER FULD: TAP FOR SUPERSLAG', 1400);
    } else if (e.def.effect === 'shot') {
      this.shotUntil = this.clock + TUNING.shotMs;
      sfx('shot');
      this.banner('SHOT! DOBBELT POINT, MEN OP OG NED ER BYTTET OM', 1800);
    } else if (e.def.effect === 'heart') {
      st.hearts = Math.min(TUNING.maxHearts, st.hearts + 1);
      sfx('heart');
      this.popup('+1 LIV', x, y - 10, 0xff9aa0);
    }
    this.burst(x, y, 'fx/star', 4);
    this.emitHud();
  }

  /**
   * Hop på hovedet: lander fiskeren oven på noget, der kan slås, tæller det som et slag.
   * Kræver at han er på vej ned, og at fødderne var over tingens top i forrige billede.
   * Gælder ikke under vand (Den Blå Planet).
   */
  isStomp(p, hurt, r, d, dt) {
    if (this.swim || !d.hittable || p.onGround) return false;
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
    p.invulnUntil = Math.max(p.invulnUntil || 0, now + 160);   // ingen skade fra det, man lige har trådt på
  }

  hitEnemy(e) {
    e.hp--;
    sfx('hit');
    if (e.hp <= 0) { this.killEnemy(e); return; }
    this.burst(e.s.x, e.s.y - 20, e.def.fx || 'fx/puff', 4);
    e.s.x += Math.max(48, this.speed * 0.32);   // slås tilbage, så der er tid til næste slag, også ved høj fart
    e.stunUntil = this.clock + 450;
    e.s.setTint(0xff8a8a);
    this.time.delayedCall(120, () => { if (e.alive) e.s.clearTint(); });
  }

  killEnemy(e) {
    const r = this.entRect(e);
    this.burst(r.x + r.w / 2, r.y + r.h / 2, e.def.fx || 'fx/puff', 8);
    this.addScore(e.def.score || 100, r.x + r.w / 2, r.y - 6);
    this.removeEnt(e);
  }

  hurt() {
    const now = this.clock;
    const p = this.player;
    if (this.ended || this.tutorial || p.isInvulnerable(now)) return;
    this.st.hearts--;
    p.invulnUntil = now + TUNING.invulnMs;
    sfx('hurt');
    this.cameras.main.shake(130, 0.007);
    this.emitHud();
    if (this.st.hearts <= 0) this.die();
  }

  // ---------- huller på løbebåndet (bosskampen) ----------
  /** Lægger et hul ind lige uden for højre kant. Det ruller mod fiskeren med løbebåndet. */
  spawnArenaPit(w) {
    const x0 = this.cameras.main.scrollX + GAME_W + 20;
    const s = this.add.tileSprite(x0, GROUND_Y, w, GAME_H - GROUND_Y, `${this.level.theme}_pit`).setOrigin(0).setDepth(DEPTH.pit);
    this.arenaPits.push({ x0, x1: x0 + w, s });
  }

  /** Hvor mange ms der går, før et nyt hul med bredden w er midt under fiskeren. */
  arenaPitEta(w) {
    const x0 = this.cameras.main.scrollX + GAME_W + 20;
    return ((x0 + w / 2 - this.player.x) / Math.max(1, this.speed)) * 1000;
  }

  /** Er der et hul under fiskeren omkring tMs fra nu (plus/minus win ms)? */
  arenaPitNear(tMs, win) {
    const v = Math.max(1, this.speed) / 1000;
    const px = this.player.x;
    return this.arenaPits.some((q) => {
      const tin = (q.x0 + 8 - px) / v;
      const tout = (q.x1 - 8 - px) / v;
      return tout > 0 && tin - win < tMs && tout + win > tMs;
    });
  }

  arenaPitUnder() {
    const x = this.player.x;
    return this.arenaPits.find((q) => x > q.x0 + 8 && x < q.x1 - 8) || null;
  }

  overArenaPit() { return !!this.pitFall || !!this.arenaPitUnder(); }

  updateArenaPits(dt, arena, scrollX) {
    if (!this.arenaPits.length) return;
    for (const q of this.arenaPits) {
      if (arena) { q.x0 -= this.speed * dt; q.x1 -= this.speed * dt; q.s.x = q.x0; }
      if (q.x1 < scrollX - 60) { q.s.destroy(); q.gone = true; }
    }
    this.arenaPits = this.arenaPits.filter((q) => !q.gone);
    const p = this.player;
    if (!this.pitFall && p.y > GROUND_Y + 4) this.pitFall = this.arenaPitUnder();
  }

  checkPit(now) {
    const p = this.player;
    if (p.y < GROUND_Y + 90) return;
    if (this.pitFall) {
      // faldt i et hul på løbebåndet: hullet forsvinder, og fiskeren står op igen samme sted
      const q = this.pitFall;
      this.pitFall = null;
      const ax = this.boss?.arena ? p.x : q.x1 + 40;
      q.s.destroy();
      this.arenaPits = this.arenaPits.filter((r) => r !== q);
      this.st.hearts--;
      sfx('hurt');
      this.emitHud();
      if (this.st.hearts <= 0) { this.die(); return; }
      p.body.reset(ax, GROUND_Y);
      p.invulnUntil = now + TUNING.invulnMs + 300;
      p.sliding = false;
      return;
    }
    const pit = this.built.pits.find((q) => p.x >= q.x0 - 30 && p.x <= q.x1 + 60) || { x1: p.x };
    this.st.hearts--;
    sfx('hurt');
    this.emitHud();
    if (this.st.hearts <= 0) { this.die(); return; }
    p.body.reset(pit.x1 + 40, GROUND_Y);
    p.invulnUntil = now + TUNING.invulnMs + 300;
    p.sliding = false;
  }

  reachCheckpoint(e) {
    e.done = true;
    e.s.setFrame('obj/flag1');
    this.st.hearts = Math.min(TUNING.maxHearts, this.st.hearts + 1);
    this.checkpoint = { x: e.s.x, score: this.st.score, bottles: this.st.bottles, meter: this.st.meter };
    sfx('flag');
    this.popup('CHECKPOINT +1 LIV', e.s.x, GROUND_Y - 110, 0x8af0a0);
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
    this.banner(step.text, 3600000);
    this.events.emit('gesture', step.expect);
  }

  unfreeze() {
    this.frozen = null;
    this.stepIdx++;
    this.physics.world.resume();
    this.player.anims.resume();
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
  // Quiz
  // =====================================================================
  openQuiz(e) {
    this.burst(e.s.x, e.s.y, 'fx/star', 8);
    this.removeEnt(e);
    let deck = this.registry.get('quizDeck');
    if (!deck || !deck.length) deck = Phaser.Utils.Array.Shuffle(QUIZ.map((_, i) => i));
    const q = QUIZ[deck.pop()];
    this.registry.set('quizDeck', deck);
    sfx('quiz');
    this.scene.pause();
    this.scene.launch('Quiz', { q });
  }

  onQuizDone(ok) {
    const p = this.player;
    if (ok) {
      if (this.st.hearts < TUNING.maxHearts) { this.st.hearts++; this.popup('+1 LIV', p.x, p.y - 100, 0xff9aa0); }
      this.addScore(SCORE.quiz, p.x, p.y - 84);
    } else {
      // forkert svar koster et liv (25/11)
      this.st.hearts--;
      sfx('hurt');
      this.cameras.main.shake(130, 0.007);
      this.popup('-1 LIV', p.x, p.y - 100, 0xff6a6a);
      this.emitHud();
      if (this.st.hearts <= 0) { this.die(); return; }
    }
    this.player.invulnUntil = this.clock + 900;   // et øjeblik til at finde rytmen igen
    this.emitHud();
  }

  // =====================================================================
  // Slut på banen
  // =====================================================================
  onBossDefeated() {
    const e = this.spawn({ type: 'g', row: 'lo', x: this.player.x + 620 }, { frame: 'obj/taxi' });
    this.popup('TAXA TIL BYEN', e.s.x, GROUND_Y - 70, 0xf2d21b);
  }

  complete() {
    if (this.ended) return;
    if (this.tutorial) { this.finishTutorial(); return; }
    this.ended = true;
    this.player.setVelocity(0, 0);
    this.shotUntil = 0;
    const bonus = this.st.hearts * SCORE.heartBonus;
    const total = this.st.score + bonus;
    const res = Scores.recordLevel(this.levelIndex, total, this.run);
    sfx('win');
    this.resetCamera();
    this.scene.pause();
    this.scene.launch('Result', {
      mode: 'complete', levelIndex: this.levelIndex, last: this.levelIndex === LEVELS.length - 1,
      score: this.st.score, bonus, total, bottles: this.st.bottles, hearts: this.st.hearts, isBest: res.isBest,
    });
  }

  die() {
    if (this.ended) return;
    this.ended = true;
    this.player.setVelocity(0, 0);
    sfx('lose');
    this.resetCamera();
    this.scene.pause();
    this.scene.launch('Result', { mode: 'dead', levelIndex: this.levelIndex, checkpoint: this.checkpoint, run: this.run });
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
  /** Lægger point til. Mens et shot virker, tæller alt dobbelt. */
  addScore(n, x, y) {
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
      const s = this.add.image(x, y, 'atlas', frame).setDepth(DEPTH.fx).setScale(2);
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

  hudState() {
    return { ...this.st, levelIndex: this.levelIndex, name: this.level.name };
  }

  emitHud() { this.events.emit('hud', this.hudState()); }
}
