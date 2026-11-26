// Gemmer valgt fisker, navn, fremskridt og bedste point på enheden (localStorage).
// Virker også, hvis lageret er spærret: så huskes tingene kun, mens siden er åben.
//
// Offentlig udgave: én spiller pr. enhed. Fremskridtet følger spilleren, ikke fiskeren,
// så man kan skifte udseende uden at miste sine baner. pid er et tilfældigt id, som
// highscore-serveren kender spilleren på. Der er intet login.

import { SAVE_KEY } from '../config.js';

let mem = null;

function newId() {
  try { if (window.crypto?.randomUUID) return window.crypto.randomUUID(); } catch (e) { /* ældre browser */ }
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

function blank() {
  return { v: 2, pid: newId(), fisher: null, name: '', mute: false, progress: { best: {}, unlocked: 1, done: false } };
}

export function load() {
  if (mem) return mem;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    mem = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch (e) {
    mem = blank();
  }
  if (!mem.pid) mem.pid = newId();
  if (!mem.progress) mem.progress = { best: {}, unlocked: 1, done: false };
  return mem;
}

export function persist() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(load())); } catch (e) { /* lageret er ikke tilgængeligt */ }
}

/** Spillerens fremskridt: bedste point pr. bane og hvor mange baner der er åbne. Argumentet bruges ikke længere. */
export function player() { return load().progress; }

export function setFisher(id) { load().fisher = id; persist(); }
export function setName(name) { load().name = name; persist(); }
export function hasName() { return !!load().name; }

export function reset() { mem = blank(); persist(); }

/** Rabatkoden fra hemmeligheden, hvis spilleren har fået en: { code, email, sent }. */
export function claim() { return load().claim || null; }
export function setClaim(c) { load().claim = c; persist(); }

/** Nyhedsbrevet: 'yes' (tilmeldt), 'no' (sagde nej tak halvvejs) eller null (ikke spurgt endnu). */
export function newsletter() { return load().newsletter || null; }
export function setNewsletter(v) { load().newsletter = v; persist(); }
