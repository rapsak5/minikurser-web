// Startskærmen: byen i skumringen med domicilet, START og en lille landekamp.

import { GAME_W, GAME_H, VERSION, PROMO } from '../config.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { unlock } from '../systems/audio.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.image(0, 0, 'title').setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.7);

    const go = () => {
      unlock();
      // På Android kan spillet gå i fuldskærm og låse til bredformat. iPhone understøtter det ikke i Safari.
      const dev = this.sys.game.device;
      if (!dev.os.desktop && this.scale.fullscreen.available && !this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
          window.screen.orientation?.lock?.('landscape').catch(() => {});
        } catch (e) { /* ikke muligt her */ }
      }
      this.scene.start(Save.hasName() ? 'Map' : 'Select');
    };
    const start = button(this, 96, 172, 144, 36, 'START', go, { color: C.green, tint: 0xffffff });
    this.tweens.add({ targets: start.label, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
    button(this, 246, 172, 140, 36, 'TOP SCORES', () => this.scene.start('Scores'), { color: C.panel, font: 'small_o' });
    this.input.keyboard?.once('keydown-ENTER', go);

    // landekampen i miniformat
    panel(this, 24, 196, 292, 92, { alpha: 0.94 });
    txt(this, 36, 210, 'COUNTRY CUP', { font: 'small_o', ox: 0, tint: C.yellow });
    this.cupRows = [];
    this.drawCup(null);
    if (Scores.isShared()) Scores.fetchBoard().then((b) => { if (b && this.sys.isActive()) this.drawCup(b); });

    this.add.rectangle(GAME_W / 2, GAME_H - 9, GAME_W, 18, C.night, 0.8);
    this.add.image(12, GAME_H - 9, 'brand').setDisplaySize(9, 14);
    txt(this, 24, GAME_H - 8, PROMO.credit, { font: 'small_o', ox: 0, tint: C.yellow });
    txt(this, GAME_W - 46, GAME_H - 8, PROMO.disclaimer, { font: 'small_o', ox: 1, tint: C.soft });
    txt(this, GAME_W - 6, GAME_H - 8, `v${VERSION}`, { font: 'small_o', ox: 1 });
  }

  drawCup(board) {
    this.cupRows.forEach((o) => o.destroy());
    this.cupRows = [];
    const keep = (o) => { this.cupRows.push(o); return o; };
    const rows = (board?.countries || []).filter((c) => c.players > 0).slice(0, 3);
    if (!rows.length) {
      keep(txt(this, 170, 250, board ? 'NO SCORES YET. BE THE FIRST!' : 'WHICH COUNTRY GETS TO THE PARTY FIRST?', { font: 'small_o', tint: C.soft }));
      return;
    }
    rows.forEach((c, i) => {
      const y = 232 + i * 20;
      keep(txt(this, 36, y, `${i + 1}`, { font: 'small_o', ox: 0, tint: i === 0 ? C.yellow : C.soft }));
      keep(this.add.image(62, y, 'atlas', `flag/${c.country}`));
      keep(txt(this, 82, y, c.country, { font: 'small_o', ox: 0 }));
      keep(txt(this, 200, y, pad(c.avg), { font: 'small_o', ox: 1 }));
      keep(txt(this, 304, y, c.best ? `BEST: ${c.best.toUpperCase()}` : '', { font: 'small_o', ox: 1, tint: C.soft }));
    });
  }

  update(time) {
    this.snow.tilePositionX = Math.floor(time * 0.02);
    this.snow.tilePositionY = -Math.floor(time * 0.03);
  }
}
