// ─── World Bible — lore canónico del Simulador Laboral (R-09) ─
// Fuente única de verdad NARRATIVA. Los números, fechas y golden
// values NO viven aquí: salen de los motores (autoEntries,
// paymentMatching, compileModelSql, simTime). Aquí solo hay contexto,
// eventos fijos y personalidades.
//
// REGLA DE ORO: el lore puede variar; los números, fechas y
// validaciones NO.

import { SIM_YEAR, SIM_MONTH, SIM_DAY } from '../lib/simTime';

export interface CompanyLore {
  id: string;
  name: string;
  taxId: string;
  city: string;
  size: string;
  sector: string;
  tono: string;            // tono de comunicación interno
  tensionActiva: string;   // problema vivo que motiva la narrativa
}

export interface CanonicalEvent {
  id: string;
  routes: string[];        // contable | analyst | engineering | science
  fechaSim: string;        // '05-jul' (coherente con AirflowSim/DataOpsSim)
  fixedFacts: string[];    // hechos idénticos para TODOS los alumnos
  descripcion: string;
}

export interface NpcTraits {
  paciencia: 0 | 1 | 2;
  formalidad: 0 | 1 | 2;
  aversionRiesgo: 0 | 1 | 2;
  memoria: boolean;        // recuerda errores repetidos
}

export interface NpcDef {
  id: string;
  nombre: string;
  rol: string;
  company: string;         // company id
  route: string;           // contable | analyst | engineering | science
  traits: NpcTraits;
  ladder: string[];        // escalera de reacciones: amable → escalada
}

export const WORLD_CALENDAR = {
  hoyIso: `${SIM_YEAR}-${String(SIM_MONTH + 1).padStart(2, '0')}-${String(SIM_DAY).padStart(2, '0')}`, // 2026-07-08
  ventana: { inicio: '2026-07-01', fin: '2026-07-31' },
  // runs Airflow coherentes: 03-jul a 08-jul (monitor)
  runs: ['03-jul', '04-jul', '05-jul', '06-jul', '07-jul', '08-jul'],
};

export const COMPANIES: Record<string, CompanyLore> = {
  lno: {
    id: 'lno',
    name: 'Logística del Norte S.A. de C.V.',
    taxId: 'LNO-080515-TYU',
    city: 'Ciudad Juárez, Chihuahua',
    size: '~50 empleados, 4 sucursales',
    sector: 'Transporte y logística de carga',
    tono: 'Directo y formal; los jefes tratan de usted y esperan números exactos.',
    tensionActiva: 'Caja apretada: cada semana el flujo de efectivo se vigila de cerca; los pagos a proveedores no pueden retrasarse.',
  },
  dataflow: {
    id: 'dataflow',
    name: 'DataFlow Analytics S.A. de C.V.',
    taxId: 'DFA-220119-KLM',
    city: 'CDMX + Monterrey',
    size: '~30 empleados, 2 oficinas',
    sector: 'Consultoría y análisis de datos (retail y logística)',
    tono: 'Cercano y técnico; el equipo habla de pipelines y SLAs con naturalidad.',
    tensionActiva: 'Presión de clientes retail por datos frescos; cualquier caída de pipeline se nota al día siguiente.',
  },
};

// Eventos canónicos: hechos FIJOS, idénticos para todos los alumnos.
// Solo el texto ambiental puede variar (variante de lore, no de datos).
export const CANONICAL_EVENTS: CanonicalEvent[] = [
  {
    id: 'incidente_05jul',
    routes: ['engineering', 'science'],
    fechaSim: '05-jul',
    fixedFacts: [
      'DAG lno_sales_pipeline falló en la tarea dbt_test',
      'Test que falló: positive(total_ventas) sobre mrt_ventas_por_cliente',
      'SLA del mart: incumplido',
      'Recuperación = corregir modelo dbt + reprocesar run',
    ],
    descripcion: 'La corrida del 05-jul del pipeline lno_sales_pipeline falló en dbt_test (positive(total_ventas)). El mart quedó con SLA incumplido. También degrada las features del caso churn (coherencia cruzada con Ciencia).',
  },
  {
    id: 'retraso_transportes_express',
    routes: ['contable', 'analyst'],
    fechaSim: '02-jul',
    fixedFacts: [
      'Proveedor Transportes Express entregó con +3 días de retraso',
      'Afecta la factura de flete correspondiente',
      'Requiere nota/registro de demora',
    ],
    descripcion: 'Transportes Express reportó retraso de 3 días en una entrega. La notificación llega por correo y afecta el registro de la operación.',
  },
  {
    id: 'rumor_auditoria_sat',
    routes: ['contable'],
    fechaSim: '08-jul',
    fixedFacts: [
      'Circula el rumor de auditoría del SAT para fin de julio',
      'El Lic. Gómez pide reforzar validación de CFDI y pólizas',
      'Sin fecha oficial: solo tensión narrativa',
    ],
    descripcion: 'Rumor interno: posible auditoría SAT a fin de mes. Sube la exigencia de validación fiscal en la semana 3-4 contable.',
  },
  {
    id: 'presion_cliente_retail',
    routes: ['engineering', 'science'],
    fechaSim: '06-jul',
    fixedFacts: [
      'Cliente retail exige reportes diarios de ventas',
      'Presiona al equipo de datos por frescura de los datos',
      'Refuerza la urgencia de SLAs del mart',
    ],
    descripcion: 'Un cliente retail presiona por reportes diarios. La frescura de los datos es crítica y cualquier falla del pipeline se vuelve tema de negocio.',
  },
];

