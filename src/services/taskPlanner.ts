// ─── Task Planner — Coherencia de trabajo a mediano plazo ─────
// Genera secuencias de tareas coherentes que siguen el ciclo contable real.
// Cada semana tiene un patrón, cada mes se repite con variaciones.

export interface PlannedTask {
  id: string;
  title: string;
  type: string;
  difficulty: number;
  time: number;
  week: number;         // Semana del mes (1-4)
  day: number;          // Día de la semana (1=Lun, 5=Vie)
  priority: 'alta' | 'media' | 'baja';
  dependsOn?: string;   // ID de tarea de la que depende
  category: 'facturacion' | 'cobranza' | 'compras' | 'banco' | 'nomina' | 'fiscal' | 'cierre';
  description: string;
  emailSubject: string;
  emailFrom: string;
  clientRef?: string;   // Referencia al cliente involucrado
  supplierRef?: string; // Referencia al proveedor
  invoiceRef?: string;  // Referencia a factura generada
}

export interface MonthPlan {
  month: number;        // 0-11
  year: number;
  tasks: PlannedTask[];
  phase: 'inicio' | 'desarrollo' | 'cierre';
  week: number;
}

// ─── Ciclo contable mensual ──────────────────────────────────
// Patrón real de un contador jr en empresa de logística

const WEEKLY_PATTERNS: Record<number, { category: string; taskTypes: string[]; difficulty: number }[]> = {
  // Semana 1: Inicio de mes — facturación del mes anterior
  1: [
    { category: 'facturacion', taskTypes: ['invoice_emission', 'invoice_emission', 'invoice_emission'], difficulty: 1 },
    { category: 'cobranza', taskTypes: ['payment_registration', 'payment_registration'], difficulty: 1 },
    { category: 'compras', taskTypes: ['supplier_invoice'], difficulty: 1 },
  ],
  // Semana 2: Operación normal — pagos y facturas
  2: [
    { category: 'cobranza', taskTypes: ['payment_registration', 'payment_registration', 'payment_registration'], difficulty: 1 },
    { category: 'compras', taskTypes: ['supplier_invoice', 'supplier_invoice'], difficulty: 1 },
    { category: 'banco', taskTypes: ['bank_reconciliation'], difficulty: 2 },
    { category: 'facturacion', taskTypes: ['invoice_emission'], difficulty: 1 },
  ],
  // Semana 3: Cálculos fiscales y nómina
  3: [
    { category: 'fiscal', taskTypes: ['tax_calculation'], difficulty: 2 },
    { category: 'nomina', taskTypes: ['payroll'], difficulty: 2 },
    { category: 'cobranza', taskTypes: ['payment_registration'], difficulty: 1 },
    { category: 'compras', taskTypes: ['supplier_invoice'], difficulty: 1 },
    { category: 'banco', taskTypes: ['payment_scheduling'], difficulty: 1 },
  ],
  // Semana 4: Cierre de mes — pólizas y reportes
  4: [
    { category: 'cierre', taskTypes: ['journal_entry', 'journal_entry'], difficulty: 2 },
    { category: 'fiscal', taskTypes: ['cfdi_reconciliation'], difficulty: 2 },
    { category: 'facturacion', taskTypes: ['credit_note'], difficulty: 2 },
    { category: 'banco', taskTypes: ['bank_reconciliation'], difficulty: 2 },
    { category: 'cierre', taskTypes: ['cash_cut'], difficulty: 2 },
  ],
};

// ─── Clientes y proveedores por categoría ────────────────────

const CLIENT_PROFILES = [
  { id: 'c1', name: 'Comercial del Norte S.A.', frequency: 'semanal', avgAmount: 45000, paymentStyle: 'puntual' },
  { id: 'c2', name: 'Transportes Rápidos S.A.', frequency: 'quincenal', avgAmount: 32000, paymentStyle: 'puntual' },
  { id: 'c3', name: 'Almacenes del Bajío S.P.R.', frequency: 'semanal', avgAmount: 28000, paymentStyle: 'pago_contado' },
  { id: 'c4', name: 'Inversiones del Valle S.A.', frequency: 'mensual', avgAmount: 85000, paymentStyle: 'tardado' },
  { id: 'c5', name: 'Corporativo Trust S.A.', frequency: 'mensual', avgAmount: 120000, paymentStyle: 'puntual' },
];

const SUPPLIER_PROFILES = [
  { id: 's1', name: 'Transportes Express S.A.', category: 'transporte', frequency: 'semanal', avgAmount: 35000 },
  { id: 's2', name: 'Papelería del Norte', category: 'oficina', frequency: 'mensual', avgAmount: 4500 },
  { id: 's3', name: 'Servicios Tech MX', category: 'tecnología', frequency: 'mensual', avgAmount: 18000 },
  { id: 's4', name: 'Combustibles del Bajío', category: 'operación', frequency: 'semanal', avgAmount: 25000 },
];

// ─── Generador de tareas ─────────────────────────────────────

let taskIdCounter = 0;

function generateTaskId(): string {
  taskIdCounter++;
  return `task-${Date.now()}-${taskIdCounter}`;
}

