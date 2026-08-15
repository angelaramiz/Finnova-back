// ─── Guion de seguimiento (historia) de la especialidad Data ──
// Escenas coherentes por arco. TODA tarea del árbol data debe
// referenciar una escena existente aquí (auditoría story-coherence).
// Fechas del calendario simulado: HOY = miércoles 08-jul-2026.

export interface StoryScene {
  sceneId: string;
  node: 'analyst' | 'data_engineering' | 'data_science';
  fechaSim: string;      // dd-mmm (runs Airflow 03→08 jul)
  npc: string;           // Ing. Sandra Mora (data) | Lic. Gómez (contabilidad)
  dataset: string;       // debe existir en SOURCES/MODELS de DBTSim
  taskType: string;      // tipo de workflow DE/DS
  arco: 'analyst' | 'engineering' | 'science';
  desc: string;
}

// Arco Analista (semanas 1-2): llegada, acceso al mart, primera alerta.
// Arco Ingeniería (semana 4): incidente 05-jul dbt_test/positive(total_ventas).
// Arco Ciencia: caso churn de Comercial del Norte cuyas features se
//   degradan por el mismo incidente 05-jul (coherencia cruzada).
export const STORY_SCENES: StoryScene[] = [
  { sceneId: 'ana-llegada', node: 'analyst', fechaSim: '01-jul', npc: 'Ing. Sandra Mora', dataset: 'raw_ventas', taskType: 'sql_query', arco: 'analyst', desc: 'Llegada a DataFlow Analytics: primer acceso al repositorio de datos.' },
  { sceneId: 'ana-mart', node: 'analyst', fechaSim: '02-jul', npc: 'Ing. Sandra Mora', dataset: 'mrt_ventas_por_cliente', taskType: 'sql_query', arco: 'analyst', desc: 'Acceso al mart mrt_ventas_por_cliente para reportes de ventas por cliente.' },
  { sceneId: 'ana-alerta', node: 'analyst', fechaSim: '03-jul', npc: 'Sistema de Monitoreo', dataset: 'stg_clientes', taskType: 'data_quality', arco: 'analyst', desc: 'Primera alerta de calidad: registros con RFC inválido en stg_clientes.' },
  { sceneId: 'ana-profile', node: 'analyst', fechaSim: '06-jul', npc: 'Ana García (Analista)', dataset: 'int_ventas_cliente', taskType: 'sql_query', arco: 'analyst', desc: 'Profiling del modelo intermedio int_ventas_cliente para el reporte semanal.' },

  { sceneId: 'eng-incidente', node: 'data_engineering', fechaSim: '05-jul', npc: 'Sistema de Monitoreo', dataset: 'mrt_ventas_por_cliente', taskType: 'incident_recovery', arco: 'engineering', desc: 'INCIDENTE: lno_sales_pipeline falló en dbt_test — positive(total_ventas); SLA mart incumplido. La misma degradación afecta las features del caso churn.' },
  { sceneId: 'eng-dag', node: 'data_engineering', fechaSim: '06-jul', npc: 'Ing. Sandra Mora', dataset: 'raw_ventas', taskType: 'airflow_dag', arco: 'engineering', desc: 'Revisión del DAG lno_sales_pipeline y reproceso del run fallido del 05-jul.' },
  { sceneId: 'eng-pipeline', node: 'data_engineering', fechaSim: '07-jul', npc: 'Ing. Sandra Mora', dataset: 'stg_ventas', taskType: 'etl_pipeline', arco: 'engineering', desc: 'Corrección del modelo dbt y nueva ejecución limpia del pipeline.' },
  { sceneId: 'eng-review', node: 'data_engineering', fechaSim: '08-jul', npc: 'Ing. Sandra Mora', dataset: 'stg_ventas', taskType: 'code_review', arco: 'engineering', desc: 'Code review del PR #42: SELECT * en stg_ventas debe rechazarse.' },

  { sceneId: 'sci-churn', node: 'data_science', fechaSim: '07-jul', npc: 'Ing. Sandra Mora', dataset: 'int_ventas_cliente', taskType: 'eda_churn', arco: 'science', desc: 'Caso churn de Comercial del Norte: EDA con features que se degradaron por el incidente 05-jul.' },
  { sceneId: 'sci-baseline', node: 'data_science', fechaSim: '08-jul', npc: 'Ing. Sandra Mora', dataset: 'int_ventas_cliente', taskType: 'modelo_baseline', arco: 'science', desc: 'Entrenamiento del modelo baseline de churn con los datos afectados por la caída del mart.' },
  { sceneId: 'sci-eval', node: 'data_science', fechaSim: '08-jul', npc: 'Ing. Sandra Mora', dataset: 'mrt_ventas_por_cliente', taskType: 'eval_metricas', arco: 'science', desc: 'Evaluación de métricas del baseline y comparación contra el mart recuperado.' },
];

export const STORY_TASK_TYPES = STORY_SCENES.map(s => s.taskType);
export const STORY_DATASETS = STORY_SCENES.map(s => s.dataset);

export function getSceneByTaskType(taskType: string): StoryScene | undefined {
  return STORY_SCENES.find(s => s.taskType === taskType);
}
