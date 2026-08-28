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
  phase?: 'analyst' | 'de' | 'ds';
  countsAsCase?: boolean;
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
  business_expense: (ctx) => ({
    id: generateTaskId(), title: 'Comida empresarial — gasto interno', type: 'business_expense',
    difficulty: 2, time: 15, week: ctx.week, day: ctx.day, priority: 'alta',
    category: 'gastos', description: 'Registrar gasto por comida de trabajo con IVA acreditable y deducibilidad 65%',
    emailSubject: 'Reembolso de gasto por comida', emailFrom: 'Lic. Gómez',
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
    phase: ctx.phase || 'analyst',
  }),
  etl_pipeline: (ctx) => ({
    id: generateTaskId(), title: 'Pipeline ETL — Transformación', type: 'etl_pipeline',
    difficulty: ctx.difficulty || 2, time: ctx.difficulty === 1 ? 20 : 30, week: ctx.week, day: ctx.day,
    priority: 'alta', category: 'etl', description: 'Crear o mantener pipeline ETL',
    emailSubject: 'Tarea de pipeline ETL', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  data_quality: (ctx) => ({
    id: generateTaskId(), title: 'Calidad de datos — Validación', type: 'data_quality',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'data_quality', description: 'Revisar métricas de calidad',
    emailSubject: 'Alerta de calidad de datos', emailFrom: 'Sistema de Monitoreo',
    phase: ctx.phase || 'analyst',
  }),
  ontology_modeling: (ctx) => ({
    id: generateTaskId(), title: 'Modelado de Ontología', type: 'ontology_modeling',
    difficulty: ctx.difficulty || 2, time: 30, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'ontologia', description: 'Definir entidades y relaciones del modelo semántico',
    emailSubject: 'Tarea de modelado Ontología', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  airflow_dag: (ctx) => ({
    id: generateTaskId(), title: 'Orquestación — DAG Airflow', type: 'airflow_dag',
    difficulty: ctx.difficulty || 2, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'monitoring', description: 'Crear o mantener DAGs de Airflow',
    emailSubject: 'Tarea de orquestación Airflow', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  code_review: (ctx) => ({
    id: generateTaskId(), title: 'Code Review — Revisión de código', type: 'code_review',
    difficulty: ctx.difficulty || 2, time: 15, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'code_review', description: 'Revisar código del equipo',
    emailSubject: 'Solicitud de code review', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  soporte_datos: (ctx) => ({
    id: generateTaskId(), title: 'Soporte — Solicitud de datos', type: 'soporte_datos',
    difficulty: ctx.difficulty || 1, time: 15, week: ctx.week, day: ctx.day,
    priority: 'baja', category: 'soporte_datos', description: 'Responder solicitud de datos de analista',
    emailSubject: 'Solicitud de datos — Analista', emailFrom: 'Ana García (Analista)',
    phase: ctx.phase || 'analyst',
  }),
  incident_recovery: (ctx) => ({
    id: generateTaskId(), title: 'Recuperación de incidente — Pipeline', type: 'incident_recovery',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'critica', category: 'incident', description: 'Diagnosticar y recuperar el pipeline que falló el 05-jul',
    emailSubject: '🔴 INCIDENTE: lno_sales_pipeline falló', emailFrom: 'Sistema de Monitoreo',
    phase: ctx.phase || 'de',
  }),
  // ── Rama Ciencia de Datos (fase analista / ciencia) ─────────
  eda_churn: (ctx) => ({
    id: generateTaskId(), title: 'EDA — Churn Comercial del Norte', type: 'eda_churn',
    difficulty: ctx.difficulty || 2, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'ds', description: 'Análisis exploratorio del churn con features del mart',
    emailSubject: 'Caso: churn de Comercial del Norte', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'analyst', countsAsCase: ctx.countsAsCase ?? true,
  }),
  modelo_baseline: (ctx) => ({
    id: generateTaskId(), title: 'Modelo baseline — Churn', type: 'modelo_baseline',
    difficulty: ctx.difficulty || 3, time: 30, week: ctx.week, day: ctx.day,
    priority: 'alta', category: 'ds', description: 'Entrenar modelo baseline y reportar métricas',
    emailSubject: 'Entrenamiento modelo churn', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'ds', countsAsCase: ctx.countsAsCase ?? true,
  }),
  eval_metricas: (ctx) => ({
    id: generateTaskId(), title: 'Evaluación de métricas — Churn', type: 'eval_metricas',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'ds', description: 'Evaluar RMSE/accuracy del baseline y comparar',
    emailSubject: 'Evaluación de modelo', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'ds',
  }),
  // ── Motores avanzados R-15 (carrera data completa) ──────────
  excel_advanced: (ctx) => ({
    id: generateTaskId(), title: 'Excel avanzado — Reporte con XLOOKUP/SUMIFS', type: 'excel_advanced',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'excel', description: 'Resolver reporte con funciones avanzadas o tabla dinámica',
    emailSubject: 'Reporte avanzado de ventas', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'analyst',
  }),
  powerbi_dax: (ctx) => ({
    id: generateTaskId(), title: 'Power BI — Medida DAX del mart', type: 'powerbi_dax',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'bi', description: 'Escribir medida DAX (CALCULATE + SUMX) sobre mrt_ventas_por_cliente',
    emailSubject: 'Medida DAX para el panel de ventas', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'analyst',
  }),
  forecast_sales: (ctx) => ({
    id: generateTaskId(), title: 'Pronóstico — Ventas con media móvil', type: 'forecast_sales',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'forecast', description: 'Pronosticar ventas y reportar MAPE',
    emailSubject: 'Pronóstico de ventas de julio', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'analyst',
  }),
  automation_etl: (ctx) => ({
    id: generateTaskId(), title: 'Automatización — Workflow n8n de ingesta', type: 'automation_etl',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'automation', description: 'Diseñar workflow n8n de ingesta diaria',
    emailSubject: 'Automatizar la ingesta diaria', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  llm_integration: (ctx) => ({
    id: generateTaskId(), title: 'API LLM — Resumen de ventas', type: 'llm_integration',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'llm', description: 'Llamada chat completions con system prompt',
    emailSubject: 'Integrar LLM para resumen ejecutivo', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  agent_task: (ctx) => ({
    id: generateTaskId(), title: 'Agente — Consulta con loop y herramienta', type: 'agent_task',
    difficulty: ctx.difficulty || 3, time: 25, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'agent', description: 'Diseñar agente que consulta herramienta con memoria',
    emailSubject: 'Agente para consultas de negocio', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'de',
  }),
  prompt_engineering: (ctx) => ({
    id: generateTaskId(), title: 'Prompt engineering — Mejora de instrucción', type: 'prompt_engineering',
    difficulty: ctx.difficulty || 2, time: 20, week: ctx.week, day: ctx.day,
    priority: 'media', category: 'prompt', description: 'Mejorar prompt con formato y few-shot',
    emailSubject: 'Mejorar prompt del asistente', emailFrom: 'Ing. Sandra Mora',
    phase: ctx.phase || 'ds',
  }),
  // ── Fundamentos Capa 0 (no countsAsCase) ─────────────────────
  excel_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Excel básico', type: 'excel_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'excel', description: 'Concepto de Excel (tablas, tipos, Power Query)', emailSubject: 'Fundamento Excel', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'analyst' }),
  sql_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — SQL básico', type: 'sql_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'sql', description: 'SELECT/WHERE/JOIN', emailSubject: 'Fundamento SQL', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'analyst' }),
  catalog_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Catálogo', type: 'catalog_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'data_quality', description: 'Linaje raw→stg→mrt', emailSubject: 'Fundamento Catálogo', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'analyst' }),
  bi_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — BI', type: 'bi_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'bi', description: 'Un visual desde un dataset', emailSubject: 'Fundamento BI', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'analyst' }),
  python_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Python/pandas', type: 'python_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'etl', description: 'Limpieza básica', emailSubject: 'Fundamento Python', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de' }),
  foundry_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Foundry', type: 'foundry_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'etl', description: '@transform mínimo', emailSubject: 'Fundamento Foundry', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de' }),
  airflow_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Airflow', type: 'airflow_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'monitoring', description: 'DAG y dependencia', emailSubject: 'Fundamento Airflow', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de' }),
  git_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Git', type: 'git_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'code_review', description: 'PR y hallazgos', emailSubject: 'Fundamento Git', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de' }),
  monitor_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Monitor', type: 'monitor_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'incident', description: 'Estado/SLA (solo lectura)', emailSubject: 'Fundamento Monitor', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de' }),
  stats_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Stats', type: 'stats_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'ds', description: 'describe/nulos', emailSubject: 'Fundamento Stats', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'ds' }),
  ml_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — ML', type: 'ml_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'ds', description: 'split/target', emailSubject: 'Fundamento ML', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'ds' }),
  metricas_basico: (ctx) => ({ id: generateTaskId(), title: 'Fundamento — Métricas', type: 'metricas_basico', difficulty: 1, time: 15, week: ctx.week, day: ctx.day, priority: 'baja', category: 'ds', description: 'RMSE/accuracy', emailSubject: 'Fundamento Métricas', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'ds' }),
  // ── Ecosistema Capa 1 (countsAsCase) ─────────────────────────
  ecosistema_da: (ctx) => ({ id: generateTaskId(), title: 'Ecosistema — Analista', type: 'ecosistema_da', difficulty: 3, time: 30, week: ctx.week, day: ctx.day, priority: 'alta', category: 'bi', description: 'DAX integrado sobre el mart', emailSubject: 'Ecosistema Analista', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'analyst', countsAsCase: true }),
  ecosistema_de: (ctx) => ({ id: generateTaskId(), title: 'Ecosistema — Ingeniero', type: 'ecosistema_de', difficulty: 3, time: 30, week: ctx.week, day: ctx.day, priority: 'alta', category: 'automation', description: 'n8n/LLM/agente sobre el pipeline', emailSubject: 'Ecosistema Ingeniero', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'de', countsAsCase: true }),
  ecosistema_ds: (ctx) => ({ id: generateTaskId(), title: 'Ecosistema — Científico', type: 'ecosistema_ds', difficulty: 3, time: 30, week: ctx.week, day: ctx.day, priority: 'alta', category: 'forecast', description: 'EDA→modelo→pronóstico', emailSubject: 'Ecosistema Científico', emailFrom: 'Ing. Sandra Mora', phase: ctx.phase || 'ds', countsAsCase: true }),
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

