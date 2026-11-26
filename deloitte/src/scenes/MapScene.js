// Kortet: tre verdener med tre baner i hver. Baner åbnes én ad gangen.

import { GAME_W, GAME_H, runnerId, isCountry, DEFAULT_COUNTRY } from '../config.js';
import { LEVELS, WORLDS, levelLabel } from '../data/levels.js';
import { txt, button, pad, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Scores from '../systems/scores.js';
import { sfx } from '../systems/audio.js';

const PANEL_X = (w) => 14 + w * 208;
const SPOTS = [{ x: 44, y: 264 }, { x: 98, y: 200 }, { x: 152, y: 136 }];

function node(i) {
  const l = LEVELS[i];
  const k = LEVELS.filter((q, j) => q.world === l.world && j < i).length;
  return { x: PANEL_X(l.world) + SPOTS[k].x, y: SPOTS[k].y };
}

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    const s = Save.load();
    this.runnerId = runnerId(s.runner);
    this.progress = Save.player();
    this.add.image(0, 0, 'map').setOrigin(0);

    // topbjælke: spilleren, point og ankomsttid
    this.add.image(22, 20, 'atlas', `flag/${isCountry(s.country) ? s.country : DEFAULT_COUNTRY}`);
    txt(this, 40, 20, (s.name || '').toUpperCase(), { font: 'small_o', scale: 2, ox: 0 });
    const lost = Scores.totalLost();
    txt(this, 250, 14, 'POINTS', { font: 'small', tint: C.soft });
    txt(this, 250, 28, pad(Scores.total()), { font: 'small_o', tint: C.yellow });
    txt(this, 330, 14, 'ARRIVAL', { font: 'small', tint: C.soft });
    txt(this, 330, 28, lost == null ? '--:--' : Scores.fmtClock(Scores.arrivalSec(lost)), { font: 'small_o', tint: lost != null && Scores.timeBonus(lost) > 0 ? 0x8af0a0 : C.yellow });
    button(this, 416, 20, 78, 24, 'CHECK IN', () => this.scene.start('Select'), { color: C.panel, font: 'small_o' });
    button(this, 498, 20, 78, 24, 'PRACTICE', () => this.scene.start('Level', { tutorial: true }), { color: C.panel, font: 'small_o' });
    button(this, 586, 20, 90, 24, 'TOP SCORES', () => this.scene.start('Scores'), { color: C.panel, font: 'small_o' });

    WORLDS.forEach((w, i) => {
      this.add.rectangle(PANEL_X(i) + 98, 58, 196, 24, C.night, 0.85);
      txt(this, PANEL_X(i) + 98, 58, `${i + 1}  ${w.name.toUpperCase()}`, { font: 'small_o', scale: 2, tint: w.color });
    });

    // ruten
    const g = this.add.graphics();
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const a = node(i);
      const b = node(i + 1);
      const n = Math.floor(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 12);
      for (let k = 1; k < n; k++) {
        const x = Math.round(a.x + ((b.x - a.x) * k) / n);
        const y = Math.round(a.y + ((b.y - a.y) * k) / n);
        g.fillStyle(C.ink, 1).fillRect(x - 3, y - 3, 6, 6);
        g.fillStyle(i < this.progress.unlocked - 1 ? 0xffe08a : C.grey, 1).fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // knuder
    this.nodeGfx = this.add.graphics();
    LEVELS.forEach((l, i) => {
      const n = node(i);
      txt(this, n.x, n.y, levelLabel(i).split('-')[1], { font: 'small_o', scale: 2 }).setDepth(2);
      this.add.zone(n.x, n.y, 56, 56).setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(i, true));
    });
    this.marker = this.add.image(0, 0, 'atlas', `portrait/${this.runnerId}/office`).setScale(0.5).setDepth(3);

    // bundbjælke: valgt bane
    this.add.rectangle(0, 318, GAME_W, 42, C.night, 0.9).setOrigin(0);
    this.levelTxt = txt(this, 14, 332, '', { font: 'small_o', scale: 2, ox: 0, tint: C.yellow });
    this.bestTxt = txt(this, 14, 350, '', { font: 'small_o', ox: 0, tint: C.soft });
    this.playBtn = button(this, 556, 339, 150, 34, 'PLAY', () => this.play(), { color: C.green });

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
    const n = node(i);
    const open = this.isOpen(i);
    this.tweens.killTweensOf(this.marker);
    this.marker.setPosition(n.x, n.y - 34);
    this.tweens.add({ targets: this.marker, y: n.y - 38, duration: 420, yoyo: true, repeat: -1 });
    this.levelTxt.setText(`${levelLabel(i)}  ${l.name.toUpperCase()}`);
    const best = this.progress.best[l.id];
    const lost = this.progress.lost[l.id];
    this.bestTxt.setText(!open ? 'LOCKED: FINISH THE LEVEL BEFORE' : best ? `BEST: ${pad(best)}   HEARTS LOST: ${lost ?? 0}` : 'NOT FINISHED YET');
    this.playBtn.setEnabled(open);
    this.drawNodes();
  }

  drawNodes() {
    const g = this.nodeGfx.clear();
    LEVELS.forEach((l, i) => {
      const n = node(i);
      const done = this.progress.best[l.id] != null;
      const col = !this.isOpen(i) ? C.grey : done ? C.greenDark : C.red;
      g.fillStyle(C.ink, 1).fillCircle(n.x, n.y, 17);
      g.fillStyle(i === this.index ? 0xffe08a : C.yellow, 1).fillCircle(n.x, n.y, 15);
      g.fillStyle(col, 1).fillCircle(n.x, n.y, 12);
    });
  }

  play() {
    if (!this.isOpen(this.index)) return;
    this.scene.start('Level', { levelIndex: this.index });
  }
}
