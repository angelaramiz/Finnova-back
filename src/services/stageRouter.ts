// ─── Stage Router — Etapa 1 (R-10 v2) ─────────────────────────
// Decide la etapa/modo a partir del match_pct y si la vacante exige
// experiencia comprobable. Lógica PURA (testeable sin IO).
//
//   if (vacante.requires_experience && density < UMBRAL_DENSIDAD) → ETAPA_3
//   else if (match_pct >= UMBRAL_MODO_A)                          → ETAPA_2_MODO_A
//   else                                                           → ETAPA_2_MODO_B

import { UMBRAL_MODO_A } from './matchScorer';

export const UMBRAL_DENSIDAD = 0.5;

export type StageRoute = 'ETAPA_2_MODO_A' | 'ETAPA_2_MODO_B' | 'ETAPA_3';

export interface RouteInput {
  match_pct: number;
  requires_experience: boolean;
  experience_density: number;  // 0-1 (density normalizada; 0 si sin datos)
}

export function routeStage(input: RouteInput): StageRoute {
  if (input.requires_experience && input.experience_density < UMBRAL_DENSIDAD) {
    return 'ETAPA_3';
  }
  if (input.match_pct >= UMBRAL_MODO_A) {
    return 'ETAPA_2_MODO_A';
  }
  return 'ETAPA_2_MODO_B';
}