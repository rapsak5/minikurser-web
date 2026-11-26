// Små byggesten til menuer og HUD: tekst, paneler og knapper i spillets stil.
//
// Fonte (bitmap, skarpe pixels):
//   ui / ui_o       VT323, 20 px (o = med mørk kant, til tekst oven på grafik)
//   big_o           Jersey 10, 20 px med kant, til overskrifter (brug scale 2 eller 3)
//   small / small_o Silkscreen 8 px, kun store bogstaver
// Brug hele skaleringer (1, 2, 3), ellers bliver pixels ujævne.

import { sfx } from '../systems/audio.js';

export const C = {
  navy: 0x1d2a44, deep: 0x14203a, night: 0x0b1224, panel: 0x263659,
  gold: 0xe8b040, goldHi: 0xffe08a, brown: 0x7a4a18,
  red: 0xc0302a, green: 0x3a9a4a, paper: 0xf6f1e6, yellow: 0xf2c418, soft: 0xd9e0ee, grey: 0x7a8296,
};

export const BASE = { ui: 20, ui_o: 20, big_o: 20, small: 8, small_o: 8 };

export function txt(scene, x, y, str, o = {}) {
  const font = o.font || 'ui_o';
  const t = scene.add.bitmapText(x, y, font, str, BASE[font] * (o.scale || 1));
  t.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.tint != null) t.setTint(o.tint);
  if (o.maxWidth) t.setMaxWidth(o.maxWidth);
  if (o.center) t.setCenterAlign();
  if (o.depth != null) t.setDepth(o.depth);
  return t;
}

/** Panel med guldkant. x, y er øverste venstre hjørne. */
export function panel(scene, x, y, w, h, o = {}) {
  const g = scene.add.graphics();
  g.fillStyle(C.brown, 1).fillRect(x, y, w, h);
  g.fillStyle(o.edge ?? C.gold, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(C.goldHi, 1).fillRect(x + 2, y + 2, w - 4, 2);
  g.fillStyle(o.fill ?? C.navy, o.alpha ?? 1).fillRect(x + 4, y + 4, w - 8, h - 8);
  if (o.depth != null) g.setDepth(o.depth);
  return g;
}

/** Knap. x, y er midten. Returnerer { zone, label, setEnabled, destroy }. */
export function button(scene, x, y, w, h, label, onClick, o = {}) {
  const g = scene.add.graphics();
  const draw = (pressed, enabled = true) => {
    g.clear();
    g.fillStyle(C.brown, 1).fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(enabled ? (o.color ?? C.red) : C.grey, 1).fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4);
    if (!pressed) g.fillStyle(0xffffff, 0.25).fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, 2);
    if (pressed) g.fillStyle(0x000000, 0.2).fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4);
  };
  draw(false);
  const t = txt(scene, x, y - 1, label, { font: o.font || 'ui_o', scale: o.scale || 1 });
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  let enabled = true;
  zone.on('pointerdown', () => { if (enabled) draw(true); });
  zone.on('pointerout', () => draw(false, enabled));
  zone.on('pointerup', () => {
    if (!enabled) return;
    draw(false);
    sfx('click');
    onClick();
  });
  if (o.depth != null) { g.setDepth(o.depth); t.setDepth(o.depth + 1); zone.setDepth(o.depth + 2); }
  return {
    zone, label: t, g,
    setEnabled(v) { enabled = v; draw(false, v); },
    setLabel(s) { t.setText(s); },
    destroy() { g.destroy(); t.destroy(); zone.destroy(); },
  };
}

export function pad(n, len = 6) { return String(Math.max(0, Math.floor(n))).padStart(len, '0'); }

/** Halvgennemsigtig mørk baggrund til overlays. */
export function dim(scene, alpha = 0.6) {
  return scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, C.night, alpha).setOrigin(0);
}
