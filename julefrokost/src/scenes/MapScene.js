// Oververdenskortet over Amager. Nord er opad, og ruten starter i Dragør mod sydøst.
// Baner åbnes én ad gangen. Knudernes placering står i NODES (spilpixels på kortbilledet).
// lx og ly flytter navnet, ox er navnets ankerpunkt (0 venstre, 0.5 midt, 1 højre).

import { GAME_W, GAME_H } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { fisherById } from '../data/fishers.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import { sfx } from '../systems/audio.js';

const NODES = {
  dragoer: { x: 428, y: 316, lx: 22, ox: 0 },
  lufthavn: { x: 356, y: 236, lx: 22, ox: 0 },
  blaaplanet: { x: 398, y: 142, lx: 22, ox: 0 },
  idraetspark: { x: 300, y: 172, lx: 22, ox: 0 },
  faelled: { x: 248, y: 204, lx: -22, ox: 1 },
  dr: { x: 232, y: 160, lx: -22, ox: 1 },
  campus: { x: 228, y: 118, lx: -22, ox: 1 },
  brygge: { x: 192, y: 92, lx: -18, ox: 1 },
  center: { x: 296, y: 108, lx: -10, ly: 24, ox: 0.5 },
  amagerbio: { x: 348, y: 110, lx: 22, ox: 0 },
  jaguaren: { x: 322, y: 76, lx: -22, ox: 1 },
  strandpark: { x: 394, y: 70, lx: 0, ly: 22, ox: 0.5 },
  copenhill: { x: 340, y: 40, lx: 22, ox: 0 },
};
const CITY = { x: 150, y: 34 };

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.fisherId = fisherById(Save.load().fisher).id;
    this.progress = Save.player();
    this.add.image(0, 0, 'map').setOrigin(0);

    // ruten
    const g = this.add.graphics();
    const pts = [...LEVELS.map((l) => NODES[l.id]), CITY];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const n = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 10);
      for (let k = 1; k < n; k++) {
        const x = Math.round(a.x + ((b.x - a.x) * k) / n);
        const y = Math.round(a.y + ((b.y - a.y) * k) / n);
        g.fillStyle(C.brown, 1).fillRect(x - 3, y - 3, 6, 6);
        g.fillStyle(i < this.progress.unlocked - 1 ? C.goldHi : C.grey, 1).fillRect(x - 1, y - 1, 2, 2);
      }
    }
    txt(this, CITY.x + 24, CITY.y - 6, 'BYEN', { font: 'small_o', scale: 2, ox: 0 });
    txt(this, CITY.x + 24, CITY.y + 10, 'TAXA KL. 22', { font: 'small_o', ox: 0, tint: C.yellow });

    // knuder
    this.nodeGfx = this.add.graphics();
    LEVELS.forEach((l, i) => {
      const n = NODES[l.id];
      txt(this, n.x, n.y, String(i + 1), { font: 'small_o', scale: 2 }).setDepth(2);
      txt(this, n.x + n.lx, n.y + (n.ly || 0), l.name.toUpperCase(), { font: 'small_o', ox: n.ox }).setDepth(2);
      this.add.zone(n.x, n.y, 48, 48).setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(i, true));
    });

    this.marker = this.add.image(0, 0, 'atlas', `portrait/${this.fisherId}`).setScale(0.5).setDepth(3);

    // infopanel
    panel(this, 472, 6, 162, 124);
    this.levelTxt = txt(this, 553, 24, '', { font: 'small_o', scale: 2, tint: C.yellow });
    this.nameTxt = txt(this, 553, 48, '', { font: 'ui', maxWidth: 150, center: true });
    this.bestTxt = txt(this, 553, 72, '', { font: 'small', tint: C.soft });
    this.playBtn = button(this, 553, 104, 138, 34, 'SPIL', () => this.play());

    button(this, 66, 298, 120, 22, 'FISKER OG NAVN', () => this.scene.start('Select'), { color: C.panel, font: 'small_o' });
    button(this, 66, 322, 120, 22, 'ØV STYRINGEN', () => this.scene.start('Level', { tutorial: true }), { color: C.panel, font: 'small_o' });
    button(this, 66, 346, 120, 22, 'TOPSCORER', () => this.scene.start('Scores'), { color: C.panel, font: 'small_o' });
    txt(this, 8, 276, (Save.load().name || '').toUpperCase(), { font: 'small_o', scale: 2, ox: 0 });

    this.select(Math.min(this.progress.unlocked, LEVELS.length) - 1, false);
    const kb = this.input.keyboard;
    kb?.on('keydown-ENTER', () => this.play());
    kb?.on('keydown-RIGHT', () => this.select(Math.min(this.index + 1, LEVELS.length - 1), true));
    kb?.on('keydown-LEFT', () => this.select(Math.max(this.index - 1, 0), true));
  }

  isOpen(i) { return i < this.progress.unlocked; }

  select(i, click) {
    if (click) sfx('click');
    this.index = i;
    const l = LEVELS[i];
    const n = NODES[l.id];
    const open = this.isOpen(i);
    const my = n.y < 70 ? n.y + 32 : n.y - 30;
    this.tweens.killTweensOf(this.marker);
    this.marker.setPosition(n.x, my);
    this.tweens.add({ targets: this.marker, y: my - 4, duration: 420, yoyo: true, repeat: -1 });
    this.levelTxt.setText(`LEVEL ${i + 1}`);
    this.nameTxt.setText(l.name);
    const best = this.progress.best[l.id];
    this.bestTxt.setText(!open ? 'LÅST: KLAR FORRIGE BANE' : best ? `BEDSTE: ${pad(best)}` : 'IKKE KLARET ENDNU');
    this.playBtn.setEnabled(open);
    this.drawNodes();
  }

  drawNodes() {
    const g = this.nodeGfx.clear();
    LEVELS.forEach((l, i) => {
      const n = NODES[l.id];
      const done = this.progress.best[l.id] != null;
      const col = !this.isOpen(i) ? C.grey : done ? C.green : C.red;
      g.fillStyle(C.brown, 1).fillCircle(n.x, n.y, 15);
      g.fillStyle(i === this.index ? C.goldHi : C.gold, 1).fillCircle(n.x, n.y, 13);
      g.fillStyle(col, 1).fillCircle(n.x, n.y, 10);
    });
  }

  play() {
    if (!this.isOpen(this.index)) return;
    this.scene.start('Level', { levelIndex: this.index });
  }
}
