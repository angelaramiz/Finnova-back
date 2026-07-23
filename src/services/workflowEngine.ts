// ─── TYPES ────────────────────────────────────────────────────

export type StepType = 'email' | 'form' | 'spreadsheet' | 'result';

export interface WorkflowStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  data: any;
}

export interface ValidationRule {
  stepId: string;
  field: string;
  type: 'exact' | 'calculated' | 'choice' | 'range';
  expected: any;
  tolerance?: number;
  label: string;
  points: number;
  feedback: { pass: string; fail: string };
}

export interface Workflow {
  taskId: string;
  taskTitle: string;
  taskType: string;
  difficulty: number;
  estimatedMinutes: number;
  steps: WorkflowStep[];
  validation: ValidationRule[];
}

// ─── HELPERS ───────────────────────────────────────────────────

function r(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const CLIENTS = [
  { name: 'Comercial del Norte S.A.', rfc: 'CNS-990101-HIJ' },
  { name: 'Transportes Rápidos S.A.', rfc: 'TRA-880202-KLM' },
  { name: 'Almacenes del Bajío S.P.R.', rfc: 'ALB-770303-NOP' },
  { name: 'Inversiones del Valle S.A.', rfc: 'INV-660404-QRS' },
  { name: 'Corporativo Trust S.A.', rfc: 'CTR-550505-TUV' },
];

const PRODUCTS = [
  { name: 'Flete nacional express', unit: 'viaje', price: 8500 },
  { name: 'Almacenaje temporal', unit: 'm2', price: 320 },
  { name: 'Manejo de carga especializada', unit: 'ton', price: 12500 },
  { name: 'Servicio de consolidación', unit: 'hora', price: 1800 },
  { name: 'Transporte internacional', unit: 'contenedor', price: 28500 },
  { name: 'Seguro de carga', unit: '%', price: 2.5 },
];

const SUPPLIERS = ['Transportes Express S.A.', 'Papelería del Norte', 'Servicios Tech MX', 'Combustibles del Bajío'];

// ─── WORKFLOW FACTORIES ───────────────────────────────────────

function getConsecutive(): string {
  // Simple incrementing invoice number
  const n = r(100, 999);
  return `FAC-2026-${String(n).padStart(3, '0')}`;
}

export function generateInvoiceWorkflow(): Workflow {
  const client = pick(CLIENTS);
  const product = pick(PRODUCTS.filter(p => p.name !== 'Seguro de carga'));
  const qty = r(1, 8);
  const unitPrice = product.price;
  const subtotal = qty * unitPrice;
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const invNum = getConsecutive();

  return {
    taskId: `wf-inv-${r(1000, 9999)}`,
    taskTitle: 'Emisión de Factura',
    taskType: 'invoice_emission',
    difficulty: 1,
    estimatedMinutes: 15,
    steps: [
      {
        id: 'email',
        type: 'email',
        title: 'Correo del jefe',
        description: 'Revisa las instrucciones en tu bandeja de entrada',
        data: {
          from: 'Lic. Gómez',
          to: 'auxiliar@logistica.com',
          subject: `Solicitud de factura — ${client.name}`,
          body: `Buenos días,
            Por favor emite una factura a nombre de **${client.name}** (RFC: ${client.rfc})
            por el servicio de **${product.name.toLowerCase()}** que realizamos este mes.

            Cantidad: ${qty} ${product.unit}(s)
            Precio unitario: $${fmt(unitPrice)}

            Incluye el IVA correspondiente. La factura debe enviarse antes del cierre del día.

            Saludos,
            Lic. Gómez
            Departamento de Administración`,
          urgency: 'media',
        },
      },
      {
        id: 'form',
        type: 'form',
        title: 'Sistema Contable — Nueva Factura',
        description: 'Llena los campos de la factura',
        data: {
          fields: [
            { key: 'clientName', label: 'Cliente', type: 'choice', options: CLIENTS.map(c => c.name), correct: client.name },
            { key: 'rfc', label: 'RFC', type: 'text', correct: client.rfc },
            { key: 'productDesc', label: 'Descripción del servicio', type: 'choice', options: PRODUCTS.filter(p => p.name !== 'Seguro de carga').map(p => p.name), correct: product.name },
            { key: 'quantity', label: 'Cantidad', type: 'number', correct: qty },
            { key: 'unitPrice', label: 'Precio unitario ($)', type: 'number', correct: unitPrice },
            { key: 'subtotal', label: 'Subtotal ($)', type: 'number', correct: subtotal, hint: `Cantidad × Precio unitario = ${qty} × $${fmt(unitPrice)}` },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'number', correct: iva, hint: `Subtotal × 0.16 = $${fmt(subtotal)} × 0.16` },
            { key: 'total', label: 'Total ($)', type: 'number', correct: total, hint: `Subtotal + IVA = $${fmt(subtotal)} + $${fmt(iva)}` },
          ],
        },
      },
      {
        id: 'result',
        type: 'result',
        title: 'Factura generada',
        description: 'La factura ha sido emitida correctamente',
        data: {
          invoiceNumber: invNum,
          issuedDate: new Date().toISOString().split('T')[0],
          client: client.name,
          rfc: client.rfc,
          concept: product.name,
          quantity: qty,
          unitPrice,
          subtotal,
          iva,
          total,
          cfdiUse: 'D03 - Gastos en general',
          paymentMethod: 'Transferencia Electrónica',
        },
      },
    ],
    validation: [
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente correcto', points: 3, feedback: { pass: 'Cliente seleccionado correctamente', fail: `El cliente era ${client.name}, no la opción que elegiste` } },
      { stepId: 'form', field: 'rfc', type: 'exact', expected: client.rfc, label: 'RFC del cliente', points: 3, feedback: { pass: 'RFC correcto', fail: `El RFC esperado era ${client.rfc}` } },
      { stepId: 'form', field: 'productDesc', type: 'choice', expected: product.name, label: 'Servicio correcto', points: 3, feedback: { pass: 'Servicio correcto', fail: 'El servicio seleccionado no coincide' } },
      { stepId: 'form', field: 'quantity', type: 'exact', expected: qty, label: 'Cantidad', points: 2, feedback: { pass: 'Cantidad correcta', fail: `La cantidad era ${qty}` } },
      { stepId: 'form', field: 'unitPrice', type: 'exact', expected: unitPrice, label: 'Precio unitario', points: 2, feedback: { pass: 'Precio unitario correcto', fail: `El precio unitario era $${fmt(unitPrice)}` } },
      { stepId: 'form', field: 'subtotal', type: 'calculated', expected: subtotal, tolerance: 0, label: 'Cálculo de subtotal', points: 4, feedback: { pass: 'Subtotal correcto', fail: `Subtotal = ${qty} × $${fmt(unitPrice)} = $${fmt(subtotal)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'Cálculo de IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(subtotal)} × 0.16 = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Cálculo del total', points: 4, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(subtotal)} + $${fmt(iva)} = $${fmt(total)}` } },
    ],
  };
}

