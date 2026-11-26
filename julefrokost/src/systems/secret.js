// Hemmeligheden: en personlig rabatkode til ai-workshop mod en mailadresse.
//
// Serverens API (server/worker-public.js):
//   POST /claim { pid, email, newsletter } -> { ok, code, sent } eller { ok: false, error }
// Serveren giver kun en kode, hvis spilleren har klaret alle baner, og kun én kode pr. mail.

import { SCORES_URL } from '../config.js';
import * as Save from './save.js';
import * as Scores from './scores.js';

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

export function cleanEmail(raw) { return String(raw || '').trim().toLowerCase().slice(0, 254); }
export function validEmail(raw) { return EMAIL.test(cleanEmail(raw)); }

const ERRORS = {
  email: 'Det ligner ikke en mailadresse.',
  notdone: 'Klar alle tretten baner først.',
  taken: 'Den mail har allerede fået en kode.',
  limit: 'Der er hentet nok koder fra denne enhed.',
  name: 'Vælg først et navn på kortet.',
  slow: 'For mange forsøg. Prøv igen i morgen.',
};

/** Henter (eller genfinder) koden. Returnerer { ok, code, sent } eller { ok: false, error }. */
export async function claim(rawEmail, newsletter) {
  const email = cleanEmail(rawEmail);
  if (!validEmail(email)) return { ok: false, error: ERRORS.email };
  if (!SCORES_URL) return { ok: false, error: 'Koderne er ikke klar endnu. Prøv igen senere.' };
  try {
    await Scores.sync();   // serveren skal have alle ventende resultater først
    const r = await fetch(`${SCORES_URL}/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: Save.load().pid, email, newsletter: !!newsletter }),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.ok) {
      if (data.error === 'taken' && data.sent) return { ok: true, code: null, sent: true, email };
      return { ok: false, error: ERRORS[data.error] || 'Noget gik galt. Prøv igen om lidt.' };
    }
    const res = { ok: true, code: data.code, sent: !!data.sent, email };
    Save.setClaim(res);
    return res;
  } catch (e) {
    return { ok: false, error: 'Ingen forbindelse. Prøv igen om lidt.' };
  }
}
