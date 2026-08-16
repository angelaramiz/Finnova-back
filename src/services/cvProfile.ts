// ─── CV Institucional — perfil de egreso con marca ────────────
// Combina los datos extra que llena el alumno (contacto, educación,
// proyectos) con el perfil de habilidades del simulador para generar:
//  - Un PDF semántico (texto seleccionable, tags ATS) con marca institucional
//  - Un .tex listo para Overleaf
// Se persiste en Supabase (tabla cv_profiles) o memoria.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

export interface CvExtraData {
  fullName?: string;
  title?: string;            // "Analista de Datos Jr"
  email?: string;
  phone?: string;
  city?: string;
  linkedin?: string;
  github?: string;
  education?: { degree: string; school: string; year: string }[];
  languages?: { name: string; level: string }[];
  summary?: string;
  certificates?: string[];
  projects?: { name: string; desc: string }[];
}

export interface CvProfileData {
  specialty: string;
  branch: string;
  practicePct: number;
  skills: { label: string; score: number; level: string }[];
  overall: number;
  strengths: string[];
  gaps: string[];
  extra: CvExtraData;
}

const cvStore = new Map<string, CvExtraData>();

async function saveRemote(userId: string, data: CvExtraData): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('cv_profiles').upsert(
      { user_id: userId, data: data as any, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch { /* tabla pendiente / BD pausada: memoria */ }
}

export async function getCvExtra(userId: string): Promise<CvExtraData> {
  const cached = cvStore.get(userId);
  if (cached) return cached;
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin.from('cv_profiles').select('data').eq('user_id', userId).maybeSingle();
      if (data?.data) {
        cvStore.set(userId, data.data);
        return data.data;
      }
    } catch { /* fallback */ }
  }
  const empty: CvExtraData = {};
  cvStore.set(userId, empty);
  return empty;
}

export async function saveCvExtra(userId: string, data: CvExtraData): Promise<CvExtraData> {
  const clean: CvExtraData = {
    fullName: data.fullName || '',
    title: data.title || '',
    email: data.email || '',
    phone: data.phone || '',
    city: data.city || '',
    linkedin: data.linkedin || '',
    github: data.github || '',
    summary: data.summary || '',
    education: Array.isArray(data.education) ? data.education.filter(e => e.degree) : [],
    languages: Array.isArray(data.languages) ? data.languages.filter(l => l.name) : [],
    certificates: Array.isArray(data.certificates) ? data.certificates.filter(c => c) : [],
    projects: Array.isArray(data.projects) ? data.projects.filter(p => p.name) : [],
  };
  cvStore.set(userId, clean);
  await saveRemote(userId, clean);
  return clean;
}

// ─── Escapado LaTeX ────────────────────────────────────────────

function esc(s: string): string {
  return String(s ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ─── Generador de CV (datos estructurados) ─────────────────────

export function buildCvProfile(profile: CvProfileData): CvProfileData {
  return profile;
}

// ─── Generador LaTeX (.tex para Overleaf) ──────────────────────

export function generateCvLatex(p: CvProfileData): string {
  const e = p.extra;
  const name = esc(e.fullName || 'Alumno');
  const title = esc(e.title || (p.specialty === 'data_engineering' ? 'Analista de Datos' : 'Contador General Jr'));
  const email = esc(e.email || '');
  const phone = esc(e.phone || '');
  const city = esc(e.city || '');
  const linkedin = esc(e.linkedin || '');
  const github = esc(e.github || '');
  const summary = esc(e.summary || 'Profesional en formación con perfil verificado en simulador laboral institucional.');

  const skills = p.skills.map(s => `  \\cvitem{${esc(s.label)}}{${s.score}/100 \\;--\\; ${s.level}}`).join('\n');
  const strengths = p.strengths.length ? p.strengths.map(s => `\\item ${esc(s)}`).join('\n') : '\\item Sin fortalezas destacadas aún';
  const gaps = p.gaps.length ? p.gaps.map(g => `\\item ${esc(g)}`).join('\n') : '\\item Sin áreas de mejora registradas';

  const education = (e.education || []).map(ed =>
    `  \\cvitem{${esc(ed.year || '')}}{${esc(ed.degree)} \\;--\\; ${esc(ed.school || '')}}`
  ).join('\n');

  const languages = (e.languages || []).map(l =>
    `  \\cvitem{${esc(l.name)}}{${esc(l.level || '')}}`
  ).join('\n');

  const certs = (e.certificates || []).map(c => `\\item ${esc(c)}`).join('\n');
  const projects = (e.projects || []).map(pj =>
    `  \\cvitem{${esc(pj.name)}}{${esc(pj.desc || '')}}`
  ).join('\n');

  return `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{casual}
\\moderncvcolor{blue}
\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.85]{geometry}

\\name{${name}}{}
\\title{${title}}
${email ? `\\email{${email}}` : ''}
${phone ? `\\phone{${phone}}` : ''}
${city ? `\\address{${city}}{}{}` : ''}
${linkedin ? `\\social[linkedin]{${linkedin}}` : ''}
${github ? `\\social[github]{${github}}` : ''}

\\begin{document}
\\makecvtitle

\\section{Perfil}
${summary}

\\section{Habilidades verificadas}
\\begin{itemize}
${strengths}
\\end{itemize}

\\section{Desempeño en el simulador}
Practica acumulada: ${p.practicePct}%
\\\\
Dominio general: ${p.overall}/100
\\\\
${p.skills.length ? '\\begin{itemize}' : ''}
${p.skills.length ? skills : ''}
${p.skills.length ? '\\end{itemize}' : ''}

\\section{Proyectos}
${projects || '  \\cvitem{Capstone}{Proyecto integrador del simulador laboral}'}

\\section{Educación}
${education || '  \\cvitem{--}{Nivel en curso — verifica con la institución}'}

\\section{Idiomas}
${languages || '  \\cvitem{Español}{Nativo}'}

${certs ? `\\section{Certificaciones}\n\\begin{itemize}\n${certs}\n\\end{itemize}` : ''}

\\section{Áreas de mejora}
\\begin{itemize}
${gaps}
\\end{itemize}

\\vfill
{\\footnotesize\\textit{Documento generado por el Simulador Laboral institucional — validación académica simulada.}}

\\end{document}
`;
}
