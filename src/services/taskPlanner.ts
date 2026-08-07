// ─── Task Planner v2 — Simulador comprehensivo de Contador Jr. ─
// Ciclo contable real mexicano con escenarios de error y retos.

export interface PlannedTask {
  id: string;
  title: string;
  type: string;
  difficulty: number;  // 1=básico, 2=intermedio, 3=avanzado, 4=trampa
  time: number;
  week: number;
  day: number;
  priority: 'critica' | 'alta' | 'media' | 'baja';
  dependsOn?: string;
  category: TaskCategory;
  description: string;
  emailSubject: string;
  emailFrom: string;
  clientRef?: string;
  supplierRef?: string;
  invoiceRef?: string;
  isTrap?: boolean;        // ← Escenario con error intencional
  trapDescription?: string; // ← Qué error contiene
  expectedMistake?: string; // ← Error que debería detectar el alumno
}

export type TaskCategory =
  | 'facturacion'      // Emitir CFDI
  | 'cobranza'         // Registrar pagos
  | 'compras'          // CFDI de proveedores
  | 'banco'            // Conciliación bancaria
  | 'nomina'           // Nómina
  | 'fiscal'           // IVA, ISR, PTU
  | 'cierre'           // Pólizas, cierre
  | 'activos'          // Depreciación, activos fijos
  | 'conciliacion'     // Conciliación de cuentas
  | 'reportes'         // Estados financieros
  | 'control'          // Auditoría, verificación
  | 'errores'          // Detección y corrección de errores
  // Data Engineering categories
  | 'pipeline'         // ETL/ELT pipelines
  | 'sql'              // Consultas SQL
  | 'data_quality'     // Calidad de datos
  | 'etl'              // Transformaciones
  | 'ontologia'        // Modelado semántico
  | 'cloud'            // AWS/GCP/Azure
  | 'monitoring'       // Monitoreo de pipelines
  | 'code_review'      // Revisión de código
  | 'soporte_datos'    // Soporte a analistas

export interface MonthPlan {
  month: number;
  year: number;
  tasks: PlannedTask[];
  weekPlans: WeekPlan[];
  summary: MonthSummary;
}

export interface WeekPlan {
  week: number;
  theme: string;
  tasks: PlannedTask[];
  totalHours: number;
}

export interface MonthSummary {
  totalTasks: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<number, number>;
  trapCount: number;
  estimatedHours: number;
  skillsCovered: string[];
}

// ─── Base de conocimiento contable ───────────────────────────
// Cada tarea tiene un "por qué" educativo