interface WeekTaskSpec { type: string; count: number; difficulty: number; phase?: 'analyst' | 'de' | 'ds'; countsAsCase?: boolean; }
interface WeekSpec { theme: string; tasks: WeekTaskSpec[]; }

const ACCOUNTING_WEEKS: Record<number, WeekSpec> = {
  1: { theme: 'Inicio de mes — Facturación', tasks: [{ type: 'invoice_emission', count: 3, difficulty: 1 }, { type: 'payment_registration', count: 2, difficulty: 1 }, { type: 'supplier_invoice', count: 2, difficulty: 1 }] },
  2: { theme: 'Operación — Cobranza y conciliación', tasks: [{ type: 'payment_registration', count: 3, difficulty: 1 }, { type: 'supplier_invoice', count: 2, difficulty: 1 }, { type: 'bank_reconciliation', count: 1, difficulty: 2 }, { type: 'ap_reconciliation', count: 1, difficulty: 2 }] },
  3: { theme: 'Cálculos fiscales y nómina', tasks: [{ type: 'tax_calculation', count: 1, difficulty: 2 }, { type: 'payroll', count: 1, difficulty: 2 }, { type: 'payment_registration', count: 1, difficulty: 1 }, { type: 'cfdi_reception', count: 1, difficulty: 1 }] },
  4: { theme: 'Cierre de mes', tasks: [{ type: 'journal_entry', count: 2, difficulty: 2 }, { type: 'depreciation', count: 1, difficulty: 2 }, { type: 'credit_note', count: 1, difficulty: 2 }, { type: 'cash_cut', count: 1, difficulty: 2 }, { type: 'financial_statements', count: 1, difficulty: 3 }] },
};

