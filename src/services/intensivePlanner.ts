// ─── Intensive Planner — Modo B (R-10 v2 T5) ─────────────────
// Genera un plan intensivo desde el diagnóstico (Etapa 1): por cada
// skill con score < umbral selecciona la herramienta diaria real del
// puesto (vía simBlocks) y genera CASOS APLICADOS.
//
// Reglas obligatorias de caso aplicado (cada caso debe tener):
//   (a) contexto de negocio realista
//   (b) decisión con varios caminos válidos
//   (c) trampa o restricción oculta
//   (d) resultado validable por motor (workflowEngine / runDEValidator)
//   (e) reflexión "por qué decidiste así"
// PROHIBIDO el caso de "ejecuta la función básica".

import { getSimBlock, SimBlock } from './simBlocks';
import { TRAP_SCENARIOS } from './workflowEngine';

export interface AppliedCase {
  id: string;
  skill: string;
  tool: string;            // screen en DesktopShell
  context: string;         // (a) contexto de negocio realista
  decision: string;        // (b) decisión multi-camino
  trap: {                  // (c) trampa / restricción oculta
    id: string;
    description: string;
    validation: string;    // validator de motor (sql | etl_clean | ...)
  };
  validable: boolean;      // (d) validable por motor
  reflection: string;      // (e) pregunta de reflexión
  feedsNext?: string;      // encadenado: resultado alimenta el siguiente caso
}

export interface IntensivePlan {
  userId: string;
  assessmentId: string;
  cases: AppliedCase[];
  completed: boolean;
}

export const SKILL_UMBRAL_INTENSIVO = 75;

// Trampas reales disponibles para construir casos aplicados.
const TRAP_POOL = TRAP_SCENARIOS || [];

// Contextos de negocio realistas por herramienta (reutiliza el lore de R-09).
const CONTEXT_BANK: Record<string, string[]> = {
  sql: ['Ventas de la semana', 'Churn de clientes', 'Fresura del mart'],
  spreadsheet: ['Cierre de quincena', 'Conciliación mensual', 'Presupuesto departamental'],
  dbt: ['Pipeline de ventas', 'Mart de clientes', 'Ingesta nocturna'],
  notebook: ['Análisis exploratorio', 'Limpieza de dataset', 'Feature engineering'],
  pipeline: ['Ingesta de ventas', 'Transformación de clientes', 'Carga al mart'],
  airflow: ['Orquestación diaria', 'Reproceso del 05-jul', 'SLAs de mart'],
  bi: ['Tablero ejecutivo', 'Reporte de ventas', 'Análisis por sector'],
  cloud: ['Deploy de datos', 'Backup del warehouse', 'Costo del clúster'],
  accounting: ['Facturación del mes', 'Pólizas de cierre', 'IVA mensual'],
  banking: ['Conciliación bancaria', 'Cheques sin cobrar', 'Pagos de proveedores'],
  catalog: ['Calidad de catálogo', 'RFC inválidos', 'Lineage del mart'],
  monitor: ['Alertas de pipeline', 'SLA del mart', 'Incidente 05-jul'],
};

// Genera un caso aplicado para un skill con contexto de la empresa (R-09 lore).
function buildAppliedCase(skill: string, block: SimBlock, idx: number): AppliedCase {
  const trap = TRAP_POOL[idx % Math.max(TRAP_POOL.length, 1)];
  const contexts = CONTEXT_BANK[block.tool] || ['Operación del mes'];
  const context = contexts[idx % contexts.length];

  return {
    id: `applied-${skill.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
    skill,
    tool: block.tool,
    context: `La empresa de ${context}: debes entregar un resultado de negocio que impacta la operación.`,
    decision: 'Evalúa el escenario y elige entre los caminos: optimizar el proceso, corregir los datos de origen, o escalar al lead. Documenta qué harías y por qué.',
    trap: trap
      ? { id: trap.id, description: trap.description, validation: trap.taskType }
      : { id: `restriccion-${idx}`, description: 'Restricción oculta: algunos registros tienen datos incompletos que no debes perder.', validation: 'de' },
    validable: true,
    reflection: '¿Por qué elegiste ese camino? ¿Qué riesgo evitaste y qué evidencia respalda tu decisión?',
    feedsNext: undefined,
  };
}

// Genera el plan intensivo: casos encadenados por cada gap del alumno.
export function buildIntensivePlan(userId: string, assessmentId: string, gaps: string[]): IntensivePlan {
  const cases: AppliedCase[] = gaps.map((skill, idx) => {
    const block = getSimBlock(skill) || { skill, tool: 'sql', label: skill, icon: '🗃️', description: '', appSet: 'any' as const };
    return buildAppliedCase(skill, block, idx);
  });

  // Encadenar: el resultado de cada caso alimenta el siguiente
  for (let i = 0; i < cases.length - 1; i++) {
    cases[i].feedsNext = cases[i + 1].id;
  }

  return { userId, assessmentId, cases, completed: false };
}

// Verifica que un caso cumple las 5 reglas obligatorias (para tests).
export function auditAppliedCase(c: AppliedCase): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  if (!c.context || c.context.trim().length < 10) failed.push('contexto');
  if (!c.decision || c.decision.trim().length < 10) failed.push('decision');
  if (!c.trap || !c.trap.description) failed.push('trampa');
  if (!c.validable) failed.push('validable');
  if (!c.reflection || c.reflection.trim().length < 10) failed.push('reflexion');
  return { ok: failed.length === 0, failed };
}