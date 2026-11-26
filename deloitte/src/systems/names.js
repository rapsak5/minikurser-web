// Navne til topscorerlisten. Samme regler gælder på serveren (server/worker-public.js).
// Kun tegn, som spillets bitmapfonte kan vise. Højst NAME_MAX tegn.

import { NAME_MAX } from '../config.js';

const ALLOWED = /[^A-Za-z0-9ÆØÅæøåÉé .\-_!']/g;

// Groft filter mod de mest oplagte grimme ord. Listen er bevidst kort; resten klares ved,
// at Kasper kan slette et navn på serveren (se README).
// SUB rammer også inde i ord. WORD rammer kun hele ord (ellers ville fx "Spike" blive stoppet af "pik").
const SUB = ['fuck', 'fisse', 'kusse', 'luder', 'neger', 'nigger', 'nigga', 'perker', 'hitler', 'nazi', 'cunt', 'whore', 'retard', 'spasser', 'kneppe', 'porno', 'bøsserøv'];
const WORD = ['pik', 'sex', 'lort', 'røv', 'bøsse', 'dick', 'cock', 'ass', 'shit'];

/** Mens man skriver: fjern tegn, der ikke kan vises, men rør ikke ved mellemrum. */
export function liveName(raw) {
  let s = String(raw || '').normalize('NFC');
  // æ, ø, å og é bevares. Andre accenter (ä, ü, ñ ...) bliver til grundbogstavet.
  s = s.replace(/[^\u0000-\u007fÆØÅæøåÉé]/g, (ch) => ch.normalize('NFD').replace(/\p{M}/gu, ''));
  return s.replace(ALLOWED, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, NAME_MAX);
}

/** Det færdige navn. */
export function cleanName(raw) {
  return liveName(raw).trim();
}

export function isBlocked(name) {
  const leet = (s) => s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
  const low = leet(name.toLowerCase());
  const flat = low.replace(/[^a-zæøåé]/g, '');
  const words = low.split(/[^a-zæøåé]+/).filter(Boolean);
  return SUB.some((w) => flat.includes(w)) || WORD.some((w) => flat === w || words.includes(w));
}

/** Returnerer { ok, name, error }. */
export function checkName(raw) {
  const name = cleanName(raw);
  if (name.length < 2) return { ok: false, name, error: 'Type at least 2 letters.' };
  if (isBlocked(name)) return { ok: false, name, error: 'Please try another name.' };
  return { ok: true, name };
}