const TASK_KNOWLEDGE: Record<string, { why: string; commonErrors: string[]; tips: string[] }> = {
  invoice_emission: {
    why: 'Facturar correctamente es obligatorio. Un CFDI con errores puede generar multas del SAT.',
    commonErrors: ['RFC incorrecto', 'Concepto no corresponde al servicio', 'Cálculo de IVA incorrecto', 'Fecha incorrecta'],
    tips: ['Siempre verifica el RFC contra el catálogo', 'El IVA es 16% sobre el subtotal', 'La fecha debe ser la del día'],
  },
  payment_registration: {
    why: 'Un pago mal registrado puede causar que un cliente pague de más o de menos.',
    commonErrors: ['Aplicar pago a factura incorrecta', 'Error en el monto', 'No registrar referencia bancaria', 'Olvidar actualizar saldo'],
    tips: ['Verifica la referencia bancaria contra el comprobante', 'El saldo pendiente = Total - Monto pagado'],
  },
  supplier_invoice: {
    why: 'Registrar CFDI de proveedores incorrectamente puede causar problemas fiscales.',
    commonErrors: ['No verificar el CFDI contra el XML', 'Error en el IVA acreditable', 'Registrar en categoría incorrecta'],
    tips: ['El IVA de proveedores se acredita, no se paga', 'Verifica que el folio fiscal coincida'],
  },
  bank_reconciliation: {
    why: 'La conciliación bancaria es crítica. Errores causan diferencias que pueden ser miles de pesos.',
    commonErrors: ['Olvidar cheques sin cobrar', 'No registrar depósitos en tránsito', 'Error en saldos', 'No cuadrar la conciliación'],
    tips: ['Saldo conciliado = Saldo banco + Depósitos en tránsito - Cheques sin cobrar', 'DEBE = HABER siempre'],
  },
  payroll: {
    why: 'La nómina tiene implicaciones fiscales y legales. Errores pueden causar demandas laborales.',
    commonErrors: ['Calcular ISR con tabla incorrecta', 'No aplicar deducciones correctas', 'Error en neto a depositar', 'No registrar PTU'],
    tips: ['ISR se calcula con tabla SAT vigente', 'IMSS cuota trabajador es ~5%', 'El neto = Bruto - ISR - IMSS'],
  },
  journal_entry: {
    why: 'Las pólizas de diario son la base de la contabilidad. Un error afecta todos los reportes.',
    commonErrors: ['DEBE y HABER no cuadran', 'Cuenta incorrecta', 'Monto incorrecto', 'Concepto no descriptivo'],
    tips: ['DEBE siempre = HABER', 'La depreciación se registra como gasto en DEBE'],
  },
  tax_calculation: {
    why: 'El IVA mal calculado puede generar multas o pagar de más.',
    commonErrors: ['Error en IVA trasladado', 'Error en IVA acreditable', 'No considerar IVA de gastos', 'Saldo incorrecto'],
    tips: ['IVA Trasladado = Ventas × 16%', 'IVA Acreditable = Compras × 16%'],
  },
  credit_note: {
    why: 'Una nota de crédito mal emitida puede causar problemas fiscales.',
    commonErrors: ['No referenciar factura original', 'Monto incorrecto', 'No registrar motivo'],
    tips: ['La nota de crédito debe referenciar la factura original', 'El monto no puede exceder la factura'],
  },
  cash_cut: {
    why: 'El corte de caja diario es obligatorio. Diferencias no explicadas pueden indicar robo.',
    commonErrors: ['No contar efectivo físico', 'Error en cálculo de efectivo esperado', 'No registrar gastos del turno'],
    tips: ['Efectivo esperado = Fondo + Ventas efectivo - Gastos - Depósitos', 'Diferencia > $100 requiere investigación'],
  },
  ap_reconciliation: {
    why: 'Verificar que todas las facturas de proveedores estén registradas evita pagos dobles.',
    commonErrors: ['No reconciliar facturas pendientes', 'Error en montos', 'Olvidar notas de crédito'],
    tips: ['Verifica cada factura contra el XML del CFDI', 'Las notas de crédito reducen el saldo'],
  },
  cfdi_reconciliation: {
    why: 'Todos los CFDI deben estar registrados. Faltas pueden causar problemas en auditorías.',
    commonErrors: ['No verificar UUID', 'Error en categorización', 'No registrar IVA acreditable'],
    tips: ['El UUID es único e irrepetible', 'Verifica que el CFDI coincida con la factura física'],
  },
  depreciation: {
    why: 'La depreciación afecta el Estado de Resultados y el Balance General.',
    commonErrors: ['Error en vida útil', 'Cálculo incorrecto', 'No registrar acumulado'],
    tips: ['Línea recta: Costo ÷ Vida útil en meses', 'El acumulado es cuenta de activo (HABER)'],
  },
  financial_statements: {
    why: 'Los estados financieros son la base para decisiones de negocio.',
    commonErrors: ['Balance no cuadra', 'Utilidad incorrecta', 'Cuenta faltante'],
    tips: ['Activos = Pasivos + Capital', 'Utilidad = Ingresos - Gastos'],
  },
  // Data Engineering knowledge
  pipeline: {
    why: 'Los pipelines ETL mueven datos desde fuentes hasta el data warehouse para análisis.',
    commonErrors: ['No manejar nulos', 'No validar schema', 'No registrar métricas de calidad'],
    tips: ['Siempre valida datos antes de insertar', 'Registra conteo de filas en cada paso'],
  },
  sql: {
    why: 'SQL es la herramienta fundamental para consultar y transformar datos.',
    commonErrors: ['Olvidar GROUP BY con agregaciones', 'JOIN incorrecto', 'No filtrar con WHERE'],
    tips: ['GROUP BY es obligatorio cuando usas SUM/COUNT', 'Verifica que las claves de JOIN coincidan'],
  },
  data_quality: {
    why: 'Datos sucios causan reportes incorrectos y malas decisiones de negocio.',
    commonErrors: ['Ignorar alertas de calidad', 'No documentar decisiones de limpieza', 'No validar duplicados'],
    tips: ['Siempre registra qué hiciste con los datos faltantes', 'La completitud ideal es >95%'],
  },
  etl: {
    why: 'ETL es el proceso que convierte datos crudos en información útil.',
    commonErrors: ['No limpiar datos antes de procesar', 'Olvidar manejar excepciones', 'No registrar métricas'],
    tips: ['Limpia primero, procesa después', 'Maneja errores con try/except'],
  },
  ontologia: {
    why: 'La Ontología modela el negocio para que todos hablen el mismo idioma de datos.',
    commonErrors: ['Entidades sin propiedades', 'Relaciones unidireccionales', 'No documentar tipos'],
    tips: ['Cada entidad debe tener al menos 3 propiedades', 'Documenta el tipo de cada propiedad'],
  },
  monitoring: {
    why: 'Monitorear pipelines detecta fallas antes de que causen problemas en producción.',
    commonErrors: ['Ignorar alertas', 'No escalar problemas', 'No documentar incidencias'],
    tips: ['Revisa pipelines cada 2 horas', 'Escala fallas que duren >15 min'],
  },
  code_review: {
    why: 'El code review mejora la calidad del código y comparte conocimiento del equipo.',
    commonErrors: ['No revisar edge cases', 'No verificar naming conventions', 'No proponer alternativas'],
    tips: ['Revisa primero la lógica, después el estilo', 'Pregunta por qué antes de sugerir cambios'],
  },
  soporte_datos: {
    why: 'Soporte a analistas asegura que los datos sean correctos y estén disponibles.',
    commonErrors: ['No documentar solicitudes', 'Entregar datos sin validar', 'No comunicar tiempos'],
    tips: ['Documenta cada solicitud en el tracker', 'Valida datos antes de entregar'],
  },
};