export function generatePaymentWorkflow(): Workflow {
  const client = pick(CLIENTS);
  const invNum = getConsecutive();
  const totalInvoice = r(10000, 80000);
  const amountPaid = r(5000, totalInvoice);
  const remaining = totalInvoice - amountPaid;

  return {
    taskId: `wf-pay-${r(1000, 9999)}`,
    taskTitle: 'Registro de Pago',
    taskType: 'payment_registration',
    difficulty: 1,
    estimatedMinutes: 10,
    steps: [
      {
        id: 'email',
        type: 'email',
        title: 'Correo del cliente',
        description: 'El cliente ha enviado un comprobante de pago',
        data: {
          from: `${client.name}`,
          to: 'cobranza@logistica.com',
          subject: `Pago de factura ${invNum}`,
          body: `Estimados,
            Adjuntamos el comprobante de pago de la factura **${invNum}**
            por un monto de **$${fmt(amountPaid)}** correspondiente a servicios prestados.

            Quedan pendientes **$${fmt(remaining)}** por liquidar.

            Quedamos atentos a la factura de los próximos servicios.

            Saludos cordiales,
            ${client.name}
            Departamento de Cuentas por Pagar`,
        },
      },
      {
        id: 'form',
        type: 'form',
        title: 'Sistema Contable — Registro de Pago',
        description: 'Registra el pago en el sistema',
        data: {
          fields: [
            { key: 'invoiceNumber', label: 'Factura a pagar', type: 'text', correct: invNum },
            { key: 'clientName', label: 'Cliente', type: 'choice', options: CLIENTS.map(c => c.name), correct: client.name },
            { key: 'amountReceived', label: 'Monto recibido ($)', type: 'number', correct: amountPaid },
            { key: 'paymentMethod', label: 'Método de pago', type: 'choice', options: ['Transferencia SPEIU', 'Cheque', 'Efectivo', 'Tarjeta'], correct: 'Transferencia SPEIU' },
            { key: 'outstandingBalance', label: 'Saldo pendiente ($)', type: 'number', correct: remaining, hint: `Total factura - Monto recibido = $${fmt(totalInvoice)} - $${fmt(amountPaid)}` },
          ],
        },
      },
      {
        id: 'result',
        type: 'result',
        title: 'Pago registrado',
        description: 'El pago ha sido aplicado a la factura',
        data: {
          invoiceNumber: invNum,
          client: client.name,
          amountPaid,
          totalInvoice,
          remaining,
          paymentDate: new Date().toISOString().split('T')[0],
          status: remaining === 0 ? 'Pagado' : 'Pago Parcial',
        },
      },
    ],
    validation: [
      { stepId: 'form', field: 'invoiceNumber', type: 'exact', expected: invNum, label: 'Factura correcta', points: 3, feedback: { pass: 'Factura correcta', fail: `La factura a pagar era ${invNum}` } },
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente', points: 3, feedback: { pass: 'Cliente correcto', fail: 'Cliente incorrecto' } },
      { stepId: 'form', field: 'amountReceived', type: 'exact', expected: amountPaid, label: 'Monto recibido', points: 4, feedback: { pass: 'Monto correcto', fail: `El monto recibido era $${fmt(amountPaid)}` } },
      { stepId: 'form', field: 'paymentMethod', type: 'choice', expected: 'Transferencia SPEIU', label: 'Método de pago', points: 2, feedback: { pass: 'Método correcto', fail: 'Revisa el método de pago indicado en el correo' } },
      { stepId: 'form', field: 'outstandingBalance', type: 'calculated', expected: remaining, tolerance: 1, label: 'Saldo pendiente', points: 4, feedback: { pass: 'Saldo pendiente correcto', fail: `Saldo = $${fmt(totalInvoice)} - $${fmt(amountPaid)} = $${fmt(remaining)}` } },
    ],
  };
}

