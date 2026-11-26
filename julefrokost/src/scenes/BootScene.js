// Henter al grafik og opretter animationer. Viser en simpel indlæsningsbjælke.

import { GAME_W, GAME_H } from '../config.js';
import { FISHERS } from '../data/fishers.js';
import { LEVELS } from '../data/levels.js';
import { THEMES } from '../data/entities.js';
import * as Save from '../systems/save.js';

export const THEME_KEYS = [...new Set(LEVELS.map((l) => l.theme))];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const g = this.add.graphics();
    const bar = (v) => {
      g.clear();
      g.fillStyle(0x7a4a18, 1).fillRect(GAME_W / 2 - 122, GAME_H / 2 - 10, 244, 20);
      g.fillStyle(0x14203a, 1).fillRect(GAME_W / 2 - 120, GAME_H / 2 - 8, 240, 16);
      g.fillStyle(0xf2c418, 1).fillRect(GAME_W / 2 - 118, GAME_H / 2 - 6, 236 * v, 12);
    };
    bar(0);
    this.load.on('progress', bar);
    this.load.on('loaderror', (file) => console.error('Kunne ikke hente', file.key, file.url));

    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    for (const t of THEME_KEYS) {
      for (const layer of ['sky', 'far', 'mid', 'ground', 'pit']) this.load.image(`${t}_${layer}`, `assets/bg/${t}_${layer}.png`);
      if (THEMES[t]?.midFrames === 2) this.load.image(`${t}_mid2`, `assets/bg/${t}_mid2.png`);
    }
    this.load.image('snow', 'assets/bg/snow.png');
    this.load.image('map', 'assets/bg/map.png');
    this.load.image('secret', 'assets/bg/secret.png');
    // ai-workshop, afsenderen
    this.load.image('brand_mark24', 'assets/brand/mark24.png');
    this.load.image('brand_mark40', 'assets/brand/mark40.png');
    this.load.image('brand_word96', 'assets/brand/wordmark96.png');
    this.load.image('brand_word120', 'assets/brand/wordmark120.png');
    for (const f of ['ui', 'ui_o', 'big_o', 'small', 'small_o']) this.load.bitmapFont(f, `assets/fonts/${f}.png`, `assets/fonts/${f}.xml`);
  }

  create() {
    const frames = (...names) => names.map((frame) => ({ key: 'atlas', frame }));
    const loop = (key, names, frameRate) => this.anims.create({ key, frames: frames(...names), frameRate, repeat: -1 });
    for (const f of FISHERS) {
      loop(`${f.id}_run`, [`fisher/${f.id}/run0`, `fisher/${f.id}/run1`], 9);
      loop(`${f.id}_swim`, [`fisher/${f.id}/swim0`, `fisher/${f.id}/swim1`], 6);
    }
    loop('due_walk', ['due/walk0', 'due/walk1'], 6);
    loop('due_fly', ['due/fly0', 'due/fly1'], 8);
    loop('cat_walk', ['enemy/cat0', 'enemy/cat1'], 6);
    loop('dog_walk', ['enemy/dog0', 'enemy/dog1'], 7);
    loop('scooter', ['enemy/scooter0', 'enemy/scooter1'], 6);
    loop('bike', ['enemy/bike0', 'enemy/bike1'], 8);
    loop('gull_fly', ['enemy/gull0', 'enemy/gull1'], 5);
    loop('goose_walk', ['enemy/goose0', 'enemy/goose1'], 6);
    loop('dozer', ['enemy/dozer0', 'enemy/dozer1'], 8);
    loop('boss_fly', ['boss/0', 'boss/1'], 5);
    loop('drone', ['enemy/drone0', 'enemy/drone1'], 16);
    loop('dolly', ['enemy/dolly0', 'enemy/dolly1'], 8);
    loop('rocker_walk', ['enemy/rocker0', 'enemy/rocker1'], 4);
    loop('shark', ['enemy/shark0', 'enemy/shark1'], 6);
    loop('jelly', ['enemy/jelly0', 'enemy/jelly1'], 4);
    loop('nudist_run', ['enemy/nudist0', 'enemy/nudist1'], 8);
    loop('kite_fly', ['enemy/kite0', 'enemy/kite1'], 4);
    loop('guitar_walk', ['enemy/guitar0', 'enemy/guitar1'], 5);
    loop('bather_dance', ['enemy/bather0', 'enemy/bather1'], 4);

    // Spillet er klar: ai-workshops logo fra index.html må gå
    if (typeof window.__hideSplash === 'function') window.__hideSplash();

    // Kun topscorerlisten kan åbnes direkte: ?scene=Scores.
    const q = new URLSearchParams(window.location.search);
    this.scene.start(q.get('scene') === 'Scores' ? 'Scores' : 'Title');
  }
}
