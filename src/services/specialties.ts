// ─── Sistema de Especialidades ─────────────────────────────────
// Cada especialidad tiene sus propios workflows, apps, y contenido.
// No hay contenido cruzado entre especialidades.

export interface Specialty {
  id: string;
  name: string;
  icon: string;
  description: string;
  company: string;
  manager: string;
  tools: string[];
  apps: AppDefinition[];
  workflowTypes: string[];
  exerciseTypes: string[];
  trapCategories: string[];
}

export interface AppDefinition {
  id: string;
  label: string;
  icon: string;
  component: string; // Nombre del componente a renderizar
  description: string;
}

// ─── Especialidad: Contabilidad ───────────────────────────────

export const ACCOUNTING_SPECIALTY: Specialty = {
  id: 'accounting',
  name: 'Contador General Junior',
  icon: '📊',
  description: 'Facturación, impuestos, reportes financieros, conciliación bancaria',
  company: 'Logística del Norte S.A. de C.V.',
  manager: 'Lic. Gómez (Contador General)',
  tools: ['Odoo', 'Excel', 'CFDI', 'SAT'],
  apps: [
    { id: 'tasks', label: 'Tareas', icon: '📋', component: 'tasks', description: 'Tareas pendientes del día' },
    { id: 'email', label: 'Correo', icon: '📧', component: 'emailInbox', description: 'Bandeja de entrada' },
    { id: 'accounting', label: 'Contable', icon: '📊', component: 'accounting', description: 'Sistema contable tipo Odoo' },
    { id: 'spreadsheet', label: 'Excel', icon: '📈', component: 'spreadsheet', description: 'Hoja de cálculo' },
    { id: 'calendar', label: 'Calendario', icon: '📅', component: 'calendar', description: 'Calendario de tareas' },
    { id: 'banking', label: 'Banco', icon: '🏦', component: 'banking', description: 'Portal bancario' },
    { id: 'calculator', label: 'Calculadora', icon: '🧮', component: 'calculator', description: 'Calculadora' },
    { id: 'files', label: 'Archivo', icon: '📁', component: 'archivo', description: 'Documentos' },
  ],
  workflowTypes: [
    'invoice_emission',
    'payment_registration',
    'supplier_invoice',
    'business_expense',
    'tax_calculation',
    'bank_reconciliation',
    'journal_entry',
    'payroll',
    'payment_scheduling',
    'ap_reconciliation',
    'cfdi_reception',
    'credit_note',
    'cash_cut',
  ],
  exerciseTypes: ['balanza_comprobacion', 'poliza_diario', 'estado_resultados', 'conciliacion_bancaria', 'diot', 'depreciacion', 'cuentas_por_cobrar'],
  trapCategories: ['iva_incorrecto', 'pago_mal_aplicado', 'conciliacion_no_cuadra', 'nomina_isr_mal'],
};

// ─── Especialidad: Data Engineering ───────────────────────────

export const DE_SPECIALTY: Specialty = {
  id: 'data_engineering',
  name: 'Ingeniero de Datos Jr',
  icon: '🔀',
  description: 'SQL, Python, pipelines ETL, Palantir Foundry, AWS',
  company: 'DataFlow Analytics S.A. de C.V.',
  manager: 'Ing. Sandra Mora (Lead Data Engineer)',
  tools: ['Palantir Foundry', 'SQL', 'Python', 'AWS'],
  apps: [
    { id: 'tasks', label: 'Tareas', icon: '📋', component: 'tasks', description: 'Tareas pendientes del día' },
    { id: 'email', label: 'Correo', icon: '📧', component: 'emailInbox', description: 'Bandeja de entrada' },
    { id: 'pipelines', label: 'Pipelines', icon: '🔀', component: 'pipeline', description: 'Simulador de pipelines ETL' },
    { id: 'sql', label: 'SQL', icon: '🗃️', component: 'sql', description: 'Editor SQL en vivo' },
    { id: 'warehouse', label: 'Warehouse', icon: '🏗️', component: 'warehouse', description: 'Esquema dimensional' },
    { id: 'monitor', label: 'Monitor', icon: '📊', component: 'monitor', description: 'Dashboard de pipelines' },
    { id: 'spreadsheet', label: 'Excel', icon: '📈', component: 'spreadsheet', description: 'Hoja de cálculo' },
  ],
  workflowTypes: [
    'sql_query',
    'etl_pipeline',
    'data_quality',
    'ontology_modeling',
    'airflow_dag',
    'code_review',
    'soporte_datos',
  ],
  exerciseTypes: ['sql_select', 'sql_group_by', 'sql_join', 'python_pandas', 'python_etl'],
  trapCategories: ['pipeline_datos_perdidos', 'sql_sin_group_by', 'alerta_calidad_ignorada'],
};

// ─── Mapa de especialidades ───────────────────────────────────

export const SPECIALTIES: Record<string, Specialty> = {
  accounting: ACCOUNTING_SPECIALTY,
  data_engineering: DE_SPECIALTY,
};

export function getSpecialty(id: string): Specialty {
  return SPECIALTIES[id] || ACCOUNTING_SPECIALTY;
}

export function getSpecialtyApps(specialtyId: string): AppDefinition[] {
  return getSpecialty(specialtyId).apps;
}

export function getSpecialtyWorkflows(specialtyId: string): string[] {
  return getSpecialty(specialtyId).workflowTypes;
}
