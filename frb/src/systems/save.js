// Gemmer valgt løber, navn, land, fremskridt og bedste point på enheden (localStorage).
// Virker også, hvis lageret er spærret: så huskes tingene kun, mens siden er åben.
//
// Én spiller pr. enhed. pid er et tilfældigt id, som highscore-serveren kender spilleren på.
// Der er intet login.

import { SAVE_KEY } from '../config.js';

let mem = null;

function newId() {
  try { if (window.crypto?.randomUUID) return window.crypto.randomUUID(); } catch (e) { /* ældre browser */ }
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

function blankProgress() { return { best: {}, lost: {}, unlocked: 1, done: false }; }

function blank() {
  return { v: 1, pid: newId(), runner: null, country: null, name: '', mute: false, progress: blankProgress() };
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
  mem.progress = { ...blankProgress(), ...(mem.progress || {}) };
  return mem;
}

export function persist() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(load())); } catch (e) { /* lageret er ikke tilgængeligt */ }
}

/** Spillerens fremskridt: bedste point og færrest tabte hjerter pr. bane, og hvor mange baner der er åbne. */
export function player() { return load().progress; }

export function setRunner(id) { load().runner = id; persist(); }
export function setCountry(id) { load().country = id; persist(); }
export function setName(name) { load().name = name; persist(); }
export function hasName() { return !!load().name && !!load().country; }

export function reset() { mem = blank(); persist(); }
