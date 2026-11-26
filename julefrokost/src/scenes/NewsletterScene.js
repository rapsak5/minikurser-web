// Halvvejs: opfordring til nyhedsbrevet Tre ting om AI. Vises én gang, efter bane 7.
// Man kan altid sige nej tak og spille videre. Mailfeltet er et HTML-felt oven på canvas,
// ligesom i hemmeligheden, så mobilens tastatur og autoudfyld virker.

import { GAME_W, GAME_H, NEWSLETTER } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { txt, panel, button, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Newsletter from '../systems/newsletter.js';
import { sfx } from '../systems/audio.js';

const FIELD = { x: 140, y: 196, w: 360, h: 32 };

export default class NewsletterScene extends Phaser.Scene {
  constructor() { super('Newsletter'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.35);
    this.add.image(14, 12, 'brand_mark40').setOrigin(0);
    this.add.image(60, 24, 'brand_word96').setOrigin(0);

    const head = txt(this, GAME_W / 2, 44, NEWSLETTER.headline, { font: 'big_o', scale: 3, tint: C.yellow });
    this.tweens.add({ targets: head, scale: { from: 0.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    txt(this, GAME_W / 2, 80, `Du har klaret ${NEWSLETTER.atLevel + 1} af ${LEVELS.length} baner.`, { font: 'ui', tint: C.soft });

    panel(this, 112, 98, GAME_W - 224, 222);
    this.objs = [];
    this.buttons = [];
    this.showForm();

    this.events.once('shutdown', () => this.removeField());
    this.events.once('destroy', () => this.removeField());
  }

  keep(o) { this.objs.push(o); return o; }

  clear() {
    this.objs.forEach((o) => o.destroy());
    this.buttons.forEach((b) => b.destroy());
    this.objs = [];
    this.buttons = [];
    this.removeField();
  }

  showForm() {
    this.clear();
    const cx = GAME_W / 2;
    this.keep(txt(this, cx, 120, NEWSLETTER.lead, { font: 'ui_o' }));
    this.keep(txt(this, cx, 142, NEWSLETTER.pitch, { font: 'ui' }));
    this.keep(txt(this, cx, 162, NEWSLETTER.promise, { font: 'ui', tint: C.soft }));
    this.keep(panel(this, FIELD.x - 4, FIELD.y - 4, FIELD.w + 8, FIELD.h + 8, { fill: C.night }));
    this.makeField(Save.claim()?.email || '');
    this.msg = this.keep(txt(this, cx, 244, NEWSLETTER.privacy, { font: 'small', tint: C.soft }));
    this.go = button(this, cx, 270, 260, 30, NEWSLETTER.yes, () => this.submit(), { color: C.green });
    this.buttons.push(this.go);
    this.buttons.push(button(this, cx, 304, 260, 24, NEWSLETTER.no, () => this.decline(), { color: C.panel, font: 'small_o' }));
  }

  decline() {
    Save.setNewsletter('no');
    sfx('click');
    this.scene.start('Map');
  }

  async submit() {
    if (this.busy) return;
    const email = this.field?.value || '';
    this.busy = true;
    this.go.setEnabled(false);
    this.go.setLabel('TILMELDER ...');
    this.field?.blur();
    const res = await Newsletter.subscribe(email, 'halvvejs');
    this.busy = false;
    if (!this.sys.isActive()) return;
    if (!res.ok) {
      this.go.setEnabled(true);
      this.go.setLabel(NEWSLETTER.yes);
      sfx('hurt');
      this.msg.setText(res.error.toUpperCase()).setTint(0xff8a8a);
      this.field?.focus();
      return;
    }
    sfx('win');
    this.clear();
    const cx = GAME_W / 2;
    const t = this.keep(txt(this, cx, 160, 'TAK!', { font: 'big_o', scale: 2, tint: C.yellow }));
    this.tweens.add({ targets: t, scale: { from: 0.4, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    this.keep(txt(this, cx, 196, NEWSLETTER.thanks, { font: 'ui' }));
    this.keep(txt(this, cx, 218, 'Nu mangler du bare resten af Amager.', { font: 'ui', tint: C.soft }));
    const go = button(this, cx, 270, 220, 30, 'SPIL VIDERE', () => this.scene.start('Map'), { color: C.green });
    this.buttons.push(go);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Map'));
  }

  makeField(value) {
    const el = document.createElement('input');
    el.type = 'email';
    el.id = 'newsletter-field';
    el.maxLength = 254;
    el.placeholder = 'din@mail.dk';
    el.autocomplete = 'email';
    el.inputMode = 'email';
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('autocorrect', 'off');
    el.spellcheck = false;
    el.setAttribute('enterkeyhint', 'send');
    el.value = value || '';
    Object.assign(el.style, {
      position: 'fixed', zIndex: 10, boxSizing: 'border-box', margin: 0, padding: '0 10px',
      border: 'none', outline: 'none', borderRadius: 0, background: '#0b1224', color: '#f6f1e6',
      caretColor: '#f2c418', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', textAlign: 'center',
      userSelect: 'text', webkitUserSelect: 'text', touchAction: 'manipulation',
    });
    const stop = (e) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); this.submit(); }
    };
    el.addEventListener('keydown', stop);
    el.addEventListener('keyup', stop);
    el.addEventListener('input', () => { if (this.msg) this.msg.setText(NEWSLETTER.privacy).setTint(C.soft); });
    document.body.appendChild(el);
    this.field = el;
    this.place = () => this.placeField();
    this.scale.on('resize', this.place);
    window.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('resize', this.place);
    this.placeField();
  }

  placeField() {
    const el = this.field;
    if (!el) return;
    const r = this.game.canvas.getBoundingClientRect();
    const k = r.width / GAME_W;
    Object.assign(el.style, {
      left: `${r.left + FIELD.x * k}px`, top: `${r.top + FIELD.y * k}px`,
      width: `${FIELD.w * k}px`, height: `${FIELD.h * k}px`,
      fontSize: `${Math.max(16, Math.round(18 * k))}px`,
    });
  }

  removeField() {
    if (!this.field) return;
    this.scale.off('resize', this.place);
    window.removeEventListener('resize', this.place);
    window.visualViewport?.removeEventListener('resize', this.place);
    this.field.remove();
    this.field = null;
  }

  update(time) {
    this.snow.tilePositionY = -Math.floor(time * 0.03);
  }
}
