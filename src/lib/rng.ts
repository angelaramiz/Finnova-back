// ─── PRNG Determinista (mulberry32) ─────────────────────────
// Misma seed → mismo documento. Permite reproducir y verificar.
// Fuente: https://en.wikipedia.org/wiki/Multiply-with-carry

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRng<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randRng(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Genera una semilla reproducible a partir de userId + fecha sim + tipo
export function docSeed(userId: string, dateSim: string, docType: string): number {
  let hash = 0;
  const str = `${userId}:${dateSim}:${docType}`;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}