function pickClientForWeek(week: number, day: number): typeof CLIENT_PROFILES[0] {
  // Los clientes más frecuentes aparecen más seguido
  const weights = CLIENT_PROFILES.map(c => {
    if (c.frequency === 'semanal') return 4;
    if (c.frequency === 'quincenal') return 2;
    return 1;
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let random = ((week * 7 + day) * 137) % totalWeight; // Determinístico por día
  for (let i = 0; i < CLIENT_PROFILES.length; i++) {
    if (random < weights[i]) return CLIENT_PROFILES[i];
    random -= weights[i];
  }
  return CLIENT_PROFILES[0];
}

function pickSupplierForWeek(week: number, category: string): typeof SUPPLIER_PROFILES[0] {
  const filtered = SUPPLIER_PROFILES.filter(s => s.category === category || category === 'general');
  return filtered[(week * 7) % filtered.length] || SUPPLIER_PROFILES[0];
}

function generateInvoiceNumber(week: number, day: number, seq: number): string {
  const n = 100 + week * 10 + day * 2 + seq;
  return `FAC-2026-${String(n).padStart(3, '0')}`;
}

// ─── Generador de semana ─────────────────────────────────────

export function generateWeekTasks(month: number, year: number, week: number): PlannedTask[] {
  const tasks: PlannedTask[] = [];
  const pattern = WEEKLY_PATTERNS[week] || WEEKLY_PATTERNS[1];

  for (let day = 1; day <= 5; day++) { // Lunes a viernes
    const dayTasks = pattern.filter((_, i) => (i + day) % 3 === 0 || day === 3); // Distribuir evenly

    for (const taskGroup of dayTasks) {
      for (const taskType of taskGroup.taskTypes) {
        const client = pickClientForWeek(week, day);
        const supplier = pickSupplierForWeek(week, 'general');
        const amount = Math.round(client.avgAmount * (0.8 + Math.random() * 0.4));

        const task = createTask({
          type: taskType,
          week,
          day,
          client,
          supplier,
          amount,
          difficulty: taskGroup.difficulty,
          month,
          year,
        });

        tasks.push(task);
      }
    }
  }

  return tasks;
}

interface TaskConfig {
  type: string;
  week: number;
  day: number;
  client: typeof CLIENT_PROFILES[0];
  supplier: typeof SUPPLIER_PROFILES[0];
  amount: number;
  difficulty: number;
  month: number;
  year: number;
  dependsOn?: string;
  invoiceRef?: string;
}

function createTask(config: TaskConfig): PlannedTask {
  const { type, week, day, client, supplier, amount, difficulty, month, year, dependsOn, invoiceRef } = config;
  const id = generateTaskId();
  const iva = Math.round(amount * 0.16);

  const taskTemplates: Record<string, () => PlannedTask> = {
    invoice_emission: () => ({
      id,
      title: `Factura a ${client.name}`,
      type: 'invoice_emission',
      difficulty,
      time: difficulty === 1 ? 10 : 15,
      week,
      day,
      priority: week === 1 ? 'alta' : 'media',
      category: 'facturacion',
      description: `Emitir CFDI 4.0 a ${client.name} por servicios de transporte/logística`,
      emailSubject: `Solicitud de factura — ${client.name}`,
      emailFrom: 'Lic. Gómez',
      clientRef: client.id,
      invoiceRef: generateInvoiceNumber(week, day, 0),
    }),

    payment_registration: () => ({
      id,
      title: `Pago de ${client.name}`,
      type: 'payment_registration',
      difficulty,
      time: 8,
      week,
      day,
      priority: 'media',
      category: 'cobranza',
      description: `Registrar pago recibido de ${client.name} por $${amount.toLocaleString('es-MX')}`,
      emailSubject: `Pago de factura — ${client.name}`,
      emailFrom: client.name,
      clientRef: client.id,
      dependsOn,
      invoiceRef,
    }),

    supplier_invoice: () => ({
      id,
      title: `CFDI de ${supplier.name}`,
      type: 'supplier_invoice',
      difficulty,
      time: 8,
      week,
      day,
      priority: 'media',
      category: 'compras',
      description: `Registrar factura de ${supplier.name} por servicios de ${supplier.category}`,
      emailSubject: `Factura — ${supplier.name}`,
      emailFrom: supplier.name,
      supplierRef: supplier.id,
    }),

    bank_reconciliation: () => ({
      id,
      title: 'Conciliación bancaria',
      type: 'bank_reconciliation',
      difficulty,
      time: 20,
      week,
      day,
      priority: week === 2 ? 'alta' : 'media',
      category: 'banco',
      description: 'Conciliar movimientos bancarios contra registros internos',
      emailSubject: 'Estado de cuenta — Julio 2026',
      emailFrom: 'Banco Norte',
    }),

    tax_calculation: () => ({
      id,
      title: 'Cálculo de IVA mensual',
      type: 'tax_calculation',
      difficulty,
      time: 25,
      week,
      day,
      priority: 'alta',
      category: 'fiscal',
      description: 'Calcular IVA trasladado, acreditable y saldo por pagar del periodo',
      emailSubject: 'Cálculo IVA mensual — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),

    payroll: () => ({
      id,
      title: 'Nómina quincenal',
      type: 'payroll',
      difficulty,
      time: 30,
      week,
      day,
      priority: 'alta',
      category: 'nomina',
      description: 'Calcular nómina de 4 empleados con retenciones ISR e IMSS',
      emailSubject: 'Cálculo nómina quincenal — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),

    journal_entry: () => ({
      id,
      title: 'Póliza de diario',
      type: 'journal_entry',
      difficulty,
      time: 15,
      week,
      day,
      priority: 'media',
      category: 'cierre',
      description: 'Registrar póliza de depreciación mensual de equipo de cómputo',
      emailSubject: 'Póliza de depreciación — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),

    payment_scheduling: () => ({
      id,
      title: 'Programación de pagos',
      type: 'payment_scheduling',
      difficulty,
      time: 10,
      week,
      day,
      priority: 'media',
      category: 'banco',
      description: 'Programar dispersión de pagos a proveedores de la semana',
      emailSubject: 'Programación de pagos — Semana',
      emailFrom: 'Tesorería',
    }),

    credit_note: () => ({
      id,
      title: `Nota de crédito — ${client.name}`,
      type: 'credit_note',
      difficulty,
      time: 12,
      week,
      day,
      priority: 'baja',
      category: 'facturacion',
      description: `Emitir nota de crédito a ${client.name} por devolución parcial`,
      emailSubject: `Solicitud nota de crédito — ${client.name}`,
      emailFrom: client.name,
      clientRef: client.id,
    }),

    cash_cut: () => ({
      id,
      title: 'Corte de caja',
      type: 'cash_cut',
      difficulty,
      time: 15,
      week,
      day,
      priority: day === 5 ? 'alta' : 'media', // Viernes es más importante
      category: 'cierre',
      description: 'Realizar corte de caja del turno matutino',
      emailSubject: 'Corte de caja diario — Turno matutino',
      emailFrom: 'Lic. Gómez',
    }),

    cfdi_reconciliation: () => ({
      id,
      title: 'Conciliación de CFDI',
      type: 'cfdi_reconciliation',
      difficulty,
      time: 20,
      week,
      day,
      priority: 'alta',
      category: 'fiscal',
      description: 'Verificar que todos los CFDI recibidos estén registrados correctamente',
      emailSubject: 'Verificación CFDI — Julio 2026',
      emailFrom: 'Lic. Gómez',
    }),
  };

  return (taskTemplates[type] || taskTemplates.invoice_emission)();
}

// ─── Generador de mes completo ───────────────────────────────

export function generateMonthPlan(month: number, year: number): MonthPlan {
  const allTasks: PlannedTask[] = [];

  for (let week = 1; week <= 4; week++) {
    const weekTasks = generateWeekTasks(month, year, week);
    allTasks.push(...weekTasks);
  }

  // Establecer dependencias entre tareas del mismo cliente
  const clientTasks = new Map<string, PlannedTask[]>();
  for (const task of allTasks) {
    if (task.clientRef) {
      if (!clientTasks.has(task.clientRef)) clientTasks.set(task.clientRef, []);
      clientTasks.get(task.clientRef)!.push(task);
    }
  }

  // Vincular factura → pago del mismo cliente
  for (const tasks of clientTasks.values()) {
    const invoices = tasks.filter(t => t.type === 'invoice_emission');
    const payments = tasks.filter(t => t.type === 'payment_registration');

    for (let i = 0; i < Math.min(invoices.length, payments.length); i++) {
      payments[i].dependsOn = invoices[i].id;
      payments[i].invoiceRef = invoices[i].invoiceRef;
    }
  }

  return {
    month,
    year,
    tasks: allTasks,
    phase: 'desarrollo',
    week: 1,
  };
}

// ─── API para obtener tareas del día ─────────────────────────

export function getTodayTasks(month: number, year: number, week: number, day: number): PlannedTask[] {
  const plan = generateMonthPlan(month, year);
  return plan.tasks.filter(t => t.week === week && t.day === day);
}

export function getWeekTasks(month: number, year: number, week: number): PlannedTask[] {
  const plan = generateMonthPlan(month, year);
  return plan.tasks.filter(t => t.week === week);
}

export function getMonthStats(month: number, year: number) {
  const plan = generateMonthPlan(month, year);
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<number, number> = {};

  for (const task of plan.tasks) {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
    byDifficulty[task.difficulty] = (byDifficulty[task.difficulty] || 0) + 1;
  }

  return {
    totalTasks: plan.tasks.length,
    byCategory,
    byDifficulty,
    estimatedHours: Math.round(plan.tasks.reduce((s, t) => s + t.time, 0) / 60),
    weeks: 4,
    tasksPerWeek: Math.round(plan.tasks.length / 4),
  };
}

// ─── Exportar para uso en el frontend ────────────────────────

export { CLIENT_PROFILES, SUPPLIER_PROFILES };
