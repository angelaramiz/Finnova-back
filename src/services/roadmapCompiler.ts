// ─── Roadmap Compiler — Agente-automatizador de rutas (R-12) ───
// Convierte una VACANTE REAL en una ruta completa SIMULAB v2 y la cablea a las
// 3 Etapas de R-10. Es el "constructor de formato" que el usuario pide: aplica
// la prueba de Etapa 1, planifica Etapa 2 (Modo A/B) y Etapa 3 (densidad), y
// detecta/registra los MOTORES FALTANTES para que el sistema los construya.
//
// Flujo:
//   1. analyzeVacancy (IA o determinístico) → skills de la vacante
//   2. buildSkillProfile + computeMatch → match_pct (Etapa 1, perfil real)
//   3. routeStage → ETAPA_2_MODO_A / B / ETAPA_3
//   4. por cada skill → resolveCapability → motor existente o faltante
//   5. registerEngineRequirement para los faltantes (auto-extensión)
//   6. genera la prueba de Etapa 1 sobre los gaps
//   7. genera tickets (Etapa 2) y pesos de densidad (Etapa 3)
//   8. devuelve SimulabV2 validado + escenario runtime
//
// REGLA DE ORO: los números (match, golden, routing) salen de los MOTORES reales
// (matchScorer, routeStage, perfiles de sim_progress). El texto del documento es
// lo único que el compilador genera con heurística; nunca inyecta golden falsos.

import { analyzeVacancy } from './vacancyAnalyzer';
import { buildSkillProfile } from './skillProfile';
import { computeMatch, UMBRAL_MODO_A } from './matchScorer';
import { routeStage, StageRoute, UMBRAL_DENSIDAD } from './stageRouter';
import { ENGINE_CAPABILITIES, resolveCapability, registerEngineRequirement } from './engineCapabilities';
import { SimulabV2, SimulabRequirement, SimulabTicket, SimulabQuestion, validateSimulabV2, simId } from './simulabFormat';
import { getArcsForRoute, RouteId } from '../data/storyArcs';

// Mapeo de skill registrada → rama de ruta (R-07).
const SKILL_TO_BRANCH: Record<string, 'analyst' | 'engineering' | 'science' | 'accounting'> = {
  SQL: 'analyst', Excel: 'analyst', BI: 'analyst', 'Power BI': 'analyst', 'Pronóstico': 'analyst',
  'Prompt engineering': 'analyst',
  Python: 'analyst', ETL: 'engineering', dbt: 'engineering', Airflow: 'engineering',
  Cloud: 'engineering', 'Calidad de datos': 'engineering', 'Resolución de incidentes': 'engineering',
  'Automatización': 'engineering', 'APIs LLM': 'engineering', 'Agentes': 'engineering', ERP: 'engineering',
  EDA: 'science', ML: 'science', Métricas: 'science',
  CFDI: 'accounting', Conciliación: 'accounting', Nómina: 'accounting', Fiscal: 'accounting', Contabilidad: 'accounting',
};

// Nivel del alumno para un skill → input de la prueba (score del perfil).
function levelLabel(score: number): string {
  if (score >= 80) return 'avanzado';
  if (score >= 60) return 'intermedio';
  if (score >= 40) return 'básico';
  return 'nulo';
}

// Pregunta de Etapa 1 por skill con brecha (heurística por dominio real).
function questionForSkill(skill: string, score: number, idx: number): SimulabQuestion | null {
  const prompt = (p: string, a: string) => ({ id: `E1-${idx}`, skill, pregunta: p, correcta: a, peso: 20 });
  const s = skill.toLowerCase();
  if (s.includes('sql')) return prompt('Dado una tabla ventas(cliente_id, total), escribe SQL que sume el total por cliente del mes de julio.', 'SELECT cliente_id, SUM(total) AS total FROM ventas WHERE fecha >= \'2026-07-01\' GROUP BY cliente_id');
  if (s.includes('power bi') || s.includes('bi')) return prompt('Explica la diferencia entre CALCULATE y SUMX en DAX de Power BI.', 'CALCULATE modifica el contexto de filtro de una medida; SUMX itera sobre una tabla fila por fila y agrega el resultado');
  if (s.includes('excel')) return prompt('Con 3 meses de inventario (ene/feb/mar), ¿qué fórmula calcula la variación % de feb respecto a ene?', '=(feb-ene)/ene');
  if (s.includes('pronostic') || s.includes('forecast')) return prompt('Con 4 semanas de ventas, ¿cómo calculas el pronóstico de la semana 5 con media móvil de 3 semanas?', 'PRONOSTICO o promedio de las últimas 3 semanas');
  if (s.includes('etl')) return prompt('En un pipeline ETL con pandas, ¿qué método elimina nulos y duplicados antes de calcular totales?', 'dropna() y drop_duplicates()');
  if (s.includes('python')) return prompt('En pandas, ¿cómo agrupas ventas por cliente y sumas el total?', 'df.groupby("cliente")["total"].sum()');
  if (s.includes('airflow')) return prompt('En Airflow, ¿qué operador y schedule define un DAG diario que primero extrae y luego transforma?', 'PythonOperator con schedule_interval="0 6 * * *" y dependencia extract >> transform');
  if (s.includes('calidad')) return prompt('Si una tabla de ventas tiene 15,000 filas y 250 nulas, ¿qué % de completitud reportas?', '98.33');
  if (s.includes('incidente')) return prompt('El DAG lno_sales_pipeline falló en dbt_test/positive(total_ventas). ¿Cuál es el primer paso de diagnóstico?', 'Revisar en AirflowSim qué tarea falló y en dbt qué test lo detonó');
  if (s.includes('cfdi')) return prompt('El IVA de una factura debe calcularse al 16%. ¿Sobre qué monto se aplica?', 'Sobre el subtotal');
  if (s.includes('nomina')) return prompt('¿Qué retenciones se descuentan del sueldo bruto para obtener el neto?', 'ISR (tabla progresiva) e IMSS');
  if (s.includes('fiscal')) return prompt('¿Qué tasa de IVA aplica en México para bienes y servicios generales?', '16%');
  if (s.includes('contab')) return prompt('Toda transacción contable debe cumplir la regla de partida doble. ¿Cuál es?', 'Suma de débitos = suma de créditos');
  return null; // skill sin heurística → sin pregunta automática
}

