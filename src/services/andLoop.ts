// ─── Bucle AND Data Analyst (P1-1, contrato congelado 2026-09-03) ───
// Compuerta AND de 2 variables:
//   1. pass_practico al 100% (tests de calificación de resultados)
//   2. decision_alumno(continuar) (el alumno se siente listo)
// + gate de quiz: racha>=1 + auto_confirma + quiz>=80.
// Racha solo con seed NO repetida (anti-farmeo); fail resetea racha y
// alimenta el quiz (quizFocus). Todo determinista por seed (mulberry32).
// Regla de oro R-09: solo lógica de compuerta, sin montos ni golden.

import { mulberry32, docSeed } from '../lib/rng';

export interface AndState {
  seedKey: string;
  racha: number;
  seedsUsed: string[];
  attempts: number;
  passedPractico: boolean;
  autoConfirma: boolean;
  quizScore: number;
  quizFocus: string[];
}

export function freshAndState(seedKey: string): AndState {
  return {
    seedKey, racha: 0, seedsUsed: [], attempts: 0,
    passedPractico: false, autoConfirma: false, quizScore: 0, quizFocus: [],
  };
}

export interface AndVariant {
  variantId: string;
  index: number;
  dataset: string;
  year: number;
  tolerance: number;
}

const VARIANT_DATASETS = ['ventas_julio', 'ventas_junio', 'ventas_mayo'];

// Variante determinista i-ésima del ejercicio: misma seed → misma variante.
export function nextVariant(seedKey: string, index: number): AndVariant {
  const rng = mulberry32(docSeed('and-loop', seedKey, String(index)));
  const dataset = VARIANT_DATASETS[Math.floor(rng() * VARIANT_DATASETS.length)];
  return {
    variantId: `${seedKey}#${index}:${dataset}`,
    index, dataset, year: 2026, tolerance: Math.floor(rng() * 3),
  };
}

export interface AttemptInput {
  variantSeed: string;
  passed: boolean; // pass práctico al 100% según el validador del ejercicio
  quizTopic?: string;
}

export function registerAttempt(state: AndState, input: AttemptInput): AndState {
  const attempts = state.attempts + 1;
  if (!input.passed) {
    const quizFocus =
      input.quizTopic && !state.quizFocus.includes(input.quizTopic)
        ? [...state.quizFocus, input.quizTopic]
        : state.quizFocus;
    return { ...state, attempts, racha: 0, passedPractico: false, quizFocus };
  }
  if (state.seedsUsed.includes(input.variantSeed)) {
    return { ...state, attempts, passedPractico: true }; // seed repetida: no farmea racha
  }
  return {
    ...state, attempts,
    racha: state.racha + 1,
    seedsUsed: [...state.seedsUsed, input.variantSeed],
    passedPractico: true,
  };
}

export function setAutoConfirma(state: AndState, ready: boolean): AndState {
  return { ...state, autoConfirma: ready };
}

export function setQuizScore(state: AndState, score: number): AndState {
  return { ...state, quizScore: Math.max(0, Math.min(100, Math.round(score))) };
}

export interface GateVerdict {
  ok: boolean;
  reasons: string[];
}

// Gate de avance: las 2 variables AND + quiz (racha>=1 + auto_confirma + quiz>=80).
export function canAdvance(state: AndState): GateVerdict {
  const reasons: string[] = [];
  if (!state.passedPractico) reasons.push('Falta el pass práctico al 100% (variable 1 de la compuerta AND).');
  if (state.racha < 1) reasons.push('Racha < 1: completa una variante con seed no repetida.');
  if (!state.autoConfirma) reasons.push('Falta tu confirmación: ¿te sientes listo para continuar? (variable 2).');
  if (state.quizScore < 80) {
    reasons.push(`Quiz ${state.quizScore}/100 < 80: repasa (${state.quizFocus.join(', ') || 'fundamentos'}).`);
  }
  return { ok: reasons.length === 0, reasons };
}
