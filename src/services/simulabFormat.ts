// ─── SIMULAB v2 — Formato estándar de carrera/ruta (R-12) ───
// Capa de AUTORÍA: una vacante real → una ruta completa. Es la fuente de verdad
// que el agente-automatizador (roadmapCompiler) construye y que el sistema
// ejecuta en las 3 Etapas (R-10): E1 diagnóstico, E2 Modo A/B, E3 experiencia.
//
// v2 añade sobre el borrador v1: `motor_mapping` (puente a los motores reales:
// taskType/validator/tool/golden) y `engine_requirements` (motores faltantes que
// el sistema debe construir — auto-extensión por vacante).

import type { EngineCapability } from './engineCapabilities';
import type { VacancySkill } from './matchScorer';
import type { StageRoute } from './stageRouter';

// ─── Tipos del formato ─────────────────────────────────────────

export interface SimulabRequirement {
  requerimiento: string;
  tipo: 'tecnica' | 'herramienta' | 'blanda' | 'experiencia' | 'escolaridad';
  nivel_pedido: string;
  nivel_actual: string;
  brecha: string;
  prioridad: 'excluyente' | 'importante' | 'deseable' | 'filtro';
}

export interface SimulabTicket {
  id: string;
  ticket: string;
  dependencias: string[];
  teoria: string[];
  practica: string;
  herramientas: string[];
  motor_mapping: {
    skill?: string;          // skill de la vacante
    taskType?: string;       // engancha workflowEngine/caseGenerator
    validator?: string;      // de/ds validator
    tool?: string;           // app en DesktopShell
    golden?: number;         // golden de motor (si aplica)
    item?: string;           // clave telemetría R-11
  };
  criterio_cumplimiento: string;
}

export interface SimulabEtapas {
  etapa1: {
    prueba: SimulabQuestion[];         // prueba de diagnóstico
    umbral_modo_a: number;             // UMBRAL_MODO_A
  };
  etapa2: {
    modo_a?: { kit: string[]; entrevista_star: string[] };
    modo_b?: { plan_intensivo: SimulabTicket[] };
  };
  etapa3: {
    densidad: { pesos: Record<string, number> };
    evidencia: string[];
  };
}

export interface SimulabQuestion {
  id: string;
  skill: string;
  pregunta: string;
  correcta: string;
  peso: number;        // 0-100 contribución a la prueba
}

export interface SimulabV2 {
  formato: 'SIMULAB v2';
  schema_version: '2.0';
  id: string;
  vacante: { titulo: string; empresa: string; requiere_experiencia: boolean; min_years: number };
  ruta: {
    rama: 'analyst' | 'engineering' | 'science' | 'accounting';
    arco_id?: string;
    task_types: string[];
  };
  analisis_requerimientos: SimulabRequirement[];
  motor_mapping: { skill: string; capability: EngineCapability }[];
  engine_requirements: EngineCapability[];   // motores por construir
  etapas: SimulabEtapas;
  simulador_laboral: { tickets: SimulabTicket[]; reglas: string[]; proyecto_integrador: string };
  entrevista: { tecnica: string[]; conductual: string[] };
  criterios_listo_para_vacante: string[];
}

// ─── Validación del formato ────────────────────────────────────

export interface SimulabValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSimulabV2(doc: SimulabV2): SimulabValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (doc.formato !== 'SIMULAB v2' || doc.schema_version !== '2.0') {
    errors.push('Formato/schema no reconocido; se espera SIMULAB v2 (2.0)');
  }
  if (!doc.id) errors.push('Falta id');
  if (!doc.vacante?.titulo) errors.push('Falta vacante.titulo');

  // Cada skill del motor_mapping debe resolverse a una capacidad con motor.
  const seenTaskTypes = new Set<string>();
  for (const m of doc.motor_mapping || []) {
    const cap = m.capability;
    if (!cap) { errors.push(`motor_mapping sin capacidad para skill "${m.skill}"`); continue; }
    if (cap.status === 'missing' && !doc.engine_requirements.some(r => r.id === cap.id)) {
      warnings.push(`skill "${m.skill}" no tiene motor; falta registrarla en engine_requirements`);
    }
    (cap.taskTypes || []).forEach(t => seenTaskTypes.add(t));
  }

  // Etapa 1: la prueba debe tener preguntas con peso y respuesta.
  const prueba = doc.etapas?.etapa1?.prueba || [];
  if (!prueba.length) errors.push('etapa1.prueba vacía — no hay prueba de diagnóstico');
  for (const q of prueba) {
    if (!q.pregunta) errors.push(`Pregunta ${q.id}: falta texto`);
    if (q.peso <= 0) warnings.push(`Pregunta ${q.id}: peso 0`);
  }

  // Etapa 2: cada ticket con motor_mapping.taskType debe existir en la ruta.
  const tickets = doc.simulador_laboral?.tickets || [];
  if (!tickets.length) errors.push('simulador_laboral.tickets vacío');
  for (const t of tickets) {
    if (t.motor_mapping?.taskType && !seenTaskTypes.has(t.motor_mapping.taskType)) {
      warnings.push(`Ticket ${t.id} usa taskType "${t.motor_mapping.taskType}" sin motor mapeado`);
    }
    if (t.motor_mapping?.golden !== undefined && typeof t.motor_mapping.golden !== 'number') {
      errors.push(`Ticket ${t.id}: golden debe ser número`);
    }
  }

  // Etapa 3: debe tener pesos de densidad y evidencia.
  const pesos = doc.etapas?.etapa3?.densidad?.pesos || {};
  if (!Object.keys(pesos).length) warnings.push('etapa3.densidad.pesos vacío');
  if (!(doc.etapas?.etapa3?.evidencia || []).length) warnings.push('etapa3.evidencia vacío');

  return { valid: errors.length === 0, errors, warnings };
}

// Helper: construye un id canónico desde la vacante.
export function simId(empresa: string, puesto: string): string {
  const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `SIMULAB_${clean(empresa)}_${clean(puesto)}`.slice(0, 90);
}