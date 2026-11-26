// Hemmeligheden efter finalen: 10% rabat på en AI-workshop fra ai-workshop.
// Man skriver sin mail og får en personlig kode, som serveren gemmer sammen med mailen.
//
// Mailfeltet er et almindeligt HTML-felt lagt oven på canvas (som navnefeltet),
// så mobilens tastatur og autoudfyld virker som normalt.

import { GAME_W, GAME_H, PROMO, SECRET, SCORES_URL } from '../config.js';
import { txt, panel, button, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Secret from '../systems/secret.js';
import { sfx } from '../systems/audio.js';

const FIELD = { x: 140, y: 174, w: 360, h: 32 };

export default class SecretScene extends Phaser.Scene {
  constructor() { super('Secret'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.35);

    // afsender øverst
    this.add.image(14, 12, 'brand_mark40').setOrigin(0);
    this.add.image(60, 24, 'brand_word96').setOrigin(0);
    txt(this, 60, 46, 'PRÆSENTERER', { font: 'small', ox: 0, tint: C.soft });

    txt(this, GAME_W / 2, 20, 'HEMMELIGHEDEN', { font: 'small_o', scale: 2, tint: C.soft });
    const head = txt(this, GAME_W / 2, 58, SECRET.headline, { font: 'big_o', scale: 3, tint: C.yellow });
    this.tweens.add({ targets: head, scale: { from: 0.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    txt(this, GAME_W / 2, 96, SECRET.offer, { font: 'ui_o' });
    txt(this, GAME_W / 2, 116, SECRET.cap, { font: 'ui', tint: C.soft });

    panel(this, 112, 132, GAME_W - 224, 178);
    this.objs = [];
    this.buttons = [];
    this.newsletter = false;

    button(this, GAME_W / 2 - 95, 336, 180, 28, 'TOPSCORERLISTEN', () => this.scene.start('Scores'), { color: C.panel });
    button(this, GAME_W / 2 + 95, 336, 180, 28, PROMO.label, () => openUrl(PROMO.url), { color: C.green });

    const saved = Save.claim();
    const stale = saved && saved.demo && SCORES_URL;   // en testkode fra før spillet kom online
    if (saved && saved.code && !stale) this.showCode(saved);
    else this.showForm(saved && !stale ? saved.email : '');

    this.events.once('shutdown', () => this.removeField());
    this.events.once('destroy', () => this.removeField());
  }

  clear() {
    this.objs.forEach((o) => o.destroy());
    this.buttons.forEach((b) => b.destroy());
    this.objs = [];
    this.buttons = [];
    this.removeField();
  }

  keep(o) { this.objs.push(o); return o; }

  showForm(email = '') {
    this.clear();
    const cx = GAME_W / 2;
    this.keep(txt(this, cx, 154, 'Skriv din mail, så får du din personlige kode.', { font: 'ui' }));
    this.keep(panel(this, FIELD.x - 4, FIELD.y - 4, FIELD.w + 8, FIELD.h + 8, { fill: C.night }));
    this.makeField(email);

    // tilmelding til nyhedsbrevet er frivillig og står derfor ikke krydset af
    const bx = 140;
    const by = 224;
    if (Save.newsletter() === 'yes') {
      this.newsletter = true;
      this.keep(txt(this, cx, by, 'Du får allerede Tre ting om AI. Tak!', { font: 'ui', tint: C.soft }));
      this.msg = this.keep(txt(this, cx, 248, SECRET.privacy, { font: 'small', tint: C.soft }));
      this.go = button(this, cx, 282, 220, 30, 'FÅ MIN KODE', () => this.submit(), { color: C.green });
      this.buttons.push(this.go);
      return;
    }
    const box = this.keep(this.add.graphics());
    const drawBox = () => {
      box.clear();
      box.fillStyle(C.brown, 1).fillRect(bx, by - 8, 16, 16);
      box.fillStyle(C.night, 1).fillRect(bx + 2, by - 6, 12, 12);
      if (this.newsletter) box.fillStyle(C.yellow, 1).fillRect(bx + 4, by - 4, 8, 8);
    };
    drawBox();
    this.keep(txt(this, bx + 24, by, SECRET.newsletter, { font: 'ui', ox: 0, tint: C.soft }));
    this.keep(this.add.zone(bx - 6, by - 14, 360, 28).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { this.newsletter = !this.newsletter; sfx('click'); drawBox(); }));

    this.msg = this.keep(txt(this, cx, 248, SECRET.privacy, { font: 'small', tint: C.soft }));
    this.go = button(this, cx, 282, 220, 30, 'FÅ MIN KODE', () => this.submit(), { color: C.green });
    this.buttons.push(this.go);
  }

  async submit() {
    if (this.busy) return;
    const email = this.field?.value || '';
    if (!Secret.validEmail(email)) return this.fail('Det ligner ikke en mailadresse.');
    this.busy = true;
    this.go.setEnabled(false);
    this.go.setLabel('HENTER KODEN ...');
    this.field?.blur();
    const res = await Secret.claim(email, this.newsletter);
    this.busy = false;
    if (!this.sys.isActive()) return;
    if (!res.ok) {
      this.go.setEnabled(true);
      this.go.setLabel('FÅ MIN KODE');
      return this.fail(res.error);
    }
    if (this.newsletter) Save.setNewsletter('yes');
    sfx('win');
    this.showCode(res);
  }

  fail(error) {
    sfx('hurt');
    this.msg.setText(error.toUpperCase()).setTint(0xff8a8a);
    this.field?.focus();
  }

  showCode(res) {
    this.clear();
    const cx = GAME_W / 2;
    if (!res.code) {
      // mailen havde allerede en kode, og serveren har sendt den igen
      this.keep(txt(this, cx, 176, 'Den mail har allerede fået en kode.', { font: 'ui_o' }));
      this.keep(txt(this, cx, 202, 'Vi har sendt den til dig igen.', { font: 'ui', tint: C.soft }));
      this.buttons.push(button(this, cx, 270, 220, 28, 'BRUG EN ANDEN MAIL', () => this.showForm(''), { color: C.panel }));
      return;
    }
    this.keep(txt(this, cx, 152, 'DIN PERSONLIGE KODE', { font: 'small_o', tint: C.yellow }));
    this.keep(this.add.rectangle(cx, 184, 300, 40, C.night));
    const code = this.keep(txt(this, cx, 183, res.code, { font: 'big_o', scale: 2, tint: C.yellow }));
    this.tweens.add({ targets: code, alpha: { from: 0, to: 1 }, duration: 400 });
    this.keep(txt(this, cx, 236, SECRET.howTo, { font: 'ui', maxWidth: 380, center: true }));
    const note = res.sent ? `Koden er også sendt til ${res.email}.` : SECRET.validUntil;
    if (note) this.keep(txt(this, cx, 264, note, { font: 'small', tint: C.soft }));
    const copy = button(this, cx, 290, 200, 26, 'KOPIÉR KODEN', () => {
      copyText(res.code).then((ok) => copy.setLabel(ok ? 'KOPIERET!' : 'SKRIV DEN NED'));
    }, { color: C.panel });
    this.buttons.push(copy);
  }

  makeField(value) {
    const el = document.createElement('input');
    el.type = 'email';
    el.id = 'email-field';
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
    // Tastetryk i feltet må ikke nå spillets styring.
    const stop = (e) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); this.submit(); }
    };
    el.addEventListener('keydown', stop);
    el.addEventListener('keyup', stop);
    el.addEventListener('input', () => {
      if (this.msg) this.msg.setText(SECRET.privacy).setTint(C.soft);
    });
    document.body.appendChild(el);
    this.field = el;
    this.place = () => this.placeField();
    this.scale.on('resize', this.place);
    window.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('resize', this.place);
    this.placeField();
    if (!el.value && this.sys.game.device.os.desktop) setTimeout(() => el.focus(), 50);
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

export function openUrl(url) {
  try {
    const w = window.open(url, '_blank', 'noopener');
    if (!w) window.location.href = url;
  } catch (e) {
    try { window.location.href = url; } catch (e2) { /* ikke muligt her */ }
  }
}

async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch (e) { /* prøv den gamle måde */ }
  try {
    const t = document.createElement('textarea');
    t.value = s;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  } catch (e) { return false; }
}
