// ─── Engine Capabilities — Registro de capacidades de motores (R-12) ───
// Distingue una UI (herramienta) de un MOTOR (cálculo/validación real).
// Es la base del agente-automatizador: al analizar una vacante, cada skill se
// resuelve contra una capacidad de motor. Si la capacidad NO existe, se registra
// un "engine_requirement" en el backlog para que el sistema construya el motor
// nuevo (auto-extensión tras cada vacante).
//
// REGLA DE ORO: los números/golden siguen saliendo de los motores reales; aquí
// solo se DECLARA qué capacidad existe y cuál falta. Nada de esto inyecta datos
// fabricados al mundo simulado.

export type CapabilityStatus = 'exists' | 'extends' | 'missing';

export interface EngineCapability {
  id: string;                 // id canónico del motor
  skill: string;              // skill de la vacante (matchScorer)
  status: CapabilityStatus;
  label: string;
  icon: string;
  aliases?: string[];         // sinónimos para resolver por nombre de herramienta
  tool?: string;              // app existente en DesktopShell (si aplica)
  taskTypes?: string[];       // workflows DE/DS/contable que ya la usan
  validator?: string;         // validador de motor (de/ds) existente
  engineModule?: string;      // dónde vive el motor (compilador de SQL, fórmula, etc.)
  gap?: string;               // qué falta para estar completo (solo para extends/missing)
  buildPlan?: string[];       // blueprint que el sistema debe construir (si missing/extends)
}

