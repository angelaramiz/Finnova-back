// ─── Task Planner v2 — Separación limpia por especialidad ──────
// Cada especialidad tiene sus propias semanas, tareas y trampas.

import { SPECIALTIES, getSpecialty, type Specialty } from './specialties';

export type TaskCategory = string;

export interface PlannedTask {
  id: string;
  title: string;
  type: string;
  difficulty: number;
  time: number;
  week: number;
  day: number;
  priority: 'critica' | 'alta' | 'media' | 'baja';
  category: string;
  description: string;
  emailSubject: string;
  emailFrom: string;
  isTrap?: boolean;
  trapId?: string;
  trapDescription?: string;
  expectedMistake?: string;
}

export interface WeekPlan {
  week: number;
  theme: string;
  tasks: PlannedTask[];
  totalHours: number;
}

export interface MonthPlan {
  month: number;
  year: number;
  specialty: string;
  tasks: PlannedTask[];
  weekPlans: WeekPlan[];
  summary: {
    totalTasks: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<number, number>;
    trapCount: number;
    estimatedHours: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function r(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Templates de tareas por especialidad ─────────────────────

const ACCOUNTING_TASK_TEMPLATES: Record<string, (ctx: any) => PlannedTask> = {
  invoice_emission: (ctx) => ({
    id: generateTaskId(), title: `Factura a ${ctx.client.name}`, type: 'invoice_emission',
    difficulty: 1, time: 10, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'facturacion', description: `Emitir CFDI 4.0 a ${ctx.client.name} por servicios de transporte`,
    emailSubject: `Solicitud de factura — ${ctx.client.name}`, emailFrom: 'Lic. Gómez',
  }),
  payment_registration: (ctx) => ({
    id: generateTaskId(), title: `Pago de ${ctx.client.name}`, type: 'payment_registration',
    difficulty: 1, time: 8, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'cobranza', description: `Registrar pago recibido de ${ctx.client.name}`,
    emailSubject: `Pago de factura — ${ctx.client.name}`, emailFrom: ctx.client.name,
  }),
  supplier_invoice: (ctx) => ({
    id: generateTaskId(), title: `CFDI de ${ctx.supplier}`, type: 'supplier_invoice',
    difficulty: 1, time: 8, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'compras', description: `Registrar factura de ${ctx.supplier}`,
    emailSubject: `Factura — ${ctx.supplier}`, emailFrom: ctx.supplier,
  }),
  bank_reconciliation: (ctx) => ({
    id: generateTaskId(), title: 'Conciliación bancaria', type: 'bank_reconciliation',
    difficulty: 2, time: 20, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'banco', description: 'Conciliar movimientos bancarios contra registros internos',
    emailSubject: 'Estado de cuenta — Julio 2026', emailFrom: 'Banco Norte',
  }),
  tax_calculation: (ctx) => ({
    id: generateTaskId(), title: 'Cálculo de IVA mensual', type: 'tax_calculation',
    difficulty: 2, time: 25, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'fiscal', description: 'Calcular IVA trasladado, acreditable y saldo por pagar',
    emailSubject: 'Cálculo IVA mensual — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  payroll: (ctx) => ({
    id: generateTaskId(), title: 'Nómina quincenal', type: 'payroll',
    difficulty: 2, time: 30, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'nomina', description: 'Calcular nómina de 4 empleados con retenciones',
    emailSubject: 'Cálculo nómina quincenal — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  journal_entry: (ctx) => ({
    id: generateTaskId(), title: 'Póliza de diario', type: 'journal_entry',
    difficulty: 2, time: 15, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'cierre', description: 'Registrar póliza contable de ajuste',
    emailSubject: 'Póliza de ajuste — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  credit_note: (ctx) => ({
    id: generateTaskId(), title: `Nota de crédito — ${ctx.client.name}`, type: 'credit_note',
    difficulty: 2, time: 12, week: ctx.week, day: ctx.day, priority: 'baja',
    category: 'facturacion', description: `Emitir nota de crédito a ${ctx.client.name}`,
    emailSubject: `Solicitud nota de crédito — ${ctx.client.name}`, emailFrom: ctx.client.name,
  }),
  cash_cut: (ctx) => ({
    id: generateTaskId(), title: 'Corte de caja', type: 'cash_cut',
    difficulty: 2, time: 15, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'cierre', description: 'Realizar corte de caja del turno matutino',
    emailSubject: 'Corte de caja diario', emailFrom: 'Lic. Gómez',
  }),
  depreciation: (ctx) => ({
    id: generateTaskId(), title: 'Depreciación de activos', type: 'depreciation',
    difficulty: 2, time: 20, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'activos', description: 'Calcular depreciación mensual de equipo',
    emailSubject: 'Depreciación mensual — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  financial_statements: (ctx) => ({
    id: generateTaskId(), title: 'Estados financieros', type: 'financial_statements',
    difficulty: 3, time: 45, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'reportes', description: 'Generar Balance General y Estado de Resultados',
    emailSubject: 'Reportes financieros — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  payment_scheduling: (ctx) => ({
    id: generateTaskId(), title: 'Programación de pagos', type: 'payment_scheduling',
    difficulty: 1, time: 10, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'banco', description: 'Programar dispersión de pagos a proveedores',
    emailSubject: 'Programación de pagos — Semana', emailFrom: 'Tesorería',
  }),
  ap_reconciliation: (ctx) => ({
    id: generateTaskId(), title: 'Conciliación AP', type: 'ap_reconciliation',
    difficulty: 2, time: 20, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'conciliacion', description: 'Verificar facturas de proveedores registradas',
    emailSubject: 'Conciliación AP — Julio 2026', emailFrom: 'Lic. Gómez',
  }),
  cfdi_reception: (ctx) => ({
    id: generateTaskId(), title: 'Verificación de CFDI', type: 'cfdi_reception',
    difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'media',
    category: 'fiscal', description: 'Verificar CFDI recibidos de proveedores',
    emailSubject: 'Verificación CFDI — Julio 2026', emailFrom: 'Sistema',
  }),
};

const DE_TASK_TEMPLATES: Record<string, (ctx: any) => PlannedTask> = {
  sql_query: (ctx) => ({
    id: generateTaskId(), title: 'Consulta SQL — Análisis de datos', type: 'sql_query',
    difficulty: ctx.difficulty || 1, time: ctx.difficulty === 1 ? 15 : 25, week: ctx.week, day: ctx.day,
    priority: 'alta', category: 'sql', description: 'Escribir y optimizar consultas SQL',
    emailSubject: 'Solicitud de consulta SQL', emailFrom: 'Ing. Sandra Mora',
  }),
  etl_pipeline: (ctx) => ({
    id: generateTaskId(), title: 'Pipeline ETL — Transformación', type: 'etl_pipeline',
    difficulty: ctx.difficulty || 2, time: ctx.difficulty === 1 ? 20 : 30, week: ctx.week, day: ctx.day,
    priority: 'alta', category: 'etl', description: 'Crear o mantener pipeline ETL',
    emailSubject: 'Tarea de pipeline ETL', emailFrom: 'Ing. Sandra Mora',
  }),
  data_quality: (ctx) => ({
    id: generateTaskId(), title: 'Calidad de datos — Validación', type: 'data_quality',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'data_quality', description: 'Revisar métricas de calidad',
    emailSubject: 'Alerta de calidad de datos', emailFrom: 'Sistema de Monitoreo',
  }),
  ontology_modeling: (ctx) => ({
    id: generateTaskId(), title: 'Modelado de Ontología', type: 'ontology_modeling',
    difficulty: ctx.difficulty || 2, time: 30, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'ontologia', description: 'Definir entidades y relaciones del modelo semántico',
    emailSubject: 'Tarea de modelado Ontología', emailFrom: 'Ing. Sandra Mora',
  }),
  airflow_dag: (ctx) => ({
    id: generateTaskId(), title: 'Orquestación — DAG Airflow', type: 'airflow_dag',
    difficulty: ctx.difficulty || 2, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'monitoring', description: 'Crear o mantener DAGs de Airflow',
    emailSubject: 'Tarea de orquestación Airflow', emailFrom: 'Ing. Sandra Mora',
  }),
  code_review: (ctx) => ({
    id: generateTaskId(), title: 'Code Review — Revisión de código', type: 'code_review',
    difficulty: ctx.difficulty || 2, time: 15, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'code_review', description: 'Revisar código del equipo',
    emailSubject: 'Solicitud de code review', emailFrom: 'Ing. Sandra Mora',
  }),
  soporte_datos: (ctx) => ({
    id: generateTaskId(), title: 'Soporte — Solicitud de datos', type: 'soporte_datos',
    difficulty: ctx.difficulty || 1, time: 15, week: ctx.week, day: ctx.day,
    priority: 'baja', category: 'soporte_datos', description: 'Responder solicitud de datos de analista',
    emailSubject: 'Solicitud de datos — Analista', emailFrom: 'Ana García (Analista)',
  }),
  incident_recovery: (ctx) => ({
    id: generateTaskId(), title: 'Recuperación de incidente — Pipeline', type: 'incident_recovery',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'critica', category: 'incident', description: 'Diagnosticar y recuperar el pipeline que falló el 05-jul',
    emailSubject: '🔴 INCIDENTE: lno_sales_pipeline falló', emailFrom: 'Sistema de Monitoreo',
  }),
};

// ─── Trampas por especialidad ─────────────────────────────────

const ACCOUNTING_TRAPS: Omit<PlannedTask, 'id'>[] = [
  { title: 'Factura con IVA incorrecto', type: 'invoice_emission', difficulty: 4, time: 15, week: 1, day: 3, priority: 'alta', category: 'errores', description: 'La factura tiene IVA al 10% en lugar de 16%', emailSubject: 'Revisar factura — posibles errores', emailFrom: 'Lic. Gómez', isTrap: true, trapId: 'iva_incorrecto', trapDescription: 'IVA al 10% en vez de 16%', expectedMistake: 'Multa SAT' },
  { title: 'Pago mal aplicado', type: 'payment_registration', difficulty: 4, time: 12, week: 2, day: 3, priority: 'alta', category: 'errores', description: 'Pago de cliente A aplicado a factura de cliente B', emailSubject: 'Pago mal aplicado — corregir', emailFrom: 'Lic. Gómez', isTrap: true, trapId: 'pago_mal_aplicado', trapDescription: 'Pago aplicado al cliente incorrecto', expectedMistake: 'Saldos incorrectos' },
  { title: 'Conciliación no cuadra', type: 'bank_reconciliation', difficulty: 4, time: 25, week: 3, day: 4, priority: 'critica', category: 'errores', description: 'Cheque sin cobrar no registrado', emailSubject: 'Conciliación con diferencia', emailFrom: 'Lic. Gómez', isTrap: true, trapId: 'conciliacion_no_cuadra', trapDescription: 'Cheque de $3,500 sin registrar', expectedMistake: 'Diferencias bancarias' },
  { title: 'Nómina con ISR mal calculado', type: 'payroll', difficulty: 4, time: 30, week: 4, day: 1, priority: 'alta', category: 'errores', description: 'ISR al 15% fijo en vez de tabla progresiva', emailSubject: 'Nómina con error fiscal', emailFrom: 'Lic. Gómez', isTrap: true, trapId: 'nomina_isr_mal', trapDescription: 'ISR fijo en vez de tabla SAT', expectedMistake: 'Demandas laborales' },
];

const DE_TRAPS: Omit<PlannedTask, 'id'>[] = [
  { title: 'Pipeline con datos perdidos', type: 'etl_pipeline', difficulty: 4, time: 20, week: 1, day: 4, priority: 'alta', category: 'errores', description: 'Pipeline elimina nulos sin imputar, perdiendo 200 registros', emailSubject: 'Pipeline ejecutado — revisar', emailFrom: 'Sistema de Monitoreo', isTrap: true, trapId: 'pipeline_datos_perdidos', trapDescription: 'dropna() sin imputar', expectedMistake: 'Pérdida de datos' },
  { title: 'SQL sin GROUP BY', type: 'sql_query', difficulty: 4, time: 15, week: 2, day: 2, priority: 'alta', category: 'errores', description: 'SUM() sin GROUP BY da resultado incorrecto', emailSubject: 'Consulta SQL — resultados inesperados', emailFrom: 'Ing. Sandra Mora', isTrap: true, trapId: 'sql_sin_group_by', trapDescription: 'Falta GROUP BY con agregación', expectedMistake: 'Resultado incorrecto' },
  { title: 'Alerta de calidad ignorada', type: 'data_quality', difficulty: 4, time: 15, week: 3, day: 4, priority: 'alta', category: 'errores', description: '500 registros con RFC inválido ignorados', emailSubject: '⚠ Datos con RFC inválido', emailFrom: 'Sistema de Calidad', isTrap: true, trapId: 'alerta_calidad_ignorada', trapDescription: 'Datos fiscales inválidos ignorados', expectedMistake: 'Problemas con SAT' },
];

// ─── Plan semanal por especialidad ────────────────────────────

const ACCOUNTING_WEEKS: Record<number, { theme: string; tasks: { type: string; count: number; difficulty: number }[] }> = {
  1: { theme: 'Inicio de mes — Facturación', tasks: [{ type: 'invoice_emission', count: 3, difficulty: 1 }, { type: 'payment_registration', count: 2, difficulty: 1 }, { type: 'supplier_invoice', count: 2, difficulty: 1 }] },
  2: { theme: 'Operación — Cobranza y conciliación', tasks: [{ type: 'payment_registration', count: 3, difficulty: 1 }, { type: 'supplier_invoice', count: 2, difficulty: 1 }, { type: 'bank_reconciliation', count: 1, difficulty: 2 }, { type: 'ap_reconciliation', count: 1, difficulty: 2 }] },
  3: { theme: 'Cálculos fiscales y nómina', tasks: [{ type: 'tax_calculation', count: 1, difficulty: 2 }, { type: 'payroll', count: 1, difficulty: 2 }, { type: 'payment_registration', count: 1, difficulty: 1 }, { type: 'cfdi_reception', count: 1, difficulty: 1 }] },
  4: { theme: 'Cierre de mes', tasks: [{ type: 'journal_entry', count: 2, difficulty: 2 }, { type: 'depreciation', count: 1, difficulty: 2 }, { type: 'credit_note', count: 1, difficulty: 2 }, { type: 'cash_cut', count: 1, difficulty: 2 }, { type: 'financial_statements', count: 1, difficulty: 3 }] },
};

const DE_WEEKS: Record<number, { theme: string; tasks: { type: string; count: number; difficulty: number }[] }> = {
  1: { theme: 'Fundamentos SQL y Python', tasks: [{ type: 'sql_query', count: 3, difficulty: 1 }, { type: 'etl_pipeline', count: 2, difficulty: 1 }, { type: 'data_quality', count: 1, difficulty: 1 }] },
  2: { theme: 'Pipeline ETL y limpieza', tasks: [{ type: 'etl_pipeline', count: 2, difficulty: 2 }, { type: 'data_quality', count: 2, difficulty: 2 }, { type: 'sql_query', count: 1, difficulty: 2 }] },
  3: { theme: 'Ontología y modelado', tasks: [{ type: 'ontology_modeling', count: 2, difficulty: 2 }, { type: 'code_review', count: 1, difficulty: 2 }, { type: 'soporte_datos', count: 1, difficulty: 1 }] },
  4: { theme: 'Monitoreo y orquestación', tasks: [{ type: 'airflow_dag', count: 2, difficulty: 2 }, { type: 'incident_recovery', count: 1, difficulty: 3 }, { type: 'etl_pipeline', count: 1, difficulty: 3 }, { type: 'code_review', count: 1, difficulty: 2 }] },
};

// ─── Generador principal ─────────────────────────────────────

export function generateMonthPlan(month: number, year: number, specialtyId: string = 'accounting'): MonthPlan {
  const specialty = getSpecialty(specialtyId);
  const isDE = specialtyId === 'data_engineering';
  const weeks = isDE ? DE_WEEKS : ACCOUNTING_WEEKS;
  const templates = isDE ? DE_TASK_TEMPLATES : ACCOUNTING_TASK_TEMPLATES;
  const traps = isDE ? DE_TRAPS : ACCOUNTING_TRAPS;

  const allTasks: PlannedTask[] = [];
  const weekPlans: WeekPlan[] = [];

  for (let week = 1; week <= 4; week++) {
    const weekConfig = weeks[week];
    if (!weekConfig) continue;

    const weekTasks: PlannedTask[] = [];

    // Generar tareas regulares
    for (const taskConfig of weekConfig.tasks) {
      for (let i = 0; i < taskConfig.count; i++) {
        const day = ((i + week) % 5) + 1;
        const client = { name: ['Comercial del Norte', 'Transportes Rápidos', 'Almacenes del Bajío', 'Inversiones del Valle', 'Corporativo Trust'][i % 5] };
        const supplier = ['Transportes Express', 'Papelería del Norte', 'Servicios Tech MX', 'Combustibles del Bajío'][i % 4];

        const template = templates[taskConfig.type];
        if (template) {
          const task = template({ week, day, client, supplier, difficulty: taskConfig.difficulty });
          weekTasks.push(task);
        }
      }
    }

    // Agregar 1 trampa por semana
    const trapIdx = week - 1;
    if (trapIdx < traps.length) {
      const trap = traps[trapIdx];
      weekTasks.push({ ...trap, id: generateTaskId() });
    }

    weekPlans.push({
      week,
      theme: weekConfig.theme,
      tasks: weekTasks,
      totalHours: Math.round(weekTasks.reduce((s, t) => s + t.time, 0) / 60),
    });

    allTasks.push(...weekTasks);
  }

  // Estadísticas
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<number, number> = {};
  let trapCount = 0;

  for (const task of allTasks) {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
    byDifficulty[task.difficulty] = (byDifficulty[task.difficulty] || 0) + 1;
    if (task.isTrap) trapCount++;
  }

  return {
    month, year, specialty: specialtyId,
    tasks: allTasks,
    weekPlans,
    summary: {
      totalTasks: allTasks.length,
      byCategory,
      byDifficulty,
      trapCount,
      estimatedHours: Math.round(allTasks.reduce((s, t) => s + t.time, 0) / 60),
    },
  };
}

export function getTodayTasks(month: number, year: number, week: number, day: number, specialtyId: string = 'accounting'): PlannedTask[] {
  const plan = generateMonthPlan(month, year, specialtyId);
  return plan.tasks.filter(t => t.week === week && t.day === day);
}

export function getWeekTasks(month: number, year: number, week: number, specialtyId: string = 'accounting'): WeekPlan | undefined {
  const plan = generateMonthPlan(month, year, specialtyId);
  return plan.weekPlans.find(w => w.week === week);
}

export function getMonthStats(month: number, year: number, specialtyId: string = 'accounting') {
  const plan = generateMonthPlan(month, year, specialtyId);
  return plan.summary;
}
