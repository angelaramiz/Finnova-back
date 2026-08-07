// ─── Data Engineering Workflows ────────────────────────────────
// Workflows para Ingeniero de Datos Jr con Palantir Foundry

function r(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export interface DEWorkflow {
  id: string;
  title: string;
  type: string;
  difficulty: number;
  estimatedMinutes: number;
  steps: any[];
  validation: any[];
}

// ─── SQL Workflows ────────────────────────────────────────────

export function generateSQLQueryWorkflow(): DEWorkflow {
  const tables = [
    { name: 'ventas', columns: ['id', 'fecha', 'cliente_id', 'producto', 'cantidad', 'precio_unitario', 'total'] },
    { name: 'clientes', columns: ['id', 'nombre', 'rfc', 'ciudad', 'sector'] },
    { name: 'productos', columns: ['id', 'nombre', 'categoria', 'precio', 'stock'] },
  ];
  const selectedTable = tables[0];
  const queryType = 'SELECT con JOIN';

  return {
    id: `de-sql-${Date.now()}`,
    title: 'Consulta SQL — Análisis de ventas',
    type: 'sql_query',
    difficulty: 1,
    estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Solicitud del Lead',
        description: 'Ing. Sandra Mora necesita datos de ventas',
        data: {
          from: 'Ing. Sandra Mora', to: 'data-engineer@dataflow.com',
          subject: 'Datos de ventas para análisis mensual',
          body: `Buenos días,\nNecesito una consulta que muestre el total de ventas por cliente para el mes de julio.\n\n**Tabla:** ventas\n**Filtro:** fecha BETWEEN '2026-07-01' AND '2026-07-31'\n**Agrupación:** por cliente_id\n**Orden:** por total descendente\n\nFavor de generar el SQL y documentar el resultado.\n\nSaludos,\nIng. Sandra Mora`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Editor SQL — Consulta de ventas',
        description: 'Escribe la consulta SQL correcta',
        data: {
          rows: [
            { label: '-- Escribe tu consulta SQL aquí', cell_B: '' },
            { label: 'SELECT', cell_B: 'cliente_id, SUM(total) as total_ventas' },
            { label: 'FROM', cell_B: 'ventas' },
            { label: 'WHERE', cell_B: "fecha BETWEEN '2026-07-01' AND '2026-07-31'" },
            { label: 'GROUP BY', cell_B: 'cliente_id' },
            { label: 'ORDER BY', cell_B: 'total_ventas DESC' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Consulta completada',
        description: 'La consulta SQL ha sido ejecutada',
        data: { queryType: 'SELECT con JOIN', table: 'ventas', rowsAffected: 5 },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_SELECT', label: 'SELECT', type: 'exact', expected: 'cliente_id, SUM(total) as total_ventas', points: 5, feedback: { pass: 'SELECT correcto', fail: 'Debes seleccionar cliente_id y SUM(total)' } },
      { stepId: 'spreadsheet', field: 'row_WHERE', label: 'WHERE', type: 'exact', expected: "fecha BETWEEN '2026-07-01' AND '2026-07-31'", points: 5, feedback: { pass: 'WHERE correcto', fail: 'Filtra por fecha de julio 2026' } },
      { stepId: 'spreadsheet', field: 'row_GROUP BY', label: 'GROUP BY', type: 'exact', expected: 'cliente_id', points: 5, feedback: { pass: 'GROUP BY correcto', fail: 'Agrupa por cliente_id' } },
    ],
  };
}

// ─── Python/ETL Workflows ─────────────────────────────────────

export function generateETLPipelineWorkflow(): DEWorkflow {
  return {
    id: `de-etl-${Date.now()}`,
    title: 'Pipeline ETL — Transformación de datos',
    type: 'etl_pipeline',
    difficulty: 2,
    estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Tarea de pipeline',
        description: 'Crear pipeline de ingesta de datos',
        data: {
          from: 'Ing. Sandra Mora', to: 'data-engineer@dataflow.com',
          subject: 'Nuevo pipeline de ingesta — CSV de ventas',
          body: `Buenos días,\nNecesitamos un pipeline ETL para ingerir archivos CSV de ventas diarias.\n\n**Requisitos:**\n1. Leer CSV de la carpeta /data/raw/ventas/\n2. Limpiar datos (nulos, duplicados)\n3. Calcular totales (cantidad × precio)\n4. Guardar en tabla 'ventas_procesadas'\n5. Registrar métricas de calidad\n\nUsa Python con pandas. Documenta cada paso.\n\nSaludos,\nIng. Sandra Mora`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Código ETL — Pipeline de ventas',
        description: 'Completa el código Python del pipeline',
        data: {
          rows: [
            { label: 'import pandas as pd', cell_B: '' },
            { label: '', cell_B: '' },
            { label: '# 1. LEER CSV', cell_B: 'df = pd.read_csv("/data/raw/ventas/daily_sales.csv")' },
            { label: '# 2. LIMPIAR DATOS', cell_B: 'df = df.dropna().drop_duplicates()' },
            { label: '# 3. CALCULAR TOTALES', cell_B: 'df["total"] = df["cantidad"] * df["precio_unitario"]' },
            { label: '# 4. GUARDAR EN TABLA', cell_B: 'df.to_sql("ventas_procesadas", conn, if_exists="append")' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Pipeline creado',
        description: 'El pipeline ETL ha sido configurado',
        data: { pipeline: 'ventas_diarias', source: 'CSV', destination: 'PostgreSQL', rowsProcessed: 1500 },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_# 1. LEER CSV', label: 'Lectura CSV', type: 'exact', expected: 'df = pd.read_csv("/data/raw/ventas/daily_sales.csv")', points: 4, feedback: { pass: 'Lectura correcta', fail: 'Usa pd.read_csv para leer el archivo' } },
      { stepId: 'spreadsheet', field: 'row_# 2. LIMPIAR DATOS', label: 'Limpieza', type: 'exact', expected: 'df = df.dropna().drop_duplicates()', points: 4, feedback: { pass: 'Limpieza correcta', fail: 'Elimina nulos y duplicados con dropna().drop_duplicates()' } },
      { stepId: 'spreadsheet', field: 'row_# 3. CALCULAR TOTALES', label: 'Cálculo', type: 'exact', expected: 'df["total"] = df["cantidad"] * df["precio_unitario"]', points: 4, feedback: { pass: 'Cálculo correcto', fail: 'Total = cantidad × precio_unitario' } },
    ],
  };
}

// ─── Data Quality Workflow ────────────────────────────────────

export function generateDataQualityWorkflow(): DEWorkflow {
  return {
    id: `de-dq-${Date.now()}`,
    title: 'Calidad de Datos — Validación de schema',
    type: 'data_quality',
    difficulty: 2,
    estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Alerta de calidad',
        description: 'Se detectaron datos inconsistentes',
        data: {
          from: 'Sistema de Monitoreo', to: 'data-engineer@dataflow.com',
          subject: '⚠ Alerta: Datos faltantes en tabla ventas',
          body: `Se han detectado ${r(50, 200)} registros con campos nulos en la tabla 'ventas'.\n\n**Campos afectados:**\n- cliente_id: ${r(10, 50)} nulos\n- producto: ${r(5, 30)} nulos\n- total: ${r(20, 80)} nulos\n\n**Acción requerida:**\n1. Investigar origen de los datos faltantes\n2. Decidir: imputar, excluir o escalar\n3. Documentar la decisión tomada`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Reporte de calidad de datos',
        description: 'Registra las métricas de calidad',
        data: {
          rows: [
            { label: 'MÉTRICA', cell_B: 'VALOR', cell_C: 'ESTADO' },
            { label: 'Registros totales', cell_B: 15000, cell_C: '✓' },
            { label: 'Registros nulos', cell_B: 250, cell_C: '⚠' },
            { label: '% Completitud', cell_B: '=(B2-B3)/B2*100', formula: '=(B2-B3)/B2*100' },
            { label: 'Duplicados', cell_B: 45, cell_C: '⚠' },
            { label: '% Unicidad', cell_B: '=(B2-B5)/B2*100', formula: '=(B2-B5)/B2*100' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Análisis completado',
        description: 'Métricas de calidad documentadas',
        data: { totalRecords: 15000, nullRecords: 250, duplicates: 45 },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_% Completitud', label: 'Completitud', type: 'calculated', expected: 98.33, tolerance: 0.1, points: 5, feedback: { pass: 'Completitud correcta', fail: 'Completitud = (15000-250)/15000 × 100 = 98.33%' } },
    ],
  };
}

// ─── Ontology Workflow ────────────────────────────────────────

export function generateOntologyWorkflow(): DEWorkflow {
  return {
    id: `de-ont-${Date.now()}`,
    title: 'Modelado Ontología — Entidades del negocio',
    type: 'ontology_modeling',
    difficulty: 3,
    estimatedMinutes: 30,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Tarea de modelado',
        description: 'Crear modelo semántico para el dominio de ventas',
        data: {
          from: 'Ing. Sandra Mora', to: 'data-engineer@dataflow.com',
          subject: 'Modelado de Ontología — Dominio de Ventas',
          body: `Buenos días,\nNecesito que diseñes el modelo de Ontología para el dominio de ventas.\n\n**Entidades requeridas:**\n1. Cliente (nombre, rfc, sector, ciudad)\n2. Venta (fecha, monto, estado)\n3. Producto (nombre, categoría, precio)\n\n**Relaciones:**\n- Cliente → realizó → Venta\n- Venta → incluye → Producto\n\nDocumenta las propiedades y relaciones en la hoja de cálculo.\n\nSaludos,\nIng. Sandra Mora`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Modelo de Ontología',
        description: 'Define entidades y relaciones',
        data: {
          rows: [
            { label: 'ENTIDAD', cell_B: 'PROPIEDADES', cell_C: 'TIPO' },
            { label: 'Cliente', cell_B: 'nombre, rfc, sector, ciudad', cell_C: 'Object' },
            { label: 'Venta', cell_B: 'fecha, monto, estado', cell_C: 'Object' },
            { label: 'Producto', cell_B: 'nombre, categoría, precio', cell_C: 'Object' },
            { label: '', cell_B: '' },
            { label: 'RELACIÓN', cell_B: 'ORIGEN', cell_C: 'DESTINO' },
            { label: 'realizó', cell_B: 'Cliente', cell_C: 'Venta' },
            { label: 'incluye', cell_B: 'Venta', cell_C: 'Producto' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Ontología modelada',
        description: 'El modelo semántico ha sido creado',
        data: { entities: 3, relationships: 2, properties: 10 },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Cliente', label: 'Entidad Cliente', type: 'exact', expected: 'Cliente', points: 3, feedback: { pass: 'Entidad correcta', fail: 'La entidad Cliente debe existir' } },
      { stepId: 'spreadsheet', field: 'row_realizó', label: 'Relación', type: 'exact', expected: 'realizó', points: 3, feedback: { pass: 'Relación correcta', fail: 'La relación Cliente-REALIZÓ-Venta es requerida' } },
    ],
  };
}

// ─── Cloud/Airflow Workflow ───────────────────────────────────

export function generateAirflowDAGWorkflow(): DEWorkflow {
  return {
    id: `de-airflow-${Date.now()}`,
    title: 'Orquestación — DAG de Airflow',
    type: 'airflow_dag',
    difficulty: 3,
    estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Tarea de orquestación',
        description: 'Crear DAG para pipeline diario',
        data: {
          from: 'Ing. Sandra Mora', to: 'data-engineer@dataflow.com',
          subject: 'DAG Airflow — Pipeline diario de ventas',
          body: `Buenos días,\nNecesitamos un DAG de Airflow para orquestar el pipeline diario de ventas.\n\n**Tareas del DAG:**\n1. extract_raw_data (06:00)\n2. transform_data (06:30)\n3. validate_quality (07:00)\n4. load_to_warehouse (07:30)\n5. notify_team (08:00)\n\n**Dependencias:** Cada tarea depende de la anterior.\n**Reintentos:** 3 con delay de 5 min.\n**Alertas:** Slack en caso de fallo.\n\nSaludos,\nIng. Sandra Mora`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'DAG de Airflow',
        description: 'Define las tareas y dependencias',
        data: {
          rows: [
            { label: 'TAREA', cell_B: 'DEPENDENCIA', cell_C: 'HORA', cell_D: 'REINTENTOS' },
            { label: 'extract_raw_data', cell_B: 'None', cell_C: '06:00', cell_D: 3 },
            { label: 'transform_data', cell_B: 'extract_raw_data', cell_C: '06:30', cell_D: 3 },
            { label: 'validate_quality', cell_B: 'transform_data', cell_C: '07:00', cell_D: 2 },
            { label: 'load_to_warehouse', cell_B: 'validate_quality', cell_C: '07:30', cell_D: 3 },
            { label: 'notify_team', cell_B: 'load_to_warehouse', cell_C: '08:00', cell_D: 1 },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'DAG creado',
        description: 'El DAG de Airflow ha sido configurado',
        data: { dag: 'ventas_diarias', tasks: 5, schedule: '0 6 * * *' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_extract_raw_data', label: 'Primera tarea', type: 'exact', expected: 'extract_raw_data', points: 3, feedback: { pass: 'Primera tarea correcta', fail: 'La primera tarea debe ser extract_raw_data' } },
      { stepId: 'spreadsheet', field: 'row_notify_team', label: 'Última tarea', type: 'exact', expected: 'notify_team', points: 3, feedback: { pass: 'Última tarea correcta', fail: 'La última tarea debe ser notify_team' } },
    ],
  };
}

// ─── All DE Workflows ─────────────────────────────────────────

export const DE_WORKFLOWS: Record<string, () => DEWorkflow> = {
  sql_query: generateSQLQueryWorkflow,
  etl_pipeline: generateETLPipelineWorkflow,
  data_quality: generateDataQualityWorkflow,
  ontology_modeling: generateOntologyWorkflow,
  airflow_dag: generateAirflowDAGWorkflow,
};

export function getDEWorkflow(type: string): DEWorkflow {
  const factory = DE_WORKFLOWS[type];
  return factory ? factory() : generateSQLQueryWorkflow();
}
