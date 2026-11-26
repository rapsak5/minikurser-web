// Tjek ind: skriv dit navn, vælg din løber og vælg dit land.
// Navn og land er det, der står på topscorerlisten, og landet tæller i landekampen.
//
// Navnefeltet er et almindeligt HTML-felt lagt oven på canvas, så mobilens tastatur
// virker som normalt. Det flyttes med, når spillet skaleres.

import { GAME_W, GAME_H, NAME_MAX, RUNNERS, COUNTRIES, DEFAULT_COUNTRY, runnerId, isCountry } from '../config.js';
import { txt, panel, button, C } from '../game/ui.js';
import * as Save from '../systems/save.js';
import * as Scores from '../systems/scores.js';
import { checkName, cleanName, liveName } from '../systems/names.js';
import { sfx } from '../systems/audio.js';

const FIELD = { x: 34, y: 62, w: 300, h: 32 };
const CELL_X = (i) => 62 + i * 62;

export default class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, C.deep).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.25);
    txt(this, 30, 22, 'CHECK IN', { font: 'big_o', scale: 2, ox: 0, tint: C.yellow });
    txt(this, 172, 26, 'BEFORE THE PARTY', { font: 'small_o', ox: 0, tint: C.soft });

    // 1 navn
    txt(this, 30, 48, '1  YOUR NAME', { font: 'small_o', ox: 0, tint: C.soft });
    panel(this, FIELD.x - 4, FIELD.y - 4, FIELD.w + 8, FIELD.h + 8, { fill: C.night });
    this.help = txt(this, 30, 106, 'YOUR NAME GOES ON THE LEADERBOARD. EVERYONE CAN SEE IT.', { font: 'small', ox: 0, tint: C.soft });
    this.makeField();

    // 2 løber
    txt(this, 30, 124, '2  PICK YOUR RUNNER', { font: 'small_o', ox: 0, tint: C.soft });
    const s = Save.load();
    this.rIndex = Math.max(0, RUNNERS.findIndex((r) => r.id === runnerId(s.runner)));
    this.cIndex = Math.max(0, COUNTRIES.findIndex((c) => c.id === (isCountry(s.country) ? s.country : DEFAULT_COUNTRY)));
    this.frame = this.add.graphics();
    RUNNERS.forEach((r, i) => {
      this.add.image(CELL_X(i), 166, 'atlas', `portrait/${r.id}/office`);
      this.add.zone(CELL_X(i), 166, 60, 64).setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx('click'); this.pick(i, this.cIndex); });
    });

    // 3 land
    txt(this, 30, 208, '3  PICK YOUR COUNTRY', { font: 'small_o', ox: 0, tint: C.soft });
    COUNTRIES.forEach((c, i) => {
      this.add.rectangle(CELL_X(i), 248, 54, 56, C.panel);
      this.add.image(CELL_X(i), 242, 'atlas', `flag/${c.id}`).setScale(1.5);
      txt(this, CELL_X(i), 266, c.id, { font: 'small_o' });
      this.add.zone(CELL_X(i), 248, 60, 60).setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx('click'); this.pick(this.rIndex, i); });
    });
    txt(this, 30, 290, 'YOUR POINTS COUNT FOR YOUR COUNTRY IN THE COUNTRY CUP.', { font: 'small', ox: 0, tint: C.soft });

    // højre side: dig selv
    panel(this, 360, 44, 256, 304);
    this.preview = this.add.sprite(440, 250, 'atlas', 'runner/r1/office/run0').setOrigin(0.375, 1).setScale(2);
    this.nameTxt = txt(this, 488, 70, '', { font: 'big_o', scale: 2 });
    this.flag = this.add.image(488, 102, 'atlas', 'flag/DK').setScale(1.5);
    this.countryTxt = txt(this, 488, 126, '', { font: 'small_o', tint: C.soft });
    this.go = button(this, 488, 314, 220, 38, "LET'S GO!", () => this.confirm(), { color: C.green });

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
    el.placeholder = 'Type your first name';
    el.autocomplete = 'given-name';
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.spellcheck = false;
    el.setAttribute('enterkeyhint', 'done');
    el.value = Save.load().name || '';
    Object.assign(el.style, {
      position: 'fixed', zIndex: 10, boxSizing: 'border-box', margin: 0, padding: '0 10px',
      border: 'none', outline: 'none', borderRadius: 0, background: '#0b1026', color: '#f6f1e6',
      caretColor: '#86bc25', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', textAlign: 'center',
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
    this.help.setText('YOUR NAME GOES ON THE LEADERBOARD. EVERYONE CAN SEE IT.').setTint(C.soft);
  }

  pick(r, c) {
    this.rIndex = r;
    this.cIndex = c;
    const g = this.frame.clear();
    g.lineStyle(3, C.yellow, 1).strokeRect(CELL_X(r) - 28, 136, 56, 60);
    g.lineStyle(3, C.yellow, 1).strokeRect(CELL_X(c) - 28, 219, 56, 58);
    this.preview.play(`${RUNNERS[r].id}_office_run`);
    this.flag.setFrame(`flag/${COUNTRIES[c].id}`);
    this.countryTxt.setText(`TEAM ${COUNTRIES[c].name.toUpperCase()}`);
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
