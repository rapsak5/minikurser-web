// Kæmpeduen: bossen på sidste bane.
// Mens kampen er i gang, står fiskeren stille på skærmen, og banen kører som et løbebånd.
// Forløb: duen svæver og sender tre små duer afsted, blinker som varsel og dykker så mod fiskeren.
// Den skal slås med pokalen midt i dykket. Seks slag, så er den færdig.
// Fra 25/11 ruller der huller forbi på løbebåndet, så man ikke bare kan stå og slå.
// Hullerne kommer aldrig, lige når duen dykker, så kampen altid kan klares.

import { GAME_W, GROUND_Y, DEPTH, SCORE } from '../config.js';
import { sfx } from '../systems/audio.js';

const HOVER_Y = GROUND_Y - 190;
const SWOOP_Y = GROUND_Y - 44;
const HP = 6;
const MINIONS = 4;          // små fjender pr. runde
// Huller på løbebåndet: [mindste, største] tid mellem dem i ms, og bredden i px
const PIT_EVERY = [1300, 2100];
const PIT_W = [96, 144];

export default class Boss {
  constructor(level) {
    this.L = level;
    this.hp = HP;
    this.round = 0;
    this.pitTimer = 900;
    this.arena = false;      // true = løbebånd
    this.state = 'idle';
    this.timer = 0;
    this.minions = 0;
    this.lastSwingId = -1;
    this.sprite = null;
  }

  get homeX() { return this.L.cameras.main.scrollX + GAME_W - 110; }

  start() {
    this.arena = true;
    this.state = 'enter';
    this.sprite = this.L.add.sprite(this.L.cameras.main.scrollX + GAME_W + 120, HOVER_Y, 'atlas', 'boss/0').setDepth(DEPTH.boss);
    this.sprite.play('boss_fly');
    this.L.banner('KÆMPEDUEN!', 1800, 2);
    sfx('boss');
  }

  rect() {
    const s = this.sprite;
    return { x: s.x - 55, y: s.y - 26, w: 110, h: 62 };
  }

  /** Jo færre liv duen har tilbage, jo hurtigere går det. */
  get rage() { return (HP - this.hp) / (HP - 1); }

  /** Hvornår (ms fra nu) dykket rammer fiskeren, hvis det startes nu. */
  swoopArrivalMs() {
    const travel = (this.homeX - (this.L.player.x + 20)) / this.swoopSpeed();
    return this.telegraphMs() + travel * 1000;
  }

  swoopSpeed() { return 540 + 160 * this.rage; }
  telegraphMs() { return Math.round(700 - 220 * this.rage); }

  pits(dt) {
    if (this.state === 'dead' || this.state === 'gone') return;
    this.pitTimer -= dt * 1000;
    if (this.pitTimer > 0) return;
    const L = this.L;
    const w = PIT_W[0] + Math.round(Math.random() * (PIT_W[1] - PIT_W[0]) / 48) * 48;
    const arrive = L.arenaPitEta(w);   // ms til hullet når fiskeren
    // intet hul i det øjeblik, hvor duen dykker forbi
    const busy = this.state === 'telegraph' || this.state === 'swoop'
      ? this.swoopHitAt != null && Math.abs(arrive - (this.swoopHitAt - L.clock)) < 650
      : false;
    if (busy) { this.pitTimer = 150; return; }
    L.spawnArenaPit(w);
    this.pitTimer = PIT_EVERY[0] + Math.random() * (PIT_EVERY[1] - PIT_EVERY[0]) - 300 * this.rage;
  }

  update(now, dt) {
    const s = this.sprite;
    if (!s) return;
    const L = this.L;
    this.timer -= dt * 1000;
    this.pits(dt);
    switch (this.state) {
      case 'enter':
        s.x -= 240 * dt;
        s.y += (HOVER_Y - s.y) * Math.min(1, dt * 4);
        if (s.x <= this.homeX) { s.x = this.homeX; this.state = 'hover'; this.timer = 1100; }
        break;
      case 'hover':
        s.y = HOVER_Y + Math.sin(now / 260) * 8;
        if (this.timer <= 0) {
          if (this.minions < MINIONS) {
            L.spawnMinion(this.minions % 2 === 0 ? 'd' : 'f');
            this.minions++;
            this.timer = 820 - 220 * this.rage;
          } else if (L.arenaPitNear(this.swoopArrivalMs(), 700)) {
            this.timer = 120;   // vent, til hullet er forbi, så dykket og hullet ikke kommer samtidig
          } else {
            this.minions = 0;
            this.round++;
            this.state = 'telegraph';
            this.timer = this.telegraphMs();
            this.swoopHitAt = L.clock + this.swoopArrivalMs();
            if (this.round === 1) L.banner('TAP, NÅR DEN DYKKER! PAS PÅ HULLERNE', 1400);
          }
        }
        break;
      case 'telegraph':
        s.y += (SWOOP_Y - s.y) * Math.min(1, dt * 5);
        s.setTint(Math.floor(now / 90) % 2 ? 0xff6a6a : 0xffffff);
        if (this.timer <= 0) { s.clearTint(); this.state = 'swoop'; sfx('boss'); }
        break;
      case 'swoop':
        s.x -= this.swoopSpeed() * dt;
        s.y = SWOOP_Y;
        if (s.x < L.cameras.main.scrollX - 140) {
          s.x = L.cameras.main.scrollX + GAME_W + 120;
          s.y = HOVER_Y;
          this.state = 'enter';
          this.swoopHitAt = null;
        }
        break;
      case 'recoil':
        s.x += 380 * dt;
        s.y += (HOVER_Y - s.y) * Math.min(1, dt * 6);
        if (this.timer <= 0) { this.state = 'enter'; }
        break;
      case 'dead':
        s.y += 260 * dt;
        s.angle += 300 * dt;
        if (this.timer <= 0) {
          s.destroy();
          this.sprite = null;
          this.arena = false;
          this.state = 'gone';
          L.onBossDefeated();
        }
        break;
      default:
    }
  }

  /** Kaldes fra banen hver frame med fiskerens kasser. */
  collide(now, hurt, swing, swingId, overlap) {
    if (!this.sprite || this.state === 'dead' || this.state === 'gone') return;
    const r = this.rect();
    if (swing && swingId !== this.lastSwingId && overlap(swing, r)) {
      this.lastSwingId = swingId;
      this.hit();
      return;
    }
    if (this.state === 'swoop' && overlap(hurt, r)) this.L.hurt();
  }

  hit() {
    const L = this.L;
    this.hp--;
    sfx('hit');
    L.burst(this.sprite.x, this.sprite.y, 'fx/feather', 14);
    L.cameras.main.shake(140, 0.008);
    this.sprite.clearTint();
    if (this.hp <= 0) {
      this.state = 'dead';
      this.timer = 1100;
      L.addScore(SCORE.boss, this.sprite.x, this.sprite.y - 40);
      L.banner('KÆMPEDUEN ER NEDE!', 1800, 2);
      sfx('win');
    } else {
      this.state = 'recoil';
      this.swoopHitAt = null;
      this.timer = 550;
      L.addScore(SCORE.bossHit, this.sprite.x, this.sprite.y - 40);
    }
  }
}