// Elenco de NPCs con modelo de comportamiento (reglas, no IA)
export const NPCS: Record<string, NpcDef> = {
  lic_gomez: {
    id: 'lic_gomez',
    nombre: 'Lic. Gómez',
    rol: 'Contador General',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 1, formalidad: 2, aversionRiesgo: 2, memoria: true },
    ladder: ['amable', 'recordatorio', 'necesitamos_hablar', 'microarco_capacitacion'],
  },
  sandra_mora: {
    id: 'sandra_mora',
    nombre: 'Ing. Sandra Mora',
    rol: 'Lead Data Engineer',
    company: 'dataflow',
    route: 'engineering',
    traits: { paciencia: 2, formalidad: 1, aversionRiesgo: 1, memoria: true },
    ladder: ['amable', 'nota_tecnica', 'revision_urgente', 'microarco_capacitacion'],
  },
  tesoreria: {
    id: 'tesoreria',
    nombre: 'Tesorería',
    rol: 'Coordinador de tesorería',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 1, formalidad: 1, aversionRiesgo: 2, memoria: false },
    ladder: ['aviso', 'recordatorio_pago', 'escalada_direccion'],
  },
  maria_lopez_rrhh: {
    id: 'maria_lopez_rrhh',
    nombre: 'María López',
    rol: 'Recursos Humanos',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 2, formalidad: 1, aversionRiesgo: 0, memoria: false },
    ladder: ['solicitud', 'seguimiento'],
  },
  cliente_comercial_norte: {
    id: 'cliente_comercial_norte',
    nombre: 'Comercial del Norte',
    rol: 'Cliente',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 0, formalidad: 1, aversionRiesgo: 0, memoria: true },
    ladder: ['pregunta_factura', 'reclamo', 'amenaza_moroso'],
  },
  proveedor_transportes_express: {
    id: 'proveedor_transportes_express',
    nombre: 'Transportes Express',
    rol: 'Proveedor',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 1, formalidad: 1, aversionRiesgo: 1, memoria: false },
    ladder: ['aviso_demora', 'recordatorio_pago', 'suspension_servicio'],
  },
  ana_analista: {
    id: 'ana_analista',
    nombre: 'Ana García',
    rol: 'Analista de Datos',
    company: 'dataflow',
    route: 'analyst',
    traits: { paciencia: 2, formalidad: 0, aversionRiesgo: 0, memoria: true },
    ladder: ['solicitud_sql', 'necesito_mas_datos', 'bloqueo_reportes'],
  },
  capacitador: {
    id: 'capacitador',
    nombre: 'Capacitador de Prácticas',
    rol: 'Capacitador de Prácticas Profesionales',
    company: 'lno',
    route: 'contable',
    traits: { paciencia: 2, formalidad: 1, aversionRiesgo: 1, memoria: true },
    ladder: ['bienvenida', 'explicacion', 'recordatorio_practica', 'microarco_capacitacion'],
  },
};

export function getNpc(id: string): NpcDef | undefined {
  return NPCS[id];
}

export function getCompany(id: string): CompanyLore | undefined {
  return COMPANIES[id];
}

// Entidades NARRATIVAS canónicas (conceptos del mundo: procesos, DAG,
// herramientas, organismos). Los arcos pueden referenciarlas como contexto;
// los datos reales (montos/folios) SIEMPRE salen de los motores.
export const NARRATIVE_ENTITIES = [
  'Banco Norte', 'SAT', 'CFDI', 'RFC', 'Nómina', 'Pólizas', 'Depreciación',
  'Estados financieros', 'Airflow', 'DataOps', 'lno_sales_pipeline',
  'Transporte', 'Almacenamiento', 'maría_lopez_rrhh', 'María López',
] as const;
