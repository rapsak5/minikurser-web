// Julefrokost på Amager: spillet (offentlig udgave). Startfil.
// Phaser 4 hentes som almindeligt script (vendor/phaser.min.js) og ligger i window.Phaser.

import { GAME_W, GAME_H, VERSION } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import SelectScene from './scenes/SelectScene.js';
import MapScene from './scenes/MapScene.js';
import LevelScene from './scenes/LevelScene.js';
import HudScene from './scenes/HudScene.js';
import QuizScene from './scenes/QuizScene.js';
import ResultScene from './scenes/ResultScene.js';
import FinaleScene from './scenes/FinaleScene.js';
import ScoresScene from './scenes/ScoresScene.js';
import SecretScene from './scenes/SecretScene.js';
import NewsletterScene from './scenes/NewsletterScene.js';
import { unlock } from './systems/audio.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  title: 'Julefrokost på Amager',
  version: VERSION,
  banner: false,
  backgroundColor: '#0b1224',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { activePointers: 3 },
  // Rækkefølgen bestemmer, hvad der tegnes øverst: HUD og overlays ligger efter banen.
  scene: [BootScene, TitleScene, SelectScene, MapScene, LevelScene, HudScene, QuizScene, ResultScene, FinaleScene, SecretScene, NewsletterScene, ScoresScene],
});

// Lyd må først starte efter et tryk. Prøv ved hvert første input.
for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { passive: true });

