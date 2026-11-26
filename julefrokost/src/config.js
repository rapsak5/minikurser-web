// Fælles konstanter. Alt, der skal justeres på spilfølelsen, står i TUNING.

export const VERSION = '0.11.0-pub';

// Offentlig udgave til promovering. Alle kan spille, vælge fisker og skrive et navn.

// Spillets interne opløsning. Skaleres op til skærmen med skarpe pixels.
export const GAME_W = 640;
export const GAME_H = 360;

export const GROUND_Y = 300;        // jordlinjen (fiskerens fødder)
export const COL = 48;              // bredden på én kolonne i banerne
export const PLAYER_SCREEN_X = 150; // hvor på skærmen fiskeren løber

// De tre højder, ting kan stå i (se src/data/levels.js)
export const ROW_Y = {
  hi: GROUND_Y - 118,   // kræver et hop
  mid: GROUND_Y - 62,   // hovedhøjde: slide under eller slå
  lo: GROUND_Y,         // på jorden
};

// Under vand (Den Blå Planet) er de tre rækker tre svømmebaner i disse højder
export const SWIM_Y = { hi: 104, mid: 176, lo: 248 };

export const TUNING = {
  gravity: 1500,
  jumpV: -600,            // giver ca. 120 px hophøjde og 0,8 sek. i luften
  fastFallV: 720,         // swipe ned i luften
  coyoteMs: 90,           // man kan stadig hoppe lige efter kanten
  jumpBufferMs: 130,      // et hop lige før landing huskes
  slideMs: 560,
  swingMs: 260,           // hvor længe slaget vises
  swingActiveMs: 190,     // hvor længe slaget rammer
  swingCooldownMs: 340,
  invulnMs: 700,          // usårlig efter et slag (900 før 25/11)
  shotMs: 6000,           // så længe giver et shot dobbelt point og ombyttet styring
  maxHearts: 4,
  beersForSuper: 10,
};

export const SCORE = {
  beer: 100,
  quiz: 500,
  heartBonus: 250,        // pr. hjerte, når banen er klaret
  bossHit: 1000,
  boss: 3000,
};

export const DEPTH = { sky: 0, far: 1, mid: 2, ground: 5, pit: 6, ent: 10, boss: 15, player: 20, fx: 30, snow: 40 };

// Afsender og reklame. Vises på forsiden, topscorerlisten, slutskærmen og hemmeligheden.
export const PROMO = {
  presents: 'ai-workshop præsenterer',
  credit: 'Et spil fra ai-workshop.dk',
  url: 'https://ai-workshop.dk',
  label: 'AI-WORKSHOP.DK',
  teaser: 'KLAR HELE AMAGER OG LÅS HEMMELIGHEDEN OP',
};

// Hemmeligheden i slutningen: en personlig rabatkode mod en mailadresse.
// Koden laves af serveren (server/worker-public.js, POST /claim) og gemmes sammen med mailen.
// Kræver at alle baner er klaret. Ret teksterne her, hvis tilbuddet ændrer sig.
export const SECRET = {
  headline: '10% RABAT',
  offer: 'på en workshop fra ai-workshop',
  cap: 'Højst 2.000 kr. i rabat. Én kode pr. mail.',
  validUntil: '',   // fx 'Gælder workshops bestilt senest 30. juni 2027'. Tom = vises ikke.
  newsletter: 'Ja tak til nyhedsbrevet Tre ting om AI',
  privacy: 'Mailen bruges kun til din kode og, hvis du siger ja, til nyhedsbrevet.',
  howTo: 'Skriv koden, når du booker en workshop på ai-workshop.dk.',
};

// Nyhedsbrevet Tre ting om AI. Spillet spørger én gang, halvvejs, efter banen med index atLevel
// (6 = Søndre Campus, bane 7). Tilmelding går til serveren (POST /subscribe) og videre til Brevo.
export const NEWSLETTER = {
  atLevel: 6,
  name: 'Tre ting om AI',
  headline: 'HALVVEJS!',
  lead: 'Mens du puster ud: få nyhedsbrevet Tre ting om AI.',
  pitch: 'Tre korte AI-nyheder hver anden uge.',
  promise: 'Seneste nummer med det samme. Afmeld når som helst.',
  privacy: 'Mailen bruges kun til nyhedsbrevet.',
  yes: 'JA TAK, TILMELD MIG',
  no: 'NEJ TAK, SPIL VIDERE',
  thanks: 'Du er skrevet op til Tre ting om AI.',
};

// Fælles topscorerliste og rabatkoder: adressen på Cloudflare Workeren i server/worker-public.js.
export const SCORES_URL = 'https://amager-spil-scores.stemplerind.workers.dev';

// Navne på listen
export const NAME_MAX = 12;

// Checkpoints i banerne. false = en bane skal klares i ét hug, ellers starter man forfra.
export const CHECKPOINTS = true;

export const SAVE_KEY = 'amager-spil-offentlig-v1';
