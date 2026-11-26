// Henter al grafik og opretter animationer. Viser en simpel indlæsningsbjælke.

import { GAME_W, GAME_H, RUNNERS } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { THEMES } from '../data/entities.js';

export const BG_KEYS = [...new Set(LEVELS.map((l) => THEMES[l.theme].bg))];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const g = this.add.graphics();
    const bar = (v) => {
      g.clear();
      g.fillStyle(0x161222, 1).fillRect(GAME_W / 2 - 122, GAME_H / 2 - 10, 244, 20);
      g.fillStyle(0x141838, 1).fillRect(GAME_W / 2 - 120, GAME_H / 2 - 8, 240, 16);
      g.fillStyle(0x86bc25, 1).fillRect(GAME_W / 2 - 118, GAME_H / 2 - 6, 236 * v, 12);
    };
    bar(0);
    this.load.on('progress', bar);
    this.load.on('loaderror', (file) => console.error('Kunne ikke hente', file.key, file.url));

    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    for (const t of BG_KEYS) {
      for (const layer of ['sky', 'far', 'mid', 'ground', 'pit']) this.load.image(`${t}_${layer}`, `assets/bg/${t}_${layer}.png`);
    }
    this.load.image('party_mid2', 'assets/bg/party_mid2.png');
    for (const k of ['snow', 'map', 'title', 'hq', 'banner', 'cut_taxi', 'cut_suit', 'cut_bar']) this.load.image(k, `assets/bg/${k}.png`);
    this.load.image('avatar', 'assets/avatar.png');   // Kasper som tegnet avatar (ikke pixelgrafik)
    for (const f of ['ui', 'ui_o', 'big_o', 'small', 'small_o']) this.load.bitmapFont(f, `assets/fonts/${f}.png`, `assets/fonts/${f}.xml`);
  }

  create() {
    this.textures.get('avatar').setFilter(Phaser.Textures.FilterMode.LINEAR);   // blød skalering, resten er skarpe pixels
    const frames = (...names) => names.map((frame) => ({ key: 'atlas', frame }));
    const loop = (key, names, frameRate) => this.anims.create({ key, frames: frames(...names), frameRate, repeat: -1 });
    for (const r of RUNNERS) {
      for (const o of ['office', 'xmas']) loop(`${r.id}_${o}_run`, [`runner/${r.id}/${o}/run0`, `runner/${r.id}/${o}/run1`], 9);
    }
    for (const [key, rate] of [['bike', 8], ['cargo', 7], ['dogwalk', 5], ['colleague', 4], ['colleague2_', 4], ['colleague3_', 4], ['colleague4_', 4], ['printer', 12], ['chair', 5], ['copier', 6], ['conga', 4], ['guest', 3], ['waiter', 6]]) {
      loop(key, [`enemy/${key}0`, `enemy/${key}1`], rate);
    }

    if (typeof window.__hideSplash === 'function') window.__hideSplash();

    // Testrobotten kan åbne en skærm eller en bane direkte: ?scene=Scores eller ?level=3
    const q = new URLSearchParams(window.location.search);
    const lvl = parseInt(q.get('level') || '', 10);
    if (lvl >= 1 && lvl <= LEVELS.length) { this.scene.start('Level', { levelIndex: lvl - 1 }); return; }
    const want = q.get('scene');
    if (want === 'Cut') { this.scene.start('Cut', { kind: q.get('kind') || 'taxi' }); return; }
    this.scene.start(['Scores', 'Select', 'Map'].includes(want) ? want : 'Title');
  }
}
