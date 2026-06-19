/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

export interface GradingResult {
  score: number;
  passed: boolean;
  feedback: string;
  evaluationType: 'deterministic' | 'ai_evaluated' | 'hybrid';
}

export interface AIProvider {
  /**
   * Evaluates a user practical exercise submission using Gemini AI or structured rubrics
   */
  evaluateSubmission(
    exercise: {
      id: string;
      title: string;
      exerciseType: string;
      question: string;
      prompt?: string;
      correctAnswer: string;
      rubrics?: any;
      maxPoints: number;
    },
    userAnswer: string
  ): Promise<GradingResult>;
}

/**
 * Standard Mock provider returning simulated or heuristic evaluation
 */
export class MockAIProvider implements AIProvider {
  async evaluateSubmission(exercise: any, userAnswer: string): Promise<GradingResult> {
    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanCorrect = exercise.correctAnswer.trim().toLowerCase();
    
    const isExact = cleanUser === cleanCorrect;
    const score = isExact ? exercise.maxPoints : 0;
    const passed = isExact;
    const feedback = isExact
      ? '¡Excelente trabajo! Tu cálculo coincide perfectamente con el resultado esperado.'
      : `Heredando validación por defecto. Tu respuesta "${userAnswer}" no coincide exactamente con el valor clave de control "${exercise.correctAnswer}". Revisa tus cifras e inténtalo de nuevo.`;

    return {
      score,
      passed,
      feedback,
      evaluationType: 'deterministic',
    };
  }
}

/**
 * Gemini AI Production-grade implementation
 */
export class GeminiAIProvider implements AIProvider {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  async evaluateSubmission(exercise: any, userAnswer: string): Promise<GradingResult> {
    // 1. Perform a deterministic fast-pass. If user got the exact key, give them max score instantly.
    const cleanUser = userAnswer.trim().replace(/[$,\s]/g, '').toLowerCase();
    const cleanCorrect = exercise.correctAnswer.trim().replace(/[$,\s]/g, '').toLowerCase();

    const isExact = cleanUser === cleanCorrect;

    if (isExact) {
      return {
        score: exercise.maxPoints,
        passed: true,
        feedback: '¡Impecable! Tu cálculo es numéricamente exacto y cumple con todas las heurísticas financieras del ejercicio. Sigue adelante.',
        evaluationType: 'deterministic',
      };
    }

    // 2. If it is multiple choice, and it was wrong, fail immediately (to save tokens + maintain deterministic standards)
    if (exercise.exerciseType === 'multiple_choice') {
      return {
        score: 0,
        passed: false,
        feedback: `La respuesta seleccionada no es correcta. La opción esperada era la "${exercise.correctAnswer}". Te invitamos a repasar los conceptos del clip de video e intentar otra opción.`,
        evaluationType: 'deterministic',
      };
    }

    // 3. Under feature flag or missing key, bypass LLM
    if (!this.ai || process.env.ENABLE_AI_GRADING === 'false') {
      return {
        score: 0,
        passed: false,
        feedback: `La cifra no coincide con el valor de control "${exercise.correctAnswer}". [Módulo IA inactivo - Calificación determinista activa]`,
        evaluationType: 'deterministic',
      };
    }

    try {
      console.log(`Analyzing exercise "${exercise.title}" with Gemini AI for userAnswer: "${userAnswer}"`);

      const rubricString = exercise.rubrics ? JSON.stringify(exercise.rubrics) : 'No specific rubric';
      
      const systemPrompt = `Eres un tutor financiero senior y evaluador edtech para una plataforma de microaprendizaje en finanzas.
Evalúa de manera objetiva los pasos matemáticos y el razonamiento del estudiante en base a la pregunta, respuesta correcta y rúbrica proporcionadas.
Incluso si el resultado final no es idéntico a la respuesta correcta debido a redondeos o comas, si el cálculo, fórmula o interpretación es fundamentalmente correcta, otorga puntos parciales o totales.
Proporciona feedback en un tono motivador, conciso (máximo 3 frases) y en idioma español europeo/latinoamericano neutro. Identifica específicamente dónde cometió el error (por ejemplo: confundir tasa mensual con anual o error de exponenciación).`;

      const userPrompt = `
EJERCICIO:
Título: ${exercise.title}
Tipo de Ejercicio: ${exercise.exerciseType}
Pregunta: ${exercise.question}
Puntos Máximos: ${exercise.maxPoints}
Respuesta Correcta Esperada: ${exercise.correctAnswer}
Rúbrica de Evaluación: ${rubricString}

CONTEXTO ENVIADO POR EL ESTUDIANTE:
Respuesta del Estudiante: "${userAnswer}"

Por favor, califica de forma justa según los criterios especificados y retorna el JSON requerido.`;

      // Request structured grading responses using gemini-3.5-flash
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: `Puntaje asignado entre 0 y ${exercise.maxPoints} según qué tan correcta es la formulación matemática o numérica.`,
              },
              passed: {
                type: Type.BOOLEAN,
                description: `Indica true si el estudiante merece pasar (generalmente >= 60% del puntaje máximo), de lo contrario false.`,
              },
              feedback: {
                type: Type.STRING,
                description: 'Feedback amigable, conciso en español aclarando errores de cálculo o interpretación.',
              },
            },
            required: ['score', 'passed', 'feedback'],
          },
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error('Empty grading response text from Gemini');
      }

      const parsed = JSON.parse(textOutput.trim());

      return {
        score: Math.min(Math.max(0, parsed.score), exercise.maxPoints),
        passed: !!parsed.passed,
        feedback: parsed.feedback,
        evaluationType: 'hybrid',
      };
    } catch (err) {
      console.error('Gemini grading error, falling back to deterministic check:', err);
      return {
        score: 0,
        passed: false,
        feedback: 'El módulo inteligente de calificación financiera no se encuentra disponible. Por favor, asegúrate de proveer el número exacto sin símbolos adicionales.',
        evaluationType: 'deterministic',
      };
    }
  }
}

export function getAIProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiAIProvider();
  }
  return new MockAIProvider();
}
