// ─── Vacancy Analyzer — Etapa 1 (R-10 v2) ─────────────────────
// Extrae skills, años requeridos y seniority del texto de una vacante.
// Usa el provider de IA (providers/ai.ts, Gemini) si hay API key;
// si no, cae a un analizador determinístico por keywords (nunca rompe).
// REGLA DE ORO: solo el texto de la vacante usa IA; los números del
// match salen de matchScorer con el perfil real del alumno.

import { getAIProvider } from '../providers/ai';
import type { VacancySkill } from './matchScorer';

export interface AnalyzedVacancy {
  title: string;
  skills: VacancySkill[];
  requires_experience: boolean;
  min_years: number;
  senior: boolean;
  source: 'ai' | 'deterministic';
}

// ─── Analizador determinístico (fallback) ─────────────────────

const SKILL_KEYWORDS: { skill: string; keywords: string[] }[] = [
  { skill: 'SQL', keywords: ['sql', 'consultas', 'query'] },
  { skill: 'Excel', keywords: ['excel', 'hoja de calculo', 'tablas dinamicas', 'vlookup'] },
  { skill: 'Power BI', keywords: ['power bi', 'dax', 'powerbi'] },
  { skill: 'Pronóstico', keywords: ['pronostico', 'forecast', 'media movil', 'tendencia lineal', 'planeacion y pronostico'] },
  { skill: 'Automatización', keywords: ['n8n', 'power automate', 'make.com', 'automatizacion', 'workflow de automatizacion', 'webhook'] },
  { skill: 'APIs LLM', keywords: ['api de modelos', 'openai', 'anthropic', 'llm', 'chat completions', 'gemini api'] },
  { skill: 'Agentes', keywords: ['agentes', 'agente de ia', 'asistentes con llm', 'agentes con llm', 'tools y funciones'] },
  { skill: 'Prompt engineering', keywords: ['prompt engineering', 'prompts', 'few-shot', 'system prompt'] },
  { skill: 'ERP', keywords: ['sap', 'oracle', 'erp', 'sap fi', 'sap mm', 'sap sd'] },
  { skill: 'dbt', keywords: ['dbt', 'data build tool'] },
  { skill: 'Python', keywords: ['python', 'pandas', 'pyspark'] },
  { skill: 'Airflow', keywords: ['airflow', 'dag', 'orquestador'] },
  { skill: 'ETL', keywords: ['etl', 'elt', 'pipelines', 'ingesta'] },
  { skill: 'BI', keywords: ['bi', 'looker', 'tablero', 'dashboard', 'visualizacion'] },
  { skill: 'Cloud', keywords: ['aws', 's3', 'redshift', 'gcp', 'azure', 'cloud'] },
  { skill: 'CFDI', keywords: ['cfdi', 'facturacion electronica', 'sat', 'comprobante fiscal'] },
  { skill: 'Conciliación', keywords: ['conciliacion', 'bancaria'] },
  { skill: 'Nómina', keywords: ['nomina', 'isr', 'imss'] },
  { skill: 'Fiscal', keywords: ['fiscal', 'iva', 'declaracion', 'impuestos'] },
  { skill: 'Contabilidad', keywords: ['contabilidad', 'póliza', 'cuentas por pagar', 'balance general'] },
  { skill: 'Calidad de datos', keywords: ['calidad de datos', 'data quality', 'validacion'] },
  { skill: 'Resolución de incidentes', keywords: ['incidentes', 'monitoreo', 'sla'] },
];

const SENIOR_KEYWORDS = ['senior', 'liderazgo', 'lider de', 'lead', 'produccion propia', 'propietario del modulo', 'a cargo de', 'responsable de'];

function detectYears(text: string): number {
  const m = text.toLowerCase().match(/(\d+)\s*(?:\+|a )?\s*a[ñn]os?/);
  return m ? parseInt(m[1], 10) : 0;
}

export function analyzeVacancyDeterministic(text: string): AnalyzedVacancy {
  const lower = text.toLowerCase();
  // Cláusulas separadas por coma/punto/; para detectar required POR skill
  // (p.ej. "SQL obligatorio, Python deseable" → SQL peso 1, Python 0.5).
  const clauses = lower.split(/[\n\r,;.]+/).map(c => c.trim()).filter(Boolean);
  const skills: VacancySkill[] = [];
  const seen = new Set<string>();

  for (const { skill, keywords } of SKILL_KEYWORDS) {
    if (!keywords.some(k => lower.includes(k))) continue;

    let weight = 0.8;
    let required = false;
    for (const clause of clauses) {
      if (!keywords.some(k => clause.includes(k))) continue;
      if (/(obligatorio|requisito|indispensable|necesario|imprescindible|minimo)/.test(clause)) {
        weight = 1;
        required = true;
      } else if (/(deseable|opcional|plus|valorado|nice to have)/.test(clause)) {
        weight = 0.5;
      }
    }
    skills.push({ skill, required, weight: +weight.toFixed(2) });
    seen.add(skill);
  }

  const min_years = detectYears(text);
  const senior = SENIOR_KEYWORDS.some(k => lower.includes(k));
  // Un puesto que pide experiencia (1+ años) exige acreditar equivalencia →
  // la Etapa 3 existe para compensarla con evidencia verificable (densidad).
  const requires_experience = min_years >= 1;

  return {
    title: (text.match(/(?:puesto|posici[oó]n|vacante):\s*([^\n\r]+)/i)?.[1] || 'Vacante').trim().slice(0, 80),
    skills,
    requires_experience,
    min_years,
    senior,
    source: 'deterministic',
  };
}

// ─── Analizador con IA (Gemini, con fallback) ─────────────────

export async function analyzeVacancy(text: string): Promise<AnalyzedVacancy> {
  const provider = getAIProvider();
  const hasGemini = process.env.GEMINI_API_KEY && process.env.ENABLE_AI_GRADING !== 'false';

  if (!hasGemini || !('ai' in provider)) {
    return analyzeVacancyDeterministic(text);
  }

  try {
    // El provider de IA solo expone evaluateSubmission; para la extracción
    // de vacantes usamos el mismo Gemini de forma directa y parseamos JSON.
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Extrae de esta vacante: título, lista de skills (con required y weight 0-1), años mínimos de experiencia, y si es senior (requiere liderazgo/producción propia). Devuelve JSON:\n{"title": "...", "skills": [{"skill":"SQL","required":true,"weight":1}], "min_years": 2, "senior": false}\n\nVACANTE:\n${text.slice(0, 4000)}`,
      config: { responseMimeType: 'application/json' },
    });
    const out = JSON.parse((response.text || '').trim());
    const skills: VacancySkill[] = (out.skills || []).map((s: any) => ({
      skill: String(s.skill || ''),
      required: !!s.required,
      weight: Math.min(1, Math.max(0, Number(s.weight) || 1)),
    })).filter((s: VacancySkill) => s.skill);
    return {
      title: String(out.title || 'Vacante').slice(0, 80),
      skills,
      min_years: Number(out.min_years) || 0,
      senior: !!out.senior,
      requires_experience: (Number(out.min_years) || 0) >= 1 || !!out.senior,
      source: 'ai',
    };
  } catch (err) {
    console.error('VacancyAnalyzer IA falló, usando determinístico:', err);
    return analyzeVacancyDeterministic(text);
  }
}