// Plan de prácticas profesionales: módulos procedurales con guía 💡.
const PRACTICAS_WEEKS: Record<number, WeekSpec> = {
  1: { theme: 'Módulo 1 — Facturación electrónica (CFDI 4.0)', tasks: [{ type: 'invoice_emission', count: 3, difficulty: 1 }, { type: 'payment_registration', count: 1, difficulty: 1 }] },
  2: { theme: 'Módulo 2 — Gastos internos y comida empresarial', tasks: [{ type: 'business_expense', count: 2, difficulty: 2 }, { type: 'invoice_emission', count: 1, difficulty: 1 }, { type: 'supplier_invoice', count: 1, difficulty: 1 }] },
  3: { theme: 'Módulo 3-4 — Cobranza y proveedores', tasks: [{ type: 'payment_registration', count: 2, difficulty: 1 }, { type: 'supplier_invoice', count: 2, difficulty: 1 }, { type: 'payment_scheduling', count: 1, difficulty: 1 }] },
  4: { theme: 'Módulo 5-6 — Nómina, conciliación y cierre', tasks: [{ type: 'payroll', count: 1, difficulty: 2 }, { type: 'bank_reconciliation', count: 1, difficulty: 2 }, { type: 'cash_cut', count: 1, difficulty: 2 }, { type: 'journal_entry', count: 1, difficulty: 2 }] },
};

