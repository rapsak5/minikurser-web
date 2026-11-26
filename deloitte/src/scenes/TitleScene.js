// Startskærmen: byen i skumringen med domicilet, START og en lille landekamp.

import { GAME_W, GAME_H, VERSION, PROMO, COUNTRIES } from '../config.js';
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
    this.drawCup(Scores.localBoard());
    if (Scores.isShared()) Scores.fetchBoard().then((b) => { if (b && this.sys.isActive()) this.drawCup(b); });

    this.add.rectangle(GAME_W / 2, GAME_H - 9, GAME_W, 18, C.night, 0.8);
    this.add.image(12, GAME_H - 9, 'brand').setDisplaySize(9, 14);
    txt(this, 24, GAME_H - 8, PROMO.credit, { font: 'small_o', ox: 0, tint: C.yellow });
    txt(this, GAME_W - 46, GAME_H - 8, PROMO.disclaimer, { font: 'small_o', ox: 1, tint: C.soft });
    txt(this, GAME_W - 6, GAME_H - 8, `v${VERSION}`, { font: 'small_o', ox: 1 });
  }

  /** Landekampen i miniformat: alle fem lande står der fra start, også med nul point. */
  drawCup(board) {
    this.cupRows.forEach((o) => o.destroy());
    this.cupRows = [];
    const keep = (o) => { this.cupRows.push(o); return o; };
    const byId = Object.fromEntries((board?.countries || []).map((c) => [c.country, c]));
    const list = COUNTRIES.map((c, i) => ({ i, ...(byId[c.id] || { country: c.id, avg: 0, players: 0, best: '' }) }))
      .sort((a, b) => b.avg - a.avg || a.i - b.i);
    const anyone = list.some((c) => c.avg > 0);
    list.forEach((c, i) => {
      const x = 56 + i * 56;
      const lead = anyone && i === 0;
      if (lead) keep(this.add.rectangle(x, 246, 50, 66, C.panel));
      keep(txt(this, x, 222, anyone ? `${i + 1}` : '', { font: 'small_o', tint: lead ? C.yellow : C.soft }));
      keep(this.add.image(x, 240, 'atlas', `flag/${c.country}`));
      keep(txt(this, x, 258, c.country, { font: 'small_o' }));
      keep(txt(this, x, 272, String(c.avg), { font: 'small_o', tint: lead ? C.yellow : C.soft }));
    });
    keep(txt(this, 304, 210, anyone ? 'AVERAGE OF TOP 20' : 'NO SCORES YET. BE THE FIRST!', { font: 'small', ox: 1, tint: C.soft }));
  }

  update(time) {
    this.snow.tilePositionX = Math.floor(time * 0.02);
    this.snow.tilePositionY = -Math.floor(time * 0.03);
  }
}
