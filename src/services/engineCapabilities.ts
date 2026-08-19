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
  { id: 'excel_advanced', skill: 'Excel', status: 'extends', label: 'Excel avanzado', icon: '📈', tool: 'spreadsheet', engineModule: 'SpreadsheetSim evaluateFormula',
    gap: 'Faltan XLOOKUP, SUMIFS/COUNTIFS, tablas dinámicas y Power Query; hoy solo hay fórmulas base (SUM/IF/VLOOKUP/INDEX/MATCH).',
    buildPlan: ['Añadir XLOOKUP y SUMIFS/COUNTIFS al motor evaluateFormula', 'Motor de tablas dinámicas (pivot) sobre rangos', 'Extender BiSim/Excel para gráficos dinámicos'] },
  { id: 'power_bi', skill: 'Power BI', status: 'missing', label: 'Power BI / DAX', icon: '📊', tool: 'bi',
    gap: 'BiSim es estilo Looker Studio; no hay motor DAX (CALCULATE, SUMX, medidas, modelado) ni conectores a Postgres.',
    buildPlan: ['Motor DAX (CALCULATE/SUMX/filtros de contexto) sobre compileModelSql', 'Modelado de datos (tablas y relaciones)', 'Conector a Postgres/Excel y publicación'] },
  { id: 'forecast', skill: 'Pronóstico', status: 'missing', label: 'Pronóstico', icon: '🔮',
    gap: 'No existe media móvil, tendencia lineal, PRONOSTICO ni MAPE como motor evaluable.',
    buildPlan: ['Motor de pronóstico (media móvil, tendencia lineal, PRONOSTICO) en motor de fórmulas', 'Medida de error MAPE', 'Workflow DE/DS de pronóstico con golden'] },
  { id: 'n8n', skill: 'Automatización', status: 'missing', label: 'n8n / Power Automate', icon: '⚙️', aliases: ['n8n', 'power automate', 'make', 'automatizacion', 'workflow automation'],
    gap: 'No hay motor de workflows de automatización (nodos, triggers, webhooks, conexión a APIs y LLM).',
    buildPlan: ['Motor de nodos/triggers/webhooks', 'Conexión a APIs y a modelos LLM', 'Workflow DE de automatización con golden'] },
  { id: 'llm_api', skill: 'APIs LLM', status: 'missing', label: 'APIs de modelos', icon: '🤖', aliases: ['openai', 'anthropic', 'gemini api', 'chat completions', 'api de modelos', 'api llm'],
    gap: 'El Gemini de providers/ai.ts solo califica; no hay motor de chat completions que el alumno consuma como herramienta.',
    buildPlan: ['Motor de llamadas chat completions (system prompt, parámetros, costos)', 'ApiClientSim extender a endpoints de modelos LLM', 'Workflow de integración LLM con golden'] },
  { id: 'agents', skill: 'Agentes', status: 'missing', label: 'Agentes / asistentes', icon: '🧠', aliases: ['agente', 'asistentes', 'agentes', 'llm agents', 'tools'],
    gap: 'No hay motor de loop agente→herramienta→decisión ni memoria básica.',
    buildPlan: ['Motor de agente (percepción, decisión, acción, tools, memoria)', 'Workflow de agente consultando herramienta real', 'Validación ds/de por decisión'] },
  { id: 'prompt', skill: 'Prompt engineering', status: 'missing', label: 'Prompt engineering', icon: '💬', aliases: ['prompt', 'prompts', 'few-shot', 'system prompt'],
    gap: 'No hay motor de prompts evaluable (contexto, few-shot, formato de salida).',
    buildPlan: ['Motor de prompts evaluable con rubrica', 'Comparación antes/después', 'Workflow de prompt engineering'] },
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