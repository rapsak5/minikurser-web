// Scenerne mellem verdenerne: adgangskortet efter campus, julesweateren efter kontoret og pladsen ved bordet til sidst.
// Den sidste er også slutskærmen: ankomsttid, bonus for at nå frem til tiden, point i alt og plads på listen.

import { GAME_W, GAME_H, CLOCK } from '../config.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { sfx } from '../systems/audio.js';

const TEXT = {
  taxi: { head: 'BIP!', line: 'Adgangskortet virker. Næste stop: kontoret.' },
  suit: { head: 'SNAP!', line: 'Julesweateren er på. Nissehuen bliver. Nu til julefrokosten.' },
};

export default class CutScene extends Phaser.Scene {
  constructor() { super('Cut'); }

  create(data) {
    const kind = ['taxi', 'suit', 'bar'].includes(data.kind) ? data.kind : 'taxi';
    this.add.image(0, 0, `cut_${kind}`).setOrigin(0);
    sfx('win');
    if (kind === 'bar') { this.finale(); return; }
    this.add.rectangle(0, GAME_H - 76, GAME_W, 76, C.night, 0.88).setOrigin(0);
    const head = txt(this, 24, GAME_H - 50, TEXT[kind].head, { font: 'big_o', scale: 2, ox: 0, tint: C.yellow });
    this.tweens.add({ targets: head, scale: { from: 0.3, to: 1 }, duration: 400, ease: 'Back.easeOut' });
    txt(this, 24, GAME_H - 22, TEXT[kind].line, { font: 'ui', ox: 0 });
    const next = () => this.scene.start('Map');
    button(this, GAME_W - 100, GAME_H - 38, 160, 36, 'VIDERE', next, { color: C.green });
    this.input.keyboard?.once('keydown-ENTER', next);
  }

  finale() {
    const x0 = 16;
    const cx = x0 + 120;
    panel(this, x0, 96, 240, 252, { alpha: 0.95 });
    this.add.image(GAME_W - 70, GAME_H - 4, 'avatar').setOrigin(0.5, 1).setDisplaySize(120, 140);
    txt(this, GAME_W - 70, GAME_H - 156, 'GOD JUL! KASPER', { font: 'ui_o', tint: C.yellow });
    const lost = Scores.totalLost();
    const head = txt(this, cx, 118, 'DU NÅEDE DET!', { font: 'big_o', scale: 2, tint: C.yellow });
    this.tweens.add({ targets: head, scale: { from: 0.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    txt(this, cx, 142, (Save.load().name || '').toUpperCase(), { font: 'small_o', tint: C.soft });
    if (lost != null) {
      const bonus = Scores.timeBonus(lost);
      txt(this, cx, 162, 'ANKOM KL.', { font: 'small', tint: C.soft });
      txt(this, cx, 186, Scores.fmtClock(Scores.arrivalSec(lost)), { font: 'big_o', scale: 2, tint: bonus > 0 ? 0x8af0a0 : 0xff8a8a });
      txt(this, cx, 210, bonus > 0 ? `TIL TIDEN! +${bonus}` : 'LIDT FOR SENT, MEN VELKOMMEN', { font: 'small_o', tint: bonus > 0 ? 0x8af0a0 : 0xff8a8a });
      txt(this, cx, 224, `${lost} TABTE HJERTER X ${CLOCK.hitSec} SEK.`, { font: 'small', tint: C.soft });
    }
    txt(this, cx, 244, 'POINT I ALT', { font: 'small', tint: C.soft });
    txt(this, cx, 262, pad(Scores.total()), { font: 'big_o', scale: 2 });
    const rank = txt(this, cx, 284, Scores.isShared() ? 'FINDER DIN PLACERING ...' : '', { font: 'small_o', tint: C.soft });
    if (Scores.isShared()) {
      Scores.fetchBoard().then((b) => {
        if (!this.sys.isActive()) return;
        rank.setText(b && b.me ? `NR. ${b.me.rank} AF ${b.count}` : 'SPIL IGEN OG SLÅ DIN EGEN REKORD');
      });
    }
    button(this, cx - 58, 322, 108, 30, 'TOPSCORERE', () => this.scene.start('Scores'), { color: C.green, font: 'small_o' });
    button(this, cx + 58, 322, 108, 30, 'KORT', () => this.scene.start('Map'), { color: C.panel, font: 'small_o' });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Scores'));
  }
}
