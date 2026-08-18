// ─── Práctica a la medida / refuerzo (R-08 Fase 3) ───────────
// Detecta habilidades bajas en el perfil y asigna micro-ejercicios
// concretos (SQL, pandas, dbt, calidad, contable) para reforzarlas.
// Cada recomendación tiene evidencia (qué habilidad, qué score, qué hacer).

import { buildSkillProfile } from './skillProfile';

export interface EjercicioRefuerzo {
  id: string;
  habilidad: string;          // id de la dimensión (p. ej. 'sql')
  label: string;              // nombre legible
  scoreActual: number;
  nivelObjetivo: 'Básico' | 'Intermedio' | 'Avanzado';
  tipo: 'sql' | 'python' | 'calidad' | 'contable' | 'ds';
  titulo: string;
  instrucciones: string;
  evidenciaEsperada: string;  // qué debe producir el alumno como evidencia
}

export interface PlanRefuerzo {
  userId: string;
  specialty: string;
  practicaPct: number;
  recomendaciones: EjercicioRefuerzo[];
  prioridad: 'refuerzo' | 'avanzar';
}

const UMBRAL_REFUERZO = 65; // habilidad < 65 → recomendar refuerzo

// Catálogo de micro-ejercicios por dimensión
const EJERCICIOS: Record<string, Omit<EjercicioRefuerzo, 'id' | 'habilidad' | 'label' | 'scoreActual'>[]> = {
  sql: [
    { nivelObjetivo: 'Intermedio', tipo: 'sql', titulo: 'Total de ventas por cliente con GROUP BY', instrucciones: 'Escribe una consulta que sume total por cliente_id usando GROUP BY. Evita el error de SUM sin agrupar.', evidenciaEsperada: 'Query + resultado con n filas (una por cliente)' },
    { nivelObjetivo: 'Avanzado', tipo: 'sql', titulo: 'JOIN ventas + clientes con agregación', instrucciones: 'Une ventas con clientes y calcula el total por ciudad con JOIN + GROUP BY.', evidenciaEsperada: 'Query + resultado agrupado por ciudad' },
  ],
  calidad: [
    { nivelObjetivo: 'Intermedio', tipo: 'calidad', titulo: 'Decisión sobre RFC inválidos', instrucciones: 'Hay 500 registros con RFC inválido. Documenta tu decisión: investigar, corregir o escalar — no ignorar.', evidenciaEsperada: 'Decisión documentada con plan de acción' },
    { nivelObjetivo: 'Intermedio', tipo: 'calidad', titulo: 'Validar nulos en stg_ventas', instrucciones: 'Identifica los campos con nulos y define una regla de imputación o rechazo.', evidenciaEsperada: 'Regla de calidad escrita' },
  ],
  etl: [
    { nivelObjetivo: 'Intermedio', tipo: 'python', titulo: 'Imputar nulos con fillna en vez de dropna', instrucciones: 'Escribe un pipeline que impute los 200 registros con nulos (fillna con media) en lugar de eliminarlos.', evidenciaEsperada: 'Código + conteo de filas conservadas' },
  ],
  orquestacion: [
    { nivelObjetivo: 'Básico', tipo: 'python', titulo: 'Definir un DAG simple con schedule', instrucciones: 'Escribe la definición de un DAG con una tarea que se ejecute diario a las 8:00.', evidenciaEsperada: 'Código del DAG + schedule' },
  ],
  facturacion: [
    { nivelObjetivo: 'Intermedio', tipo: 'contable', titulo: 'Factura con IVA correcto (16%)', instrucciones: 'Calcula el IVA de una factura de $50,000 usando la tasa correcta del 16%.', evidenciaEsperada: 'Subtotal, IVA y total correctos' },
  ],
  conciliacion: [
    { nivelObjetivo: 'Intermedio', tipo: 'contable', titulo: 'Conciliar con cheque sin cobrar', instrucciones: 'Identifica la diferencia de $3,500 y regístrala como cheque en tránsito.', evidenciaEsperada: 'Conciliación que cuadra' },
  ],
  fiscal: [
    { nivelObjetivo: 'Intermedio', tipo: 'contable', titulo: 'Cálculo de IVA mensual', instrucciones: 'Con ingresos gravados de $120,000 y compras de $40,000, calcula el IVA por pagar.', evidenciaEsperada: 'IVA trasladado, acreditable y saldo' },
  ],
  ml: [
    { nivelObjetivo: 'Básico', tipo: 'ds', titulo: 'Split 80/20 y baseline', instrucciones: 'Define el split train/test 80/20 y entrena un baseline simple para el caso churn.', evidenciaEsperada: 'Accuracy y RMSE del baseline' },
  ],
};

export async function buildPlanRefuerzo(userId: string, specialty: string): Promise<PlanRefuerzo> {
  const skills = await buildSkillProfile(userId, specialty);

  const recomendaciones: EjercicioRefuerzo[] = [];
  for (const skill of skills.skills) {
    if (skill.score >= UMBRAL_REFUERZO) continue;
    const catalogo = EJERCICIOS[skill.id];
    if (!catalogo || catalogo.length === 0) continue;
    // Elige el ejercicio cuyo nivel objetivo sea el siguiente nivel del alumno
    const siguiente = catalogo.find(e => e.nivelObjetivo !== skill.level) || catalogo[0];
    recomendaciones.push({
      id: `ref-${skill.id}-${recomendaciones.length}`,
      habilidad: skill.id,
      label: skill.label,
      scoreActual: skill.score,
      ...siguiente,
    });
  }

  return {
    userId,
    specialty,
    practicaPct: skills.overall,
    recomendaciones: recomendaciones.slice(0, 4),
    prioridad: recomendaciones.length > 0 ? 'refuerzo' : 'avanzar',
  };
}
