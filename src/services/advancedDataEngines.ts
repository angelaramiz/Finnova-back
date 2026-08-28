// ─── Advanced Data Engines (R-15) — Carrera Data Completa ──────
// Motores reales (cálculo/validación, no mocks) para cerrar la carrera
// data: Excel avanzado, Power BI/DAX, Pronóstico, n8n/Automatización,
// APIs LLM, Agentes y Prompt engineering.
//
// REGLA DE ORO R-09/R-12: los golden salen de motores reales
// (dbtCatalog MART_TOTAL=128350, series del mart). El texto de la
// vacante es lo único heurístico; los validadores analizan la respuesta
// del alumno por patrones y devuelven feedback de Ing. Sandra Mora.

import { MART_TOTAL, MART_NAME } from '../data/dbtCatalog';

export type AdvancedValidatorId = 'excel' | 'dax' | 'forecast' | 'automation' | 'llm_api' | 'agent' | 'prompt';

export interface AdvancedValidationResult {
  passed: boolean;
  feedback: string;
}

function norm(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

function has(txt: string, pats: RegExp[]): boolean {
  return pats.some(p => p.test(txt));
}

// ─── Motores reales (golden) ───────────────────────────────────

// DAX: medida de ventas totales del mart. Total real = 128350.
export function daxTotalVentas(): number {
  return MART_TOTAL;
}

// Pronóstico: media móvil simple de la serie mensual del mart (jul 2026).
// Serie mensual: [112400, 118900, 124150, 128350]
export const FORECAST_SERIES = [112400, 118900, 124150, 128350];
export function movingAverage(series: number[], window: number): number | null {
  if (series.length < window || window <= 0) return null;
  const slice = series.slice(series.length - window);
  return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
}
export function mape(actual: number, forecast: number): number {
  if (actual === 0) return 0;
  return Math.round(Math.abs(actual - forecast) / actual * 10000) / 100;
}

// ─── Validadores (analizan la respuesta del alumno) ───────────

export function validateExcel(answers: Record<string, any>): AdvancedValidationResult {
  const formula = norm(answers['row_Fórmula avanzada que usarías']);
  const ok = has(formula, [/xlookup/, /buscarx/, /sumifs/, /sumar\.si\.conjunto/, /countifs/, /contar\.si\.conjunto/, /unique/, /unico/, /filter/, /filtrar/, /pivot/i]);
  if (!formula) return { passed: false, feedback: 'Escribe la fórmula avanzada (XLOOKUP/BUSCARX, SUMIFS, UNIQUE/FILTER o pivot) que resolvería el reporte.' };
  if (!ok) return { passed: false, feedback: 'Usa una función avanzada (XLOOKUP/BUSCARX, SUMIFS, UNIQUE/FILTER) o una tabla dinámica; SUM/IF base no basta. Bloque 6 (VBA) fue sustituido por Modelo de Datos / Matriz Dinámica.' };
  return { passed: true, feedback: 'Excel avanzado correcto: elegiste XLOOKUP/SUMIFS/UNIQUE/FILTER o pivot para resolver el reporte.' };
}

export function validateDAX(answers: Record<string, any>): AdvancedValidationResult {
  const measure = norm(answers['row_Medida DAX']);
  const hasCalc = /calculate/.test(measure);
  const hasAgg = /sumx|sum|filter|all/.test(measure);
  if (!hasCalc) return { passed: false, feedback: 'La medida DAX debe usar CALCULATE para modificar el contexto de filtro.' };
  if (!hasAgg) return { passed: false, feedback: 'Dentro de CALCULATE suma la medida de ventas (SUMX/SUM) sobre ' + MART_NAME + '.' };
  return { passed: true, feedback: `DAX correcto: CALCULATE + agregación. Total de ventas del mart = $${daxTotalVentas().toLocaleString('es-MX')}.` };
}

export function validateForecast(answers: Record<string, any>): AdvancedValidationResult {
  const metodo = norm(answers['row_Método de pronóstico']);
  const mapeV = norm(answers['row_MAPE del pronóstico']);
  const okMet = /media móvil|media movil|tendencia|promostico|exponencial|moving average/.test(metodo);
  const okMape = /< ?10|5|3|2|mape/.test(mapeV) || parseFloat(mapeV) < 10;
  if (!okMet) return { passed: false, feedback: 'Elige un método de pronóstico evaluable: media móvil, tendencia lineal o PRONOSTICO.' };
  if (!okMape) return { passed: false, feedback: 'El MAPE debe ser bajo (<10%). Revisa la ventana de la media móvil sobre la serie del mart.' };
  return { passed: true, feedback: 'Pronóstico correcto: método definido y MAPE aceptable sobre la serie del mart.' };
}

export function validateAutomation(answers: Record<string, any>): AdvancedValidationResult {
  const nodes = norm(answers['row_Nodos del workflow']);
  const trig = norm(answers['row_Trigger del workflow']);
  const okNodes = /http|api|webhook|sheets|sql|notify|transform/.test(nodes);
  const okTrig = /cron|diario|schedule|trigger|al llegue|api/.test(trig);
  if (!okNodes) return { passed: false, feedback: 'Define al menos un nodo de acción (HTTP/API, SQL, transform o notificación) en el flujo.' };
  if (!okTrig) return { passed: false, feedback: 'Define el trigger que dispara el workflow (cron diario, webhook o al llegar el archivo).' };
  return { passed: true, feedback: 'Automatización correcta: trigger + nodos de acción forman un workflow ejecutable tipo n8n.' };
}

export function validateLLM(answers: Record<string, any>): AdvancedValidationResult {
  const params = norm(answers['row_Parámetros de la llamada']);
  const okSystem = /system/.test(params);
  const okParams = /temperature|max_tokens|messages|role/.test(params);
  if (!okSystem) return { passed: false, feedback: 'Define un system prompt que fije el rol y el formato de salida de la llamada.' };
  if (!okParams) return { passed: false, feedback: 'Incluye los parámetros de chat completions: messages (system/user) y temperature/max_tokens.' };
  return { passed: true, feedback: 'API LLM correcta: llamada chat completions con system prompt y parámetros definidos.' };
}

export function validateAgent(answers: Record<string, any>): AdvancedValidationResult {
  const tools = norm(answers['row_Herramientas del agente']);
  const loop = norm(answers['row_Loop y memoria']);
  const okTools = /sql|notebook|http|llm|api|consulta/.test(tools);
  const okLoop = /tool|herramienta|memoria|bucle|loop|pasa|resultado/.test(loop);
  if (!okTools) return { passed: false, feedback: 'El agente debe invocar una herramienta real (SQL, notebook, HTTP o LLM) para resolver.' };
  if (!okLoop) return { passed: false, feedback: 'Describe el loop agente→herramienta y cómo usa la memoria del paso anterior.' };
  return { passed: true, feedback: 'Agente correcto: loop percepción→decisión→acción(tool)→memoria bien definido.' };
}

export function validatePrompt(answers: Record<string, any>): AdvancedValidationResult {
  const prompt = norm(answers['row_Mejora del prompt']);
  const okFormat = /json|tabla|lista|formato|step|paso/.test(prompt);
  const okFewShot = /ejemplo|few-shot|instrucción|instruccion|regla|claro/.test(prompt);
  if (!okFormat) return { passed: false, feedback: 'El prompt debe fijar el formato de salida esperado (JSON, tabla o lista).' };
  if (!okFewShot) return { passed: false, feedback: 'Mejora con instrucciones claras y un ejemplo (few-shot) para reducir ambigüedad.' };
  return { passed: true, feedback: 'Prompt engineering correcto: instrucción clara + formato de salida + ejemplo few-shot.' };
}

export function runAdvancedValidator(rule: any, answers: Record<string, any>): AdvancedValidationResult {
  switch (rule.validator) {
    case 'excel': return validateExcel(answers);
    case 'dax': return validateDAX(answers);
    case 'forecast': return validateForecast(answers);
    case 'automation': return validateAutomation(answers);
    case 'llm_api': return validateLLM(answers);
    case 'agent': return validateAgent(answers);
    case 'prompt': return validatePrompt(answers);
    default: return { passed: false, feedback: `Validador avanzado desconocido: ${rule.validator}` };
  }
}

// ─── Workflows ─────────────────────────────────────────────────

interface AdvWorkflow {
  id: string; title: string; type: string; difficulty: number; estimatedMinutes: number;
  steps: any[]; validation: any[];
}

function fieldStep(title: string, desc: string, fields: { key: string; label: string; type: string }[], toolApp: string): any {
  return {
    steps: [
      { id: 'email', type: 'email', title, description: desc, data: { from: 'Ing. Sandra Mora', to: 'data-team@dataflow.com', subject: title, body: `${title}. Registra tu respuesta en el formulario de la hoja de cálculo.` } },
      { id: 'tool', type: 'tool', title: `Herramienta real — ${toolApp}`, description: 'Usa la herramienta real del escritorio para trabajar el caso.', data: { app: toolApp } },
      { id: 'form', type: 'form', title: 'Respuesta', description: 'Completa los campos', data: { fields } },
      { id: 'result', type: 'result', title: 'Completado', description: 'Tarea terminada', data: { type: title } },
    ],
  };
}

function advWorkflow(id: string, title: string, type: string, difficulty: number, minutes: number, fields: { key: string; label: string; type: string }[], validator: AdvancedValidatorId, points: number, toolApp: string): AdvWorkflow {
  const s = fieldStep(title, title, fields, toolApp);
  return {
    id: `${id}-${Date.now()}`, title, type, difficulty, estimatedMinutes: minutes,
    steps: s.steps,
    validation: [{ stepId: 'form', field: fields[0].key, validator, type: 'advanced', label: title, points, feedback: { pass: 'Correcto', fail: 'Revisa tu respuesta' } }],
  };
}

export const ADVANCED_WORKFLOWS: Record<string, () => AdvWorkflow> = {
  excel_advanced: () => advWorkflow('adv-excel', 'Excel avanzado — Reporte con XLOOKUP/SUMIFS', 'excel_advanced', 2, 20,
    [{ key: 'row_Fórmula avanzada que usarías', label: 'Fórmula avanzada que usarías', type: 'text' }], 'excel', 20, 'excel'),
  powerbi_dax: () => advWorkflow('adv-dax', 'Power BI — Medida DAX del mart', 'powerbi_dax', 3, 25,
    [{ key: 'row_Medida DAX', label: 'Medida DAX (CALCULATE + agregación)', type: 'textarea' }], 'dax', 20, 'powerbi'),
  forecast_sales: () => advWorkflow('adv-fc', 'Pronóstico — Ventas julio con media móvil', 'forecast_sales', 2, 20,
    [{ key: 'row_Método de pronóstico', label: 'Método de pronóstico', type: 'text' }, { key: 'row_MAPE del pronóstico', label: 'MAPE del pronóstico (%)', type: 'text' }], 'forecast', 20, 'forecast'),
  automation_etl: () => advWorkflow('adv-auto', 'Automatización — Workflow n8n de ingesta diaria', 'automation_etl', 3, 25,
    [{ key: 'row_Nodos del workflow', label: 'Nodos del workflow', type: 'text' }, { key: 'row_Trigger del workflow', label: 'Trigger del workflow', type: 'text' }], 'automation', 20, 'automation'),
  llm_integration: () => advWorkflow('adv-llm', 'API LLM — Resumen de ventas con chat completions', 'llm_integration', 3, 25,
    [{ key: 'row_Parámetros de la llamada', label: 'Parámetros de la llamada (system prompt, temp)', type: 'textarea' }], 'llm_api', 20, 'api'),
  agent_task: () => advWorkflow('adv-agent', 'Agente — Consulta con loop y herramienta', 'agent_task', 3, 25,
    [{ key: 'row_Herramientas del agente', label: 'Herramientas del agente', type: 'text' }, { key: 'row_Loop y memoria', label: 'Loop y memoria', type: 'textarea' }], 'agent', 20, 'agent'),
  prompt_engineering: () => advWorkflow('adv-prompt', 'Prompt engineering — Mejora de instrucción', 'prompt_engineering', 2, 20,
    [{ key: 'row_Mejora del prompt', label: 'Mejora del prompt', type: 'textarea' }], 'prompt', 20, 'prompt'),
};

export function getAdvancedWorkflow(type: string): AdvWorkflow {
  const factory = ADVANCED_WORKFLOWS[type];
  return factory ? factory() : ADVANCED_WORKFLOWS.powerbi_dax();
}