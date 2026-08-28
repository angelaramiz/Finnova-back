// ─── Fundamentos (Capa 0) + Ecosistema (Capa 1) — R-15 ────────
// Mini-módulos por herramienta (Capa 0, cierre por criterio) antes de la
// práctica integrada del rol (Capa 1). Capa 0 NO cuenta como countsAsCase
// (no infla expediente) pero sí como sims.validated → desbloquea UNLOCK_PCT.
// Regla de oro R-09: golden de motores; validadores por tipo de/ds/advanced.

export interface FundWorkflow {
  id: string; title: string; type: string; difficulty: number; estimatedMinutes: number;
  steps: any[]; validation: any[]; countsAsCase?: boolean;
}

function fund(type: string, concept: string, toolApp: string, fields: { key: string; label: string; type: string }[]): FundWorkflow {
  return {
    id: `fund-${type}-${Date.now()}`, title: `Fundamento — ${type.replace(/_/g, ' ')}`, type, difficulty: 1, estimatedMinutes: 15,
    steps: [
      { id: 'email', type: 'email', title: `Fundamento — ${type.replace(/_/g, ' ')}`, description: 'Mini-módulo de concepto básico', data: { from: 'Ing. Sandra Mora', to: 'data-team@dataflow.com', subject: `Fundamento: ${type.replace(/_/g, ' ')}`, body: `Concepto básico de ${type.replace(/_/g, ' ')}. Completa el campo del formulario con lo que se pide.` } },
      { id: 'tool', type: 'tool', title: `Herramienta real — ${toolApp}`, description: 'Usa la herramienta para identificar el concepto.', data: { app: toolApp } },
      { id: 'form', type: 'form', title: 'Respuesta', description: 'Completa el campo', data: { fields } },
      { id: 'result', type: 'result', title: 'Completado', description: 'Fundamento listo', data: { type } },
    ],
    // validator 'concept' lee el campo REAL del formulario (rule.field) y exige el keyword de la herramienta.
    validation: [{ stepId: 'form', field: fields[0].key, validator: 'concept', concept, type: 'de', label: `Fundamento ${type}`, points: 10, feedback: { pass: 'Concepto identificado', fail: 'Revisa tu respuesta' } }],
  };
}

function eco(type: string, validator: 'dax' | 'automation' | 'forecast', toolApp: string, fields: { key: string; label: string; type: string }[]): FundWorkflow {
  const w: FundWorkflow = {
    id: `fund-${type}-${Date.now()}`, title: `Ecosistema — ${type.replace(/_/g, ' ')}`, type, difficulty: 3, estimatedMinutes: 30, countsAsCase: true,
    steps: [
      { id: 'email', type: 'email', title: `Ecosistema — ${type.replace(/_/g, ' ')}`, description: 'Práctica integrada del rol', data: { from: 'Ing. Sandra Mora', to: 'data-team@dataflow.com', subject: `Ecosistema: ${type.replace(/_/g, ' ')}`, body: `Práctica integrada de ${type.replace(/_/g, ' ')}. Completa los campos.` } },
      { id: 'tool', type: 'tool', title: `Herramienta real — ${toolApp}`, description: 'Usa la herramienta para el caso integrado.', data: { app: toolApp } },
      { id: 'form', type: 'form', title: 'Respuesta', description: 'Completa los campos', data: { fields } },
      { id: 'result', type: 'result', title: 'Completado', description: 'Ecosistema listo', data: { type } },
    ],
    // Los validadores advanced leen sus claves reales; el form debe proveerlas todas.
    validation: [{ stepId: 'form', field: fields[0].key, validator, type: 'advanced', label: `Ecosistema ${type}`, points: 20, feedback: { pass: 'Correcto', fail: 'Revisa tu respuesta' } }],
  };
  return w;
}

