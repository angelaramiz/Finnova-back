// ─── Arcos narrativos por ruta (R-09) ─────────────────────────
// Cada arco es una lista de escenas { sceneId, route, ventanaSim,
// npc, entidades, taskTypes, trigger, consecuencia }.
// Solo contexto narrativo: los montos y golden values los pone el
// caseGenerator con los motores existentes.

export type RouteId = 'contable' | 'analyst' | 'engineering' | 'science';

export interface ArcScene {
  sceneId: string;
  route: RouteId;
  ventanaSim: string;       // '01-jul'..'08-jul' (rango de inicio)
  npc: string;              // id del NPC en worldBible
  entidades: string[];      // clientes/proveedores/productos/datasets
  taskTypes: string[];      // tipos de workflow que cubre
  trigger: string;          // evento que activa la escena
  consecuencia: string;     // qué cambia al completarla (avance de arco)
}

export interface StoryArc {
  id: string;
  route: RouteId;
  nombre: string;
  descripcion: string;
  escenas: ArcScene[];
}

export const STORY_ARCS: StoryArc[] = [
  // ── Contable ────────────────────────────────────────────────
  {
    id: 'contable_primer_mes',
    route: 'contable',
    nombre: 'Primer mes',
    descripcion: 'Llegada del contador junior: facturación inicial, cobranza y primera conciliación con cheque sin cobrar.',
    escenas: [
      {
        sceneId: 'c1_factura_inicial',
        route: 'contable',
        ventanaSim: '01-jul',
        npc: 'lic_gomez',
        entidades: ['Comercial del Norte', 'Flete nacional express'],
        taskTypes: ['invoice_emission'],
        trigger: 'Solicitud del Lic. Gómez de facturar los servicios de la primera semana',
        consecuencia: 'Primer logro de facturación registrado en la crónica',
      },
      {
        sceneId: 'c1_conciliacion_cheque',
        route: 'contable',
        ventanaSim: '03-jul',
        npc: 'tesoreria',
        entidades: ['Transportes Express', 'Banco Norte'],
        taskTypes: ['bank_reconciliation', 'payment_registration'],
        trigger: 'Estado de cuenta de julio llega con diferencia por cheque sin cobrar',
        consecuencia: 'Conciliación cuadrada; el Lic. Gómez confía más en los números del junior',
      },
      {
        sceneId: 'c1_nomina',
        route: 'contable',
        ventanaSim: '08-jul',
        npc: 'maria_lopez_rrhh',
        entidades: ['María López', 'Nómina'],
        taskTypes: ['payroll'],
        trigger: 'Solicitud de nómina quincenal de RRHH',
        consecuencia: 'Cierre de la quincena; habilita el arco de cierre de mes',
      },
    ],
  },
  {
    id: 'contable_cierre_mes',
    route: 'contable',
    nombre: 'Cierre de mes',
    descripcion: 'Pólizas de ajuste, depreciación, notas de crédito y estados financieros.',
    escenas: [
      {
        sceneId: 'c2_polizas',
        route: 'contable',
        ventanaSim: '07-jul',
        npc: 'lic_gomez',
        entidades: ['Depreciación', 'Pólizas'],
        taskTypes: ['journal_entry', 'depreciation'],
        trigger: 'Instrucción de preparar el cierre del mes',
        consecuencia: 'Pólizas cuadradas registradas',
      },
      {
        sceneId: 'c2_estados',
        route: 'contable',
        ventanaSim: '08-jul',
        npc: 'lic_gomez',
        entidades: ['Estados financieros'],
        taskTypes: ['financial_statements'],
        trigger: 'Solicitud de Balance General y Estado de Resultados',
        consecuencia: 'Cierre contable del mes completado',
      },
    ],
  },
  {
    id: 'contable_auditoria',
    route: 'contable',
    nombre: 'Rumor de auditoría',
    descripcion: 'El rumor del SAT sube la exigencia de validación fiscal.',
    escenas: [
      {
        sceneId: 'c3_cfdi',
        route: 'contable',
        ventanaSim: '08-jul',
        npc: 'lic_gomez',
        entidades: ['CFDI', 'SAT'],
        taskTypes: ['cfdi_reception', 'tax_calculation'],
        trigger: 'Rumor de auditoría SAT (evento canónico)',
        consecuencia: 'Fiscal al día; el Lic. Gómez cierra el arco reconociendo el trabajo',
      },
    ],
  },

  // ── Analista ────────────────────────────────────────────────
  {
    id: 'analyst_mart',
    route: 'analyst',
    nombre: 'Acceso al mart',
    descripcion: 'Primeros reportes sobre el mart y alerta de calidad.',
    escenas: [
      {
        sceneId: 'a1_mart',
        route: 'analyst',
        ventanaSim: '02-jul',
        npc: 'sandra_mora',
        entidades: ['mrt_ventas_por_cliente'],
        taskTypes: ['sql_query'],
        trigger: 'Sandra Mora asigna el primer reporte sobre el mart',
        consecuencia: 'Acceso al mart validado; la analista Ana pide más datos',
      },
      {
        sceneId: 'a1_alerta_calidad',
        route: 'analyst',
        ventanaSim: '03-jul',
        npc: 'ana_analista',
        entidades: ['stg_clientes', 'RFC'],
        taskTypes: ['data_quality'],
        trigger: 'Alerta de calidad: RFC inválidos en stg_clientes',
        consecuencia: 'Alerta atendida; habilita el caso churn compartido con ciencia',
      },
    ],
  },
  {
    id: 'analyst_churn',
    route: 'analyst',
    nombre: 'Caso churn Comercial del Norte',
    descripcion: 'Caso compartido con ciencia: entender la caída de Comercial del Norte.',
    escenas: [
      {
        sceneId: 'a2_churn',
        route: 'analyst',
        ventanaSim: '07-jul',
        npc: 'sandra_mora',
        entidades: ['int_ventas_cliente', 'Comercial del Norte'],
        taskTypes: ['eda_churn', 'sql_query'],
        trigger: 'Comercial del Norte reduce volumen tras el incidente 05-jul',
        consecuencia: 'Insight documentado; si es ruta science, continúa a baseline',
      },
    ],
  },

  // ── Ingeniería ──────────────────────────────────────────────
  {
    id: 'engineering_incidente',
    route: 'engineering',
    nombre: 'Incidente 05-jul',
    descripcion: 'Diagnóstico y recuperación del pipeline caído.',
    escenas: [
      {
        sceneId: 'e1_incidente',
        route: 'engineering',
        ventanaSim: '05-jul',
        npc: 'sandra_mora',
        entidades: ['lno_sales_pipeline', 'mrt_ventas_por_cliente'],
        taskTypes: ['incident_recovery'],
        trigger: 'Alerta de monitoreo: dbt_test falló (evento canónico incidente_05jul)',
        consecuencia: 'Pipeline recuperado y SLA restablecido (efecto observable en banner)',
      },
    ],
  },
  {
    id: 'engineering_propiedad',
    route: 'engineering',
    nombre: 'Propiedad del pipeline',
    descripcion: 'El junior toma propiedad: DAGs, code reviews y SLAs.',
    escenas: [
      {
        sceneId: 'e2_dag',
        route: 'engineering',
        ventanaSim: '06-jul',
        npc: 'sandra_mora',
        entidades: ['lno_sales_pipeline', 'Airflow'],
        taskTypes: ['airflow_dag'],
        trigger: 'Revisión del DAG tras el incidente',
        consecuencia: 'DAG estable; se suma el código al repo (GitSim)',
      },
      {
        sceneId: 'e2_review',
        route: 'engineering',
        ventanaSim: '08-jul',
        npc: 'sandra_mora',
        entidades: ['stg_ventas'],
        taskTypes: ['code_review'],
        trigger: 'PR #42 con SELECT * en stg_ventas',
        consecuencia: 'Review aprobado/rechazado con consecuencias (GitSim)',
      },
    ],
  },
  {
    id: 'engineering_slas',
    route: 'engineering',
    nombre: 'SLAs y monitoreo',
    descripcion: 'SLAs de calidad del mart y monitoreo continuo.',
    escenas: [
      {
        sceneId: 'e3_sla',
        route: 'engineering',
        ventanaSim: '08-jul',
        npc: 'sandra_mora',
        entidades: ['mrt_ventas_por_cliente', 'DataOps'],
        taskTypes: ['data_quality', 'soporte_datos'],
        trigger: 'Revisión de SLAs tras recuperar el mart',
        consecuencia: 'SLAs estables; trust alto con Sandra Mora desbloquea escena especial',
      },
    ],
  },

  // ── Ciencia ─────────────────────────────────────────────────
  {
    id: 'science_churn',
    route: 'science',
    nombre: 'Caso churn',
    descripcion: 'EDA → baseline → evaluación → presentación, con features degradadas por el incidente 05-jul.',
    escenas: [
      {
        sceneId: 's1_eda',
        route: 'science',
        ventanaSim: '07-jul',
        npc: 'sandra_mora',
        entidades: ['int_ventas_cliente', 'Comercial del Norte'],
        taskTypes: ['eda_churn'],
        trigger: 'Caso churn; features degradadas por incidente_05jul',
        consecuencia: 'EDA documentado; Sandra valida el enfoque',
      },
      {
        sceneId: 's1_baseline',
        route: 'science',
        ventanaSim: '08-jul',
        npc: 'sandra_mora',
        entidades: ['int_ventas_cliente'],
        taskTypes: ['modelo_baseline'],
        trigger: 'Entrenar baseline con los datos afectados por el incidente',
        consecuencia: 'Baseline registrado con métricas degradadas',
      },
      {
        sceneId: 's1_eval',
        route: 'science',
        ventanaSim: '08-jul',
        npc: 'sandra_mora',
        entidades: ['mrt_ventas_por_cliente'],
        taskTypes: ['eval_metricas'],
        trigger: 'Evaluar contra el mart recuperado',
        consecuencia: 'Métricas mejoran tras recuperación; caso cerrado con presentación',
      },
    ],
  },
];

export function getArc(route: RouteId, arcId?: string): StoryArc | undefined {
  if (arcId) return STORY_ARCS.find(a => a.id === arcId);
  return STORY_ARCS.find(a => a.route === route);
}

export function getArcsForRoute(route: RouteId): StoryArc[] {
  return STORY_ARCS.filter(a => a.route === route);
}