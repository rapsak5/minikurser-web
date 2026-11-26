// Tjek ind: skriv dit navn, vælg din løber og vælg din afdeling.
// Navn og afdeling er det, der står på topscorerlisten, og afdelingen tæller i afdelingskampen.
//
// Navnefeltet er et almindeligt HTML-felt lagt oven på canvas, så mobilens tastatur
// virker som normalt. Det flyttes med, når spillet skaleres.

import { GAME_W, GAME_H, NAME_MAX, RUNNERS, COUNTRIES, DEFAULT_COUNTRY, runnerId, isCountry } from '../config.js';
import { txt, panel, button, C, overlayRoot } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Scores from '../systems/scores.js';
import { checkName, cleanName, liveName } from '../systems/names.js';
import { sfx } from '../systems/audio.js';

const FIELD = { x: 34, y: 62, w: 300, h: 32 };
const CELL_X = (i) => 62 + i * 62;
const DEP_X = (i) => 48 + i * 39;   // otte afdelinger på række

export default class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.25);
    txt(this, 30, 22, 'TJEK IND', { font: 'big_o', scale: 2, ox: 0, tint: C.yellow });
    txt(this, 172, 26, 'FØR JULEFROKOSTEN', { font: 'small_o', ox: 0, tint: C.soft });

    // 1 navn
    txt(this, 30, 48, '1  DIT NAVN', { font: 'small_o', ox: 0, tint: C.soft });
    panel(this, FIELD.x - 4, FIELD.y - 4, FIELD.w + 8, FIELD.h + 8, { fill: C.night });
    this.help = txt(this, 30, 106, 'DIT NAVN KOMMER PÅ TOPSCORERLISTEN. ALLE KAN SE DET.', { font: 'small', ox: 0, tint: C.soft });
    this.makeField();

    // 2 løber
    txt(this, 30, 124, '2  VÆLG LØBER', { font: 'small_o', ox: 0, tint: C.soft });
    const s = Save.load();
    this.rIndex = Math.max(0, RUNNERS.findIndex((r) => r.id === runnerId(s.runner)));
    this.cIndex = Math.max(0, COUNTRIES.findIndex((c) => c.id === (isCountry(s.country) ? s.country : DEFAULT_COUNTRY)));
    this.frame = this.add.graphics();
    RUNNERS.forEach((r, i) => {
      this.add.image(CELL_X(i), 166, 'atlas', `portrait/${r.id}/office`);
      this.add.zone(CELL_X(i), 166, 60, 64).setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx('click'); this.pick(i, this.cIndex); });
    });

    // 3 afdeling
    txt(this, 30, 208, '3  VÆLG AFDELING', { font: 'small_o', ox: 0, tint: C.soft });
    COUNTRIES.forEach((c, i) => {
      this.add.rectangle(DEP_X(i), 248, 35, 56, C.panel);
      this.add.image(DEP_X(i), 242, 'atlas', `flag/${c.id}`);
      const lab = txt(this, DEP_X(i), 266, c.short, { font: 'small_o', ox: 0 });
      lab.setX(Math.round(DEP_X(i) - lab.width / 2));   // hele pixels, ellers tegnes bogstaverne skævt
      this.add.zone(DEP_X(i), 248, 38, 60).setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx('click'); this.pick(this.rIndex, i); });
    });
    txt(this, 30, 290, 'DINE POINT TÆLLER FOR DIN AFDELING I AFDELINGSKAMPEN.', { font: 'small', ox: 0, tint: C.soft });

    // højre side: dig selv
    panel(this, 360, 44, 256, 304);
    this.preview = this.add.sprite(440, 250, 'atlas', 'runner/r1/office/run0').setOrigin(0.375, 1).setScale(2);
    this.nameTxt = txt(this, 488, 70, '', { font: 'big_o', scale: 2 });
    this.flag = this.add.image(488, 102, 'atlas', 'flag/KU').setScale(1.5);
    this.countryTxt = txt(this, 488, 126, '', { font: 'small_o', tint: C.soft });
    this.go = button(this, 488, 314, 220, 38, 'LØB!', () => this.confirm(), { color: C.green });

    this.pick(this.rIndex, this.cIndex);
    this.refreshName();
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.pick((this.rIndex + RUNNERS.length - 1) % RUNNERS.length, this.cIndex));
    kb?.on('keydown-RIGHT', () => this.pick((this.rIndex + 1) % RUNNERS.length, this.cIndex));
    kb?.on('keydown-ENTER', () => this.confirm());

    this.events.once('shutdown', () => this.removeField());
    this.events.once('destroy', () => this.removeField());
  }

  makeField() {
    const el = document.createElement('input');
    el.type = 'text';
    el.id = 'name-field';
    el.maxLength = NAME_MAX;
    el.placeholder = 'Skriv dit fornavn';
    el.autocomplete = 'given-name';
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.spellcheck = false;
    el.setAttribute('enterkeyhint', 'done');
    el.value = Save.load().name || '';
    Object.assign(el.style, {
      position: 'fixed', zIndex: 10, boxSizing: 'border-box', margin: 0, padding: '0 10px',
      border: 'none', outline: 'none', borderRadius: 0, background: '#0b1026', color: '#f6f1e6',
      caretColor: '#c73028', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', textAlign: 'center',
      userSelect: 'text', webkitUserSelect: 'text', touchAction: 'manipulation',
    });
    // Tastetryk i feltet må ikke nå spillets styring.
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
    overlayRoot().appendChild(el);
    this.field = el;
    this.place = () => this.placeField();
    // går spillet i eller ud af fuldskærm, flyttes feltet med, så det stadig kan trykkes på
    this.onFullscreen = () => {
      const root = overlayRoot();
      if (this.field && this.field.parentNode !== root) root.appendChild(this.field);
      this.placeField();
    };
    this.scale.on('resize', this.place);
    window.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('resize', this.place);
    document.addEventListener('fullscreenchange', this.onFullscreen);
    document.addEventListener('webkitfullscreenchange', this.onFullscreen);
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
      fontSize: `${Math.max(16, Math.round(20 * k))}px`,
    });
  }

  removeField() {
    if (!this.field) return;
    this.scale.off('resize', this.place);
    window.removeEventListener('resize', this.place);
    window.visualViewport?.removeEventListener('resize', this.place);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreen);
    this.field.remove();
    this.field = null;
  }

  refreshName() {
    const name = cleanName(this.field?.value || '');
    this.nameTxt.setText(name ? name.toUpperCase() : '???');
    this.help.setText('DIT NAVN KOMMER PÅ TOPSCORERLISTEN. ALLE KAN SE DET.').setTint(C.soft);
  }

  pick(r, c) {
    this.rIndex = r;
    this.cIndex = c;
    const g = this.frame.clear();
    g.lineStyle(3, C.yellow, 1).strokeRect(CELL_X(r) - 28, 136, 56, 60);
    g.lineStyle(3, C.yellow, 1).strokeRect(DEP_X(c) - 18, 219, 36, 58);
    this.preview.play(`${RUNNERS[r].id}_office_run`);
    this.flag.setFrame(`flag/${COUNTRIES[c].id}`);
    this.countryTxt.setText(`HOLD ${COUNTRIES[c].name.toUpperCase()}`);
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
    Save.setRunner(RUNNERS[this.rIndex].id);
    Save.setCountry(COUNTRIES[this.cIndex].id);
    Scores.sync();
    sfx('flag');
    this.field?.blur();
    // første gang går turen gennem øvebanen
    if (first) this.scene.start('Level', { tutorial: true });
    else this.scene.start('Map');
  }

  update(time) { this.snow.tilePositionY = -Math.floor(time * 0.03); }
}