// ─── Escenarios de error (trampas) ───────────────────────────
// Estos escenarios tienen errores intencionales que el alumno debe detectar

const TRAP_SCENARIOS: Omit<PlannedTask, 'id'>[] = [
  // TRAMPA 1: IVA incorrecto
  {
    title: 'Verificar factura con IVA incorrecto',
    type: 'invoice_emission',
    difficulty: 4,
    time: 15,
    week: 1,
    day: 3,
    priority: 'alta',
    category: 'errores',
    description: 'El Lic. Gómez te pide que revises una factura que preparó un becario. El IVA está calculado al 10% en lugar de 16%.',
    emailSubject: 'Revisar factura — posibles errores',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'La factura tiene IVA al 10% (debería ser 16%)',
    expectedMistake: 'Si el alumno no detecta el error, aceptará la factura con IVA incorrecto',
  },
  // TRAMPA 2: Cliente incorrecto
  {
    title: 'Pago aplicado a factura incorrecta',
    type: 'payment_registration',
    difficulty: 4,
    time: 12,
    week: 2,
    day: 2,
    priority: 'alta',
    category: 'errores',
    description: 'Recibes un pago de $45,000 de Comercial del Norte, pero el becario lo aplicó a la factura de Transportes Rápidos.',
    emailSubject: 'Pago mal aplicado — corregir',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'El pago está aplicado al cliente incorrecto',
    expectedMistake: 'Si el alumno no verifica, el saldo de Transportes Rápidos quedará incorrecto',
  },
  // TRAMPA 3: Conciliación no cuadra
  {
    title: 'Conciliación bancaria con diferencia',
    type: 'bank_reconciliation',
    difficulty: 4,
    time: 25,
    week: 2,
    day: 4,
    priority: 'critica',
    category: 'errores',
    description: 'La conciliación bancaria tiene una diferencia de $3,500. El becario no registró un cheque sin cobrar.',
    emailSubject: 'Conciliación con diferencia — investigar',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'Hay un cheque de $3,500 sin registrar en la conciliación',
    expectedMistake: 'Si el alumno no busca cheques sin cobrar, no podrá cuadrar la conciliación',
  },
  // TRAMPA 4: Nómina con ISR mal calculado
  {
    title: 'Nómina con error en ISR',
    type: 'payroll',
    difficulty: 4,
    time: 30,
    week: 3,
    day: 1,
    priority: 'alta',
    category: 'errores',
    description: 'El becario calculó ISR al 15% fijo, pero debería usar la tabla progresiva del SAT.',
    emailSubject: 'Nómina con error fiscal — corregir',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'ISR calculado al 15% fijo en lugar de tabla progresiva',
    expectedMistake: 'Si el alumno no usa la tabla correcta, el neto será incorrecto y puede haber multas',
  },
  // TRAMPA 5: Póliza invertida
  {
    title: 'Póliza de depreciación invertida',
    type: 'journal_entry',
    difficulty: 4,
    time: 15,
    week: 4,
    day: 2,
    priority: 'alta',
    category: 'errores',
    description: 'El becario puso la depreciación acumulada en DEBE y el gasto en HABER (invertido).',
    emailSubject: 'Póliza incorrecta — corregir',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'DEBE y HABER están invertidos en la póliza',
    expectedMistake: 'Si el alumno no detecta, el Estado de Resultados mostrará utilidad falsa',
  },
  // TRAMPA 6: Factura de proveedor duplicada
  {
    title: 'CFDI de proveedor duplicado',
    type: 'supplier_invoice',
    difficulty: 4,
    time: 12,
    week: 2,
    day: 3,
    priority: 'media',
    category: 'errores',
    description: 'Se registró dos veces la misma factura de Transportes Express. El alumno debe detectar la duplicación.',
    emailSubject: 'Factura duplicada — verificar',
    emailFrom: 'Sistema',
    isTrap: true,
    trapDescription: 'La misma factura aparece dos veces en el sistema',
    expectedMistake: 'Si el alumno no verifica, pagará doble al proveedor',
  },
  // TRAMPA 7: Nota de crédito excede factura
  {
    title: 'Nota de crédito mayor a factura',
    type: 'credit_note',
    difficulty: 4,
    time: 12,
    week: 4,
    day: 3,
    priority: 'media',
    category: 'errores',
    description: 'El cliente solicita nota de crédito por $15,000, pero la factura original es de $12,000.',
    emailSubject: 'Nota de crédito inválida',
    emailFrom: 'Cliente',
    isTrap: true,
    trapDescription: 'El monto de la nota de crédito excede la factura original',
    expectedMistake: 'Si el alumno no verifica el monto, generará un crédito fiscal inválido',
  },
  // TRAMPA 8: Corte de caja descuadrado
  {
    title: 'Corte de caja con diferencia no explicada',
    type: 'cash_cut',
    difficulty: 4,
    time: 15,
    week: 4,
    day: 5,
    priority: 'alta',
    category: 'errores',
    description: 'El corte de caja tiene una diferencia de $850. El efectivo contado es menor al esperado.',
    emailSubject: 'Corte de caja — diferencia',
    emailFrom: 'Lic. Gómez',
    isTrap: true,
    trapDescription: 'Hay $850 de diferencia entre efectivo esperado y contado',
    expectedMistake: 'Si el alumno no investiga, puede haber robo o error no detectado',
  },
  // TRAMPA 9: Pipeline con pérdida silenciosa de datos
  {
    title: 'Pipeline con datos perdidos',
    type: 'etl_pipeline',
    difficulty: 4,
    time: 20,
    week: 2,
    day: 4,
    priority: 'alta',
    category: 'errores',
    description: 'El pipeline elimina registros con valores nulos en lugar de imputarlos. 200 ventas se pierden silenciosamente.',
    emailSubject: 'Pipeline ejecutado — revisar resultados',
    emailFrom: 'Sistema de Monitoreo',
    isTrap: true,
    trapDescription: 'El pipeline usa dropna() sin antes imputar, perdiendo datos válidos',
    expectedMistake: 'Si el alumno no revisa el conteo de filas, no detectará la pérdida de 200 registros',
  },
  // TRAMPA 10: SQL con GROUP BY incorrecto
  {
    title: 'SQL con GROUP BY faltante',
    type: 'sql_query',
    difficulty: 4,
    time: 15,
    week: 3,
    day: 2,
    priority: 'alta',
    category: 'errores',
    description: 'La consulta SQL usa SUM() sin GROUP BY, causando un resultado incorrecto que parece válido.',
    emailSubject: 'Consulta SQL — resultados inesperados',
    emailFrom: 'Ing. Sandra Mora',
    isTrap: true,
    trapDescription: 'Falta GROUP BY en una consulta con función de agregación',
    expectedMistake: 'Si el alumno no verifica, aceptará un solo número como resultado total en lugar de desglose por cliente',
  },
  // TRAMPA 11: Alerta de calidad ignorada
  {
    title: 'Alerta de calidad ignorada',
    type: 'data_quality',
    difficulty: 4,
    time: 15,
    week: 3,
    day: 4,
    priority: 'alta',
    category: 'errores',
    description: 'El sistema detectó 500 registros con RFC inválido. El becario los ignoró pensando que "no son importantes".',
    emailSubject: '⚠ Datos con RFC inválido — acción requerida',
    emailFrom: 'Sistema de Calidad',
    isTrap: true,
    trapDescription: 'Se ignoraron registros con datos fiscales inválidos',
    expectedMistake: 'Si el alumno no investiga, la empresa podría tener problemas con el SAT',
  },
];

