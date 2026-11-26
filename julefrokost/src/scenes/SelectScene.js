// Første skærm efter titlen: skriv dit navn og vælg din fisker.
// Navnet er det, der står på den offentlige topscorerliste.
//
// Navnefeltet er et almindeligt HTML-felt lagt oven på canvas, så mobilens tastatur
// virker som normalt. Det flyttes med, når spillet skaleres.

import { GAME_W, GAME_H, NAME_MAX } from '../config.js';
import { FISHERS, fisherById } from '../data/fishers.js';
import { txt, panel, button, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Scores from '../systems/scores.js';
import { checkName, cleanName, liveName } from '../systems/names.js';
import { sfx } from '../systems/audio.js';

const FIELD = { x: GAME_W / 2 - 130, y: 58, w: 260, h: 34 };

export default class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    txt(this, GAME_W / 2, 26, 'HVEM ER DU?', { font: 'big_o', scale: 2, tint: C.yellow });

    // navnefeltet: en ramme i spillet og et HTML-felt ovenpå
    panel(this, FIELD.x - 4, FIELD.y - 4, FIELD.w + 8, FIELD.h + 8, { fill: C.night });
    this.help = txt(this, GAME_W / 2, 110, 'NAVNET KOMMER PÅ TOPSCORERLISTEN. ALLE KAN SE DET.', { font: 'small', tint: C.soft });
    this.makeField();

    txt(this, GAME_W / 2, 136, 'VÆLG DIN FISKER', { font: 'small_o', scale: 2, tint: C.yellow });
    const saved = fisherById(Save.load().fisher).id;
    this.index = Math.max(0, FISHERS.findIndex((f) => f.id === saved));
    this.frame = this.add.graphics();
    this.cells = FISHERS.map((f, i) => {
      const x = 59 + i * 87;
      this.add.image(x, 186, 'atlas', `portrait/${f.id}`);
      this.add.zone(x, 186, 84, 70).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        sfx('click');
        this.select(i);
      });
      return { x };
    });

    panel(this, 110, 232, GAME_W - 220, 118);
    this.preview = this.add.sprite(200, 336, 'atlas', `fisher/${saved}/run0`).setOrigin(0.375, 1);
    this.nameTxt = txt(this, 280, 262, '', { font: 'big_o', scale: 2, ox: 0 });
    this.go = button(this, 400, 314, 200, 34, 'SPIL', () => this.confirm());

    this.select(this.index);
    this.refreshName();
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.select((this.index + FISHERS.length - 1) % FISHERS.length));
    kb?.on('keydown-RIGHT', () => this.select((this.index + 1) % FISHERS.length));
    kb?.on('keydown-ENTER', () => this.confirm());

    this.events.once('shutdown', () => this.removeField());
    this.events.once('destroy', () => this.removeField());
  }

  makeField() {
    const el = document.createElement('input');
    el.type = 'text';
    el.id = 'name-field';
    el.maxLength = NAME_MAX;
    el.placeholder = 'Skriv dit navn';
    el.autocomplete = 'nickname';
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.spellcheck = false;
    el.setAttribute('enterkeyhint', 'done');
    el.value = Save.load().name || '';
    Object.assign(el.style, {
      position: 'fixed', zIndex: 10, boxSizing: 'border-box', margin: 0, padding: '0 10px',
      border: 'none', outline: 'none', borderRadius: 0, background: '#0b1224', color: '#f6f1e6',
      caretColor: '#f2c418', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', textAlign: 'center',
      userSelect: 'text', webkitUserSelect: 'text', touchAction: 'manipulation',
    });
    // Tastetryk i feltet må ikke nå spillets styring (ellers kan mellemrum, W og S blive "spist").
    const stop = (e) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); el.blur(); this.confirm(); }
    };
    el.addEventListener('keydown', stop);
    el.addEventListener('keyup', stop);
    el.addEventListener('input', () => {
      const live = liveName(el.value);
      if (el.value !== live) el.value = live;
      this.refreshName();
    });
    document.body.appendChild(el);
    this.field = el;
    this.place = () => this.placeField();
    this.scale.on('resize', this.place);
    window.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('resize', this.place);
    this.placeField();
    // først gang: sæt markøren i feltet på computer. På mobil åbner tastaturet først ved tryk.
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
      fontSize: `${Math.max(16, Math.round(20 * k))}px`,
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

  refreshName() {
    const name = cleanName(this.field?.value || '');
    this.nameTxt.setText(name ? name.toUpperCase() : '???');
    this.help.setText('NAVNET KOMMER PÅ TOPSCORERLISTEN. ALLE KAN SE DET.').setTint(C.soft);
  }

  select(i) {
    this.index = i;
    const f = FISHERS[i];
    const c = this.cells[i];
    this.frame.clear().lineStyle(2, C.yellow, 1).strokeRect(c.x - 30, 154, 60, 64);
    this.preview.play(`${f.id}_run`);
  }

  confirm() {
    const res = checkName(this.field?.value || '');
    if (!res.ok) {
      sfx('hurt');
      this.help.setText(res.error.toUpperCase()).setTint(0xff8a8a);
      this.field?.focus();
      return;
    }
    const first = !Save.load().tutorialDone;
    Save.setName(res.name);
    Save.setFisher(FISHERS[this.index].id);
    Scores.sync();
    sfx('flag');
    this.field?.blur();
    // første gang går turen gennem øvebanen
    if (first) this.scene.start('Level', { tutorial: true });
    else this.scene.start('Map');
  }
}
