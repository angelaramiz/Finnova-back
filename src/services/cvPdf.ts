// ─── PDF semántico del CV con marca institucional ─────────────
// Genera un PDF con texto seleccionable (ATS-friendly) usando pdfkit.
// Estructura: encabezado con marca, perfil, habilidades, proyectos,
// educación, idiomas y pie institucional.

import PDFDocument from 'pdfkit';
import { CvProfileData } from './cvProfile';

const PRIMARY = '#0f3d5c';     // azul institucional
const ACCENT = '#FFB162';      // ámbar de la marca
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const LIGHT = '#eef2f7';

export async function generateCvPdf(p: CvProfileData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      bufferPages: true,
      info: {
        Title: `CV — ${p.extra.fullName || 'Alumno'} | ${p.specialty === 'data_engineering' ? 'Especialidad Data' : 'Contabilidad'}`,
        Author: 'Simulador Laboral Institucional',
        Subject: 'Curriculum Vitae — perfil verificado en simulador',
        Keywords: ['CV', 'currículum', p.specialty, 'data', 'simulador'].filter(Boolean).join(', '),
        Creator: 'Simulador Laboral v0.1.107',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;

    // ── Encabezado con marca ──
    doc.rect(0, 0, doc.page.width, 130).fill(PRIMARY);
    doc.fillColor('#fff').fontSize(26).font('Helvetica-Bold').text(
      p.extra.fullName || 'Alumno', 50, 34, { width: W }
    );
    doc.fontSize(13).font('Helvetica').text(
      p.extra.title || (p.specialty === 'data_engineering' ? 'Analista de Datos' : 'Contador General Jr'),
      { width: W }
    );
    doc.fontSize(9).fillColor('#cbd5e1').text(
      [p.extra.city, p.extra.email, p.extra.phone].filter(Boolean).join('  •  '), { width: W }
    );
    doc.moveDown(0.3);
    doc.fillColor(ACCENT).rect(50, 118, 90, 4).fill();
    doc.rect(140, 118, W - 90, 1).fillOpacity(0.3).fill('#fff');
    doc.fillOpacity(1);

    let y = 155;
    const section = (title: string) => {
      doc.fillColor(PRIMARY).fontSize(13).font('Helvetica-Bold').text(title, 50, y, { width: W });
      doc.fillColor(ACCENT).rect(50, y + 16, 26, 2.5).fill();
      doc.fillColor(TEXT);
      y += 30;
    };
    const para = (text: string, size = 10, color = TEXT) => {
      doc.fontSize(size).font('Helvetica').fillColor(color).text(text, 50, y, { width: W });
      y = doc.y + 8;
    };
    const item = (label: string, value: string, size = 10) => {
      doc.fontSize(size).font('Helvetica-Bold').fillColor(PRIMARY).text(label, 50, y, { width: 180 });
      doc.font('Helvetica').fillColor(TEXT).text(value, 240, y, { width: W - 190 });
      y = doc.y + 6;
    };

    // ── Perfil ──
    section('PERFIL');
    para(p.extra.summary || 'Profesional en formación con perfil verificado en simulador laboral institucional.');
    para(`Practica acumulada: ${p.practicePct}%  •  Dominio general: ${p.overall}/100  •  Rama: ${p.branch}`, 9, MUTED);

    // ── Habilidades ──
    section('HABILIDADES VERIFICADAS');
    if (p.strengths.length) {
      doc.font('Helvetica-Bold').fillColor('#16a34a').fontSize(10).text('Fortalezas: ' + p.strengths.join(', '), 50, y, { width: W });
      y = doc.y + 6;
    }
    if (p.skills.length) {
      // barras de habilidad
      p.skills.forEach(s => {
        doc.font('Helvetica').fillColor(TEXT).fontSize(9).text(s.label, 50, y, { width: 200 });
        doc.rect(260, y + 2, 220, 8).fill(LIGHT);
        doc.fillColor(s.score >= 80 ? '#16a34a' : s.score >= 60 ? ACCENT : '#ef4444')
          .rect(260, y + 2, (220 * s.score) / 100, 8).fill();
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`${s.score}% · ${s.level}`, 490, y, { width: 100 });
        doc.fillColor(TEXT);
        y += 16;
      });
      y += 6;
    }

    // ── Proyectos ──
    section('PROYECTOS');
    const projects = p.extra.projects?.length ? p.extra.projects : [{ name: 'Capstone integrador', desc: 'Proyecto final del simulador laboral institucional' }];
    projects.forEach(pj => item(pj.name, pj.desc || ''));

    // ── Educación ──
    section('EDUCACIÓN');
    const edu = p.extra.education?.length ? p.extra.education : [{ degree: 'Nivel en curso', school: 'Verifica con la institución', year: '' }];
    edu.forEach(ed => item(`${ed.year}${ed.year ? '  ' : ''}${ed.degree}`, ed.school || ''));

    // ── Idiomas ──
    section('IDIOMAS');
    const langs = p.extra.languages?.length ? p.extra.languages : [{ name: 'Español', level: 'Nativo' }];
    langs.forEach(l => item(l.name, l.level || ''));

    // ── Certificaciones ──
    if (p.extra.certificates?.length) {
      section('CERTIFICACIONES');
      p.extra.certificates.forEach(c => para('•  ' + c, 9.5));
    }

    // ── Áreas de mejora ──
    if (p.gaps.length) {
      section('ÁREAS DE MEJORA');
      para(p.gaps.join('  •  '), 9.5, MUTED);
    }

    // ── Pie institucional ──
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor(LIGHT).rect(0, doc.page.height - 30, doc.page.width, 30).fill();
      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED).text(
        'Documento generado por el Simulador Laboral institucional — validación académica simulada.',
        50, doc.page.height - 22, { width: W, align: 'left' }
      );
      doc.text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 22, { width: W, align: 'right' });
    }

    doc.end();
  });
}
