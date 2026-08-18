// ─── Expediente profesional verificable (R-08) ────────────────
// Convierte el progreso real del alumno en logros cuantificados
// con fecha y datos. Alimenta el CV y el link público con sello.

import { getRoleProgress } from './progressTracker';
import { buildSkillProfile } from './skillProfile';
import { getWorld } from './simWorld';

export interface ExpedienteLogro {
  titulo: string;
  fecha: string;            // ISO
  datos: string;            // detalle cuantificado
  categoria: string;        // facturacion | datos | calidad | incidente | proyecto
  verificable: boolean;     // tiene datos duros que un reclutador puede checar
}

export interface Expediente {
  userId: string;
  specialty: string;
  branch: string;
  logros: ExpedienteLogro[];
  resumen: {
    totalTareas: number;
    scorePromedio: number;
    racha: number;
    horasInvertidas: number;
    trampasDetectadas: number;
    incidentesResueltos: number;
  };
}

// Mapeo para títulos legibles por categoría
const TITULO_POR_TIPO: Record<string, string> = {
  sql_query: 'Consulta SQL de ventas por cliente',
  etl_pipeline: 'Pipeline ETL de transformación de datos',
  data_quality: 'Validación de calidad de datos',
  incident_recovery: 'Diagnóstico y recuperación de pipeline',
  code_review: 'Code review con detección de errores',
  airflow_dag: 'Orquestación de DAG en Airflow',
  soporte_datos: 'Atención a solicitudes de datos',
  invoice_emission: 'Emisión de factura CFDI',
  payment_registration: 'Registro de pagos de clientes',
  bank_reconciliation: 'Conciliación bancaria',
  tax_calculation: 'Cálculo de IVA mensual',
  payroll: 'Cálculo de nómina',
  journal_entry: 'Pólizas de diario',
  supplier_invoice: 'Registro de facturas de proveedores',
  eda_churn: 'Análisis exploratorio de datos (churn)',
  modelo_baseline: 'Modelo baseline de ML',
  eval_metricas: 'Evaluación de métricas de modelo',
};

function categoriaDe(taskType: string): string {
  if (['sql_query', 'etl_pipeline', 'data_quality', 'code_review', 'airflow_dag', 'soporte_datos', 'ontology_modeling'].includes(taskType)) return 'datos';
  if (['eda_churn', 'modelo_baseline', 'eval_metricas'].includes(taskType)) return 'datos';
  if (taskType === 'incident_recovery') return 'incidente';
  if (['invoice_emission', 'payment_registration', 'supplier_invoice', 'tax_calculation', 'payroll', 'journal_entry', 'bank_reconciliation', 'cash_cut', 'credit_note', 'ap_reconciliation', 'payment_scheduling', 'cfdi_reception'].includes(taskType)) return 'facturacion';
  return 'proyecto';
}

export async function buildExpediente(userId: string, specialty: string): Promise<Expediente> {
  const progress = await getRoleProgress(userId, specialty, 9999);
  const skills = await buildSkillProfile(userId, specialty);
  const completions = progress.recentCompletions || [];

  const logros: ExpedienteLogro[] = [];

  for (const c of completions) {
    // Solo tareas aprobadas cuentan como logro verificable
    if (!c.passed || c.score < 70) continue;

    const base = {
      fecha: c.completedAt,
      categoria: categoriaDe(c.taskType),
      verificable: true,
    };

    // Logros especiales: trampas detectadas
    if (c.isTrap && c.trapDetected) {
      logros.push({
        ...base,
        titulo: `Detección de error intencional en ${TITULO_POR_TIPO[c.taskType] || c.title}`,
        datos: `Identificó y corrigió un error premeditado (${c.feedback || 'trampa detectada'}) con score ${c.score}%.`,
      });
      continue;
    }

    // Logro normal
    logros.push({
      ...base,
      titulo: TITULO_POR_TIPO[c.taskType] || c.title,
      datos: `Completó "${c.title}" con score ${c.score}% (${c.timeSpent} min).`,
    });
  }

  // Incidente del pipeline (mundo simulado) — solo si está recuperado
  const world = await getWorld(userId);
  if (world.pipeline?.status === 'recovered') {
    logros.push({
      titulo: 'Recuperación del pipeline lno_sales_pipeline',
      fecha: world.pipeline.recoveredAt || new Date().toISOString(),
      datos: 'Diagnosticó y resolvió la falla de dbt_test (positive(total_ventas)) del 05-jul; SLA del mart restablecido.',
      categoria: 'incidente',
      verificable: true,
    });
  }

  // Ordenar por fecha (más recientes primero) y limitar a 20
  logros.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const topLogros = logros.slice(0, 20);

  const totalHoras = Math.round(completions.reduce((s, c) => s + c.timeSpent, 0) / 60 * 10) / 10;

  return {
    userId,
    specialty,
    branch: skills.branch,
    logros: topLogros,
    resumen: {
      totalTareas: completions.length,
      scorePromedio: progress.avgScore || 0,
      racha: progress.streak || 0,
      horasInvertidas: totalHoras,
      trampasDetectadas: completions.filter(c => c.isTrap && c.trapDetected).length,
      incidentesResueltos: world.pipeline?.status === 'recovered' ? 1 : 0,
    },
  };
}

// ─── Link de verificación ─────────────────────────────────────

export interface VerificationLink {
  slug: string;
  userId: string;
  active: boolean;
  createdAt: string;
  revokedAt?: string | null;
}

export function generateSlug(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
