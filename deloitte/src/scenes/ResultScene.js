// Overlay oven på en bane på pause. Tre udgaver:
//   complete  banen er klaret: point og bonusser gøres op
//   dead      alle julehjerter er brugt: prøv igen fra sidste checkpoint
//   pause     pauseknappen

import { GAME_W, GAME_H, CLOCK } from '../config.js';
import { LEVELS, levelLabel } from '../data/levels.js';
import { txt, panel, button, dim, pad, C } from '../game/ui.js';
import { isMuted, toggleMute } from '../systems/audio.js';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  create(d) {
    dim(this, 0.6);
    const cx = GAME_W / 2;
    const toMap = () => { this.scene.stop('Level'); this.scene.start('Map'); };

    if (d.mode === 'complete') {
      panel(this, 120, 24, GAME_W - 240, GAME_H - 48);
      txt(this, cx, 48, 'LEVEL CLEARED!', { font: 'big_o', scale: 2, tint: C.yellow });
      txt(this, cx, 74, `${levelLabel(d.levelIndex)}  ${LEVELS[d.levelIndex].name}`, { font: 'ui' });
      let y = 100;
      const row = (label, value, tint) => {
        txt(this, cx - 170, y, label, { font: 'ui', ox: 0, tint: tint ?? C.soft });
        txt(this, cx + 170, y, value, { font: 'ui', ox: 1, tint });
        y += 22;
      };
      row(`Points (best combo X${d.bestMult})`, pad(d.score));
      row(`Collected ${d.picked} of ${d.pickupTotal}`, d.bonus.all ? `+${pad(d.bonus.all, 4)}` : '+0000', d.bonus.all ? 0x8af0a0 : undefined);
      row(`${d.hearts} ${d.hearts === 1 ? 'heart' : 'hearts'} left`, `+${pad(d.bonus.hearts, 4)}`);
      row(d.lost === 0 ? 'Perfect run' : `Hearts lost: ${d.lost} (+${d.lost * CLOCK.hitSec} sec)`, `+${pad(d.bonus.perfect, 4)}`, d.bonus.perfect ? 0x8af0a0 : undefined);
      y += 4;
      txt(this, cx - 170, y, 'TOTAL', { font: 'small_o', scale: 2, ox: 0, tint: C.yellow });
      txt(this, cx + 170, y, pad(d.total), { font: 'small_o', scale: 2, ox: 1, tint: C.yellow });
      if (d.isBest) txt(this, cx, y + 26, 'NEW RECORD!', { font: 'small_o', scale: 2, tint: 0x8af0a0 });
      const next = () => {
        this.scene.stop('Level');
        if (d.cut) this.scene.start('Cut', { kind: d.cut }); else this.scene.start('Map');
      };
      button(this, cx - 100, 300, 180, 34, 'NEXT', next, { color: C.green });
      button(this, cx + 100, 300, 180, 34, 'PLAY AGAIN', () => this.scene.start('Level', { levelIndex: d.levelIndex }), { color: C.panel });
      this.input.keyboard?.once('keydown-ENTER', next);
    } else if (d.mode === 'dead') {
      panel(this, 130, 50, GAME_W - 260, GAME_H - 100);
      txt(this, cx, 96, 'OUCH!', { font: 'big_o', scale: 3, tint: 0xff8a8a });
      txt(this, cx, 140, 'Out of Christmas hearts.', { font: 'ui' });
      txt(this, cx, 162, d.checkpoint ? 'You start at your checkpoint.' : 'You start the level again.', { font: 'ui', tint: C.soft });
      const retry = () => this.scene.start('Level', { levelIndex: d.levelIndex, checkpoint: d.checkpoint, run: d.run, lost: d.lost });
      button(this, cx, 220, 200, 34, 'TRY AGAIN', retry, { color: C.green });
      button(this, cx, 264, 200, 30, 'MAP', toMap, { color: C.panel });
      this.input.keyboard?.once('keydown-ENTER', retry);
    } else {
      panel(this, 130, 50, GAME_W - 260, GAME_H - 100);
      txt(this, cx, 92, 'PAUSE', { font: 'big_o', scale: 3, tint: C.yellow });
      const resume = () => { this.scene.stop(); this.scene.resume('Level'); };
      button(this, cx, 156, 200, 34, 'CONTINUE', resume, { color: C.green });
      const snd = button(this, cx, 200, 200, 30, isMuted() ? 'SOUND: OFF' : 'SOUND: ON', () => snd.setLabel(toggleMute() ? 'SOUND: OFF' : 'SOUND: ON'), { color: C.panel });
      button(this, cx, 240, 200, 30, 'MAP', toMap, { color: C.panel });
      txt(this, cx, 284, 'Swipe up: jump   Swipe down: slide   Tap: excuse me', { font: 'small', tint: C.soft });
      this.input.keyboard?.once('keydown-ESC', resume);
    }
  }
}
