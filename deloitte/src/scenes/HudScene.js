// HUD oven på banen: portræt, tre julehjerter, måler, ur, tæller, combo, point, pauseknap og beskeder.
// Kører som sin egen scene, så den ikke ruller eller sejler med banen.

import { GAME_W, TUNING } from '../config.js';
import { THEMES } from '../data/entities.js';
import { txt, button, C, pad, BASE } from '../game/ui.js';
import { fmtClock } from '../systems/scores.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  init(data) { this.level = data.level; }

  create() {
    const L = this.level;
    const g = this.add.graphics();
    // hjertebjælke og måler ved siden af portrættet
    g.fillStyle(C.ink, 1).fillRect(56, 6, 96, 28);
    g.fillStyle(C.navy, 1).fillRect(58, 8, 92, 24);
    g.fillStyle(C.ink, 1).fillRect(56, 36, 96, 14);
    g.fillStyle(C.deep, 1).fillRect(58, 38, 92, 10);
    this.add.image(2, 2, 'atlas', `portrait/${L.runnerId}/${L.outfit}`).setOrigin(0);

    this.hearts = [];
    for (let i = 0; i < TUNING.maxHearts; i++) this.hearts.push(this.add.image(62 + i * 30, 9, 'atlas', 'hud/heart').setOrigin(0));
    this.meter = this.add.graphics();
    this.superTxt = txt(this, 104, 43, 'SUPER: TAP', { font: 'small_o', tint: C.yellow }).setVisible(false);

    // uret i midten
    g.fillStyle(C.ink, 1).fillRect(GAME_W / 2 - 62, 6, 124, 30);
    g.fillStyle(C.gold, 1).fillRect(GAME_W / 2 - 60, 8, 120, 26);
    g.fillStyle(C.navy, 1).fillRect(GAME_W / 2 - 58, 10, 116, 22);
    this.add.image(GAME_W / 2 - 52, 11, 'atlas', 'hud/clock').setOrigin(0);
    this.clockTxt = txt(this, GAME_W / 2 - 4, 21, '17:30', { font: 'small_o', scale: 2, tint: C.yellow });
    txt(this, GAME_W / 2 + 40, 24, '/18', { font: 'small_o', tint: C.soft });

    // højre side: tæller, combo og point
    g.fillStyle(C.ink, 1).fillRect(GAME_W - 170, 6, 124, 44);
    g.fillStyle(C.navy, 1).fillRect(GAME_W - 168, 8, 120, 40);
    const item = THEMES[L.level.theme]?.ents?.b?.frame || 'item/memo';
    this.add.image(GAME_W - 154, 20, 'atlas', item).setScale(0.75);
    this.count = txt(this, GAME_W - 140, 20, '0/0', { font: 'small_o', ox: 0 });
    this.multTxt = txt(this, GAME_W - 54, 20, 'X1', { font: 'small_o', scale: 2, ox: 1, tint: C.soft });
    this.score = txt(this, GAME_W - 54, 39, '000000', { font: 'small_o', scale: 2, ox: 1 });

    // pauseknap
    g.fillStyle(C.ink, 1).fillRect(GAME_W - 40, 6, 34, 30);
    g.fillStyle(C.gold, 1).fillRect(GAME_W - 38, 8, 30, 26);
    g.fillStyle(C.navy, 1).fillRect(GAME_W - 30, 14, 4, 14).fillRect(GAME_W - 22, 14, 4, 14);
    this.add.zone(GAME_W - 22, 20, 44, 40).setInteractive().on('pointerup', () => L.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => L.pauseGame());

    this.shotTxt = txt(this, GAME_W / 2, 48, '', { font: 'small_o', tint: 0xff9aa0 });
    this.bannerTxt = txt(this, GAME_W / 2, 116, '', { font: 'big_o', center: true }).setAlpha(0);

    // øvebanen: en pil eller en ring viser bevægelsen, og man kan springe over
    this.gestureGfx = this.add.graphics().setVisible(false);
    if (L.tutorial) {
      button(this, GAME_W - 74, 338, 132, 26, 'SKIP', () => L.finishTutorial(), { color: C.panel, font: 'small_o' });
      L.events.on('gesture', this.showGesture, this);
    }

    L.events.on('hud', this.refresh, this);
    L.events.on('banner', this.showBanner, this);
    this.events.once('shutdown', () => {
      L.events.off('hud', this.refresh, this);
      L.events.off('banner', this.showBanner, this);
      L.events.off('gesture', this.showGesture, this);
    });
    this.refresh(L.hudState());
    if (L.pendingBanner) this.showBanner(L.pendingBanner.text, L.pendingBanner.ms, L.pendingBanner.scale);
  }

  refresh(s) {
    this.hearts.forEach((h, i) => h.setFrame(i < s.hearts ? 'hud/heart' : 'hud/heart_empty'));
    const full = s.meter >= TUNING.beersForSuper;
    const w = Math.round(88 * (s.meter / TUNING.beersForSuper));
    this.meter.clear();
    this.meter.fillStyle(full ? C.yellow : C.green, 1).fillRect(60, 40, w, 6);
    this.meter.fillStyle(0xffffff, 0.5).fillRect(60, 40, w, 2);
    this.isFull = full;
    this.count.setText(`${s.picked}/${s.pickupTotal}`);
    this.multTxt.setText(`X${s.mult}`).setTint(s.mult >= 5 ? 0xff9aa0 : s.mult > 1 ? C.yellow : C.soft);
    this.score.setText(pad(s.score, 6));
  }

  showBanner(text, ms = 1800, scale = 1) {
    const t = this.bannerTxt;
    this.tweens.killTweensOf(t);
    t.setText(text).setFontSize(BASE.big_o * scale).setAlpha(1).setY(scale > 1 ? 130 : 116);
    this.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 350 });
  }

  /** Viser bevægelsen 'up', 'down' eller 'tap'. null skjuler den igen. */
  showGesture(kind) {
    const g = this.gestureGfx;
    this.tweens.killTweensOf(g);
    g.clear().setVisible(!!kind).setPosition(0, 0).setAlpha(1).setScale(1);
    if (!kind) return;
    const x = 470;
    const y = 210;
    g.fillStyle(0x1d2a44, 0.85).fillCircle(x, y, 30);
    g.lineStyle(3, 0xf2c418, 1).strokeCircle(x, y, 30);
    g.fillStyle(0xffffff, 1);
    if (kind === 'tap') {
      g.fillCircle(x, y, 10);
      this.tweens.add({ targets: g, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });
    } else {
      const d = kind === 'up' ? -1 : 1;
      g.fillRect(x - 4, y - 12, 8, 24);
      g.fillTriangle(x - 14, y + d * 8, x + 14, y + d * 8, x, y + d * 24);
      this.tweens.add({ targets: g, y: d * 26, duration: 520, repeat: -1, ease: 'Quad.easeOut' });
    }
  }

  update() {
    const L = this.level;
    const left = L.shotUntil - L.clock;
    this.shotTxt.setText(left > 0 ? `SNAPS: DOUBLE POINTS ${Math.ceil(left / 1000)}` : '');
    this.superTxt.setVisible(this.isFull && Math.floor(L.clock / 300) % 2 === 0);
    const sec = L.clockSec();
    this.clockTxt.setText(fmtClock(sec)).setTint(sec >= 18 * 3600 ? 0xff8a8a : C.yellow);
  }
}
