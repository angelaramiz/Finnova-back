// ─── NPC engine — modelo de comportamiento por reglas (R-09 T5) ──
// Sin LLM en las decisiones: cada NPC tiene rasgos (paciencia, formalidad,
// aversión a riesgo, memoria) y una escalera de reacciones. Las acciones
// del alumno disparan eventos que ajustan trust y nivel de escalera, y
// producen correos (para EmailInbox) y toasts. Solo el loreText puede
// parafrasearse con LLM (opcional); los números/fechas jamás.

import { getNpc, type NpcDef } from '../data/worldBible';

export type NpcEventType =
  | 'trap_detected'      // el alumno detectó y corrigió una trampa
  | 'task_failed'        // tarea falló en validación
  | 'task_overdue'       // tarea venció sin entregar
  | 'incident_recovered' // incidente 05-jul recuperado
  | 'arc_completed'      // arco terminado
  | 'error_repeated';    // mismo error 2+ veces (memoria)

export interface NpcState {
  npcId: string;
  trust: number;             // 0-100
  nivelEscalera: number;     // índice en la ladder del NPC
  erroresRepetidos: Record<string, number>; // trapId -> veces
  actions: { at: string; type: NpcEventType; detail: string }[];
}

export interface NpcEvent {
  type: NpcEventType;
  trapId?: string;
  sceneId?: string;
  taskType?: string;
}

export interface NpcReaction {
  npcId: string;
  npcName: string;
  correo?: { subject: string; body: string; from: string };
  toast?: string;
  trustDelta: number;
  nivelEscalera: number;
  microArco?: string;        // 'capacitacion_<trapId>' cuando se activa
  escenaEspecial?: string;   // 'cierre_cliente' / 'propiedad_modulo' con trust alto
  state: NpcState;
}

const TRUST_DELTAS: Record<NpcEventType, number> = {
  trap_detected: 5,
  task_failed: -4,
  task_overdue: -6,
  incident_recovered: 10,
  arc_completed: 8,
  error_repeated: -3,
};

export function freshNpcState(npcId: string): NpcState {
  return { npcId, trust: 50, nivelEscalera: 0, erroresRepetidos: {}, actions: [] };
}

// Plantillas de correo según formalidad (0 informal, 1 neutral, 2 formal)
const EMAIL_TEMPLATES: Record<'praise' | 'reminder' | 'escalate' | 'repeat' | 'special', Record<number, (npc: NpcDef, det: string) => string>> = {
  praise: {
    0: (npc) => `¡Buen trabajo! ${detFrase(npc)}. Sigue así.`,
    1: (npc) => `Bien hecho: ${detFrase(npc)}. Se agradece el cuidado con los detalles.`,
    2: (npc) => `Estimado colaborador, se reconoce su trabajo: ${detFrase(npc)}. Continúe con la misma rigurosidad.`,
  },
  reminder: {
    0: (npc) => `Ojo con esto: ${detFrase(npc)}. Revisa que quede bien.`,
    1: (npc) => `Recordatorio: ${detFrase(npc)}. Verifica que el registro sea correcto.`,
    2: (npc) => `Reciba un recordatorio: ${detFrase(npc)}. Le solicito revisar antes de cerrar.`,
  },
  escalate: {
    0: (npc) => `Ya van varias veces con lo mismo: ${detFrase(npc)}. Necesitamos hablarlo.`,
    1: (npc) => `Necesito que revisemos esto con calma: ${detFrase(npc)}. Es la tercera vez.`,
    2: (npc) => `Es necesario conversar sobre ${detFrase(npc)}. La dirección está al tanto y espera corrección.`,
  },
  repeat: {
    0: (npc) => `Vamos a hacer un repaso rápido: ${detFrase(npc)}. Te dejo una guía corta.`,
    1: (npc) => `He preparado un micro-espacio de capacitación por ${detFrase(npc)}. Es importante que lo revises.`,
    2: (npc) => `Por la recurrencia en ${detFrase(npc)}, le asigno un breve plan de capacitación. Confío en que lo resuelva.`,
  },
  special: {
    0: (npc) => `Confío en ti para esto: ${detFrase(npc)}.`,
    1: (npc) => `Con la confianza acumulada, le encargo: ${detFrase(npc)}.`,
    2: (npc) => `Dada su trayectoria, le confío ${detFrase(npc)}. Espero su propuesta.`,
  },
};

function detFrase(npc: NpcDef): string {
  return `${npc.rol} en ${npc.company === 'lno' ? 'Logística del Norte' : 'DataFlow Analytics'}`;
}

// Firman con nombre de la persona (no el id)
const NPC_SIGNATURE: Record<string, string> = {
  lic_gomez: 'Lic. Gómez',
  sandra_mora: 'Ing. Sandra Mora',
  tesoreria: 'Tesorería',
  maria_lopez_rrhh: 'María López (RRHH)',
  cliente_comercial_norte: 'Comercial del Norte',
  proveedor_transportes_express: 'Transportes Express',
  ana_analista: 'Ana García',
};

function sign(npcId: string): string {
  return NPC_SIGNATURE[npcId] || getNpc(npcId)?.nombre || npcId;
}

