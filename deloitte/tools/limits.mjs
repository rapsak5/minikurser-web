// Regner serverens grænser ud fra banerne: højeste mulige point og hvor lang tid en bane tager.
// Kør: node deloitte/tools/limits.mjs   og sæt resultatet ind i LIMITS i server/worker.js.
import { LEVELS, buildLevel } from '../src/data/levels.js';
import { entityDef } from '../src/data/entities.js';
import { SCORE, COMBO, TUNING } from '../src/config.js';

const out = {};
for (const l of LEVELS) {
  const b = buildLevel(l);
  let base = 0;
  let shot = false;
  for (const s of b.spawns) {
    const d = entityDef(s.type, l.theme);
    if (s.type === 'b') base += SCORE.pickup;
    else if (s.type === 'h') base += 500;
    else if (s.type === 's') shot = true;
    else if (d.kind === 'enemy' && d.hittable) base += Math.max(d.score || 100, ...(d.variants || []).map((v) => v.score || 0));
  }
  const max = base * COMBO.max * (shot ? 2 : 1) + TUNING.maxHearts * SCORE.heartBonus + SCORE.perfect + SCORE.allPickups;
  const [s0, s1] = l.speed;
  const sec = (b.width / (s1 - s0)) * Math.log(s1 / s0);
  out[l.id] = { max: Math.ceil((max * 1.1) / 100) * 100, sec: Math.round(sec) };
}
console.log('const LIMITS = ' + JSON.stringify(out, null, 2).replace(/"(\w+)":/g, '$1:') + ';');