const DE_WEEKS: Record<number, WeekSpec> = {
  1: { theme: 'Fundamentos SQL y Python (Analista)', tasks: [{ type: 'sql_query', count: 3, difficulty: 1, phase: 'analyst' }, { type: 'etl_pipeline', count: 2, difficulty: 1, phase: 'analyst' }, { type: 'data_quality', count: 1, difficulty: 1, phase: 'analyst' }] },
  2: { theme: 'Profiling y reportes (Analista)', tasks: [{ type: 'sql_query', count: 2, difficulty: 2, phase: 'analyst' }, { type: 'data_quality', count: 2, difficulty: 2, phase: 'analyst' }, { type: 'soporte_datos', count: 1, difficulty: 1, phase: 'analyst' }] },
  3: { theme: 'Pipeline ETL (Ingeniería)', tasks: [{ type: 'etl_pipeline', count: 2, difficulty: 2, phase: 'de' }, { type: 'ontology_modeling', count: 1, difficulty: 2, phase: 'de' }, { type: 'code_review', count: 1, difficulty: 2, phase: 'de' }] },
  4: { theme: 'Monitoreo y orquestación (Ingeniería)', tasks: [{ type: 'airflow_dag', count: 2, difficulty: 2, phase: 'de' }, { type: 'incident_recovery', count: 1, difficulty: 3, phase: 'de' }, { type: 'etl_pipeline', count: 1, difficulty: 3, phase: 'de' }, { type: 'code_review', count: 1, difficulty: 2, phase: 'de' }] },
};

const DS_WEEKS: Record<number, WeekSpec> = {
  1: { theme: 'EDA y exploración (Ciencia)', tasks: [{ type: 'eda_churn', count: 2, difficulty: 2, phase: 'analyst' }, { type: 'sql_query', count: 1, difficulty: 2, phase: 'analyst' }, { type: 'data_quality', count: 1, difficulty: 2, phase: 'analyst' }] },
  2: { theme: 'Modelo baseline (Ciencia)', tasks: [{ type: 'modelo_baseline', count: 2, difficulty: 3, phase: 'ds' }, { type: 'eda_churn', count: 1, difficulty: 2, phase: 'ds' }] },
  3: { theme: 'Evaluación de modelos (Ciencia)', tasks: [{ type: 'eval_metricas', count: 2, difficulty: 2, phase: 'ds' }, { type: 'modelo_baseline', count: 1, difficulty: 3, phase: 'ds' }] },
  4: { theme: 'Capstone de ciencia', tasks: [{ type: 'eval_metricas', count: 2, difficulty: 3, phase: 'ds' }, { type: 'eda_churn', count: 1, difficulty: 2, phase: 'ds', countsAsCase: true }, { type: 'modelo_baseline', count: 1, difficulty: 3, phase: 'ds', countsAsCase: true }, { type: 'prompt_engineering', count: 1, difficulty: 2, phase: 'ds' }] },
};

