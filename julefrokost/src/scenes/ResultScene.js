// Overlay oven på en bane på pause. Tre udgaver:
//   complete  banen er klaret: point gøres op
//   dead      alle liv er brugt: prøv igen fra sidste checkpoint
//   pause     pauseknappen

import { GAME_W, GAME_H } from '../config.js';
import { LEVELS } from '../data/levels.js';
import * as Newsletter from '../systems/newsletter.js';
import { txt, panel, button, dim, pad, C } from '../game/ui.js';
import { isMuted, toggleMute } from '../systems/audio.js';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  create(d) {
    dim(this, 0.6);
    panel(this, 130, 50, GAME_W - 260, GAME_H - 100);
    const cx = GAME_W / 2;
    const toMap = () => { this.scene.stop('Level'); this.scene.start('Map'); };

    if (d.mode === 'complete') {
      txt(this, cx, 78, 'BANEN ER KLARET!', { font: 'big_o', scale: 2, tint: C.yellow });
      txt(this, cx, 106, LEVELS[d.levelIndex].name, { font: 'ui' });
      const row = (y, label, value) => {
        txt(this, cx - 130, y, label, { font: 'ui', ox: 0, tint: C.soft });
        txt(this, cx + 130, y, value, { font: 'ui', ox: 1 });
      };
      row(142, 'Point i banen', pad(d.score));
      row(166, `Bajere: ${d.bottles}`, '');
      row(190, `${d.hearts} hjerter tilbage`, `+${pad(d.bonus, 4)}`);
      row(220, 'I alt', pad(d.total));
      if (d.isBest) txt(this, cx, 244, 'NY REKORD!', { font: 'small_o', scale: 2, tint: 0x8af0a0 });
      const next = () => {
        this.scene.stop('Level');
        // halvvejs spørger spillet én gang om nyhedsbrevet
        this.scene.start(d.last ? 'Finale' : (Newsletter.shouldAsk(d.levelIndex) ? 'Newsletter' : 'Map'));
      };
      button(this, cx, 280, 200, 34, d.last ? 'FINALEN' : 'VIDERE', next);
      this.input.keyboard?.once('keydown-ENTER', next);
    } else if (d.mode === 'dead') {
      txt(this, cx, 96, 'ØV!', { font: 'big_o', scale: 3, tint: 0xff8a8a });
      txt(this, cx, 140, 'Duerne vandt denne gang.', { font: 'ui' });
      txt(this, cx, 162, d.checkpoint ? 'Du starter ved dit checkpoint.' : 'Du starter forfra på banen.', { font: 'ui', tint: C.soft });
      const retry = () => this.scene.start('Level', { levelIndex: d.levelIndex, checkpoint: d.checkpoint, run: d.run });
      button(this, cx, 220, 200, 34, 'PRØV IGEN', retry);
      button(this, cx, 264, 200, 30, 'KORTET', toMap, { color: C.panel });
      this.input.keyboard?.once('keydown-ENTER', retry);
    } else {
      txt(this, cx, 92, 'PAUSE', { font: 'big_o', scale: 3, tint: C.yellow });
      const resume = () => { this.scene.stop(); this.scene.resume('Level'); };
      button(this, cx, 156, 200, 34, 'FORTSÆT', resume);
      const snd = button(this, cx, 200, 200, 30, isMuted() ? 'LYD: FRA' : 'LYD: TIL', () => snd.setLabel(toggleMute() ? 'LYD: FRA' : 'LYD: TIL'), { color: C.panel });
      button(this, cx, 240, 200, 30, 'KORTET', toMap, { color: C.panel });
      txt(this, cx, 284, 'Swipe op: hop   Swipe ned: slide   Tap: slå', { font: 'small', tint: C.soft });
      this.input.keyboard?.once('keydown-ESC', resume);
    }
  }
}