export function applyNpcEvent(state: NpcState, ev: NpcEvent, now: string = new Date().toISOString()): NpcReaction {
  const npc = getNpc(state.npcId);
  const def = npc || { id: state.npcId, nombre: state.npcId, rol: '', company: 'lno', route: 'contable', traits: { paciencia: 1, formalidad: 1, aversionRiesgo: 1, memoria: true }, ladder: ['amable', 'recordatorio', 'necesitamos_hablar'] };

  const delta = TRUST_DELTAS[ev.type] || 0;
  let trust = Math.max(0, Math.min(100, state.trust + delta));
  const nivelEscalera = state.nivelEscalera;

  // Memoria: registrar errores repetidos (trampas falladas)
  const erroresRepetidos = { ...state.erroresRepetidos };
  let microArco: string | undefined;
  let correo: NpcReaction['correo'];

  const detalles = ev.trapId || ev.taskType || ev.sceneId || 'la tarea';

  if (ev.type === 'trap_detected') {
    correo = {
      subject: `Reconocimiento — ${ev.trapId || 'trampa detectada'}`,
      body: EMAIL_TEMPLATES.praise[def.traits.formalidad](def, detalles),
      from: sign(state.npcId),
    };
  } else if (ev.type === 'incident_recovered') {
    correo = {
      subject: 'Incidente resuelto — gracias',
      body: EMAIL_TEMPLATES.praise[def.traits.formalidad](def, 'el incidente del 05-jul quedó resuelto'),
      from: sign(state.npcId),
    };
  } else if (ev.type === 'arc_completed') {
    correo = {
      subject: 'Arco completado',
      body: EMAIL_TEMPLATES.praise[def.traits.formalidad](def, 'has completado el arco narrativo'),
      from: sign(state.npcId),
    };
  } else if (ev.type === 'task_failed' || ev.type === 'task_overdue') {
    // sube escalera
    const nextNivel = Math.min(def.ladder.length - 1, nivelEscalera + (ev.type === 'task_overdue' ? 2 : 1));
    if (ev.trapId) {
      erroresRepetidos[ev.trapId] = (erroresRepetidos[ev.trapId] || 0) + 1;
      if (def.traits.memoria && erroresRepetidos[ev.trapId] >= 2) {
        microArco = `capacitacion_${ev.trapId}`;
        correo = {
          subject: 'Capacitación asignada',
          body: EMAIL_TEMPLATES.repeat[def.traits.formalidad](def, detalles),
          from: sign(state.npcId),
        };
      } else {
        correo = {
          subject: nextNivel >= 2 ? 'Necesitamos hablar' : 'Recordatorio',
          body: nextNivel >= 2 ? EMAIL_TEMPLATES.escalate[def.traits.formalidad](def, detalles) : EMAIL_TEMPLATES.reminder[def.traits.formalidad](def, detalles),
          from: sign(state.npcId),
        };
      }
    } else {
      correo = {
        subject: nextNivel >= 2 ? 'Necesitamos hablar' : 'Recordatorio',
        body: nextNivel >= 2 ? EMAIL_TEMPLATES.escalate[def.traits.formalidad](def, detalles) : EMAIL_TEMPLATES.reminder[def.traits.formalidad](def, detalles),
        from: sign(state.npcId),
      };
    }
    state = { ...state, nivelEscalera: nextNivel };
  } else if (ev.type === 'error_repeated') {
    microArco = 'capacitacion_recurrente';
    correo = {
      subject: 'Plan de capacitación',
      body: EMAIL_TEMPLATES.repeat[def.traits.formalidad](def, detalles),
      from: sign(state.npcId),
    };
  }

  // Escena especial con trust alto
  let escenaEspecial: string | undefined;
  if (trust >= 80 && (ev.type === 'arc_completed' || ev.type === 'incident_recovered')) {
    escenaEspecial = def.route === 'contable' ? 'cierre_cliente' : 'propiedad_modulo';
    if (!correo) {
      correo = {
        subject: 'Nueva responsabilidad',
        body: EMAIL_TEMPLATES.special[def.traits.formalidad](def, 'una responsabilidad mayor'),
        from: sign(state.npcId),
      };
    }
  }

  const newState: NpcState = {
    ...state,
    npcId: state.npcId,
    trust,
    erroresRepetidos,
    actions: [...state.actions, { at: now, type: ev.type, detail: detalles }],
  };

  return {
    npcId: state.npcId,
    npcName: sign(state.npcId),
    correo,
    toast: ev.type === 'trap_detected' ? `Trust +${delta} con ${sign(state.npcId)}` : undefined,
    trustDelta: delta,
    nivelEscalera: newState.nivelEscalera,
    microArco,
    escenaEspecial,
    state: newState,
  };
}

// Estado agregado por usuario: todos los NPCs del alumno
export interface NpcWorld {
  [npcId: string]: NpcState;
}

export function freshNpcWorld(npcIds: string[]): NpcWorld {
  const w: NpcWorld = {};
  for (const id of npcIds) w[id] = freshNpcState(id);
  return w;
}