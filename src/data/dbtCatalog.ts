// ─── Catálogo dbt — versión backend auto-contenida (R-09) ─────
// El pipeline dbt real vive en alumnos/src/components/DBTSim.tsx
// (SOURCES/MODELS/compileModelSql). Este catálogo es la proyección
// backend de los nombres de datasets, tests y golden values que el
// generador de casos necesita SIN depender de alumnos/ (el submódulo
// Finnova-back se despliega solo).
//
// REGLA DE ORO: los golden values aquí son calculados por los motores
// reales (compileModelSql). El test tests/de-motors.test.ts verifica
// que el total del mart coincide con la suma de stg_ventas; el test
// tests/story-coherence.test.ts verifica que este catálogo coincide
// con SOURCES/MODELS reales.

// Datasets fuente (raw) y modelos dbt (staging/intermediate/marts)
export const DBT_SOURCES = ['raw_ventas', 'raw_clientes'];
export const DBT_MODELS = ['stg_ventas', 'stg_clientes', 'int_ventas_cliente', 'mrt_ventas_por_cliente'];
export const DBT_DATASETS = [...DBT_SOURCES, ...DBT_MODELS];

// Mart principal: mrt_ventas_por_cliente (total de ventas agregado)
export const MART_NAME = 'mrt_ventas_por_cliente';
export const MART_TOTAL = 128350; // verificado por tests/de-motors.test.ts

// Pipeline orquestado (AirflowSim/DataOpsSim)
export const DAG_ID = 'lno_sales_pipeline';

// Incidente canónico 05-jul (hecho fijo, idéntico para todos)
export const INCIDENT = {
  fechaSim: '05-jul',
  dagId: DAG_ID,
  failedTask: 'dbt_test',
  failedTest: 'positive(total_ventas)',
  affectedModel: MART_NAME,
  sla: 'breached' as const,
};

// Tests dbt definidos en DBTSim (para validación de calidad)
export const DBT_TESTS = [
  { model: 'stg_ventas', column: 'id', type: 'not_null', label: 'not_null(id)' },
  { model: 'stg_ventas', column: 'total', type: 'positive', label: 'positive(total > 0)' },
  { model: 'stg_clientes', column: 'cliente_id', type: 'unique', label: 'unique(cliente_id)' },
  { model: 'int_ventas_cliente', column: 'venta_id', type: 'not_null', label: 'not_null(venta_id)' },
  { model: MART_NAME, column: 'total_ventas', type: 'positive', label: 'positive(total_ventas)' },
];