export function generateBankReconciliationWorkflow(): Workflow {
  const bankBalance = r(150000, 600000);
  const bookBalance = bankBalance + r(-50000, 50000);
  const diff = bankBalance - bookBalance;

  return {
    taskId: `wf-recon-${r(1000, 9999)}`,
    taskTitle: 'Conciliación Bancaria',
    taskType: 'bank_reconciliation',
    difficulty: 2,
    estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo del jefe — Conciliación',
        description: 'Instrucciones para la conciliación bancaria mensual',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Conciliación bancaria julio 2026',
          body: `Buenos días,\nNecesito que concilies el estado de cuenta bancario del mes de julio.\n\nDatos:\n- **Saldo bancario (estado de cuenta):** $${fmt(bankBalance)}\n- **Saldo en libros (libro mayor):** $${fmt(bookBalance)}\n\nRevisa la diferencia y determina si es correcta. Anota el saldo conciliado.\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de Cálculo — Conciliación',
        description: 'Ingresa los saldos para verificar la conciliación',
        data: {
          rows: [
            { label: 'Saldo en Libro Mayor', value: bookBalance, editable: false },
            { label: 'Saldo Estado de Cuenta Bancario', value: bankBalance, editable: false },
            { label: 'Diferencia (Banco - Libros)', value: null, editable: true, correct: diff, formula: '= Banco - Libros' },
            { label: 'Saldo Conciliado Final', value: null, editable: true, correct: bankBalance, formula: '= Banco (con ajustes)' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Conciliación completada',
        description: 'La conciliación bancaria ha sido registrada',
        data: { bankBalance, bookBalance, diff, reconciled: bankBalance, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Diferencia', type: 'calculated', expected: diff, tolerance: 1, label: 'Cálculo de diferencia', points: 8, feedback: { pass: 'Diferencia correcta', fail: `Diferencia = $${fmt(bankBalance)} - $${fmt(bookBalance)} = $${fmt(diff)}` } },
      { stepId: 'spreadsheet', field: 'row_Saldo Conciliado Final', type: 'calculated', expected: bankBalance, tolerance: 1, label: 'Saldo conciliado', points: 5, feedback: { pass: 'Saldo conciliado correcto', fail: 'El saldo conciliado debe ser igual al saldo bancario' } },
    ],
  };
}

function generateJournalEntryWorkflow(): Workflow {
  const monthlyDepreciation = r(3000, 12000);
  const originalCost = monthlyDepreciation * 48;
  const accumulatedDep = r(0, originalCost / 2);

  return {
    taskId: `wf-journal-${r(1000, 9999)}`,
    taskTitle: 'Póliza de Diario',
    taskType: 'journal_entry',
    difficulty: 2,
    estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo del jefe — Póliza de Depreciación',
        description: 'Instrucciones para registrar la depreciación mensual',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Registro de depreciación — Julio 2026',
          body: `Buenos días,\nNecesito que registres la depreciación del equipo de cómputo de la empresa.\n\nDatos:\n- **Costo original equipo:** $${fmt(originalCost)}\n- **Vida útil:** 4 años (48 meses)\n- **Método:** Línea recta\n\nRegistra la póliza de diario con:\n1. Cuenta de depreciación (DEBE)\n2. Depreciación acumulada (HABER)\n3. Concepto descriptivo\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Póliza de Diario',
        description: 'Llena los datos de la póliza',
        data: {
          fields: [
            { key: 'debitAccount', label: 'Cuenta Cargo (DEBE)', type: 'choice', options: ['Gastos de depreciación', 'Depreciación acumulada', 'Inventario', 'Caja chica'], correct: 'Gastos de depreciación' },
            { key: 'creditAccount', label: 'Cuenta Abono (HABER)', type: 'choice', options: ['Depreciación acumulada', 'Gastos de depreciación', 'Bancos', 'Proveedores'], correct: 'Depreciación acumulada' },
            { key: 'amount', label: 'Monto ($)', type: 'number', correct: monthlyDepreciation, hint: 'Costo original ÷ vida útil en meses' },
            { key: 'concept', label: 'Concepto', type: 'choice', options: ['Depreciación mensual equipo de cómputo', 'Depreciación anual equipo', 'Reparación equipo', 'Compra de equipo'], correct: 'Depreciación mensual equipo de cómputo' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Póliza registrada',
        description: 'La póliza de depreciación ha sido registrada',
        data: {
          debitAccount: 'Gastos de depreciación', creditAccount: 'Depreciación acumulada',
          amount: monthlyDepreciation, originalCost, monthlyDepreciation,
          concept: 'Depreciación mensual equipo de cómputo', period: 'Julio 2026',
        },
      },
    ],
    validation: [
      { stepId: 'form', field: 'debitAccount', type: 'choice', expected: 'Gastos de depreciación', label: 'Cuenta DEBE correcta', points: 4, feedback: { pass: 'Cuenta cargo correcta', fail: 'La depreciación se registra como gasto en el DEBE' } },
      { stepId: 'form', field: 'creditAccount', type: 'choice', expected: 'Depreciación acumulada', label: 'Cuenta HABER correcta', points: 4, feedback: { pass: 'Cuenta abono correcta', fail: 'El acumulado se acredita en el HABER' } },
      { stepId: 'form', field: 'amount', type: 'calculated', expected: monthlyDepreciation, tolerance: 1, label: 'Monto correcto', points: 5, feedback: { pass: 'Monto correcto', fail: `Depreciación = $${fmt(originalCost)} ÷ 48 meses = $${fmt(monthlyDepreciation)}` } },
      { stepId: 'form', field: 'concept', type: 'choice', expected: 'Depreciación mensual equipo de cómputo', label: 'Concepto descriptivo', points: 2, feedback: { pass: 'Concepto correcto', fail: 'Selecciona el concepto más específico' } },
    ],
  };
}

function generateGenericWorkflow(taskType: string): Workflow {
  const client = pick(CLIENTS);
  return {
    taskId: `wf-gen-${r(1000, 9999)}`,
    taskTitle: taskType.replace(/_/g, ' '),
    taskType,
    difficulty: 1,
    estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucciones',
        description: 'Revisa la solicitud en tu correo',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: taskType.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
          body: `Realiza la tarea: ${taskType.replace(/_/g, ' ')}.`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Registrar operación',
        description: 'Completa la información',
        data: {
          fields: [
            { key: 'clientName', label: 'Cliente', type: 'choice', options: CLIENTS.map(c => c.name), correct: client.name },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Tarea completada', description: 'Operación registrada',
        data: { client: client.name, status: 'Completado' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente', points: 5, feedback: { pass: 'Cliente correcto', fail: 'Verifica el cliente seleccionado' } },
    ],
  };
}

function generatePayrollWorkflow(): Workflow {
  const employees = [
    { name: 'Juan Martínez', daily: 350, days: 30 },
    { name: 'María García', daily: 420, days: 30 },
    { name: 'Roberto Sánchez', daily: 280, days: 30 },
    { name: 'Ana Patricia Ruiz', daily: 520, days: 30 },
  ];
  const totalGross = employees.reduce((s, e) => s + e.daily * e.days, 0);
  const totalIsr = Math.round(totalGross * 0.12);
  const totalImss = Math.round(totalGross * 0.08);
  const totalNeto = totalGross - totalIsr - totalImss;

  // For the user to calculate: we randomly pick one employee to compute
  const target = pick(employees);
  const grossSingle = target.daily * target.days;
  const isrSingle = Math.round(grossSingle * 0.12);
  const imssSingle = Math.round(grossSingle * 0.08);
  const netoSingle = grossSingle - isrSingle - imssSingle;

  return {
    taskId: `wf-pay-${r(1000, 9999)}`,
    taskTitle: 'Cálculo de Nómina',
    taskType: 'payroll',
    difficulty: 2,
    estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo RRHH — Nómina Quincenal',
        description: 'Recibe la lista de asistencia y calcula la nómina',
        data: {
          from: 'María López — RRHH', to: 'auxiliar@logistica.com',
          subject: 'Nómina primera quincena julio 2026',
          body: `Buenos días,\nAdjunto la lista de asistencia de la primera quincena de julio.\n\n**Empleados:**\n${employees.map(e => `- ${e.name}: $${fmt(e.daily)}/día × ${e.days} días`).join('\n')}\n\nCalcula el sueldo de **${target.name}**:\n- Sueldo bruto = días × sueldo diario\n- ISR (12%) = bruto × 0.12\n- IMSS (8%) = bruto × 0.08\n- Neto = bruto - ISR - IMSS\n\nGracias,\nMaría López`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de Cálculo — Nómina',
        description: `Calcula la nómina de ${target.name}`,
        data: {
          rows: [
            { label: `Sueldo Bruto (${target.name})`, value: null, editable: true, correct: grossSingle, formula: `= ${target.days} × $${fmt(target.daily)}` },
            { label: 'ISR (12%)', value: null, editable: true, correct: isrSingle, formula: '= Bruto × 0.12' },
            { label: 'IMSS (8%)', value: null, editable: true, correct: imssSingle, formula: '= Bruto × 0.08' },
            { label: `Sueldo Neto (${target.name})`, value: null, editable: true, correct: netoSingle, formula: '= Bruto − ISR − IMSS' },
            { label: 'Total Nómina (4 empleados)', value: null, editable: true, correct: totalNeto, formula: '= Suma de todos los sueldos netos' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Nómina calculada',
        description: 'La nómina quincenal ha sido procesada',
        data: { totalGross, totalIsr, totalImss, totalNeto, employees: employees.length, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: `row_Sueldo Bruto (${target.name})`, type: 'calculated', expected: grossSingle, tolerance: 1, label: `Sueldo bruto de ${target.name}`, points: 5, feedback: { pass: 'Sueldo bruto correcto', fail: `Bruto = ${target.days} × $${fmt(target.daily)} = $${fmt(grossSingle)}` } },
      { stepId: 'spreadsheet', field: 'row_ISR (12%)', type: 'calculated', expected: isrSingle, tolerance: 1, label: 'ISR retenido', points: 4, feedback: { pass: 'ISR correcto', fail: `ISR = $${fmt(grossSingle)} × 12% = $${fmt(isrSingle)}` } },
      { stepId: 'spreadsheet', field: 'row_IMSS (8%)', type: 'calculated', expected: imssSingle, tolerance: 1, label: 'IMSS retenido', points: 4, feedback: { pass: 'IMSS correcto', fail: `IMSS = $${fmt(grossSingle)} × 8% = $${fmt(imssSingle)}` } },
      { stepId: 'spreadsheet', field: `row_Sueldo Neto (${target.name})`, type: 'calculated', expected: netoSingle, tolerance: 1, label: 'Sueldo neto', points: 5, feedback: { pass: 'Sueldo neto correcto', fail: `Neto = $${fmt(grossSingle)} - $${fmt(isrSingle)} - $${fmt(imssSingle)} = $${fmt(netoSingle)}` } },
      { stepId: 'spreadsheet', field: 'row_Total Nómina (4 empleados)', type: 'calculated', expected: totalNeto, tolerance: 10, label: 'Total nómina', points: 5, feedback: { pass: 'Total nómina correcto', fail: `Suma los sueldos netos de los 4 empleados = $${fmt(totalNeto)}` } },
    ],
  };
}

function generateSupplierInvoiceWorkflow(): Workflow {
  const supplier = pick(SUPPLIERS);
  const amount = r(5000, 60000);
  const iva = Math.round(amount * 0.16);
  const total = amount + iva;
  const folio = `CFDI-${r(100000, 999999)}`;

  return {
    taskId: `wf-supp-${r(1000, 9999)}`,
    taskTitle: 'Registro de Factura de Proveedor',
    taskType: 'supplier_invoice',
    difficulty: 1,
    estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo — Factura de proveedor',
        description: 'Has recibido una factura CFDI de un proveedor',
        data: {
          from: `${supplier}`, to: 'proveedores@logistica.com',
          subject: `Factura ${folio} — Servicios julio 2026`,
          body: `Estimados,\nAdjuntamos nuestra factura electrónica (CFDI) por los servicios prestados en julio.\n\n**Datos de la factura:**\n- **Folio fiscal:** ${folio}\n- **Proveedor:** ${supplier}\n- **Subtotal (sin IVA):** $${fmt(amount)}\n- **IVA (16%):** $${fmt(iva)}\n- **Total:** $${fmt(total)}\n\nQuedamos atentos a su programación de pago.\n\nSaludos,\n${supplier}`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Registro de CFDI',
        description: 'Registra la factura del proveedor en el sistema',
        data: {
          fields: [
            { key: 'supplierName', label: 'Proveedor', type: 'choice', options: SUPPLIERS, correct: supplier },
            { key: 'folio', label: 'Folio fiscal', type: 'text', correct: folio },
            { key: 'amount', label: 'Subtotal ($)', type: 'number', correct: amount },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'number', correct: iva, hint: `Subtotal × 0.16 = $${fmt(amount)} × 0.16` },
            { key: 'total', label: 'Total ($)', type: 'number', correct: total, hint: `Subtotal + IVA = $${fmt(amount)} + $${fmt(iva)}` },
            { key: 'category', label: 'Categoría', type: 'choice', options: ['Servicios', 'Papelería', 'Transporte', 'Mantenimiento'], correct: 'Servicios' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'CFDI registrado',
        description: 'La factura del proveedor ha sido registrada',
        data: { supplier, folio, amount, iva, total, category: 'Servicios', date: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'supplierName', type: 'choice', expected: supplier, label: 'Proveedor', points: 3, feedback: { pass: 'Proveedor correcto', fail: 'Verifica el proveedor emisor' } },
      { stepId: 'form', field: 'folio', type: 'exact', expected: folio, label: 'Folio fiscal', points: 3, feedback: { pass: 'Folio correcto', fail: `El folio es ${folio}` } },
      { stepId: 'form', field: 'amount', type: 'exact', expected: amount, label: 'Subtotal', points: 3, feedback: { pass: 'Subtotal correcto', fail: `El subtotal era $${fmt(amount)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(amount)} × 16% = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Total', points: 4, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(amount)} + $${fmt(iva)} = $${fmt(total)}` } },
      { stepId: 'form', field: 'category', type: 'choice', expected: 'Servicios', label: 'Categoría', points: 2, feedback: { pass: 'Categoría correcta', fail: 'La categoría debe ser Servicios' } },
    ],
  };
}

function generateIVAWorkflow(): Workflow {
  const grossIncome = r(350000, 750000);
  const deductibleExpenses = r(80000, 250000);
  const ivaRate = 0.16;
  const ivaTrasladado = Math.round(grossIncome * ivaRate);
  const ivaAcreditable = Math.round(deductibleExpenses * ivaRate);
  const ivaPorPagar = ivaTrasladado - ivaAcreditable;

  return {
    taskId: `wf-iva-${r(1000, 9999)}`,
    taskTitle: 'Cálculo de IVA Mensual',
    taskType: 'tax_calculation',
    difficulty: 2,
    estimatedMinutes: 20,
    steps: [
      {
        id: 'email',
        type: 'email',
        title: 'Correo del jefe — Cálculo de IVA',
        description: 'Instrucciones para el cálculo del IVA mensual',
        data: {
          from: 'Lic. Gómez',
          to: 'auxiliar@logistica.com',
          subject: 'Declaración de IVA mensual — Julio 2026',
          body: `Buen día,
            Necesito que calcules el IVA del mes de julio para preparar la declaración.

            Datos del mes:
            - **Ingresos gravados:** $${fmt(grossIncome)}
            - **Gastos deducibles (con IVA):** $${fmt(deductibleExpenses)}

            Calcula:
            1. IVA trasladado (16% de ingresos)
            2. IVA acreditable (16% de gastos)
            3. IVA por pagar (diferencia)

            Entrégame el cálculo antes de las 4pm.

            Saludos,
            Lic. Gómez`,
        },
      },
      {
        id: 'spreadsheet',
        type: 'spreadsheet',
        title: 'Hoja de Cálculo — Cálculo de IVA',
        description: 'Calcula el IVA del mes usando la hoja de cálculo',
        data: {
          rows: [
            { label: 'Ingresos gravados', value: grossIncome, editable: false },
            { label: 'Gastos deducibles (con IVA)', value: deductibleExpenses, editable: false },
            { label: 'Tasa de IVA', value: '16%', editable: false },
            { label: 'IVA Trasladado (16%)', value: null, editable: true, correct: ivaTrasladado, formula: '= Ingresos × 16%' },
            { label: 'IVA Acreditable (16%)', value: null, editable: true, correct: ivaAcreditable, formula: '= Gastos × 16%' },
            { label: 'IVA por Pagar', value: null, editable: true, correct: ivaPorPagar, formula: '= IVA Trasladado − IVA Acreditable' },
          ],
        },
      },
      {
        id: 'result',
        type: 'result',
        title: 'Preliminar de Declaración',
        description: 'Resumen del cálculo de IVA',
        data: {
          period: 'Julio 2026',
          grossIncome,
          deductibleExpenses,
          ivaTrasladado,
          ivaAcreditable,
          ivaPorPagar,
          ivaRate: '16%',
        },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_IVA Trasladado', label: 'IVA Trasladado', type: 'calculated', expected: ivaTrasladado, tolerance: 10, points: 5, feedback: { pass: 'IVA trasladado correcto', fail: `IVA Trasladado = $${fmt(grossIncome)} × 16% = $${fmt(ivaTrasladado)}` } },
      { stepId: 'spreadsheet', field: 'row_IVA Acreditable', label: 'IVA Acreditable', type: 'calculated', expected: ivaAcreditable, tolerance: 10, points: 5, feedback: { pass: 'IVA acreditable correcto', fail: `IVA Acreditable = $${fmt(deductibleExpenses)} × 16% = $${fmt(ivaAcreditable)}` } },
      { stepId: 'spreadsheet', field: 'row_IVA por Pagar', label: 'IVA por Pagar', type: 'calculated', expected: ivaPorPagar, tolerance: 20, points: 5, feedback: { pass: 'IVA por pagar correcto', fail: `IVA por Pagar = $${fmt(ivaTrasladado)} - $${fmt(ivaAcreditable)} = $${fmt(ivaPorPagar)}` } },
    ],
  };
}

export function generateWorkflow(taskType: string): Workflow {
  switch (taskType) {
    case 'invoice_emission': return generateInvoiceWorkflow();
    case 'payment_registration': return generatePaymentWorkflow();
    case 'tax_calculation': return generateIVAWorkflow();
    case 'bank_reconciliation': return generateBankReconciliationWorkflow();
    case 'journal_entry': return generateJournalEntryWorkflow();
    case 'payroll': return generatePayrollWorkflow();
    case 'supplier_invoice': return generateSupplierInvoiceWorkflow();
    default: return generateGenericWorkflow(taskType);
  }
}
