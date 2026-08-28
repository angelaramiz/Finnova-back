// ─── Validación DE por resultado/patrón real ───────────────────
// En lugar de comparar strings exactos, estos validadores analizan el
// código/query/decisión que escribió el estudiante y devuelven feedback
// técnico, como lo haría un lead revisando el trabajo.

export type DEValidatorId = 'sql' | 'etl_clean' | 'quality_decision' | 'review' | 'incident' | 'bi' | 'basic_read' | 'concept';

export interface DEValidationResult {
  passed: boolean;
  feedback: string;
}

function normalize(v: any): string {
  return String(v ?? '').trim();
}

function has(txt: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(txt));
}

// Reconstruye el documento SQL a partir de las filas del editor
function sqlDoc(answers: Record<string, any>): string {
  return ['row_SELECT', 'row_FROM', 'row_WHERE', 'row_GROUP BY', 'row_ORDER BY', 'row_HAVING']
    .map(k => answers[k])
    .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
    .join('\n')
    .toLowerCase();
}

export function validateSQL(answers: Record<string, any>, trap?: string): DEValidationResult {
  const sql = sqlDoc(answers);
  const hasAgg = has(sql, [/\b(sum|count|avg|max|min)\s*\(/]);
  const groupByCell = normalize(answers['row_GROUP BY']);
  const hasGroupBy = /\bgroup\s+by\b/.test(sql) || groupByCell !== '';
  const aggWithoutGroupBy = hasAgg && !hasGroupBy;
  const hasTotal = /total/.test(sql);
  const hasCliente = /cliente/.test(sql);
  const hasJoin = /\bjoin\b/.test(sql);

  if (trap === 'sql_sin_group_by') {
    if (aggWithoutGroupBy) {
      return { passed: false, feedback: 'SUM() sin GROUP BY agrega TODAS las filas en un solo renglón. Agrupa por cliente_id para obtener el total por cliente.' };
    }
    if (!hasAgg) {
      return { passed: false, feedback: 'Necesitas agregar el total por cliente, por ejemplo SUM(total) as total_ventas.' };
    }
    if (!hasCliente || !hasTotal) {
      return { passed: false, feedback: 'El resultado debe incluir la columna del cliente y el total agregado (SUM(total) as total_ventas).' };
    }
    return { passed: true, feedback: 'Correcto: agregaste con GROUP BY y el total por cliente quedó bien calculado.' };
  }

  // Query normal (sin trampa): espera agregación agrupada por cliente
  if (!hasCliente) return { passed: false, feedback: 'Debes seleccionar la columna cliente_id (o el nombre del cliente).' };
  if (!hasTotal) return { passed: false, feedback: 'Falta el total agregado: agrega SUM(total) as total_ventas.' };
  if (hasAgg && !hasGroupBy) return { passed: false, feedback: 'Tienes una agregación (SUM/COUNT) sin GROUP BY: cada columna no agregada debe ir en GROUP BY.' };
  if (hasJoin && !hasAgg && hasGroupBy) return { passed: false, feedback: 'El GROUP BY sobra si no hay agregación; revisa la consulta.' };
  return { passed: true, feedback: 'La consulta es correcta: devuelve el total de ventas por cliente.' };
}

export function validateETLClean(answers: Record<string, any>, trap?: string): DEValidationResult {
  const code = normalize(answers['row_# 2. LIMPIAR DATOS']).toLowerCase();
  const usesDropna = /\bdropna\s*\(/.test(code);
  const usesImpute = /(fillna|ffill|bfill|interpolate|mean\s*\(|median\s*\(|imputar)/.test(code);
  const usesDuplicates = /drop_duplicates|dedupe/.test(code);

  if (trap === 'pipeline_datos_perdidos') {
    if (usesDropna && !usesImpute) {
      return { passed: false, feedback: 'dropna() elimina las 200 filas con nulos: pierdes registros. Imputa (fillna/media) para conservar la información.' };
    }
    if (usesImpute) {
      return { passed: true, feedback: 'Correcto: imputaste los nulos en vez de eliminarlos; se conservan las 200 filas.' };
    }
    if (usesDropna && usesImpute) {
      return { passed: true, feedback: 'Imputaste los nulos antes de limpiar; se conservan las filas. Bien.' };
    }
    return { passed: false, feedback: 'Describe la limpieza con un método concreto: imputa con fillna (media/mediana) para no perder las 200 filas.' };
  }

  if (!usesDropna && !usesImpute) {
    return { passed: false, feedback: 'Debes limpiar los datos: elimina nulos (dropna) o imputa (fillna) y quita duplicados.' };
  }
  if (!usesDuplicates && usesDropna) {
    return { passed: false, feedback: 'Falta eliminar duplicados: usa .drop_duplicates() después del manejo de nulos.' };
  }
  return { passed: true, feedback: 'Limpieza correcta: manejas nulos y duplicados.' };
}

export function validateQualityDecision(answers: Record<string, any>, field: string, trap?: string): DEValidationResult {
  const decision = normalize(answers[field]).toLowerCase();
  const ignores = has(decision, [/ignor/, /descart/, /no hacer/, /omitir/, /pasar por alto/, /nada/]);
  const acts = has(decision, [/imput/, /correg/, /investig/, /escalar/, /limpiar/, /validar/, /actualizar/, /revisar/, /analizar/, /depurar/, /rfc inv/]);

  if (trap === 'alerta_calidad_ignorada') {
    if (ignores && !acts) {
      return { passed: false, feedback: 'Ignoraste los 500 registros con RFC inválido: quedan datos fiscales incorrectos que el SAT puede rechazar. Debes investigar y corregir o escalar.' };
    }
    if (acts) {
      return { passed: true, feedback: 'Correcto: tomaste acción (investigar/corregir/escalar) en lugar de ignorar la alerta de calidad.' };
    }
    return { passed: false, feedback: 'Describe una acción concreta: investigar el origen, corregir los RFC o escalar la alerta.' };
  }

  if (acts) return { passed: true, feedback: 'Decisión correcta: documentaste una acción de remediación.' };
  if (ignores) return { passed: false, feedback: 'Ignorar la alerta no es aceptable en calidad de datos: documenta cómo vas a corregir o escalar.' };
  return { passed: false, feedback: 'Escribe tu decisión concreta (investigar, imputar, corregir o escalar).' };
}

export function validateReview(answers: Record<string, any>): DEValidationResult {
  const selectStar = normalize(answers['row_-- SELECT * detectado? (si/no)']).toLowerCase();
  const refs = normalize(answers['row_Refs rotos detectados? (si/no)']).toLowerCase();
  const veredicto = normalize(answers['row_Veredicto del review (aprobar/rechazar)']).toLowerCase();

  // Escenario conocido del PR #42: contiene SELECT * y los refs son válidos
  const detectedSelect = selectStar === 'si';
  const detectsFakeRefs = refs === 'si';
  const rejected = veredicto === 'rechazar';

  if (detectsFakeRefs) {
    return { passed: false, feedback: 'Los refs del PR apuntan a modelos existentes: no hay refs rotos. Revisa de nuevo el diff en GitSim.' };
  }
  if (!detectedSelect) {
    return { passed: false, feedback: 'Revisa el modelo stg_ventas del PR: contiene SELECT * que debe señalarse en el review.' };
  }
  if (!rejected) {
    return { passed: false, feedback: 'Un PR con SELECT * no debe aprobarse. Recházalo con un comentario en la línea exacta.' };
  }
  return { passed: true, feedback: 'Review correcto: detectaste el SELECT *, confirmaste refs válidos y rechazaste el PR con comentario.' };
}

export function validateIncident(answers: Record<string, any>): DEValidationResult {
  const task = normalize(answers['row_Tarea que falló en el DAG']).toLowerCase();
  const test = normalize(answers['row_Test que falló']).toLowerCase();
  const action = normalize(answers['row_Acción de recuperación']).toLowerCase();

  if (task && !task.includes('dbt_test')) {
    return { passed: false, feedback: 'El run del 05-jul falló en la tarea dbt_test (los tests de dbt no pasaron), no en otra tarea del DAG.' };
  }
  if (test && !(/positive/.test(test) && /total_ventas/.test(test))) {
    return { passed: false, feedback: 'El test que falló fue positive(total_ventas): el mrt_ventas_por_cliente tenía montos negativos o nulos.' };
  }
  const acts = /correg|reprocesar|fix|refactor|arreglar|re-ejecutar/.test(action);
  if (action && !acts) {
    return { passed: false, feedback: 'La recuperación requiere dos pasos: corregir el modelo dbt y reprocesar el run fallido.' };
  }
  if (!task || !test || !action) {
    return { passed: false, feedback: 'Completa el diagnóstico: qué tarea falló, qué test falló y qué acción tomaste.' };
  }
  return { passed: true, feedback: 'Diagnóstico correcto: dbt_test falló en positive(total_ventas); corregiste el modelo y reprocesaste el run.' };
}

export function validateBI(answers: Record<string, any>): DEValidationResult {
  const visual = normalize(answers['row_Visual del tablero']);
  const fuente = normalize(answers['row_Origen de los datos']);
  const ok = /barras|tabla|gráfico|grafico|linea|linea|tarjeta|kpi|punto/.test(visual)
    && /mart|warehouse|mrt|dato|base|fuente|query|ventas/.test(fuente);
  if (!visual || !fuente) return { passed: false, feedback: 'Completa el visual (barras/tabla/gráfico) y el origen de los datos (mart/warehouse).' };
  if (!ok) return { passed: false, feedback: 'Un visual BI básico: 1 gráfico (barras/tabla) alimentado de un dataset (mart/warehouse), publicado.' };
  return { passed: true, feedback: 'BI básico correcto: visual publicado desde el dataset.' };
}

// Mini-módulo de solo lectura: basta identificar el dato/estado solicitado.
export function validateBasicRead(answers: Record<string, any>): DEValidationResult {
  const field = ruleField(answers);
  if (field && String(field).trim()) return { passed: true, feedback: 'Identificación correcta (solo lectura).' };
  return { passed: false, feedback: 'Identifica el dato solicitado (estado/SLA/métrica) para completar la lectura.' };
}

function ruleField(answers: Record<string, any>): any {
  const key = Object.keys(answers).find(k => /row_/.test(k));
  return key ? answers[key] : undefined;
}

// Validadores de concepto (Capa 0, fundamentos por herramienta).
// Lee el campo REAL del formulario (rule.field) y exige mencionar el
// concepto clave de la herramienta — evita auto-aprueba en vacío.
const TOOL_KEYWORDS: Record<string, RegExp> = {
  excel: /tabla|tipo|power ?query|limpi|columna/i,
  sql: /select|where|join|group ?by|query|consulta/i,
  catalog: /linaje|lineage|catálogo|catalogo|raw|stg|mrt|dataset/i,
  bi: /visual|gráfico|grafico|barras|dashboard|tablero|kpi/i,
  python: /pandas|limpi|fillna|dropna|imputar|drop_duplicates/i,
  foundry: /transform|foundry|transformar|lectura/i,
  airflow: /dag|dependencia|airflow|schedule|trigger/i,
  git: /pr|pull request|select \*|review|rechazar|diff/i,
  monitor: /sla|estado|pipeline|falló|fallo|05-jul|alert/i,
  stats: /describe|nulos|distribución|distribucion|media|mediana|correlaci/i,
  ml: /split|train|test|target|churn|objetivo|baseline/i,
  metricas: /rmse|accuracy|métrica|metrica|precisi/i,
  default: /.+/i,
};

export function validateConcept(rule: any, answers: Record<string, any>): DEValidationResult {
  const field = String(rule.field || '');
  const raw = answers[field];
  const value = String(raw ?? '').trim();
  if (!value) return { passed: false, feedback: 'Responde con el concepto de la herramienta; el campo no puede quedar vacío.' };
  const tool = String(rule.concept || 'default').toLowerCase();
  const re = TOOL_KEYWORDS[tool] || TOOL_KEYWORDS.default;
  if (!re.test(value)) return { passed: false, feedback: `Tu respuesta no menciona el concepto clave de ${tool} (revisa la guía).` };
  return { passed: true, feedback: `Concepto de ${tool} identificado correctamente.` };
}

export function runDEValidator(rule: any, answers: Record<string, any>): DEValidationResult {
  switch (rule.validator) {
    case 'sql': return validateSQL(answers, rule.trap);
    case 'etl_clean': return validateETLClean(answers, rule.trap);
    case 'quality_decision': return validateQualityDecision(answers, rule.field, rule.trap);
    case 'review': return validateReview(answers);
    case 'incident': return validateIncident(answers);
    case 'bi': return validateBI(answers);
    case 'basic_read': return validateBasicRead(answers);
    case 'concept': return validateConcept(rule, answers);
    default: return { passed: false, feedback: `Validador desconocido: ${rule.validator}` };
  }
}
