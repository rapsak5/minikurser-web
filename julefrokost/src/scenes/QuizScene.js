// Quizkassen: banen står på pause, mens spørgsmålet vises med tre svarknapper.
// Rigtigt svar giver et ekstra liv og point. Forkert svar koster et liv (25/11). Resultatet sendes tilbage til banen som 'quiz-done'.

import { GAME_W, GAME_H } from '../config.js';
import { txt, panel, button, dim, C } from '../game/ui.js';
import { sfx } from '../systems/audio.js';

export default class QuizScene extends Phaser.Scene {
  constructor() { super('Quiz'); }

  create(data) {
    const q = data.q;
    this.q = q;
    const correct = q.a[0];
    const answers = Phaser.Utils.Array.Shuffle([...q.a]);
    dim(this, 0.65);
    panel(this, 60, 30, GAME_W - 120, GAME_H - 60);
    txt(this, GAME_W / 2, 56, 'QUIZKASSE', { font: 'big_o', scale: 2, tint: C.yellow });
    txt(this, GAME_W / 2, 100, q.q, { font: 'ui', maxWidth: 460, center: true });
    this.feedback = txt(this, GAME_W / 2, 306, 'Rigtigt svar: ekstra liv. Forkert: du mister et liv', { font: 'ui', tint: C.soft });
    this.locked = false;
    this.buttons = answers.map((a, i) => button(this, GAME_W / 2, 152 + i * 46, 420, 38, a, () => this.pick(a, correct), { color: C.panel }));
    this.input.keyboard?.on('keydown', (ev) => {
      const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(ev.code);
      if (i >= 0) this.pick(answers[i], correct);
    });
  }

  pick(answer, correct) {
    if (this.locked) return;
    this.locked = true;
    const ok = answer === correct;
    this.buttons.forEach((b) => {
      b.setEnabled(false);
      if (b.label.text === correct) b.label.setTint(0x8af0a0);
      else if (b.label.text === answer) b.label.setTint(0xff8a8a);
    });
    sfx(ok ? 'right' : 'wrong');
    this.feedback.setText(ok ? 'RIGTIGT! Ekstra liv og 500 point' : `FORKERT! -1 LIV. Svaret var: ${correct}`).setTint(ok ? 0x8af0a0 : 0xff8a8a);
    this.time.delayedCall(ok ? 1000 : 1700, () => {
      const level = this.scene.get('Level');
      this.scene.stop();
      this.scene.resume('Level');
      level.events.emit('quiz-done', ok);
    });
  }
}
