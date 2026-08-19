// ─── Career Center — Modo A (R-10 v2 T4) ─────────────────────
// Kit de postulación para una vacante con match ≥ 75: genera un CV a
// la medida de ESA vacante, un checklist de aplicación y selecciona la
// entrevista STAR sobre los logros reales del alumno (reusa R-08).

import { getCvExtra } from './cvProfile';
import { buildSkillProfile } from './skillProfile';
import { buildExpediente } from './expediente';

export interface CareerKit {
  vacancyTitle: string;
  skillsTarget: string[];
  cvPitch: string;             // 2-3 frases para el resumen del CV a la medida
  checklist: string[];         // pasos de postulación
  starQuestions: string[];     // preguntas STAR sobre logros reales
  evidencias: string[];        // bullets del expediente (R-08)
  match_pct: number;
}

// Genera el pitch del CV priorizando los skills que la vacante pide y
// que el alumno demuestra con evidencia real (score alto).
export async function buildCareerKit(
  userId: string,
  vacancyTitle: string,
  skillsTarget: string[],
  match_pct: number,
  specialty = 'data_engineering'
): Promise<CareerKit> {
  const [profile, expediente] = await Promise.all([
    buildSkillProfile(userId, specialty),
    buildExpediente(userId, specialty).catch(() => null),
  ]);

  const strengths = profile.strengths.filter(s => skillsTarget.some(t => s.toLowerCase().includes(t.toLowerCase())) || skillsTarget.length === 0);
  const evidenciaList = expediente?.logros?.map((l: any) => l.titulo) || [];

  const cvPitch = `Candidato con perfil en ${profile.branch} orientado a ${vacancyTitle}. ` +
    `Fortalezas: ${(strengths.length ? strengths.slice(0, 4) : profile.strengths.slice(0, 4)).join(', ')}. ` +
    `Match de ${match_pct}% con los requisitos de la vacante.`;

  const checklist = [
    'Personaliza el resumen del CV con las fortalezas alineadas a la vacante',
    'Añade los logros cuantificados de tu expediente como evidencia',
    'Prepara respuestas STAR a partir de tus casos resueltos',
    'Adjunta el link de expediente verificable',
    'Revisa ortografía y formato antes de enviar',
  ];

  const starQuestions = (evidenciaList.length ? evidenciaList.slice(0, 3) : ['Cuéntame de un caso difícil que resolviste', 'Describe un incidente que recuperaste', '¿Qué decisión técnica tomaste con datos incompletos?']);

  return {
    vacancyTitle,
    skillsTarget,
    cvPitch,
    checklist,
    starQuestions,
    evidencias: evidenciaList,
    match_pct,
  };
}