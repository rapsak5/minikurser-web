// Den offentlige topscorerliste. Viser enhedens egne point med det samme
// og skifter til den fælles liste, når den er hentet.

import { GAME_W, GAME_H } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { isFisher, DEFAULT_FISHER } from '../data/fishers.js';
import { txt, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';

export default class ScoresScene extends Phaser.Scene {
  constructor() { super('Scores'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.navy).setOrigin(0);
    txt(this, GAME_W / 2, 24, 'TOPSCORERLISTEN', { font: 'big_o', scale: 2, tint: C.yellow });
    this.add.image(10, 8, 'brand_mark24').setOrigin(0);
    this.add.image(GAME_W - 10, 14, 'brand_word96').setOrigin(1, 0);
    const head = (x, s, ox = 0) => txt(this, x, 52, s, { font: 'small', ox, tint: C.yellow });
    head(96, 'PLADS'); head(180, 'NAVN'); head(400, 'POINT', 1); head(430, 'NÅET TIL');
    this.rowObjs = [];
    this.status = txt(this, GAME_W / 2, 306, '', { font: 'small', tint: C.soft });
    this.draw(Scores.localBoard());
    if (Scores.isShared()) {
      this.status.setText('HENTER LISTEN ...');
      Scores.fetchBoard().then((b) => {
        if (!this.sys.isActive()) return;
        if (b) { this.draw(b); this.status.setText(`${b.count} ${b.count === 1 ? 'SPILLER' : 'SPILLERE'} PÅ LISTEN`); } else this.status.setText('KUNNE IKKE HENTE LISTEN. VISER KUN DINE EGNE POINT');
      });
    } else this.status.setText('LISTEN ER IKKE ONLINE ENDNU. VISER KUN DINE EGNE POINT');
    button(this, GAME_W / 2 - 90, 334, 160, 30, 'KORTET', () => this.scene.start('Map'));
    button(this, GAME_W / 2 + 90, 334, 160, 30, 'FORSIDEN', () => this.scene.start('Title'), { color: C.panel });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Map'));
  }

  draw(board) {
    this.rowObjs.forEach((o) => o.destroy());
    this.rowObjs = [];
    const keep = (o) => { this.rowObjs.push(o); return o; };
    const row = (r, rank, y) => {
      if (r.me) keep(this.add.rectangle(GAME_W / 2, y, 470, 25, C.panel));
      keep(txt(this, 104, y, String(rank), { font: 'ui', ox: 0 }));
      keep(this.add.image(152, y, 'atlas', `portrait/${isFisher(r.fisher) ? r.fisher : DEFAULT_FISHER}`).setScale(0.4));
      keep(txt(this, 180, y, String(r.name), { font: 'ui', ox: 0, tint: rank === 1 && r.score > 0 ? C.yellow : 0xffffff }));
      keep(txt(this, 400, y, pad(r.score), { font: 'ui', ox: 1 }));
      const reached = r.reached === 0 ? 'Ikke startet' : r.reached >= LEVELS.length ? 'Byen' : LEVELS[r.reached - 1].name;
      keep(txt(this, 430, y, reached, { font: 'ui', ox: 0, tint: C.soft }));
    };
    const rows = board.rows.slice(0, Scores.TOP_N);
    rows.forEach((r, i) => row(r, i + 1, 76 + i * 26));
    const meShown = rows.some((r) => r.me);
    if (!meShown && board.me && board.me.score > 0) {
      const y = 76 + rows.length * 26;
      keep(txt(this, GAME_W / 2, y - 8, '. . .', { font: 'small', tint: C.soft }));
      row({ ...board.me, me: true }, board.me.rank, y + 6);
    }
  }
}