// ─── Generador de tareas por semana ──────────────────────────

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CLIENT_PROFILES = [
  { id: 'c1', name: 'Comercial del Norte S.A.', rfc: 'CNS-990101-HIJ', frequency: 'semanal', avgAmount: 45000, paymentStyle: 'puntual' },
  { id: 'c2', name: 'Transportes Rápidos S.A.', rfc: 'TRA-880202-KLM', frequency: 'quincenal', avgAmount: 32000, paymentStyle: 'puntual' },
  { id: 'c3', name: 'Almacenes del Bajío S.P.R.', rfc: 'ALB-770303-NOP', frequency: 'semanal', avgAmount: 28000, paymentStyle: 'pago_contado' },
  { id: 'c4', name: 'Inversiones del Valle S.A.', rfc: 'INV-660404-QRS', frequency: 'mensual', avgAmount: 85000, paymentStyle: 'tardado' },
  { id: 'c5', name: 'Corporativo Trust S.A.', rfc: 'CTR-550505-TUV', frequency: 'mensual', avgAmount: 120000, paymentStyle: 'puntual' },
];

const SUPPLIER_PROFILES = [
  { id: 's1', name: 'Transportes Express S.A.', rfc: 'TEX-920101-ABC', category: 'transporte', frequency: 'semanal', avgAmount: 35000 },
  { id: 's2', name: 'Papelería del Norte', rfc: 'PAN-850202-DEF', category: 'oficina', frequency: 'mensual', avgAmount: 4500 },
  { id: 's3', name: 'Servicios Tech MX', rfc: 'STM-900303-GHI', category: 'tecnología', frequency: 'mensual', avgAmount: 18000 },
  { id: 's4', name: 'Combustibles del Bajío', rfc: 'CDB-780404-JKL', category: 'operación', frequency: 'semanal', avgAmount: 25000 },
];