// Capacidades que YA existen hoy (verificadas en código):
//   SQL → compileModelSql / SQLSim (sql_query, validator 'sql')
//   Python/ETL → NotebookSim (etl_pipeline, validator 'etl_clean')
//   Calidad → Catalog (data_quality, validator 'quality_decision')
//   Incidentes → Monitor (incident_recovery, validator 'incident')
//   Airflow → AirflowSim (airflow_dag)
//   Ciencia → Stats/ML (eda_churn, modelo_baseline, eval_metricas)
//   Contable → workflowEngine (invoice_emission, payroll, …)
export const ENGINE_CAPABILITIES: EngineCapability[] = [
  // ─── Existentes ──────────────────────────────────────────────
  { id: 'sql', skill: 'SQL', status: 'exists', label: 'Motor SQL', icon: '🗃️', tool: 'sql', taskTypes: ['sql_query'], validator: 'sql', engineModule: 'compileModelSql / SQLSim' },
  { id: 'etl', skill: 'ETL', status: 'exists', label: 'Motor ETL', icon: '🔀', tool: 'pipeline', taskTypes: ['etl_pipeline'], validator: 'etl_clean', engineModule: 'NotebookSim (pandas)' },
  { id: 'python', skill: 'Python', status: 'exists', label: 'Kernel Python', icon: '📓', tool: 'notebook', taskTypes: ['etl_pipeline'], validator: 'etl_clean', engineModule: 'NotebookSim' },
  { id: 'dbt', skill: 'dbt', status: 'exists', label: 'Motor dbt', icon: '🧱', tool: 'dbt', engineModule: 'DBTSim compileModelSql' },
  { id: 'quality', skill: 'Calidad de datos', status: 'exists', label: 'Calidad de datos', icon: '📚', tool: 'catalog', taskTypes: ['data_quality'], validator: 'quality_decision', engineModule: 'CatalogSim' },
  { id: 'incidents', skill: 'Resolución de incidentes', status: 'exists', label: 'Incidentes', icon: '📊', tool: 'monitor', taskTypes: ['incident_recovery'], validator: 'incident', engineModule: 'MonitorSim / simWorld' },
  { id: 'airflow', skill: 'Airflow', status: 'exists', label: 'Orquestación', icon: '🛫', tool: 'airflow', taskTypes: ['airflow_dag'], engineModule: 'AirflowSim' },
  { id: 'cloud', skill: 'Cloud', status: 'exists', label: 'Cloud', icon: '☁️', tool: 'cloud', engineModule: 'CloudSim (S3/Redshift)' },
  { id: 'bi_looker', skill: 'BI', status: 'exists', label: 'BI (Looker Studio)', icon: '📊', tool: 'bi', engineModule: 'BiSim (sobre compileModelSql)' },
  { id: 'ds_eda', skill: 'EDA', status: 'exists', label: 'EDA', icon: '📈', tool: 'stats', taskTypes: ['eda_churn'], validator: 'eda', engineModule: 'StatsSim' },
  { id: 'ds_ml', skill: 'ML', status: 'exists', label: 'Modelos ML', icon: '🤖', tool: 'ml', taskTypes: ['modelo_baseline'], validator: 'model', engineModule: 'MLSim' },
  { id: 'ds_metrics', skill: 'Métricas', status: 'exists', label: 'Métricas', icon: '🧪', taskTypes: ['eval_metricas'], validator: 'metrics', engineModule: 'dsValidation' },
  { id: 'cfdi', skill: 'CFDI', status: 'exists', label: 'Facturación CFDI', icon: '📊', tool: 'accounting', taskTypes: ['invoice_emission', 'cfdi_reception', 'credit_note'], engineModule: 'workflowEngine' },
  { id: 'conciliacion', skill: 'Conciliación', status: 'exists', label: 'Conciliación', icon: '🏦', tool: 'banking', taskTypes: ['bank_reconciliation', 'ap_reconciliation'], engineModule: 'workflowEngine / paymentMatching' },
  { id: 'nomina', skill: 'Nómina', status: 'exists', label: 'Nómina', icon: '📈', tool: 'spreadsheet', taskTypes: ['payroll'], engineModule: 'workflowEngine' },
  { id: 'fiscal', skill: 'Fiscal', status: 'exists', label: 'Fiscal / IVA', icon: '📊', tool: 'accounting', taskTypes: ['tax_calculation'], engineModule: 'workflowEngine' },
  { id: 'contabilidad', skill: 'Contabilidad', status: 'exists', label: 'Contable', icon: '📊', tool: 'accounting', taskTypes: ['journal_entry', 'financial_statements', 'depreciation'], engineModule: 'AccountingSystem / autoEntries' },

  // ─── Extender (el motor existe parcial, falta función) ───────
  { id: 'excel_advanced', skill: 'Excel', status: 'exists', label: 'Excel avanzado', icon: '📈', tool: 'spreadsheet', taskTypes: ['excel_advanced'], validator: 'excel', engineModule: 'SpreadsheetSim (XLOOKUP/BUSCARX, SUMIFS, COUNTIFS, UNIQUE, FILTER + pivots) + Power Pivot/DAX (bloque 6 VBA sustituido por Modelo de Datos)',
    gap: 'Bloque 6 VBA eliminado (obsoleto para IA/SQL). Cierre por criterio v2.',
    buildPlan: ['Modelo de Datos con Power Pivot / DAX básico (relaciones, medidas) como bloque 6', 'Funciones de Matriz Dinámica UNIQUE/FILTER (Sustituto de VBA para automatización)', 'SIMULAB v2 con densidad por criterio (p1 0.4 PQ, p2 0.2 pivot, p3 0.15 fórmulas, p4 0.15 dashboard, p5 0.1 oral)'] },
  { id: 'power_bi', skill: 'Power BI', status: 'exists', label: 'Power BI / DAX', icon: '📊', tool: 'bi', taskTypes: ['powerbi_dax'], validator: 'dax', engineModule: 'advancedDataEngines.validateDAX (CALCULATE/SUMX sobre MART_TOTAL=128350)' },
  { id: 'forecast', skill: 'Pronóstico', status: 'exists', label: 'Pronóstico', icon: '🔮', taskTypes: ['forecast_sales'], validator: 'forecast', engineModule: 'advancedDataEngines (media móvil, MAPE sobre serie del mart)' },
  { id: 'n8n', skill: 'Automatización', status: 'exists', label: 'n8n / Power Automate', icon: '⚙️', aliases: ['n8n', 'power automate', 'make', 'automatizacion', 'workflow automation'], taskTypes: ['automation_etl'], validator: 'automation', engineModule: 'advancedDataEngines.validateAutomation' },
  { id: 'llm_api', skill: 'APIs LLM', status: 'exists', label: 'APIs de modelos', icon: '🤖', aliases: ['openai', 'anthropic', 'gemini api', 'chat completions', 'api de modelos', 'api llm'], taskTypes: ['llm_integration'], validator: 'llm_api', engineModule: 'advancedDataEngines.validateLLM' },
  { id: 'agents', skill: 'Agentes', status: 'exists', label: 'Agentes / asistentes', icon: '🧠', aliases: ['agente', 'asistentes', 'agentes', 'llm agents', 'tools'], taskTypes: ['agent_task'], validator: 'agent', engineModule: 'advancedDataEngines.validateAgent' },
  { id: 'prompt', skill: 'Prompt engineering', status: 'exists', label: 'Prompt engineering', icon: '💬', aliases: ['prompt', 'prompts', 'few-shot', 'system prompt'], taskTypes: ['prompt_engineering'], validator: 'prompt', engineModule: 'advancedDataEngines.validatePrompt' },

  // ─── Extender (el motor existe parcial, falta función) ───────
  { id: 'erp', skill: 'ERP', status: 'missing', label: 'ERP (SAP/Oracle)', icon: '🏭', aliases: ['sap', 'oracle', 'erp', 'sap fi', 'sap mm', 'sap sd'],
    gap: 'No hay plataforma ERP: faltan TableStore (BD genérica), TransactionEngine (efectos en cascada FI/SD/MM) y FormEngine configurable.',
    buildPlan: ['TableStore: almacén relacional en memoria (esquemas, CRUD, joins)', 'TransactionEngine: orquestar efectos entre módulos con validación', 'FormEngine: pantallas configurables por JSON', 'ScenarioCatalog: datos por escenario'] },
];

