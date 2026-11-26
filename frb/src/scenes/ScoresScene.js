// Topscorerlisten: spillerne til venstre og afdelingskampen til højre.
// Viser enhedens egne point med det samme og skifter til den fælles liste, når den er hentet.

import { GAME_W, GAME_H, COUNTRIES, CUP_TOP, runnerId, isCountry, DEFAULT_COUNTRY } from '../config.js';
import { LEVELS, levelLabel } from '../data/levels.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';

export default class ScoresScene extends Phaser.Scene {
  constructor() { super('Scores'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.2);
    txt(this, 20, 22, 'TOPSCORERE', { font: 'big_o', scale: 2, ox: 0, tint: C.yellow });
    const head = (x, s, ox = 0) => txt(this, x, 50, s, { font: 'small', ox, tint: C.soft });
    head(72, 'NAVN'); head(262, 'POINT', 1); head(280, 'ANKOMST');
    panel(this, 388, 40, 238, 268, { fill: C.night });
    txt(this, 400, 58, 'AFDELINGSKAMPEN', { font: 'small_o', scale: 2, ox: 0, tint: C.yellow });
    txt(this, 400, 76, `SNIT AF DE ${CUP_TOP} BEDSTE I HVER AFDELING`, { font: 'small', ox: 0, tint: C.soft });
    this.rowObjs = [];
    this.status = txt(this, 20, 300, '', { font: 'small', ox: 0, tint: C.soft });
    this.draw(Scores.localBoard());
    if (Scores.isShared()) {
      this.status.setText('HENTER LISTEN ...');
      Scores.fetchBoard().then((b) => {
        if (!this.sys.isActive()) return;
        if (b) { this.draw(b); this.status.setText(`${b.count} ${b.count === 1 ? 'SPILLER' : 'SPILLERE'} PÅ LISTEN`); } else this.status.setText('DEN FÆLLES LISTE SVARER IKKE. VISER DINE EGNE POINT');
      });
    } else this.status.setText('DEN FÆLLES LISTE ER IKKE ÅBEN ENDNU. VISER DINE EGNE POINT');
    const back = () => this.scene.start(Save.hasName() ? 'Map' : 'Title');
    button(this, 110, 334, 180, 30, Save.hasName() ? 'KORT' : 'TILBAGE', back, { color: C.green });
    button(this, 300, 334, 180, 30, 'FORSIDE', () => this.scene.start('Title'), { color: C.panel });
    this.input.keyboard?.once('keydown-ENTER', back);
  }

  draw(board) {
    this.rowObjs.forEach((o) => o.destroy());
    this.rowObjs = [];
    const keep = (o) => { this.rowObjs.push(o); return o; };
    const row = (r, rank, y) => {
      if (r.me) keep(this.add.rectangle(196, y, 364, 25, C.panel));
      keep(txt(this, 22, y, String(rank), { font: 'small_o', scale: 2, ox: 0, tint: rank <= 3 ? C.yellow : 0xffffff }));
      keep(this.add.image(54, y, 'atlas', `flag/${isCountry(r.country) ? r.country : DEFAULT_COUNTRY}`));
      keep(txt(this, 72, y, String(r.name).toUpperCase(), { font: 'small_o', scale: 2, ox: 0 }));
      keep(txt(this, 262, y, pad(r.score), { font: 'small_o', ox: 1 }));
      const done = r.lost != null && r.reached >= LEVELS.length;
      const onTime = done && Scores.timeBonus(r.lost) > 0;
      const where = done ? Scores.fmtClock(Scores.arrivalSec(r.lost)) : r.reached === 0 ? 'IKKE STARTET' : `PÅ ${levelLabel(Math.min(r.reached, LEVELS.length - 1))}`;
      keep(txt(this, 280, y, where, { font: 'small_o', ox: 0, tint: done ? (onTime ? 0x8af0a0 : 0xff8a8a) : C.soft }));
    };
    const rows = board.rows.slice(0, Scores.TOP_N);
    rows.forEach((r, i) => row(r, i + 1, 72 + i * 26));
    const meShown = rows.some((r) => r.me);
    if (!meShown && board.me && board.me.score > 0) {
      const y = 72 + rows.length * 26;
      row({ ...board.me, me: true }, board.me.rank, Math.min(y, 282));
    }

    // afdelingskampen: en søjle pr. afdeling
    const byId = Object.fromEntries((board.countries || []).map((c) => [c.country, c]));
    const list = COUNTRIES.map((c) => byId[c.id] || { country: c.id, avg: 0, players: 0, best: '' }).sort((a, b) => b.avg - a.avg);
    const max = Math.max(1, ...list.map((c) => c.avg));
    const g = keep(this.add.graphics());
    list.forEach((c, i) => {
      const x = 398 + i * 28;
      const h = c.avg > 0 ? Math.max(8, Math.round((c.avg / max) * 130)) : 3;
      const col = c.avg <= 0 ? C.grey : [C.yellow, 0xc8ccd8, 0xe0a060, 0x6a8ac0, 0x6a8ac0, 0x6a8ac0, 0x6a8ac0, 0x6a8ac0][i];
      const short = COUNTRIES.find((q) => q.id === c.country)?.short || c.country;
      g.fillStyle(C.ink, 1).fillRect(x - 1, 250 - h - 1, 24, h + 2);
      g.fillStyle(col, 1).fillRect(x, 250 - h, 22, h);
      g.fillStyle(0xffffff, 0.6).fillRect(x, 250 - h, 22, 2);
      keep(this.add.image(x + 11, 264, 'atlas', `flag/${c.country}`));
      keep(txt(this, x + 11, 282, short, { font: 'small' }));
      keep(txt(this, x + 11, 250 - h - 10, c.avg > 0 ? (c.avg > 999 ? `${Math.round(c.avg / 1000)}K` : String(c.avg)) : '', { font: 'small', tint: C.soft }));
      keep(txt(this, x + 11, 296, c.players > 0 ? `${c.players}` : '', { font: 'small', tint: C.soft }));
    });
    if (!list.some((c) => c.avg > 0)) keep(txt(this, 507, 170, 'INGEN AFDELING HAR POINT ENDNU', { font: 'small_o', tint: C.soft }));
  }

  update(time) { this.snow.tilePositionY = -Math.floor(time * 0.03); }
}
