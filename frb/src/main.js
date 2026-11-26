// Nå julefrokosten (FRB+): startfil.
// Phaser 4 hentes som almindeligt script (vendor/phaser.min.js) og ligger i window.Phaser.

import { GAME_W, GAME_H, VERSION } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import SelectScene from './scenes/SelectScene.js';
import MapScene from './scenes/MapScene.js';
import LevelScene from './scenes/LevelScene.js';
import HudScene from './scenes/HudScene.js';
import ResultScene from './scenes/ResultScene.js';
import CutScene from './scenes/CutScene.js';
import ScoresScene from './scenes/ScoresScene.js';
import { unlock } from './systems/audio.js';

window.__game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  title: 'Nå julefrokosten',
  version: VERSION,
  banner: false,
  backgroundColor: '#0b1026',
  pixelArt: true,
  roundPixels: true,   // alt på hele pixels, ellers tegnes centreret tekst skævt, når spillet skaleres på telefonen
  // Fuldskærm (Android, når man trykker START) gælder hele #game, så navnefeltet, der ligger i #game, er med i fuldskærmen.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H, fullscreenTarget: 'game' },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { activePointers: 3 },
  // Rækkefølgen bestemmer, hvad der tegnes øverst: HUD og overlays ligger efter banen.
  scene: [BootScene, TitleScene, SelectScene, MapScene, LevelScene, HudScene, ResultScene, CutScene, ScoresScene],
});

// Lyd må først starte efter et tryk. Prøv ved hvert første input.
for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { passive: true });
