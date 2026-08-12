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
  isTrap?: boolean;
  trapId?: string;
  trapDescription?: string;
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
      { stepId: 'spreadsheet', field: 'row_SELECT', validator: 'sql', type: 'de', label: 'Consulta SQL', points: 15, feedback: { pass: 'Consulta correcta', fail: 'Revisa la consulta SQL' } },
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
      { stepId: 'spreadsheet', field: 'row_# 2. LIMPIAR DATOS', validator: 'etl_clean', type: 'de', label: 'Limpieza de datos', points: 8, feedback: { pass: 'Limpieza correcta', fail: 'Revisa el manejo de nulos y duplicados' } },
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
            { label: 'DECISIÓN sobre datos nulos', cell_B: '' },
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
      { stepId: 'spreadsheet', field: 'row_DECISIÓN sobre datos nulos', validator: 'quality_decision', type: 'de', label: 'Decisión de calidad', points: 10, feedback: { pass: 'Decisión correcta', fail: 'Documenta una acción de remediación' } },
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

// ─── Code Review Workflow ─────────────────────────────────────

export function generateCodeReviewWorkflow(): DEWorkflow {
  return {
    id: `de-cr-${Date.now()}`,
    title: 'Code Review — Revisión de código',
    type: 'code_review',
    difficulty: 2,
    estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Solicitud de code review',
        description: 'Karla Ruiz abrió un PR en el repo lno-dbt',
        data: {
          from: 'Ing. Sandra Mora', to: 'data-engineer@dataflow.com',
          subject: 'Code review — PR #42 del repo lno-dbt',
          body: `Buenos días,\nKarla abrió el PR **#42 — stg_ventas con limpieza de nulos** en el repo lno-dbt y necesito tu revisión antes de mergear.\n\n**Revisa en GitSim:**\n1. ¿Hay SELECT * en los modelos?\n2. ¿Los refs apuntan a modelos existentes?\n3. ¿Los tests usan columnas que existen?\n4. ¿Hay datos hardcodeados?\n5. ¿El estilo sigue las guías del equipo?\n\nRegistra cada hallazgo con la línea exacta. Si el PR está bien, aprueba; si no, rechaza con comentarios.\n\nSaludos,\nIng. Sandra Mora`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Checklist de revisión',
        description: 'Marca cada hallazgo encontrado en el PR',
        data: {
          rows: [
            { label: '-- SELECT * detectado? (si/no)', cell_B: '' },
            { label: 'Refs rotos detectados? (si/no)', cell_B: '' },
            { label: 'Tests con columna inexistente? (si/no)', cell_B: '' },
            { label: 'Datos hardcodeados? (si/no)', cell_B: '' },
            { label: 'Veredicto del review (aprobar/rechazar)', cell_B: '' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Review completado',
        description: 'El code review ha sido enviado a Sandra',
        data: { repo: 'lno-dbt', pr: '#42', reviewedBy: 'Ingeniero de Datos Jr', approved: false },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_-- SELECT * detectado? (si/no)', validator: 'review', type: 'de', label: 'Code review', points: 15, feedback: { pass: 'Review correcto', fail: 'Revisa los hallazgos del PR en GitSim' } },
    ],
  };
}

// ─── Soporte de Datos Workflow ────────────────────────────────

export function generateSoporteDatosWorkflow(): DEWorkflow {
  const client = ['Comercial del Norte', 'Transportes Rápidos', 'Almacenes del Bajío'][Math.floor(Math.random() * 3)];
  return {
    id: `de-sd-${Date.now()}`,
    title: 'Soporte — Solicitud de datos',
    type: 'soporte_datos',
    difficulty: 1,
    estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Solicitud de datos',
        description: 'Un analista de negocio necesita un dataset',
        data: {
          from: 'Carlos Ríos (Analista)', to: 'data-engineering@dataflow.com',
          subject: 'Solicitud de datos — ventas de clientes',
          body: `Hola,\nPara el reporte mensual necesito el dataset **mrt_ventas_por_cliente** con las ventas de julio.\n\n**Requisitos:**\n- Columnas: cliente, num_ventas, total_ventas\n- Periodo: julio 2026\n- Formato: CSV\n\n¿Me pueden confirmar que el dato está disponible en el warehouse y enviarme el archivo?\n\nGracias,\nCarlos Ríos`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Respuesta de soporte',
        description: 'Confirma la disponibilidad del dataset',
        data: {
          rows: [
            { label: '-- Dataset solicitado', cell_B: 'mrt_ventas_por_cliente' },
            { label: 'Disponible en warehouse? (si/no)', cell_B: '' },
            { label: 'Cliente con mayor total en julio', cell_B: '' },
            { label: 'Total de ventas julio ($)', cell_B: '' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Soporte completado',
        description: 'El dataset fue entregado al analista',
        data: { dataset: 'mrt_ventas_por_cliente', requester: 'Carlos Ríos', status: 'Entregado' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Disponible en warehouse? (si/no)', label: 'Disponibilidad', type: 'exact', expected: 'si', points: 5, feedback: { pass: 'Correcto: el dataset está disponible en el warehouse', fail: 'El dataset mrt_ventas_por_cliente sí está disponible' } },
      { stepId: 'spreadsheet', field: 'row_Cliente con mayor total en julio', label: 'Top cliente', type: 'choice', expected: 'TechCorp SA', points: 5, feedback: { pass: 'Correcto: TechCorp SA lidera en ventas de julio', fail: 'El cliente con mayor total de julio es TechCorp SA' } },
    ],
  };
}

// ─── Incident Recovery Workflow ───────────────────────────────
// Tarea narrativa: el pipeline lno_sales_pipeline falló el 05-jul en
// dbt_test. El estudiante diagnostica y ejecuta la recuperación; al
// aprobar, el mundo simulado queda marcado como recuperado.

export function generateIncidentRecoveryWorkflow(): DEWorkflow {
  return {
    id: `de-inc-${Date.now()}`,
    title: 'Recuperación de incidente — lno_sales_pipeline',
    type: 'incident_recovery',
    difficulty: 3,
    estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email',
        title: 'Incidente del pipeline',
        description: 'El pipeline diario falló y el mart ejecutivo no se actualizó',
        data: {
          from: 'Sistema de Monitoreo', to: 'data-engineer@dataflow.com',
          subject: '🔴 INCIDENTE: lno_sales_pipeline falló el 05-jul',
          body: `Se detectó un incidente en el pipeline **lno_sales_pipeline**.

**Run del 05-jul:**
- Tarea con fallo: dbt_test
- Test fallido: positive(total_ventas) en mrt_ventas_por_cliente
- Consecuencia: el mart no cumplió su SLA y el panel ejecutivo quedó desactualizado.

**Tu tarea (como DE de guardia):**
1. Confirma en AirflowSim cuál tarea falló y qué test lo detonó
2. Revisa el modelo mrt_ventas_por_cliente en dbt
3. Corrige el modelo y reprocesa el run fallido
4. Verifica que el SLA del mart vuelva a verde en DataOps

Documenta tu diagnóstico y la acción tomada.

Saludos,
Sistema de Monitoreo`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet',
        title: 'Diagnóstico y recuperación',
        description: 'Registra el diagnóstico y la acción',
        data: {
          rows: [
            { label: 'Tarea que falló en el DAG', cell_B: '' },
            { label: 'Test que falló', cell_B: '' },
            { label: 'Acción de recuperación', cell_B: '' },
          ],
        },
      },
      {
        id: 'result', type: 'result',
        title: 'Incidente resuelto',
        description: 'El pipeline fue recuperado',
        data: { dag: 'lno_sales_pipeline', incident: '05-jul', recovered: true },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Tarea que falló en el DAG', validator: 'incident', type: 'de', label: 'Diagnóstico del incidente', points: 15, feedback: { pass: 'Diagnóstico correcto', fail: 'Revisa el diagnóstico del incidente' } },
    ],
  };
}

// ─── All DE Workflows ─────────────────────────────────────────

// P0-3: cada tarea DE incluye un paso `tool` que embebe la herramienta
// real (SQLSim, Notebook, GitSim, Airflow, Catalog…) como contexto de
// trabajo. La app del paso se mapea en DesktopShell.

const TOOL_APPS: Record<string, { app: string; title: string; description: string }> = {
  sql_query: { app: 'sql', title: 'SQLSim — Exploración de datos', description: 'Usa el editor SQL real con el dataset de ventas para diseñar y probar tu consulta.' },
  etl_pipeline: { app: 'notebook', title: 'Notebook — Pipeline ETL', description: 'Usa el notebook con pandas para probar la transformación sobre los datos reales.' },
  data_quality: { app: 'catalog', title: 'Data Catalog — Calidad', description: 'Revisa el catálogo y sus métricas de calidad antes de decidir.' },
  ontology_modeling: { app: 'catalog', title: 'Data Catalog — Modelado', description: 'Revisa las entidades y relaciones existentes del catálogo.' },
  airflow_dag: { app: 'airflow', title: 'Airflow — DAG lno_sales_pipeline', description: 'Revisa el DAG, sus tareas y las ejecuciones en AirflowSim.' },
  code_review: { app: 'git', title: 'GitSim — PR #42 (lno-dbt)', description: 'Revisa el diff del PR en GitSim y detecta los hallazgos.' },
  soporte_datos: { app: 'warehouse', title: 'Warehouse — Marts disponibles', description: 'Consulta el warehouse y los marts disponibles en WarehouseSim.' },
  incident_recovery: { app: 'airflow', title: 'Airflow — Incidente 05-jul', description: 'Revisa la ejecución fallida del 05-jul en AirflowSim para diagnosticar.' },
};

function withTool(wf: DEWorkflow, app: string, title: string, description: string): DEWorkflow {
  const steps = wf.steps.slice();
  const emailIdx = steps.findIndex(s => s.id === 'email');
  steps.splice(emailIdx + 1, 0, {
    id: 'tool', type: 'tool', title, description,
    data: { app },
  });
  return { ...wf, steps };
}

export const DE_WORKFLOWS: Record<string, () => DEWorkflow> = {
  sql_query: () => withTool(generateSQLQueryWorkflow(), TOOL_APPS.sql_query.app, TOOL_APPS.sql_query.title, TOOL_APPS.sql_query.description),
  etl_pipeline: () => withTool(generateETLPipelineWorkflow(), TOOL_APPS.etl_pipeline.app, TOOL_APPS.etl_pipeline.title, TOOL_APPS.etl_pipeline.description),
  data_quality: () => withTool(generateDataQualityWorkflow(), TOOL_APPS.data_quality.app, TOOL_APPS.data_quality.title, TOOL_APPS.data_quality.description),
  ontology_modeling: () => withTool(generateOntologyWorkflow(), TOOL_APPS.ontology_modeling.app, TOOL_APPS.ontology_modeling.title, TOOL_APPS.ontology_modeling.description),
  airflow_dag: () => withTool(generateAirflowDAGWorkflow(), TOOL_APPS.airflow_dag.app, TOOL_APPS.airflow_dag.title, TOOL_APPS.airflow_dag.description),
  code_review: () => withTool(generateCodeReviewWorkflow(), TOOL_APPS.code_review.app, TOOL_APPS.code_review.title, TOOL_APPS.code_review.description),
  soporte_datos: () => withTool(generateSoporteDatosWorkflow(), TOOL_APPS.soporte_datos.app, TOOL_APPS.soporte_datos.title, TOOL_APPS.soporte_datos.description),
  incident_recovery: () => withTool(generateIncidentRecoveryWorkflow(), TOOL_APPS.incident_recovery.app, TOOL_APPS.incident_recovery.title, TOOL_APPS.incident_recovery.description),
};

// ─── Trampas DE ────────────────────────────────────────────────
// Inyectan el error en el email y marcan la regla `de` correspondiente
// para que el validador evalúe la detección/corrección del estudiante.

const DE_TRAP_SCENARIOS: Record<string, { description: string }> = {
  pipeline_datos_perdidos: { description: 'El pipeline usa dropna() y pierde 200 registros con nulos' },
  sql_sin_group_by: { description: 'SUM() sin GROUP BY devuelve un solo renglón con resultado incorrecto' },
  alerta_calidad_ignorada: { description: '500 registros con RFC inválido fueron ignorados por el equipo' },
};

function applyDETrap(wf: DEWorkflow, trap: string): DEWorkflow {
  const email = wf.steps.find(s => s.id === 'email');
  const trapRule = wf.validation.find((v: any) => v.type === 'de');

  switch (trap) {
    case 'sql_sin_group_by': {
      if (email) email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nEl query anterior se ejecutó **sin GROUP BY**: SUM(total) devolvió un solo renglón con un resultado incorrecto.\nCorrige la consulta para que devuelva el total por cliente.\n`;
      if (trapRule) trapRule.trap = 'sql_sin_group_by';
      break;
    }
    case 'pipeline_datos_perdidos': {
      if (email) email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nEl pipeline usa **dropna()** y perdió 200 registros que tenían nulos.\nCorrige la limpieza para **imputar** los valores faltantes en lugar de eliminarlos.\n`;
      if (trapRule) trapRule.trap = 'pipeline_datos_perdidos';
      break;
    }
    case 'alerta_calidad_ignorada': {
      if (email) email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nEl equipo **ignoró** 500 registros con RFC inválido.\nDocumenta tu decisión: investiga, corrige o escala — no los dejes pasar.\n`;
      if (trapRule) trapRule.trap = 'alerta_calidad_ignorada';
      break;
    }
    default: break;
  }

  return {
    ...wf,
    isTrap: true,
    trapId: trap,
    trapDescription: DE_TRAP_SCENARIOS[trap]?.description || 'Error intencional en el pipeline',
  };
}

export function getDEWorkflow(type: string, trap?: string): DEWorkflow {
  const factory = DE_WORKFLOWS[type];
  const wf = factory ? factory() : generateSQLQueryWorkflow();
  return trap ? applyDETrap(wf, trap) : wf;
}
