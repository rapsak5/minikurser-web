// HUD oven på banen: portræt, fem hjerter, ølmåler, bajertæller, point, pauseknap og beskeder.
// Kører som sin egen scene, så den ikke ruller eller sejler med banen.

import { GAME_W, TUNING } from '../config.js';
import { txt, button, C, pad, BASE } from '../game/ui.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  init(data) { this.level = data.level; }

  create() {
    const L = this.level;
    const g = this.add.graphics();
    // hjertebjælke og ølmåler bag portrættet
    g.fillStyle(C.brown, 1).fillRect(50, 8, 120, 24);
    g.fillStyle(0xc0563a, 1).fillRect(52, 10, 116, 20);
    g.fillStyle(0xe88a5a, 1).fillRect(52, 10, 116, 2);
    g.fillStyle(C.brown, 1).fillRect(50, 34, 120, 16);
    g.fillStyle(C.deep, 1).fillRect(52, 36, 116, 12);
    this.add.image(4, 4, 'atlas', `portrait/${L.fisherId}`).setOrigin(0);

    this.hearts = [];
    for (let i = 0; i < TUNING.maxHearts; i++) this.hearts.push(this.add.image(64 + i * 21, 11, 'atlas', 'hud/heart').setOrigin(0));
    this.meter = this.add.graphics();
    this.superTxt = txt(this, 110, 42, 'SUPERSLAG: TAP', { font: 'small_o', tint: C.yellow }).setVisible(false);

    // højre side: bajere og point
    g.fillStyle(C.brown, 1).fillRect(GAME_W - 158, 8, 110, 42);
    g.fillStyle(0xc0563a, 1).fillRect(GAME_W - 156, 10, 106, 38);
    g.fillStyle(C.paper, 1).fillRect(GAME_W - 132, 13, 78, 15);
    this.add.image(GAME_W - 152, 9, 'atlas', 'hud/beer').setOrigin(0);
    this.bottles = txt(this, GAME_W - 58, 21, '000', { font: 'small', scale: 2, ox: 1, tint: C.red });
    this.score = txt(this, GAME_W - 58, 39, '000000', { font: 'small_o', scale: 2, ox: 1 });

    // pauseknap
    g.fillStyle(C.brown, 1).fillRect(GAME_W - 40, 8, 32, 28);
    g.fillStyle(C.gold, 1).fillRect(GAME_W - 38, 10, 28, 24);
    g.fillStyle(C.navy, 1).fillRect(GAME_W - 30, 15, 4, 14).fillRect(GAME_W - 22, 15, 4, 14);
    this.add.zone(GAME_W - 22, 20, 44, 40).setInteractive().on('pointerup', () => L.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => L.pauseGame());

    this.shotTxt = txt(this, GAME_W / 2, 20, '', { font: 'ui_o', tint: 0xff9aa0 });
    this.bannerTxt = txt(this, GAME_W / 2, 96, '', { font: 'big_o', center: true }).setAlpha(0);

    // øvebanen: en pil eller en ring viser bevægelsen, og man kan springe over
    this.gestureGfx = this.add.graphics().setVisible(false);
    if (L.tutorial) {
      button(this, GAME_W - 74, 338, 132, 26, 'SPRING OVER', () => L.finishTutorial(), { color: C.panel, font: 'small_o' });
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
    const w = Math.round(112 * (s.meter / TUNING.beersForSuper));
    this.meter.clear();
    this.meter.fillStyle(full ? C.yellow : 0xf0a020, 1).fillRect(54, 38, w, 8);
    this.meter.fillStyle(0xffffff, 0.5).fillRect(54, 38, w, 2);
    this.isFull = full;
    this.bottles.setText(pad(s.bottles, 3));
    this.score.setText(pad(s.score, 6));
  }

  showBanner(text, ms = 1800, scale = 1) {
    const t = this.bannerTxt;
    this.tweens.killTweensOf(t);
    t.setText(text).setFontSize(BASE.big_o * scale).setAlpha(1).setY(scale > 1 ? 110 : 96);
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
    this.shotTxt.setText(left > 0 ? `SHOT: DOBBELT POINT ${Math.ceil(left / 1000)}` : '');
    this.superTxt.setVisible(this.isFull && Math.floor(L.clock / 300) % 2 === 0);
  }
}
