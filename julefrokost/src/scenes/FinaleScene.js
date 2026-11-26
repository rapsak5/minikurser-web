// Slutskærmen, når alle baner er klaret: point, plads på listen og vejen til hemmeligheden.

import { GAME_W } from '../config.js';
import { txt, panel, button, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { sfx } from '../systems/audio.js';

export default class FinaleScene extends Phaser.Scene {
  constructor() { super('Finale'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, 360, C.deep).setOrigin(0);
    txt(this, GAME_W / 2, 18, 'HELE AMAGER ER KLARET. TAXAEN VENTER.', { font: 'small_o', tint: C.soft });
    const big = txt(this, GAME_W / 2, 54, 'VELFORTJENT BAD!', { font: 'big_o', scale: 3, tint: C.yellow });
    this.tweens.add({ targets: big, scale: { from: 0.2, to: 1 }, duration: 500, ease: 'Back.easeOut' });
    this.add.image(8, 90, 'secret').setOrigin(0);

    const x0 = 400;
    const cx = x0 + 116;
    panel(this, x0, 90, 232, 216);
    txt(this, cx, 108, (Save.load().name || '').toUpperCase(), { font: 'small_o', scale: 2, tint: C.yellow });
    txt(this, cx, 130, 'POINT I ALT', { font: 'small', tint: C.soft });
    txt(this, cx, 152, pad(Scores.total()), { font: 'big_o', scale: 2 });
    const rank = txt(this, cx, 180, Scores.isShared() ? 'FINDER DIN PLADS ...' : '', { font: 'small_o', tint: C.soft });
    if (Scores.isShared()) {
      Scores.fetchBoard().then((b) => {
        if (!this.sys.isActive()) return;
        rank.setText(b && b.me ? `NR. ${b.me.rank} AF ${b.count} PÅ LISTEN` : '');
      });
    }
    const claimed = Save.claim()?.code;
    txt(this, cx, 212, claimed ? 'DIN RABATKODE LIGGER KLAR' : 'DER VENTER EN HEMMELIGHED', { font: 'small_o', tint: C.yellow });
    const open = button(this, cx, 248, 190, 30, claimed ? 'DIN RABATKODE' : 'SE HEMMELIGHEDEN', () => this.scene.start('Secret'), { color: C.green });
    this.tweens.add({ targets: open.label, alpha: 0.35, duration: 550, yoyo: true, repeat: -1 });
    button(this, cx, 284, 190, 28, 'TOPSCORERLISTEN', () => this.scene.start('Scores'), { color: C.panel });
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Secret'));
    // afsender nederst til venstre
    this.add.image(8, 340, 'brand_mark24').setOrigin(0, 0.5);
    this.add.image(38, 341, 'brand_word96').setOrigin(0, 0.5);
    sfx('win');
  }
}
