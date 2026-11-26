// Tilmelding til nyhedsbrevet Tre ting om AI.
//
// Serverens API (server/worker-public.js):
//   POST /subscribe { pid, email, source } -> { ok, synced } eller { ok: false, error }
// Serveren gemmer mailen og lægger den på Brevo-listen. Spillet spørger kun én gang halvvejs.

import { SCORES_URL, NEWSLETTER } from '../config.js';
import * as Save from './save.js';
import { cleanEmail, validEmail } from './secret.js';

const ERRORS = {
  email: 'Det ligner ikke en mailadresse.',
  slow: 'For mange forsøg. Prøv igen i morgen.',
};

/** Skal spillet spørge nu? Kun efter halvvejsbanen og kun én gang. */
export function shouldAsk(levelIndex) {
  return !!SCORES_URL && levelIndex === NEWSLETTER.atLevel && !Save.newsletter();
}

export async function subscribe(rawEmail, source = 'halvvejs') {
  const email = cleanEmail(rawEmail);
  if (!validEmail(email)) return { ok: false, error: ERRORS.email };
  try {
    const r = await fetch(`${SCORES_URL}/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: Save.load().pid, email, source }),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.ok) return { ok: false, error: ERRORS[data.error] || 'Noget gik galt. Prøv igen om lidt.' };
    Save.setNewsletter('yes');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Ingen forbindelse. Prøv igen om lidt.' };
  }
}