// Backlog de motores por construir (se llena al analizar vacantes).
// Se persiste en memoria (TTL/limpieza opcional) igual que otros registros.
export const ENGINE_BACKLOG: EngineCapability[] = [];

export function resolveCapability(skill: string): EngineCapability | undefined {
  const s = skill.trim().toLowerCase();
  const byAlias = ENGINE_CAPABILITIES.find(c => (c.aliases || []).some(a => a.toLowerCase() === s));
  if (byAlias) return byAlias;
  const exact = ENGINE_CAPABILITIES.find(c => c.skill.toLowerCase() === s);
  if (exact) return exact;
  return ENGINE_CAPABILITIES.find(c =>
    s.includes(c.skill.toLowerCase())
    || c.skill.toLowerCase().includes(s));
}

// Marca una capacidad como pendiente de construir (dedupe por id).
export function registerEngineRequirement(cap: EngineCapability): { added: boolean; backlogSize: number } {
  if (cap.status === 'exists') return { added: false, backlogSize: ENGINE_BACKLOG.length };
  const exists = ENGINE_BACKLOG.some(b => b.id === cap.id);
  if (!exists) ENGINE_BACKLOG.push(cap);
  return { added: !exists, backlogSize: ENGINE_BACKLOG.length };
}

export function pendingEngines(): EngineCapability[] {
  return ENGINE_BACKLOG.map(c => ({ ...c }));
}

export function listCapabilities() {
  return ENGINE_CAPABILITIES.map(c => ({ id: c.id, skill: c.skill, status: c.status, label: c.label, icon: c.icon, tool: c.tool, taskTypes: c.taskTypes || [], validator: c.validator, gap: c.gap || '', buildPlan: c.buildPlan || [] }));
}