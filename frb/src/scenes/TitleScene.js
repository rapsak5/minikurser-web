// Startskærmen: campus en vintereftermiddag med hovedbygningen, Kasper, START og en lille afdelingskamp.

import { GAME_W, GAME_H, VERSION, PROMO, COUNTRIES, CUP_TOP } from '../config.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { unlock } from '../systems/audio.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.image(0, 0, 'title').setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.7);

    // afsenderen: Kasper som tegnet avatar med nissehue
    panel(this, 444, 176, 184, 158, { alpha: 0.94 });
    this.add.image(536, 330, 'avatar').setOrigin(0.5, 1).setDisplaySize(120, 140);
    txt(this, 536, 194, 'EN JULEGAVE', { font: 'ui_o', tint: C.yellow });
    txt(this, 536, 210, 'FRA KASPER', { font: 'ui_o', tint: C.yellow });

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
    button(this, 246, 172, 140, 36, 'TOPSCORERE', () => this.scene.start('Scores'), { color: C.panel, font: 'small_o' });
    this.input.keyboard?.once('keydown-ENTER', go);

    // afdelingskampen i miniformat
    panel(this, 24, 196, 292, 92, { alpha: 0.94 });
    txt(this, 36, 210, 'AFDELINGSKAMPEN', { font: 'small_o', ox: 0, tint: C.yellow });
    this.cupRows = [];
    this.drawCup(Scores.localBoard());
    if (Scores.isShared()) Scores.fetchBoard().then((b) => { if (b && this.sys.isActive()) this.drawCup(b); });

    this.add.rectangle(GAME_W / 2, GAME_H - 9, GAME_W, 18, C.night, 0.8);
    txt(this, 8, GAME_H - 9, PROMO.credit, { font: 'ui_o', ox: 0, tint: C.yellow });
    txt(this, GAME_W - 46, GAME_H - 8, PROMO.disclaimer, { font: 'small_o', ox: 1, tint: C.soft });
    txt(this, GAME_W - 6, GAME_H - 8, `v${VERSION}`, { font: 'small_o', ox: 1 });
  }

  /** Afdelingskampen i miniformat: alle otte hold står der fra start, også med nul point. */
  drawCup(board) {
    this.cupRows.forEach((o) => o.destroy());
    this.cupRows = [];
    const keep = (o) => { this.cupRows.push(o); return o; };
    const byId = Object.fromEntries((board?.countries || []).map((c) => [c.country, c]));
    const list = COUNTRIES.map((c, i) => ({ i, ...(byId[c.id] || { country: c.id, avg: 0, players: 0, best: '' }) }))
      .sort((a, b) => b.avg - a.avg || a.i - b.i);
    const anyone = list.some((c) => c.avg > 0);
    list.forEach((c, i) => {
      const x = 46 + i * 35;
      const lead = anyone && i === 0;
      const short = COUNTRIES.find((q) => q.id === c.country)?.short || c.country;
      if (lead) keep(this.add.rectangle(x, 246, 34, 66, C.panel));
      keep(txt(this, x, 222, anyone ? `${i + 1}` : '', { font: 'small_o', tint: lead ? C.yellow : C.soft }));
      keep(this.add.image(x, 240, 'atlas', `flag/${c.country}`));
      keep(txt(this, x, 258, short, { font: 'small_o' }));
      keep(txt(this, x, 272, c.avg > 999 ? `${Math.round(c.avg / 1000)}K` : String(c.avg), { font: 'small_o', tint: lead ? C.yellow : C.soft }));
    });
    keep(txt(this, 304, 210, anyone ? `SNIT AF TOP ${CUP_TOP}` : 'ENDNU INGEN POINT', { font: 'small', ox: 1, tint: C.soft }));
  }

  update(time) {
    this.snow.tilePositionX = Math.floor(time * 0.02);
    this.snow.tilePositionY = -Math.floor(time * 0.03);
  }
}