// Semanas de motores avanzados R-15: se fusionan con las semanas base.
const ADVANCED_WEEKS: Record<string, Record<number, WeekSpec>> = {
  analyst: { 3: { theme: 'Motores avanzados — Analista (BI/DAX, Excel, Pronóstico)', tasks: [{ type: 'powerbi_dax', count: 2, difficulty: 3, phase: 'analyst' }, { type: 'excel_advanced', count: 1, difficulty: 2, phase: 'analyst' }, { type: 'forecast_sales', count: 1, difficulty: 2, phase: 'analyst' }] } },
  engineering: { 3: { theme: 'Motores avanzados — Ingeniería (n8n, LLM, Agentes)', tasks: [{ type: 'automation_etl', count: 2, difficulty: 3, phase: 'de' }, { type: 'llm_integration', count: 1, difficulty: 3, phase: 'de' }, { type: 'agent_task', count: 1, difficulty: 3, phase: 'de' }] } },
  science: { 4: { theme: 'Motores avanzados — Ciencia (Prompt)', tasks: [{ type: 'prompt_engineering', count: 2, difficulty: 2, phase: 'ds' }] } },
};

// Capa 0 — Fundamentos por herramienta (no countsAsCase). Se inserta antes del ecosistema.
const FUNDAMENTALS_WEEKS: Record<string, Record<number, WeekSpec>> = {
  analyst: { 2: { theme: 'Capa 0 — Fundamentos Analista (Excel→SQL→Catalog→BI)', tasks: [{ type: 'excel_basico', count: 1, difficulty: 1, phase: 'analyst' }, { type: 'sql_basico', count: 1, difficulty: 1, phase: 'analyst' }, { type: 'catalog_basico', count: 1, difficulty: 1, phase: 'analyst' }, { type: 'bi_basico', count: 1, difficulty: 1, phase: 'analyst' }] } },
  engineering: { 2: { theme: 'Capa 0 — Fundamentos Ingeniería (Python→Foundry→Airflow→Git→Monitor)', tasks: [{ type: 'python_basico', count: 1, difficulty: 1, phase: 'de' }, { type: 'foundry_basico', count: 1, difficulty: 1, phase: 'de' }, { type: 'airflow_basico', count: 1, difficulty: 1, phase: 'de' }, { type: 'git_basico', count: 1, difficulty: 1, phase: 'de' }, { type: 'monitor_basico', count: 1, difficulty: 1, phase: 'de' }] } },
  science: { 3: { theme: 'Capa 0 — Fundamentos Ciencia (Stats→ML→Métricas)', tasks: [{ type: 'stats_basico', count: 1, difficulty: 1, phase: 'ds' }, { type: 'ml_basico', count: 1, difficulty: 1, phase: 'ds' }, { type: 'metricas_basico', count: 1, difficulty: 1, phase: 'ds' }] } },
};

// Capa 1 — Ecosistema (countsAsCase): práctica integrada del rol.
const ECOSYSTEM_WEEKS: Record<string, Record<number, WeekSpec>> = {
  analyst: { 3: { theme: 'Capa 1 — Ecosistema Analista (Power Pivot/DAX + UNIQUE/FILTER + forecast)', tasks: [{ type: 'ecosistema_da', count: 1, difficulty: 3, phase: 'analyst', countsAsCase: true }, { type: 'powerbi_dax', count: 1, difficulty: 3, phase: 'analyst' }, { type: 'forecast_sales', count: 1, difficulty: 2, phase: 'analyst' }] } },
  engineering: { 3: { theme: 'Capa 1 — Ecosistema Ingeniería (n8n + LLM + Agente sobre lno_sales_pipeline)', tasks: [{ type: 'ecosistema_de', count: 1, difficulty: 3, phase: 'de', countsAsCase: true }, { type: 'automation_etl', count: 1, difficulty: 3, phase: 'de' }, { type: 'llm_integration', count: 1, difficulty: 3, phase: 'de' }] } },
  science: { 4: { theme: 'Capa 1 — Ecosistema Ciencia (EDA→modelo→pronóstico→prompt)', tasks: [{ type: 'ecosistema_ds', count: 1, difficulty: 3, phase: 'ds', countsAsCase: true }, { type: 'prompt_engineering', count: 1, difficulty: 2, phase: 'ds' }, { type: 'forecast_sales', count: 1, difficulty: 2, phase: 'ds' }] } },
};

