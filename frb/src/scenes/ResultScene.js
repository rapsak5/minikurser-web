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
      txt(this, cx, 48, 'BANEN ER KLARET!', { font: 'big_o', scale: 2, tint: C.yellow });
      txt(this, cx, 74, `${levelLabel(d.levelIndex)}  ${LEVELS[d.levelIndex].name}`, { font: 'ui' });
      let y = 100;
      const row = (label, value, tint) => {
        txt(this, cx - 170, y, label, { font: 'ui', ox: 0, tint: tint ?? C.soft });
        txt(this, cx + 170, y, value, { font: 'ui', ox: 1, tint });
        y += 22;
      };
      row(`Point (bedste combo X${d.bestMult})`, pad(d.score));
      row(`Samlet ${d.picked} af ${d.pickupTotal}`, d.bonus.all ? `+${pad(d.bonus.all, 4)}` : '+0000', d.bonus.all ? 0x8af0a0 : undefined);
      row(`${d.hearts} ${d.hearts === 1 ? 'hjerte' : 'hjerter'} tilbage`, `+${pad(d.bonus.hearts, 4)}`);
      row(d.lost === 0 ? 'Fejlfrit løb' : `Tabte hjerter: ${d.lost} (+${d.lost * CLOCK.hitSec} sek.)`, `+${pad(d.bonus.perfect, 4)}`, d.bonus.perfect ? 0x8af0a0 : undefined);
      y += 4;
      txt(this, cx - 170, y, 'I ALT', { font: 'small_o', scale: 2, ox: 0, tint: C.yellow });
      txt(this, cx + 170, y, pad(d.total), { font: 'small_o', scale: 2, ox: 1, tint: C.yellow });
      if (d.isBest) txt(this, cx, y + 26, 'NY REKORD!', { font: 'small_o', scale: 2, tint: 0x8af0a0 });
      const next = () => {
        this.scene.stop('Level');
        if (d.cut) this.scene.start('Cut', { kind: d.cut }); else this.scene.start('Map');
      };
      button(this, cx - 100, 300, 180, 34, 'VIDERE', next, { color: C.green });
      button(this, cx + 100, 300, 180, 34, 'SPIL IGEN', () => this.scene.start('Level', { levelIndex: d.levelIndex }), { color: C.panel });
      this.input.keyboard?.once('keydown-ENTER', next);
    } else if (d.mode === 'dead') {
      panel(this, 130, 50, GAME_W - 260, GAME_H - 100);
      txt(this, cx, 96, 'AV!', { font: 'big_o', scale: 3, tint: 0xff8a8a });
      txt(this, cx, 140, 'Ikke flere julehjerter.', { font: 'ui' });
      txt(this, cx, 162, d.checkpoint ? 'Du starter ved dit checkpoint.' : 'Du starter banen forfra.', { font: 'ui', tint: C.soft });
      const retry = () => this.scene.start('Level', { levelIndex: d.levelIndex, checkpoint: d.checkpoint, run: d.run, lost: d.lost });
      button(this, cx, 220, 200, 34, 'PRØV IGEN', retry, { color: C.green });
      button(this, cx, 264, 200, 30, 'KORT', toMap, { color: C.panel });
      this.input.keyboard?.once('keydown-ENTER', retry);
    } else {
      panel(this, 130, 50, GAME_W - 260, GAME_H - 100);
      txt(this, cx, 92, 'PAUSE', { font: 'big_o', scale: 3, tint: C.yellow });
      const resume = () => { this.scene.stop(); this.scene.resume('Level'); };
      button(this, cx, 156, 200, 34, 'FORTSÆT', resume, { color: C.green });
      const snd = button(this, cx, 200, 200, 30, isMuted() ? 'LYD: FRA' : 'LYD: TIL', () => snd.setLabel(toggleMute() ? 'LYD: FRA' : 'LYD: TIL'), { color: C.panel });
      button(this, cx, 240, 200, 30, 'KORT', toMap, { color: C.panel });
      txt(this, cx, 284, 'Swipe op: hop   Swipe ned: slide   Tap: undskyld', { font: 'small', tint: C.soft });
      this.input.keyboard?.once('keydown-ESC', resume);
    }
  }
}
