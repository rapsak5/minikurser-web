// Fælles konstanter. Alt, der skal justeres på spilfølelsen, står i TUNING.
// Nå julefrokosten (FRB+) er en kopi af Late for the Party (Deloitte-spillet) med FRB+ tema og afdelingskamp.

export const VERSION = '0.1.0';
export const TITLE = 'Nå julefrokosten';

// Spillets interne opløsning. Skaleres op til skærmen med skarpe pixels.
export const GAME_W = 640;
export const GAME_H = 360;

export const GROUND_Y = 300;        // jordlinjen (løberens fødder)
export const COL = 48;              // bredden på én kolonne i banerne
export const PLAYER_SCREEN_X = 150; // hvor på skærmen løberen er

// De tre højder, ting kan stå i (se src/data/levels.js)
export const ROW_Y = {
  hi: GROUND_Y - 118,   // kræver et hop
  mid: GROUND_Y - 62,   // hovedhøjde: slide under eller sig "Excuse me"
  lo: GROUND_Y,         // på jorden
};

export const TUNING = {
  gravity: 1500,
  jumpV: -600,            // giver ca. 120 px hophøjde og 0,8 sek. i luften
  fastFallV: 720,         // swipe ned i luften
  coyoteMs: 90,
  jumpBufferMs: 130,
  slideMs: 560,
  swingMs: 300,           // hvor længe "Excuse me!" vises
  swingActiveMs: 200,     // hvor længe det virker
  swingCooldownMs: 340,
  invulnMs: 800,
  shotMs: 6000,           // snaps: dobbelt point og ombyttet styring
  maxHearts: 3,           // tre julehjerter
  beersForSuper: 10,      // ti ting i træk fylder måleren: SUPER EXCUSE ME
};

export const SCORE = {
  pickup: 100,
  heartBonus: 250,        // pr. julehjerte, når banen er klaret
  perfect: 2000,          // ingen hjerter tabt på banen
  allPickups: 1500,       // alt samlet op
};

// Combo: hver COMBO.step ting i træk uden at blive ramt lægger én til gangeren, op til COMBO.max.
export const COMBO = { step: 8, max: 5 };

// Uret. Julefrokosten på FRB+ er fredag 4. december 2026 kl. 14.30.
// Spillet starter 14:00, hver bane tager 3 minutter, og hvert tabt hjerte koster 20 sekunder.
// Ni baner giver 14:27. Man når julefrokosten til tiden med højst ni tabte hjerter i alt.
export const CLOCK = {
  startMin: 14 * 60,
  perLevelMin: 3,
  hitSec: 20,
  deadlineMin: 14 * 60 + 30,
  onTimeBonus: 5000,      // for at nå frem senest 14:30
  earlyBonus: 1000,       // pr. 20 sekunder, man er foran
};

export const DEPTH = { sky: 0, far: 1, landmark: 1.5, mid: 2, ground: 5, pit: 6, ent: 10, player: 20, fx: 30, snow: 40 };

export const PROMO = {
  presents: 'En julegave fra Kasper',
  credit: 'EN JULEGAVE FRA KASPER',
  disclaimer: 'GOD JULEFROKOST 4/12',
  url: '',
};

// Afdelingerne i afdelingskampen (Campusadministration Frederiksberg+, om.ku.dk) og Resten af KU.
// Internt hedder feltet stadig country, så server og gemte data er de samme som i Deloitte-spillet.
// short er det, der står under ikonet. Ikonerne tegnes i tools/build_assets.py (frames flag/<id>).
export const COUNTRIES = [
  { id: 'BYG', name: 'Bygninger', short: 'BYG' },
  { id: 'FIN', name: 'Forskningsfinansiering', short: 'FORSK' },
  { id: 'HR', name: 'HR', short: 'HR' },
  { id: 'IT', name: 'IT-support', short: 'IT' },
  { id: 'KOM', name: 'Kommunikation', short: 'KOM' },
  { id: 'UDD', name: 'Uddannelse', short: 'UDD' },
  { id: 'OKO', name: 'Økonomi', short: 'ØKO' },
  { id: 'KU', name: 'Resten af KU', short: 'KU' },
];
export const DEFAULT_COUNTRY = 'KU';
export const CUP_TOP = 10;   // afdelingskampen: gennemsnittet af de 10 bedste i hver afdeling
export function isCountry(id) { return COUNTRIES.some((c) => c.id === id); }

// De fem løbere. id skal matche framenavnene i atlasset (runner/<id>/<tøj>/..., portrait/<id>/<tøj>).
export const RUNNERS = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }, { id: 'r5' }];
export const DEFAULT_RUNNER = 'r1';
export function isRunner(id) { return RUNNERS.some((r) => r.id === id); }
export function runnerId(id) { return isRunner(id) ? id : DEFAULT_RUNNER; }

// Fælles topscorerliste: adressen på Cloudflare Workeren i server/worker.js. Tom = kun egne point.
export const SCORES_URL = '';   // sættes, når Workeren frb-julespil-scores kører

export const NAME_MAX = 12;
export const CHECKPOINTS = true;
export const SAVE_KEY = 'frb-julespil-v1';
