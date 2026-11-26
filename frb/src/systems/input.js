// Styringen: tre kommandoer.
//   swipe op  -> 'up'     (også pil op, W, mellemrum)
//   swipe ned -> 'down'   (også pil ned, S)
//   tap       -> 'tap'    (også X, Enter, pil til højre)
// Et swipe udløses, så snart fingeren har flyttet sig nok. Man behøver ikke slippe først.

import { GAME_W } from '../config.js';

const SWIPE_PX = 20;   // i spilpixels
const TAP_SLOP = 14;

export default class Gestures extends Phaser.Events.EventEmitter {
  /** ignore(pointer) kan returnere true for tryk, der ikke skal styre spillet (fx pauseknappen). */
  constructor(scene, ignore = null) {
    super();
    this.scene = scene;
    this.ignore = ignore;
    this.active = new Map();
    const inp = scene.input;
    inp.on('pointerdown', this.down, this);
    inp.on('pointermove', this.move, this);
    inp.on('pointerup', this.up, this);
    inp.on('pointerupoutside', this.up, this);
    this.keyHandler = (ev) => {
      if (ev.repeat) return;
      const k = ev.code;
      if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') this.emit('up');
      else if (k === 'ArrowDown' || k === 'KeyS') this.emit('down');
      else if (k === 'KeyX' || k === 'Enter' || k === 'ArrowRight') this.emit('tap');
    };
    inp.keyboard?.on('keydown', this.keyHandler);
    scene.events.once('shutdown', this.destroy, this);
  }

  down(p) {
    if (this.ignore && this.ignore(p)) return;
    this.active.set(p.id, { x: p.x, y: p.y, fired: false });
  }

  move(p) {
    const a = this.active.get(p.id);
    if (!a || a.fired) return;
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      a.fired = true;
      this.emit(dy < 0 ? 'up' : 'down');
    }
  }

  up(p) {
    const a = this.active.get(p.id);
    if (!a) return;
    this.active.delete(p.id);
    if (a.fired) return;
    if (Math.abs(p.x - a.x) <= TAP_SLOP && Math.abs(p.y - a.y) <= TAP_SLOP) this.emit('tap');
  }

  destroy() {
    const inp = this.scene.input;
    inp.off('pointerdown', this.down, this);
    inp.off('pointermove', this.move, this);
    inp.off('pointerup', this.up, this);
    inp.off('pointerupoutside', this.up, this);
    inp.keyboard?.off('keydown', this.keyHandler);
    this.removeAllListeners();
  }
}

export const HUD_BUTTON_ZONE = (p) => p.x > GAME_W - 44 && p.y < 40;
