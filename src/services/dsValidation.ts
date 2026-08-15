// ─── Validación DS por resultado/patrón real ──────────────────
// Análogo a runDEValidator pero para la rama Ciencia de Datos:
// analiza EDA, features y métricas con feedback de Ing. Sandra Mora.

export type DSValidatorId = 'eda' | 'model' | 'metrics';

export interface DSValidationResult {
  passed: boolean;
  feedback: string;
}

function normalize(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

function has(txt: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(txt));
}

export function validateEDA(answers: Record<string, any>): DSValidationResult {
  const desc = normalize(answers['row_Describe el dataset (filas, columnas, nulos)']);
  const insight = normalize(answers['row_Insight principal']);
  const ident = /(nulos|nulo|faltante|dropna|fillna|correlaci|distribuci|comercial del norte|churn)/.test(desc + ' ' + insight);
  if (!desc || !insight) {
    return { passed: false, feedback: 'Completa el EDA: describe el dataset (filas, columnas, nulos) y da un insight principal.' };
  }
  if (!ident) {
    return { passed: false, feedback: 'Tu EDA debe identificar los nulos/montos afectados por el incidente 05-jul y el caso churn de Comercial del Norte.' };
  }
  return { passed: true, feedback: 'EDA correcto: identificaste la degradación del mart y el foco del caso churn.' };
}

export function validateModel(answers: Record<string, any>): DSValidationResult {
  const split = normalize(answers['row_Split train/test']);
  const target = normalize(answers['row_Variable objetivo']);
  const hasSplit = /80|70|60|train/.test(split);
  const hasTarget = /churn|baja|abandono|cliente/.test(target);
  if (!hasSplit) {
    return { passed: false, feedback: 'Define un split train/test explícito (p. ej. 80/20) para el baseline.' };
  }
  if (!hasTarget) {
    return { passed: false, feedback: 'La variable objetivo del caso es el churn (baja/abandono del cliente).' };
  }
  return { passed: true, feedback: 'Modelo baseline bien definido: split y variable objetivo correctos.' };
}

export function validateMetrics(answers: Record<string, any>): DSValidationResult {
  const rmse = normalize(answers['row_RMSE del baseline']);
  const acc = normalize(answers['row_Accuracy del baseline']);
  const cmp = normalize(answers['row_Comparación vs mart recuperado']);
  const hasCmp = /(mejor|mejora|recuper|superior|0\.8|0\.85|1310|1842|disminuy|subió|subio)/.test(cmp);
  if (!rmse || !acc) {
    return { passed: false, feedback: 'Reporta las métricas del baseline (RMSE y accuracy).' };
  }
  if (!hasCmp) {
    return { passed: false, feedback: 'Compara las métricas contra las del mart recuperado: el accuracy sube y el RMSE baja tras la corrección.' };
  }
  return { passed: true, feedback: 'Evaluación correcta: métricas reportadas y comparación coherente con la recuperación del mart.' };
}

export function runDSValidator(rule: any, answers: Record<string, any>): DSValidationResult {
  switch (rule.validator) {
    case 'eda': return validateEDA(answers);
    case 'model': return validateModel(answers);
    case 'metrics': return validateMetrics(answers);
    default: return { passed: false, feedback: `Validador DS desconocido: ${rule.validator}` };
  }
}
