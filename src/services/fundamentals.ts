// ─── Fundamentos (Capa 0) + Ecosistema (Capa 1) — R-15 ────────
// Mini-módulos por herramienta (Capa 0, cierre por criterio) antes de la
// práctica integrada del rol (Capa 1). Capa 0 NO cuenta como countsAsCase
// (no infla expediente) pero sí como sims.validated → desbloquea UNLOCK_PCT.
// Regla de oro R-09: golden de motores; validadores por tipo de/ds/advanced.

export interface FundWorkflow {
  id: string; title: string; type: string; difficulty: number; estimatedMinutes: number;
  steps: any[]; validation: any[]; countsAsCase?: boolean;
}

function fund(type: string, validatorType: 'de' | 'ds' | 'advanced', validator: string, points: number, toolApp: string, fieldKey: string, fieldLabel: string): FundWorkflow {
  return {
    id: `fund-${type}-${Date.now()}`, title: `Fundamento — ${type.replace(/_/g, ' ')}`, type, difficulty: 1, estimatedMinutes: 15,
    steps: [
      { id: 'email', type: 'email', title: `Fundamento — ${type.replace(/_/g, ' ')}`, description: 'Mini-módulo de concepto básico', data: { from: 'Ing. Sandra Mora', to: 'data-team@dataflow.com', subject: `Fundamento: ${type.replace(/_/g, ' ')}`, body: `Concepto básico de ${type.replace(/_/g, ' ')}. Completa el campo del formulario con lo que se pide.` } },
      { id: 'tool', type: 'tool', title: `Herramienta real — ${toolApp}`, description: 'Usa la herramienta para identificar el concepto.', data: { app: toolApp } },
      { id: 'form', type: 'form', title: 'Respuesta', description: 'Completa el campo', data: { fields: [{ key: fieldKey, label: fieldLabel, type: 'textarea' }] } },
      { id: 'result', type: 'result', title: 'Completado', description: 'Fundamento listo', data: { type } },
    ],
    validation: [{ stepId: 'form', field: fieldKey, validator, type: validatorType, label: `Fundamento ${type}`, points, feedback: { pass: 'Correcto', fail: 'Revisa tu respuesta' } }],
  };
}

function eco(type: string, validatorType: 'de' | 'ds' | 'advanced', validator: string, toolApp: string, fieldKey: string, fieldLabel: string): FundWorkflow {
  const w = fund(type, validatorType, validator, 20, toolApp, fieldKey, fieldLabel);
  w.difficulty = 3; w.estimatedMinutes = 30;
  w.title = `Ecosistema — ${type.replace(/_/g, ' ')}`;
  w.countsAsCase = true;
  return w;
}

export const FUNDAMENTALS_WORKFLOWS: Record<string, () => FundWorkflow> = {
  // ── DA (Analista): Capa 0 ──
  excel_basico: () => fund('excel_basico', 'de', 'basic_read', 10, 'excel', 'row_Concepto de Excel', 'Concepto de Excel (tabla, tipos o Power Query) que aplicarías'),
  sql_basico: () => fund('sql_basico', 'de', 'sql', 10, 'sql', 'row_Concepto de SQL', 'Consulta SQL básica (SELECT/WHERE/JOIN) que harías'),
  catalog_basico: () => fund('catalog_basico', 'de', 'quality_decision', 10, 'catalog', 'row_Concepto de catálogo', 'Linaje raw→stg→mrt que localizaste en el catálogo'),
  bi_basico: () => fund('bi_basico', 'de', 'bi', 10, 'bi', 'row_Visual del tablero', 'Visual del tablero (barras/tabla) y su origen de datos'),
  // ── DE (Ingeniero): Capa 0 ──
  python_basico: () => fund('python_basico', 'de', 'etl_clean', 10, 'notebook', 'row_Concepto de Python', 'Limpieza en Python/pandas que aplicarías (dropna/imputar)'),
  foundry_basico: () => fund('foundry_basico', 'de', 'etl_clean', 10, 'pipeline', 'row_Concepto de Foundry', 'Transform @transform mínimo que escribirías'),
  airflow_basico: () => fund('airflow_basico', 'de', 'basic_read', 10, 'airflow', 'row_Concepto de Airflow', 'DAG y dependencia que identificaste'),
  git_basico: () => fund('git_basico', 'de', 'review', 10, 'git', 'row_Concepto de Git', 'Hallazgo del PR que revisarías (SELECT * / ref rotos)'),
  monitor_basico: () => fund('monitor_basico', 'de', 'basic_read', 10, 'monitor', 'row_Estado del pipeline', 'Estado/SLA que observaste en el monitor (05-jul)'),
  // ── DS (Científico): Capa 0 ──
  stats_basico: () => fund('stats_basico', 'ds', 'eda', 10, 'stats', 'row_Insight de stats', 'Insight del EDA básico (describe, nulos)'),
  ml_basico: () => fund('ml_basico', 'ds', 'model', 10, 'ml', 'row_Config del modelo', 'Split train/test y variable objetivo del baseline'),
  metricas_basico: () => fund('metricas_basico', 'ds', 'metrics', 10, 'bi', 'row_Métricas', 'RMSE y accuracy del baseline reportados'),
  // ── Ecosistema (Capa 1, countsAsCase) ──
  ecosistema_da: () => eco('ecosistema_da', 'advanced', 'dax', 'powerbi', 'row_Medida DAX integrada', 'Medida DAX (CALCULATE+SUMX) sobre el mart integrado'),
  ecosistema_de: () => eco('ecosistema_de', 'advanced', 'automation', 'automation', 'row_Workflow integrado', 'Workflow n8n (trigger+nodos) sobre lno_sales_pipeline'),
  ecosistema_ds: () => eco('ecosistema_ds', 'advanced', 'forecast', 'forecast', 'row_Pronóstico integrado', 'Pronóstico con media móvil y MAPE sobre el mart'),
};

export const FUNDAMENTAL_TYPES = Object.keys(FUNDAMENTALS_WORKFLOWS);

export function getFundamentalWorkflow(type: string): FundWorkflow {
  const factory = FUNDAMENTALS_WORKFLOWS[type];
  return factory ? factory() : FUNDAMENTALS_WORKFLOWS.sql_basico();
}