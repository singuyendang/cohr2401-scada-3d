/**
 * Smooth periodic micro-perturbation generator (2-4s natural drift waves)
 * scaled by Sandbox noiseAmplitudePct (0..300%, default 100%).
 *
 * Baseline amplitudes at 100%:
 *  - Pressure (bar):  ±0.04 bar
 *  - Pressure (kPa):  ±0.6 kPa
 *  - Pressure (Pa):   ±4.0 Pa
 *  - Temperature:     ±0.15 °C
 *  - Flow / Load:     ±1.5% relative
 */

function tagHash(tag: string): number {
  let h = 2166136261;
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

export function sensorPerturbation(
  tag: string,
  simTimeSec: number,
  baseAmplitude: number,
  noiseAmplitudePct: number
): number {
  if (noiseAmplitudePct <= 0 || baseAmplitude === 0) return 0;
  const scale = noiseAmplitudePct / 100;
  const seed = tagHash(tag);
  const phase1 = (seed % 97) * 0.13;
  const phase2 = (seed % 53) * 0.27;
  // Two incommensurate waves with periods ~3.1s and ~7.3s produce natural plant ripple every 2-4s
  const wave =
    0.65 * Math.sin((2 * Math.PI * simTimeSec) / 3.2 + phase1) +
    0.35 * Math.sin((2 * Math.PI * simTimeSec) / 7.5 + phase2);
  return wave * baseAmplitude * scale;
}