// ─── Ciclo contable real por semana ─────────────────────────

const WEEK_THEMES: Record<number, { theme: string; focus: string; tasks: { type: string; category: TaskCategory; difficulty: number; count: number }[] }> = {
  1: {
    theme: 'Inicio de mes — Facturación del mes anterior',
    focus: 'Emitir facturas pendientes, registrar pagos recibidos, primeros CFDI de proveedores',
    tasks: [
      { type: 'invoice_emission', category: 'facturacion', difficulty: 1, count: 3 },
      { type: 'payment_registration', category: 'cobranza', difficulty: 1, count: 2 },
      { type: 'supplier_invoice', category: 'compras', difficulty: 1, count: 2 },
      { type: 'invoice_emission', category: 'facturacion', difficulty: 2, count: 1 },
    ],
  },
  2: {
    theme: 'Operación normal — Cobranza y conciliación',
    focus: 'Registrar pagos, conciliar bancos, verificar CFDI',
    tasks: [
      { type: 'payment_registration', category: 'cobranza', difficulty: 1, count: 3 },
      { type: 'supplier_invoice', category: 'compras', difficulty: 1, count: 2 },
      { type: 'bank_reconciliation', category: 'banco', difficulty: 2, count: 1 },
      { type: 'invoice_emission', category: 'facturacion', difficulty: 1, count: 1 },
      { type: 'ap_reconciliation', category: 'conciliacion', difficulty: 2, count: 1 },
    ],
  },
  3: {
    theme: 'Cálculos fiscales y nómina',
    focus: 'IVA mensual, nómina quincenal, cálculos de impuestos',
    tasks: [
      { type: 'tax_calculation', category: 'fiscal', difficulty: 2, count: 1 },
      { type: 'payroll', category: 'nomina', difficulty: 2, count: 1 },
      { type: 'payment_registration', category: 'cobranza', difficulty: 1, count: 1 },
      { type: 'supplier_invoice', category: 'compras', difficulty: 1, count: 1 },
      { type: 'payment_scheduling', category: 'banco', difficulty: 1, count: 1 },
      { type: 'cfdi_reconciliation', category: 'fiscal', difficulty: 2, count: 1 },
    ],
  },
  4: {
    theme: 'Cierre de mes — Pólizas y reportes',
    focus: 'Depreciación, pólizas de ajuste, corte de caja, estados financieros',
    tasks: [
      { type: 'journal_entry', category: 'cierre', difficulty: 2, count: 2 },
      { type: 'depreciation', category: 'activos', difficulty: 2, count: 1 },
      { type: 'credit_note', category: 'facturacion', difficulty: 2, count: 1 },
      { type: 'bank_reconciliation', category: 'banco', difficulty: 2, count: 1 },
      { type: 'cash_cut', category: 'cierre', difficulty: 2, count: 1 },
      { type: 'financial_statements', category: 'reportes', difficulty: 3, count: 1 },
    ],
  },
  // ─── Data Engineering Weekly Themes ──────────────────────────
  5: {
    theme: 'Semana 1 — Fundamentos SQL y Python',
    focus: 'Consultas SQL básicas, pandas, primeros scripts',
    tasks: [
      { type: 'sql_query', category: 'sql', difficulty: 1, count: 3 },
      { type: 'etl_pipeline', category: 'etl', difficulty: 1, count: 2 },
      { type: 'data_quality', category: 'data_quality', difficulty: 1, count: 1 },
    ],
  },
  6: {
    theme: 'Semana 2 — Pipeline ETL y limpieza',
    focus: 'Construcción de pipelines, limpieza de datos, profiling',
    tasks: [
      { type: 'etl_pipeline', category: 'pipeline', difficulty: 2, count: 2 },
      { type: 'data_quality', category: 'data_quality', difficulty: 2, count: 2 },
      { type: 'sql_query', category: 'sql', difficulty: 2, count: 1 },
    ],
  },
  7: {
    theme: 'Semana 3 — Ontología y modelado',
    focus: 'Modelado semántico, entidades, relaciones, documentación',
    tasks: [
      { type: 'ontology_modeling', category: 'ontologia', difficulty: 2, count: 2 },
      { type: 'data_quality', category: 'data_quality', difficulty: 2, count: 1 },
      { type: 'code_review', category: 'code_review', difficulty: 2, count: 1 },
      { type: 'soporte_datos', category: 'soporte_datos', difficulty: 1, count: 1 },
    ],
  },
  8: {
    theme: 'Semana 4 — Monitoreo y orquestación',
    focus: 'DAGs de Airflow, monitoreo, alertas, troubleshooting',
    tasks: [
      { type: 'airflow_dag', category: 'monitoring', difficulty: 2, count: 2 },
      { type: 'etl_pipeline', category: 'pipeline', difficulty: 3, count: 1 },
      { type: 'data_quality', category: 'data_quality', difficulty: 3, count: 1 },
      { type: 'code_review', category: 'code_review', difficulty: 2, count: 1 },
    ],
  },
};