export const FUNDAMENTALS_WORKFLOWS: Record<string, () => FundWorkflow> = {
  // ── DA (Analista): Capa 0 ──
  excel_basico: () => fund('excel_basico', 'excel', 'excel', [{ key: 'row_Concepto de Excel', label: 'Concepto de Excel (tabla, tipos o Power Query) que aplicarías', type: 'textarea' }]),
  sql_basico: () => fund('sql_basico', 'sql', 'sql', [{ key: 'row_Concepto de SQL', label: 'Consulta SQL básica (SELECT/WHERE/JOIN) que harías', type: 'textarea' }]),
  catalog_basico: () => fund('catalog_basico', 'catalog', 'catalog', [{ key: 'row_Concepto de catálogo', label: 'Linaje raw→stg→mrt que localizaste en el catálogo', type: 'textarea' }]),
  bi_basico: () => fund('bi_basico', 'bi', 'bi', [
    { key: 'row_Visual del tablero', label: 'Visual del tablero (barras/tabla) que harías', type: 'textarea' },
    { key: 'row_Origen de los datos', label: 'Origen de los datos (mart/warehouse)', type: 'textarea' },
  ]),
  // ── DE (Ingeniero): Capa 0 ──
  python_basico: () => fund('python_basico', 'python', 'notebook', [{ key: 'row_Concepto de Python', label: 'Limpieza en Python/pandas que aplicarías (dropna/imputar)', type: 'textarea' }]),
  foundry_basico: () => fund('foundry_basico', 'foundry', 'pipeline', [{ key: 'row_Concepto de Foundry', label: 'Transform @transform mínimo que escribirías', type: 'textarea' }]),
  airflow_basico: () => fund('airflow_basico', 'airflow', 'airflow', [{ key: 'row_Concepto de Airflow', label: 'DAG y dependencia que identificaste', type: 'textarea' }]),
  git_basico: () => fund('git_basico', 'git', 'git', [{ key: 'row_Concepto de Git', label: 'Hallazgo del PR que revisarías (SELECT * / ref rotos)', type: 'textarea' }]),
  monitor_basico: () => fund('monitor_basico', 'monitor', 'monitor', [{ key: 'row_Estado del pipeline', label: 'Estado/SLA que observaste en el monitor (05-jul)', type: 'textarea' }]),
  // ── DS (Científico): Capa 0 ──
  stats_basico: () => fund('stats_basico', 'stats', 'stats', [{ key: 'row_Insight de stats', label: 'Insight del EDA básico (describe, nulos)', type: 'textarea' }]),
  ml_basico: () => fund('ml_basico', 'ml', 'ml', [{ key: 'row_Config del modelo', label: 'Split train/test y variable objetivo del baseline', type: 'textarea' }]),
  metricas_basico: () => fund('metricas_basico', 'metricas', 'bi', [{ key: 'row_Métricas', label: 'RMSE y accuracy del baseline reportados', type: 'textarea' }]),
  // ── Ecosistema (Capa 1, countsAsCase): el form provee TODAS las claves que lee su validador advanced ──
  ecosistema_da: () => eco('ecosistema_da', 'dax', 'powerbi', [{ key: 'row_Medida DAX', label: 'Medida DAX (CALCULATE+SUMX) sobre el mart', type: 'textarea' }]),
  ecosistema_de: () => eco('ecosistema_de', 'automation', 'automation', [
    { key: 'row_Nodos del workflow', label: 'Nodos del workflow (HTTP/SQL/notify)', type: 'textarea' },
    { key: 'row_Trigger del workflow', label: 'Trigger del workflow (cron/webhook)', type: 'textarea' },
  ]),
  ecosistema_ds: () => eco('ecosistema_ds', 'forecast', 'forecast', [
    { key: 'row_Método de pronóstico', label: 'Método de pronóstico', type: 'textarea' },
    { key: 'row_MAPE del pronóstico', label: 'MAPE del pronóstico (%)', type: 'textarea' },
  ]),
};

export const FUNDAMENTAL_TYPES = Object.keys(FUNDAMENTALS_WORKFLOWS);

export function getFundamentalWorkflow(type: string): FundWorkflow {
  const factory = FUNDAMENTALS_WORKFLOWS[type];
  return factory ? factory() : FUNDAMENTALS_WORKFLOWS.sql_basico();
}