// Scenerne mellem verdenerne: taxaen efter byen, julejakkesættet efter kontoret og fadøllen til sidst.
// Den sidste er også slutskærmen: ankomsttid, bonus for at nå frem til tiden, point i alt og plads på listen.

import { GAME_W, GAME_H, CLOCK } from '../config.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { sfx } from '../systems/audio.js';

const TEXT = {
  taxi: { head: 'TAXI!', line: 'The city is behind you. Next stop: the office.' },
  suit: { head: 'SUIT UP!', line: 'Christmas suit on. The hat stays. Now for the party.' },
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
    button(this, GAME_W - 100, GAME_H - 38, 160, 36, 'CONTINUE', next, { color: C.green });
    this.input.keyboard?.once('keydown-ENTER', next);
  }

  finale() {
    const x0 = 16;
    const cx = x0 + 120;
    panel(this, x0, 96, 240, 252, { alpha: 0.95 });
    const lost = Scores.totalLost();
    const head = txt(this, cx, 118, 'YOU MADE IT!', { font: 'big_o', scale: 2, tint: C.yellow });
    this.tweens.add({ targets: head, scale: { from: 0.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    txt(this, cx, 142, (Save.load().name || '').toUpperCase(), { font: 'small_o', tint: C.soft });
    if (lost != null) {
      const bonus = Scores.timeBonus(lost);
      txt(this, cx, 162, 'ARRIVED AT', { font: 'small', tint: C.soft });
      txt(this, cx, 186, Scores.fmtClock(Scores.arrivalSec(lost)), { font: 'big_o', scale: 2, tint: bonus > 0 ? 0x8af0a0 : 0xff8a8a });
      txt(this, cx, 210, bonus > 0 ? `ON TIME! +${bonus}` : 'FASHIONABLY LATE', { font: 'small_o', tint: bonus > 0 ? 0x8af0a0 : 0xff8a8a });
      txt(this, cx, 224, `${lost} HEARTS LOST X ${CLOCK.hitSec} SEC`, { font: 'small', tint: C.soft });
    }
    txt(this, cx, 244, 'TOTAL POINTS', { font: 'small', tint: C.soft });
    txt(this, cx, 262, pad(Scores.total()), { font: 'big_o', scale: 2 });
    const rank = txt(this, cx, 284, Scores.isShared() ? 'FINDING YOUR RANK ...' : '', { font: 'small_o', tint: C.soft });
    if (Scores.isShared()) {
      Scores.fetchBoard().then((b) => {
        if (!this.sys.isActive()) return;
        rank.setText(b && b.me ? `NO. ${b.me.rank} OF ${b.count}` : 'PLAY AGAIN TO BEAT YOUR SCORE');
      });
    }
    button(this, cx - 58, 322, 108, 30, 'TOP SCORES', () => this.scene.start('Scores'), { color: C.green, font: 'small_o' });
    button(this, cx + 58, 322, 108, 30, 'MAP', () => this.scene.start('Map'), { color: C.panel, font: 'small_o' });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Scores'));
  }
}