// ─── Generador principal ────────────────────────────────────

function createTaskFromConfig(config: {
  type: string;
  category: TaskCategory;
  difficulty: number;
  week: number;
  day: number;
  month: number;
  year: number;
  client?: typeof CLIENT_PROFILES[0];
  supplier?: typeof SUPPLIER_PROFILES[0];
  amount?: number;
  trap?: typeof TRAP_SCENARIOS[0];
}): PlannedTask {
  const { type, category, difficulty, week, day, month, year, client, supplier, amount, trap } = config;

  if (trap) {
    return {
      ...trap,
      id: generateTaskId(),
    };
  }

  const amt = amount || (client ? Math.round(client.avgAmount * (0.8 + Math.random() * 0.4)) : r(10000, 50000));
  const iva = Math.round(amt * 0.16);
  const invNum = `FAC-2026-${String(100 + week * 10 + day * 2).padStart(3, '0')}`;

  const templates: Record<string, () => PlannedTask> = {
    invoice_emission: () => ({
      id: generateTaskId(),
      title: `Factura a ${client?.name || 'Cliente'}`,
      type, difficulty, time: difficulty === 1 ? 10 : 15, week, day,
      priority: week === 1 ? 'alta' : 'media',
      category, description: `Emitir CFDI 4.0 a ${client?.name} por servicios de transporte`,
      emailSubject: `Solicitud de factura — ${client?.name}`,
      emailFrom: 'Lic. Gómez',
      clientRef: client?.id, invoiceRef: invNum,
    }),
    payment_registration: () => ({
      id: generateTaskId(),
      title: `Pago de ${client?.name || 'Cliente'}`,
      type, difficulty, time: 8, week, day,
      priority: 'media', category,
      description: `Registrar pago recibido de ${client?.name} por $${amt.toLocaleString('es-MX')}`,
      emailSubject: `Pago de factura — ${client?.name}`,
      emailFrom: client?.name || 'Cliente',
      clientRef: client?.id, invoiceRef: invNum,
    }),
    supplier_invoice: () => ({
      id: generateTaskId(),
      title: `CFDI de ${supplier?.name || 'Proveedor'}`,
      type, difficulty, time: 8, week, day,
      priority: 'media', category,
      description: `Registrar factura de ${supplier?.name} por servicios de ${supplier?.category}`,
      emailSubject: `Factura — ${supplier?.name}`,
      emailFrom: supplier?.name || 'Proveedor',
      supplierRef: supplier?.id,
    }),
    bank_reconciliation: () => ({
      id: generateTaskId(),
      title: 'Conciliación bancaria',
      type, difficulty, time: 20, week, day,
      priority: week === 2 ? 'alta' : 'media', category,
      description: 'Conciliar movimientos bancarios contra registros internos del mes',
      emailSubject: 'Estado de cuenta — Julio 2026',
      emailFrom: 'Banco Norte',
    }),
    tax_calculation: () => ({
      id: generateTaskId(),
      title: 'Cálculo de IVA mensual',
      type, difficulty, time: 25, week, day,
      priority: 'alta', category,
      description: 'Calcular IVA trasladado, acreditable y saldo por pagar del periodo',
      emailSubject: 'Cálculo IVA mensual — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    payroll: () => ({
      id: generateTaskId(),
      title: 'Nómina quincenal',
      type, difficulty, time: 30, week, day,
      priority: 'alta', category,
      description: 'Calcular nómina de 4 empleados con retenciones ISR e IMSS',
      emailSubject: 'Cálculo nómina quincenal — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    journal_entry: () => ({
      id: generateTaskId(),
      title: 'Póliza de diario',
      type, difficulty, time: 15, week, day,
      priority: 'media', category,
      description: 'Registrar póliza contable de ajuste del periodo',
      emailSubject: 'Póliza de ajuste — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    payment_scheduling: () => ({
      id: generateTaskId(),
      title: 'Programación de pagos',
      type, difficulty, time: 10, week, day,
      priority: 'media', category,
      description: 'Programar dispersión de pagos a proveedores de la semana',
      emailSubject: 'Programación de pagos — Semana',
      emailFrom: 'Tesorería',
    }),
    credit_note: () => ({
      id: generateTaskId(),
      title: `Nota de crédito — ${client?.name || 'Cliente'}`,
      type, difficulty, time: 12, week, day,
      priority: 'baja', category,
      description: `Emitir nota de crédito a ${client?.name} por devolución parcial`,
      emailSubject: `Solicitud nota de crédito — ${client?.name}`,
      emailFrom: client?.name || 'Cliente',
      clientRef: client?.id,
    }),
    cash_cut: () => ({
      id: generateTaskId(),
      title: 'Corte de caja',
      type, difficulty, time: 15, week, day,
      priority: day === 5 ? 'alta' : 'media', category,
      description: 'Realizar corte de caja del turno matutino',
      emailSubject: 'Corte de caja diario — Turno matutino',
      emailFrom: 'Lic. Gómez',
    }),
    ap_reconciliation: () => ({
      id: generateTaskId(),
      title: 'Conciliación de cuentas por pagar',
      type, difficulty, time: 20, week, day,
      priority: 'media', category,
      description: 'Verificar que todas las facturas de proveedores estén registradas correctamente',
      emailSubject: 'Conciliación AP — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    cfdi_reconciliation: () => ({
      id: generateTaskId(),
      title: 'Verificación de CFDI',
      type, difficulty, time: 20, week, day,
      priority: 'alta', category,
      description: 'Verificar que todos los CFDI recibidos estén registrados y sean válidos',
      emailSubject: 'Verificación CFDI — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    depreciation: () => ({
      id: generateTaskId(),
      title: 'Depreciación de activos fijos',
      type, difficulty, time: 20, week, day,
      priority: 'media', category,
      description: 'Calcular y registrar depreciación mensual de equipo de cómputo y mobiliario',
      emailSubject: 'Depreciación mensual — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
    financial_statements: () => ({
      id: generateTaskId(),
      title: 'Estados financieros',
      type, difficulty, time: 45, week, day,
      priority: 'alta', category,
      description: 'Generar Balance General, Estado de Resultados y Balanza de Comprobación',
      emailSubject: 'Reportes financieros — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
  };

  return (templates[type] || templates.invoice_emission)();
}

function r(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Generador de mes completo ─────────────────────────────

export function generateMonthPlan(month: number, year: number): MonthPlan {
  const allTasks: PlannedTask[] = [];
  const weekPlans: WeekPlan[] = [];

  for (let week = 1; week <= 4; week++) {
    const weekTheme = WEEK_THEMES[week];
    const weekTasks: PlannedTask[] = [];

    // Generar tareas regulares
    for (const taskConfig of weekTheme.tasks) {
      for (let i = 0; i < taskConfig.count; i++) {
        const client = CLIENT_PROFILES[i % CLIENT_PROFILES.length];
        const supplier = SUPPLIER_PROFILES[i % SUPPLIER_PROFILES.length];
        const day = ((i + week) % 5) + 1; // Distribuir entre L-V

        const task = createTaskFromConfig({
          type: taskConfig.type,
          category: taskConfig.category,
          difficulty: taskConfig.difficulty,
          week,
          day,
          month,
          year,
          client,
          supplier,
        });
        weekTasks.push(task);
      }
    }

    // Agregar 1 trampa por semana (dificultad 4)
    const trapIndex = week - 1;
    if (trapIndex < TRAP_SCENARIOS.length) {
      const trap = TRAP_SCENARIOS[trapIndex];
      const trapTask = createTaskFromConfig({
        type: trap.type,
        category: trap.category,
        difficulty: trap.difficulty,
        week,
        day: 3, // Miércoles (día pico)
        month,
        year,
        trap,
      });
      weekTasks.push(trapTask);
    }

    // Ordenar por día
    weekTasks.sort((a, b) => a.day - b.day);

    weekPlans.push({
      week,
      theme: weekTheme.theme,
      tasks: weekTasks,
      totalHours: Math.round(weekTasks.reduce((s, t) => s + t.time, 0) / 60),
    });

    allTasks.push(...weekTasks);
  }

  // Estadísticas
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<number, number> = {};
  let trapCount = 0;

  for (const task of allTasks) {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
    byDifficulty[task.difficulty] = (byDifficulty[task.difficulty] || 0) + 1;
    if (task.isTrap) trapCount++;
  }

  const summary: MonthSummary = {
    totalTasks: allTasks.length,
    byCategory,
    byDifficulty,
    trapCount,
    estimatedHours: Math.round(allTasks.reduce((s, t) => s + t.time, 0) / 60),
    skillsCovered: Object.keys(byCategory),
  };

  return { month, year, tasks: allTasks, weekPlans, summary };
}

// ─── APIs de consulta ───────────────────────────────────────

export function getTodayTasks(month: number, year: number, week: number, day: number): PlannedTask[] {
  const plan = generateMonthPlan(month, year);
  return plan.tasks.filter(t => t.week === week && t.day === day);
}

export function getWeekTasks(month: number, year: number, week: number): WeekPlan {
  const plan = generateMonthPlan(month, year);
  return plan.weekPlans.find(w => w.week === week) || plan.weekPlans[0];
}

export function getMonthStats(month: number, year: number): MonthSummary {
  const plan = generateMonthPlan(month, year);
  return plan.summary;
}

export function getTaskKnowledge(taskType: string) {
  return TASK_KNOWLEDGE[taskType] || null;
}

export { CLIENT_PROFILES, SUPPLIER_PROFILES, TRAP_SCENARIOS };