// Genera el plan intensivo (Etapa 2, Modo B) sobre los gaps.
function buildTickets(gaps: string[], engineFor: (s: string) => { taskType?: string; tool?: string; validator?: string; golden?: number }): SimulabTicket[] {
  return gaps.slice(0, 6).map((g, i) => {
    const cap = resolveCapability(g);
    return {
      id: `T${i + 1}`,
      ticket: `Cerrar brecha: ${g}`,
      dependencias: i === 0 ? [] : [`T${i}`],
      teoria: [`Fundamentos de ${g}`],
      practica: `Resolver un caso real que exija ${g} sobre datos del simulador`,
      herramientas: cap?.tool ? [cap.tool] : [],
      motor_mapping: {
        skill: g,
        taskType: cap?.taskTypes?.[0],
        validator: cap?.validator,
        tool: cap?.tool,
        golden: cap?.status === 'exists' ? undefined : undefined,
        item: `gap_${g.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      },
      criterio_cumplimiento: `Caso de ${g} aprobado por el motor de validación`,
    };
  });
}

export interface CompiledRoute {
  simulab: SimulabV2;
  match_pct: number;
  routing: StageRoute;
  routing_detail: { umbral_modo_a: number; umbral_densidad: number; requires_experience: boolean; density: number };
  validation: ReturnType<typeof validateSimulabV2>;
  missing_engines: { id: string; skill: string; label: string; buildPlan: string[] }[];
  requires_engine_build: boolean;
}

export async function compileRoute(vacancyText: string, userId: string, specialty = 'data_engineering'): Promise<CompiledRoute> {
  // 1. Analizar la vacante (IA con fallback determinístico).
  const vacancy = await analyzeVacancy(vacancyText);

  // 2. Perfil real del alumno (sim_progress) + match.
  const profile = await buildSkillProfile(userId, specialty);
  const match = computeMatch(profile.skills, vacancy.skills);

  // Densidad de experiencia (Etapa 3) — desde profiles si hay Supabase.
  let density = 0;
  try {
    const { isSupabaseReady, supabaseAdmin } = await import('../lib/supabaseClient');
    if (isSupabaseReady()) {
      const { data } = await supabaseAdmin.from('profiles').select('experience_density').eq('id', userId).maybeSingle();
      density = Math.min(1, (Number(data?.experience_density) || 0) / 100);
    }
  } catch { /* 0 */ }

  // 3. Routing (Etapa 1 → 2/3).
  const routing = routeStage({ match_pct: match.match_pct, requires_experience: vacancy.requires_experience, experience_density: density });

  // 4. Capacidades de motor por skill + detectar faltantes.
  const motor_mapping = (vacancy.skills || [])
    .map(v => ({ skill: v.skill, capability: resolveCapability(v.skill) }))
    .filter(m => m.capability) as { skill: string; capability: NonNullable<ReturnType<typeof resolveCapability>> }[];

  const missing: NonNullable<ReturnType<typeof resolveCapability>>[] = [];
  for (const m of motor_mapping) {
    if (m.capability.status !== 'exists') registerEngineRequirement(m.capability);
    if (m.capability.status !== 'exists') missing.push(m.capability);
  }

  // 5. Rama de la ruta (skills dominantes) + arco del mundo vivo.
  const branch = deriveBranch(vacancy.skills.map(s => s.skill), specialty);
  const routeId = (branch === 'accounting' ? 'contable' : branch) as RouteId;
  const arcs = getArcsForRoute(routeId);
  const arco_id = arcs[0]?.id;

  // 6. Prueba de Etapa 1 sobre gaps.
  const prueba: SimulabQuestion[] = [];
  match.top_gaps.forEach((g, i) => {
    const q = questionForSkill(g, 0, i);
    if (q) prueba.push(q);
  });
  if (!prueba.length) prueba.push({ id: 'E1-0', skill: 'general', pregunta: 'Describe brevemente tu experiencia más relevante para este puesto.', correcta: 'respuesta abierta', peso: 100 });

  // 7. Tickets de Etapa 2 (Modo B) sobre gaps.
  const tickets = buildTickets(match.top_gaps, () => ({}));

  // 8. Requerimientos (análisis de brechas) en el formato v1 → v2.
  const analisis_requerimientos: SimulabRequirement[] = (vacancy.skills || []).map(s => {
    const cap = resolveCapability(s.skill);
    const score = skillScoreFor(profile.skills, s.skill);
    return {
      requerimiento: s.skill,
      tipo: cap?.status === 'exists' ? 'tecnica' : 'herramienta',
      nivel_pedido: s.required ? 'avanzado' : 'intermedio',
      nivel_actual: levelLabel(score),
      brecha: cap?.gap || 'cerrar brecha de dominio',
      prioridad: s.required ? 'importante' : 'deseable',
    };
  });

  // 9. Ensamblar SimulabV2.
  const doc: SimulabV2 = {
    formato: 'SIMULAB v2',
    schema_version: '2.0',
    id: simId(vacancy.title || 'vacante', vacancy.title || 'puesto'),
    vacante: { titulo: vacancy.title, empresa: '—', requiere_experiencia: vacancy.requires_experience, min_years: vacancy.min_years },
    ruta: { rama: branch, arco_id, task_types: motor_mapping.flatMap(m => m.capability.taskTypes || []) },
    analisis_requerimientos,
    motor_mapping,
    engine_requirements: missing.map(c => ({ ...c })),
    etapas: {
      etapa1: { prueba, umbral_modo_a: UMBRAL_MODO_A },
      etapa2: routing === 'ETAPA_2_MODO_A'
        ? { modo_a: { kit: ['CV a la medida de la vacante', 'Historia STAR sobre logros reales', 'Checklist de postulación'], entrevista_star: [] } }
        : { modo_b: { plan_intensivo: tickets } },
      etapa3: {
        densidad: { pesos: { casos: 0.4, complejidad: 0.2, variedad: 0.15, incidentes: 0.15, resultados: 0.1 } },
        evidencia: ['Expediente R-08 con logros verificables', 'Proyecto integrador del simulador'],
      },
    },
    simulador_laboral: {
      tickets,
      reglas: ['Un ticket se cierra solo con criterio cumplido, nunca por tiempo', 'Cada entrega se versiona', 'Cada ticket termina con explicación oral de 5 minutos'],
      proyecto_integrador: 'Proyecto integrador que cubre los gaps de la vacante sobre el mundo simulado',
    },
    entrevista: { tecnica: prueba.map(q => q.pregunta), conductual: ['STAR: error en datos que detectaste y corregiste'] },
    criterios_listo_para_vacante: ['Responder 8 de 10 preguntas técnicas', 'Cerrar los tickets del plan intensivo', 'Proyecto integrador aprobado por el motor'],
  };

  const validation = validateSimulabV2(doc);
  return {
    simulab: doc,
    match_pct: match.match_pct,
    routing,
    routing_detail: { umbral_modo_a: UMBRAL_MODO_A, umbral_densidad: UMBRAL_DENSIDAD, requires_experience: vacancy.requires_experience, density },
    validation,
    missing_engines: missing.map(c => ({ id: c.id, skill: c.skill, label: c.label, buildPlan: c.buildPlan || [] })),
    requires_engine_build: missing.length > 0,
  };
}

function skillScoreFor(skills: { id: string; label: string; score: number }[], skill: string): number {
  const s = skill.toLowerCase();
  const found = skills.find(p => p.label.toLowerCase().includes(s) || s.includes(p.label.toLowerCase()));
  return found?.score || 0;
}

function deriveBranch(skills: string[], specialty: string): 'analyst' | 'engineering' | 'science' | 'accounting' {
  if (specialty === 'accounting') return 'accounting';
  const counts: Record<string, number> = {};
  for (const s of skills) {
    const b = SKILL_TO_BRANCH[s] || 'analyst';
    counts[b] = (counts[b] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as any) || 'analyst';
}

// Expone el catálogo de capacidades (para UI y para conocer motores por construir).
export { listCapabilities } from './engineCapabilities';