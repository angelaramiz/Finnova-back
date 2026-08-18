// ─── Entrevista entrenada con hechos reales (R-08 Fase 2) ────
// El simulador entrevista al alumno sobre los eventos reales que
// registró (logros del expediente). Cada pregunta se basa en un logro
// concreto y se califica con rúbrica técnica.

import { buildExpediente, ExpedienteLogro } from './expediente';

export interface InterviewQuestion {
  id: string;
  logroIndex: number;
  pregunta: string;
  contexto: string;        // dato real que justifica la pregunta
  rubrica: string[];       // qué debe mencionar la respuesta
  puntajeMaximo: number;
}

export interface InterviewAnswer {
  questionId: string;
  respuesta: string;
  puntaje: number;
  feedback: string;
}

export interface InterviewSession {
  userId: string;
  specialty: string;
  preguntas: InterviewQuestion[];
  respuestas: InterviewAnswer[];
  totalPuntaje: number;
  totalMaximo: number;
  completada: boolean;
  createdAt: string;
}

// Plantillas de preguntas por tipo de logro
function preguntaPara(logro: ExpedienteLogro, idx: number): InterviewQuestion | null {
  const c = logro.categoria;

  if (c === 'incidente') {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `Dices que recuperaste el pipeline: ¿qué prueba fallaba y por qué, y qué hiciste para resolverlo?`,
      contexto: logro.datos,
      rubrica: ['dbt_test', 'positive', 'total_ventas', 'correg', 'reproces'],
      puntajeMaximo: 10,
    };
  }

  if (c === 'datos' && /SQL/i.test(logro.titulo)) {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `En tu consulta SQL: ¿cómo aseguraste que el total por cliente fuera correcto y qué error común evitaste?`,
      contexto: logro.datos,
      rubrica: ['GROUP BY', 'agregar', 'SUM', 'cliente'],
      puntajeMaximo: 10,
    };
  }

  if (c === 'datos' && /Calidad/i.test(logro.titulo)) {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `En la alerta de calidad: ¿qué decidiste y por qué era la acción correcta en lugar de ignorarla?`,
      contexto: logro.datos,
      rubrica: ['investigar', 'corregir', 'escalar', 'no ignorar'],
      puntajeMaximo: 10,
    };
  }

  if (c === 'datos' && /ETL|Pipeline/i.test(logro.titulo)) {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `En tu pipeline: ¿cómo manejaste los datos nulos y qué diferencia hace eso en el resultado final?`,
      contexto: logro.datos,
      rubrica: ['imputar', 'fillna', 'no perder', 'nulos'],
      puntajeMaximo: 10,
    };
  }

  if (c === 'facturacion' && /factura|CFDI/i.test(logro.titulo)) {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `Al emitir la factura: ¿qué validaste antes de timbrar y qué pasaría si la tasa de IVA fuera incorrecta?`,
      contexto: logro.datos,
      rubrica: ['IVA', '16%', 'RFC', 'multa', 'validar'],
      puntajeMaximo: 10,
    };
  }

  if (c === 'facturacion' && /Conciliación/i.test(logro.titulo)) {
    return {
      id: `iq-${idx}`,
      logroIndex: idx,
      pregunta: `En tu conciliación: ¿cómo identificaste la diferencia y qué registro faltaba?`,
      contexto: logro.datos,
      rubrica: ['cheque', 'sin cobrar', 'diferencia', 'registrar'],
      puntajeMaximo: 10,
    };
  }

  return null;
}

export async function startInterview(userId: string, specialty: string): Promise<InterviewSession> {
  const expediente = await buildExpediente(userId, specialty);
  const preguntas: InterviewQuestion[] = [];

  for (let i = 0; i < expediente.logros.length && preguntas.length < 5; i++) {
    const q = preguntaPara(expediente.logros[i], i);
    if (q) preguntas.push(q);
  }

  return {
    userId,
    specialty,
    preguntas,
    respuestas: [],
    totalPuntaje: 0,
    totalMaximo: preguntas.reduce((s, q) => s + q.puntajeMaximo, 0),
    completada: false,
    createdAt: new Date().toISOString(),
  };
}

// Califica una respuesta contra la rúbrica (presencia de conceptos clave)
export function evaluarRespuesta(pregunta: InterviewQuestion, respuesta: string): { puntaje: number; feedback: string } {
  const text = respuesta.toLowerCase();
  // Coincide si la respuesta contiene el término o su raíz (matchea conjugaciones)
  const aciertos = pregunta.rubrica.filter(k => text.includes(k.toLowerCase())).length;
  const ratio = pregunta.rubrica.length > 0 ? aciertos / pregunta.rubrica.length : 0;
  const puntaje = Math.round(pregunta.puntajeMaximo * ratio);

  let feedback: string;
  if (puntaje >= pregunta.puntajeMaximo * 0.8) {
    feedback = 'Respuesta sólida: usaste los conceptos técnicos clave y defendiste tu trabajo con datos.';
  } else if (puntaje >= pregunta.puntajeMaximo * 0.5) {
    feedback = 'Buena respuesta, pero puedes profundizar más en los detalles técnicos (menciona qué falló y por qué).';
  } else {
    feedback = `Falta precisión técnica. Deberías mencionar: ${pregunta.rubrica.join(', ')}. Piensa en qué evidencia concreta respalda tu logro.`;
  }

  return { puntaje, feedback };
}

export function completarEntrevista(session: InterviewSession, respuestas: InterviewAnswer[]): InterviewSession {
  const conPuntaje = session.preguntas.map(q => {
    const found = respuestas.find(r => r.questionId === q.id);
    if (!found) return { questionId: q.id, respuesta: '', puntaje: 0, feedback: 'Sin respuesta' };
    const { puntaje, feedback } = evaluarRespuesta(q, found.respuesta);
    return { questionId: q.id, respuesta: found.respuesta, puntaje, feedback };
  });

  return {
    ...session,
    respuestas: conPuntaje,
    totalPuntaje: conPuntaje.reduce((s, r) => s + r.puntaje, 0),
    completada: true,
  };
}