// ─── Generador principal ─────────────────────────────────────

export function generateMonthPlan(month: number, year: number, specialtyId: string = 'accounting', route?: 'analyst' | 'de' | 'ds'): MonthPlan {
  const specialty = getSpecialty(specialtyId);
  const isDE = specialtyId === 'data_engineering';
  // En la especialidad data, el árbol de rutas define qué semanas se usan:
  //  - fase analista: semanas 1-2 (base común)
  //  - ruta ingeniería: semanas 3-4 (DE)
  //  - ruta ciencia: semanas 3-4 (DS)
  let weeks = isDE ? DE_WEEKS : specialtyId === 'practicas' ? PRACTICAS_WEEKS : ACCOUNTING_WEEKS;
  if (isDE) {
    // Capa 0 (fundamentos) → Capa 1 (ecosistema + motores avanzados), por rama.
    // Fusiona semanas que coinciden (misma clave de semana) en vez de sobrescribir.
    const merge = (...sets: (Record<number, WeekSpec> | undefined)[]) => {
      const out: Record<number, WeekSpec> = {};
      for (const set of sets) {
        if (!set) continue;
        for (const [k, spec] of Object.entries(set)) {
          const week = Number(k);
          if (out[week]) out[week] = { theme: out[week].theme + ' + ' + spec.theme, tasks: [...out[week].tasks, ...spec.tasks] };
          else out[week] = spec;
        }
      }
      return out;
    };
    if (route === 'ds') weeks = merge({ 1: DE_WEEKS[1] }, DS_WEEKS, FUNDAMENTALS_WEEKS.science, ECOSYSTEM_WEEKS.science, ADVANCED_WEEKS.science);
    else if (route === 'de') weeks = merge({ 1: DE_WEEKS[1], 4: DE_WEEKS[4] }, FUNDAMENTALS_WEEKS.engineering, ECOSYSTEM_WEEKS.engineering, ADVANCED_WEEKS.engineering);
    else weeks = merge({ 1: DE_WEEKS[1] }, FUNDAMENTALS_WEEKS.analyst, ECOSYSTEM_WEEKS.analyst, ADVANCED_WEEKS.analyst); // analista: fundamentos → ecosistema
  }
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
          const task = template({ week, day, client, supplier, difficulty: taskConfig.difficulty, phase: taskConfig.phase, countsAsCase: taskConfig.countsAsCase });
          weekTasks.push(task);
        }
      }
    }

    // Agregar 1 trampa por semana (solo semanas base/inferencia, no en analista puro)
    const trapIdx = week - 1;
    if (trapIdx < traps.length && week > 2) {
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

export function getTodayTasks(month: number, year: number, week: number, day: number, specialtyId: string = 'accounting', route?: 'analyst' | 'de' | 'ds'): PlannedTask[] {
  const plan = generateMonthPlan(month, year, specialtyId, route);
  return plan.tasks.filter(t => t.week === week && t.day === day);
}

export function getWeekTasks(month: number, year: number, week: number, specialtyId: string = 'accounting', route?: 'analyst' | 'de' | 'ds'): WeekPlan | undefined {
  const plan = generateMonthPlan(month, year, specialtyId, route);
  return plan.weekPlans.find(w => w.week === week);
}

export function getMonthStats(month: number, year: number, specialtyId: string = 'accounting', route?: 'analyst' | 'de' | 'ds') {
  const plan = generateMonthPlan(month, year, specialtyId, route);
  return plan.summary;
}
