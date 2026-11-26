// De syv fiskere, man kan vælge imellem. id skal matche framenavnene i atlasset
// (fisher/<id>/..., portrait/<id>). I den offentlige udgave har de ingen navne:
// spilleren skriver selv sit navn, og det er det, der står på topscorerlisten.

export const FISHERS = [
  { id: 'f1' },
  { id: 'f2' },
  { id: 'f3' },
  { id: 'f4' },
  { id: 'f5' },
  { id: 'f6' },
  { id: 'f7' },
];

export const DEFAULT_FISHER = 'f7';

export function isFisher(id) { return FISHERS.some((f) => f.id === id); }

export function fisherById(id) {
  return FISHERS.find((f) => f.id === id) || FISHERS.find((f) => f.id === DEFAULT_FISHER);
}
