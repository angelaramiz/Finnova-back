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

import { getClients, getSuppliers, getProducts, pickClient, pickSupplier, pickProduct, getNextInvoiceNumber } from './persistentData';

function r(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ─── Persistent data helpers ──────────────────────────────────

function resolveClient(userId?: string) {
  if (userId) {
    const c = pickClient(userId);
    return { name: c.name, rfc: c.rfc, contact: c.contact, email: c.email };
  }
  return pick([{ name: 'Comercial del Norte S.A.', rfc: 'CNS-990101-HIJ' }, { name: 'Transportes Rápidos S.A.', rfc: 'TRA-880202-KLM' }, { name: 'Almacenes del Bajío S.P.R.', rfc: 'ALB-770303-NOP' }, { name: 'Inversiones del Valle S.A.', rfc: 'INV-660404-QRS' }, { name: 'Corporativo Trust S.A.', rfc: 'CTR-550505-TUV' }]);
}

function resolveProduct(userId?: string) {
  if (userId) {
    const p = pickProduct(userId);
    return { name: p.name, unit: p.unit, price: p.price };
  }
  return pick([{ name: 'Flete nacional express', unit: 'viaje', price: 8500 }, { name: 'Almacenaje temporal', unit: 'm2', price: 320 }, { name: 'Manejo de carga especializada', unit: 'ton', price: 12500 }, { name: 'Servicio de consolidación', unit: 'hora', price: 1800 }, { name: 'Transporte internacional', unit: 'contenedor', price: 28500 }]);
}

function resolveSupplier(userId?: string) {
  if (userId) {
    const s = pickSupplier(userId);
    return { name: s.name, rfc: s.rfc, contact: s.contact };
  }
  return { name: pick(['Transportes Express S.A.', 'Papelería del Norte', 'Servicios Tech MX', 'Combustibles del Bajío']), rfc: 'N/A', contact: 'N/A' };
}

function resolveClientList(userId?: string): string[] {
  if (userId) return getClients(userId).map(c => c.name);
  return ['Comercial del Norte S.A.', 'Transportes Rápidos S.A.', 'Almacenes del Bajío S.P.R.', 'Inversiones del Valle S.A.', 'Corporativo Trust S.A.'];
}

function resolveSupplierList(userId?: string): string[] {
  if (userId) return getSuppliers(userId).map(s => s.name);
  return ['Transportes Express S.A.', 'Papelería del Norte', 'Servicios Tech MX', 'Combustibles del Bajío'];
}

function resolveProductList(userId?: string): string[] {
  if (userId) return getProducts(userId).filter(p => p.name !== 'Seguro de carga').map(p => p.name);
  return ['Flete nacional express', 'Almacenaje temporal', 'Manejo de carga especializada', 'Servicio de consolidación', 'Transporte internacional'];
}

// ─── WORKFLOW FACTORIES ───────────────────────────────────────

function getConsecutive(): string {
  const n = r(100, 999);
  return `FAC-2026-${String(n).padStart(3, '0')}`;
}

export function generateInvoiceWorkflow(userId?: string): Workflow {
  const client = resolveClient(userId);
  const product = resolveProduct(userId);
  const qty = r(1, 8);
  const unitPrice = product.price;
  const subtotal = qty * unitPrice;
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const invNum = userId ? getNextInvoiceNumber(userId) : getConsecutive();

  return {
    taskId: `wf-inv-${r(1000, 9999)}`,
    taskTitle: 'Emisión de Factura',
    taskType: 'invoice_emission',
    difficulty: 1,
    estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo del jefe', description: 'Revisa las instrucciones en tu bandeja de entrada',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: `Solicitud de factura — ${client.name}`,
          body: `Buenos días,\nPor favor emite una factura a nombre de **${client.name}** (RFC: ${client.rfc})\npor el servicio de **${product.name.toLowerCase()}** que realizamos este mes.\n\nCantidad: ${qty} ${product.unit}(s)\nPrecio unitario: $${fmt(unitPrice)}\n\nIncluye el IVA correspondiente. La factura debe enviarse antes del cierre del día.\n\nSaludos,\nLic. Gómez\nDepartamento de Administración`,
          urgency: 'media',
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Nueva Factura', description: 'Llena los campos de la factura',
        data: {
          fields: [
            { key: 'clientName', label: 'Cliente', type: 'choice', options: resolveClientList(userId), correct: client.name, validation: { required: true } },
            { key: 'rfc', label: 'RFC', type: 'rfc', correct: client.rfc, validation: { required: true } },
            { key: 'productDesc', label: 'Descripción del servicio', type: 'choice', options: resolveProductList(userId), correct: product.name, validation: { required: true } },
            { key: 'quantity', label: 'Cantidad', type: 'number', correct: qty, validation: { required: true, min: 1, max: 100 } },
            { key: 'unitPrice', label: 'Precio unitario ($)', type: 'currency', correct: unitPrice, validation: { required: true, min: 1 } },
            { key: 'subtotal', label: 'Subtotal ($)', type: 'calculated', correct: subtotal, formula: 'quantity * unitPrice', dependsOn: 'quantity' },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'calculated', correct: iva, formula: 'subtotal * 0.16', dependsOn: 'subtotal' },
            { key: 'total', label: 'Total ($)', type: 'calculated', correct: total, formula: 'subtotal + iva', dependsOn: 'iva' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Factura generada', description: 'La factura ha sido emitida correctamente',
        data: { invoiceNumber: invNum, issuedDate: new Date().toISOString().split('T')[0], client: client.name, rfc: client.rfc, concept: product.name, quantity: qty, unitPrice, subtotal, iva, total, cfdiUse: 'D03 - Gastos en general', paymentMethod: 'Transferencia Electrónica' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente correcto', points: 3, feedback: { pass: 'Cliente seleccionado correctamente', fail: `El cliente era ${client.name}` } },
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

export function generatePaymentWorkflow(userId?: string): Workflow {
  const client = resolveClient(userId);
  const invNum = userId ? getNextInvoiceNumber(userId) : getConsecutive();
  const totalInvoice = r(10000, 80000);
  const amountPaid = r(5000, totalInvoice);
  const remaining = totalInvoice - amountPaid;

  return {
    taskId: `wf-pay-${r(1000, 9999)}`, taskTitle: 'Registro de Pago', taskType: 'payment_registration', difficulty: 1, estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo del cliente', description: 'El cliente ha enviado un comprobante de pago',
        data: {
          from: client.name, to: 'cobranza@logistica.com', subject: `Pago de factura ${invNum}`,
          body: `Estimados,\nAdjuntamos el comprobante de pago de la factura **${invNum}** por un monto de **$${fmt(amountPaid)}** correspondiente a servicios prestados.\n\nQuedan pendientes **$${fmt(remaining)}** por liquidar.\n\nSaludos cordiales,\n${client.name}`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Registro de Pago', description: 'Registra el pago en el sistema',
        data: {
          fields: [
            { key: 'invoiceNumber', label: 'Factura a pagar', type: 'text', correct: invNum, validation: { required: true } },
            { key: 'clientName', label: 'Cliente', type: 'choice', options: resolveClientList(userId), correct: client.name, validation: { required: true } },
            { key: 'amountReceived', label: 'Monto recibido ($)', type: 'currency', correct: amountPaid, validation: { required: true, min: 1 } },
            { key: 'paymentMethod', label: 'Método de pago', type: 'choice', options: ['Transferencia SPEIU', 'Cheque', 'Efectivo', 'Tarjeta'], correct: 'Transferencia SPEIU', validation: { required: true } },
            { key: 'outstandingBalance', label: 'Saldo pendiente ($)', type: 'calculated', correct: remaining, formula: 'totalInvoice - amountReceived', dependsOn: 'amountReceived' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Pago registrado', description: 'El pago ha sido aplicado a la factura',
        data: { invoiceNumber: invNum, client: client.name, amountPaid, totalInvoice, remaining, paymentDate: new Date().toISOString().split('T')[0], status: remaining === 0 ? 'Pagado' : 'Pago Parcial' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'invoiceNumber', type: 'exact', expected: invNum, label: 'Factura correcta', points: 3, feedback: { pass: 'Factura correcta', fail: `La factura a pagar era ${invNum}` } },
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente', points: 3, feedback: { pass: 'Cliente correcto', fail: 'Cliente incorrecto' } },
      { stepId: 'form', field: 'amountReceived', type: 'calculated', expected: amountPaid, tolerance: 0, label: 'Monto recibido', points: 4, feedback: { pass: 'Monto correcto', fail: `El monto era $${fmt(amountPaid)}` } },
      { stepId: 'form', field: 'outstandingBalance', type: 'calculated', expected: remaining, tolerance: 1, label: 'Saldo pendiente', points: 5, feedback: { pass: 'Saldo correcto', fail: `El saldo era $${fmt(remaining)}` } },
    ],
  };
}

function generateIVAWorkflow(): Workflow {
  const sales = r(50000, 200000);
  const purchases = r(20000, sales);
  const ivaTrasladado = Math.round(sales * 0.16);
  const ivaAcreditable = Math.round(purchases * 0.16);
  const ivaPorPagar = ivaTrasladado - ivaAcreditable;

  return {
    taskId: `wf-iva-${r(1000, 9999)}`, taskTitle: 'Cálculo de IVA', taskType: 'tax_calculation', difficulty: 2, estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud del contador', description: 'Calcula el IVA del periodo',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com', subject: 'Cálculo IVA mensual — Julio 2026',
          body: `Buenos días,\nNecesito el cálculo del IVA mensual.\n\nVentas del periodo: $${fmt(sales)}\nCompras del periodo: $${fmt(purchases)}\n\nCalcula el IVA trasladado, acreditable y el saldo por pagar.\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de cálculo — IVA mensual', description: 'Completa la hoja',
        data: {
          rows: [
            { label: 'Ventas del periodo', cell_B: sales },
            { label: 'Compras del periodo', cell_B: purchases },
            { label: 'IVA Trasladado (16%)', cell_B: ivaTrasladado, formula: '=B1*0.16' },
            { label: 'IVA Acreditable (16%)', cell_B: ivaAcreditable, formula: '=B2*0.16' },
            { label: 'IVA por Pagar', cell_B: ivaPorPagar, formula: '=B3-B4' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'IVA calculado', description: 'El IVA ha sido procesado',
        data: { sales, purchases, ivaTrasladado, ivaAcreditable, ivaPorPagar, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_IVA Trasladado (16%)', label: 'IVA Trasladado', type: 'calculated', expected: ivaTrasladado, tolerance: 10, points: 5, feedback: { pass: 'IVA trasladado correcto', fail: `IVA Trasladado = $${fmt(sales)} × 16% = $${fmt(ivaTrasladado)}` } },
      { stepId: 'spreadsheet', field: 'row_IVA Acreditable (16%)', label: 'IVA Acreditable', type: 'calculated', expected: ivaAcreditable, tolerance: 10, points: 5, feedback: { pass: 'IVA acreditable correcto', fail: `IVA Acreditable = $${fmt(purchases)} × 16% = $${fmt(ivaAcreditable)}` } },
      { stepId: 'spreadsheet', field: 'row_IVA por Pagar', label: 'IVA por Pagar', type: 'calculated', expected: ivaPorPagar, tolerance: 20, points: 5, feedback: { pass: 'IVA por pagar correcto', fail: `IVA por Pagar = $${fmt(ivaTrasladado)} - $${fmt(ivaAcreditable)} = $${fmt(ivaPorPagar)}` } },
    ],
  };
}

function generateBankReconciliationWorkflow(): Workflow {
  const bankBalance = r(100000, 500000);
  const bookBalance = bankBalance + r(-5000, 5000);
  const depositsInTransit = r(1, 5) * 5000;
  const outstandingChecks = r(1, 5) * 3000;
  const adjustedBank = bankBalance + depositsInTransit - outstandingChecks;

  return {
    taskId: `wf-bank-${r(1000, 9999)}`, taskTitle: 'Conciliación Bancaria', taskType: 'bank_reconciliation', difficulty: 2, estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email', title: 'Estado de cuenta', description: 'Recibiste el estado de cuenta del banco',
        data: {
          from: 'Banco Norte', to: 'contabilidad@logistica.com', subject: 'Estado de cuenta — Julio 2026',
          body: `Estimado cliente,\nAdjuntamos su estado de cuenta correspondiente a julio 2026.\n\nSaldo en cuenta: $${fmt(bankBalance)}\n\nFavor de realizar su conciliación bancaria.\n\nSaludos,\nBanco Norte`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de conciliación', description: 'Completa la conciliación',
        data: {
          rows: [
            { label: 'Saldo bancario', cell_B: bankBalance },
            { label: 'Depósitos en tránsito', cell_B: depositsInTransit },
            { label: 'Cheques sin cobrar', cell_B: outstandingChecks },
            { label: 'Saldo conciliado', cell_B: adjustedBank, formula: '=B1+B2-B3' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Conciliación completada', description: 'La conciliación bancaria ha sido procesada',
        data: { bankBalance, bookBalance, depositsInTransit, outstandingChecks, adjustedBank, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Saldo conciliado', label: 'Saldo conciliado', type: 'calculated', expected: adjustedBank, tolerance: 10, points: 10, feedback: { pass: 'Conciliación correcta', fail: `Saldo conciliado = $${fmt(bankBalance)} + $${fmt(depositsInTransit)} - $${fmt(outstandingChecks)} = $${fmt(adjustedBank)}` } },
    ],
  };
}

function generateJournalEntryWorkflow(): Workflow {
  const originalCost = r(50000, 200000);
  const monthlyDepreciation = Math.round(originalCost / 48);

  return {
    taskId: `wf-jnl-${r(1000, 9999)}`, taskTitle: 'Póliza de Diario', taskType: 'journal_entry', difficulty: 1, estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud del contador', description: 'Registra la depreciación mensual',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com', subject: 'Registro de depreciación — Julio 2026',
          body: `Buenos días,\nNecesito que registres la depreciación del equipo de cómputo.\n\nCosto original: $${fmt(originalCost)}\nVida útil: 4 años (48 meses)\nMétodo: Línea recta\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Póliza de Diario', description: 'Llena los datos de la póliza',
        data: {
          fields: [
            { key: 'debitAccount', label: 'Cuenta Cargo (DEBE)', type: 'choice', options: ['Gastos de depreciación', 'Depreciación acumulada', 'Inventario', 'Caja chica'], correct: 'Gastos de depreciación', validation: { required: true } },
            { key: 'creditAccount', label: 'Cuenta Abono (HABER)', type: 'choice', options: ['Depreciación acumulada', 'Gastos de depreciación', 'Bancos', 'Proveedores'], correct: 'Depreciación acumulada', validation: { required: true } },
            { key: 'amount', label: 'Monto ($)', type: 'currency', correct: monthlyDepreciation, validation: { required: true, min: 1 } },
            { key: 'concept', label: 'Concepto', type: 'choice', options: ['Depreciación mensual equipo de cómputo', 'Depreciación anual equipo', 'Reparación equipo', 'Compra de equipo'], correct: 'Depreciación mensual equipo de cómputo', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Póliza registrada', description: 'La póliza ha sido registrada',
        data: { debitAccount: 'Gastos de depreciación', creditAccount: 'Depreciación acumulada', amount: monthlyDepreciation, originalCost, concept: 'Depreciación mensual equipo de cómputo', period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'debitAccount', type: 'choice', expected: 'Gastos de depreciación', label: 'Cuenta DEBE correcta', points: 4, feedback: { pass: 'Cuenta cargo correcta', fail: 'La depreciación se registra como gasto en el DEBE' } },
      { stepId: 'form', field: 'creditAccount', type: 'choice', expected: 'Depreciación acumulada', label: 'Cuenta HABER correcta', points: 4, feedback: { pass: 'Cuenta abono correcta', fail: 'El acumulado se acredita en el HABER' } },
      { stepId: 'form', field: 'amount', type: 'calculated', expected: monthlyDepreciation, tolerance: 1, label: 'Monto correcto', points: 5, feedback: { pass: 'Monto correcto', fail: `Depreciación = $${fmt(originalCost)} ÷ 48 meses = $${fmt(monthlyDepreciation)}` } },
    ],
  };
}

function generatePayrollWorkflow(): Workflow {
  const employees = [
    { name: 'Ana García', salary: 25000 },
    { name: 'Carlos López', salary: 32000 },
    { name: 'María Fernández', salary: 28000 },
    { name: 'Roberto Méndez', salary: 35000 },
  ];
  const totalGross = employees.reduce((s, e) => s + e.salary, 0);
  const totalIsr = Math.round(totalGross * 0.15);
  const totalImss = Math.round(totalGross * 0.05);
  const totalNeto = totalGross - totalIsr - totalImss;

  return {
    taskId: `wf-nom-${r(1000, 9999)}`, taskTitle: 'Cálculo de Nómina', taskType: 'payroll', difficulty: 2, estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucciones de nómina', description: 'Calcula la nómina del mes',
        data: {
          from: 'Lic. Gómez', to: 'nomina@logistica.com', subject: 'Cálculo nómina — Julio 2026',
          body: `Buenos días,\nCalcula la nómina mensual de los 4 empleados.\n\nEmpleados:\n${employees.map(e => `- ${e.name}: $${fmt(e.salary)}`).join('\n')}\n\nAplica ISR (15%) e IMSS (5%).\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de nómina', description: 'Completa la nómina',
        data: {
          rows: [
            ...employees.map(e => ({ label: e.name, cell_B: e.salary })),
            { label: 'Total bruto', cell_B: totalGross, formula: '=SUMA(B1:B4)' },
            { label: 'ISR (15%)', cell_B: totalIsr, formula: '=B5*0.15' },
            { label: 'IMSS (5%)', cell_B: totalImss, formula: '=B5*0.05' },
            { label: 'Total neto', cell_B: totalNeto, formula: '=B5-B6-B7' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Nómina calculada', description: 'La nómina ha sido procesada',
        data: { employees: employees.length, totalGross, totalIsr, totalImss, totalNeto, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Total bruto', label: 'Total bruto', type: 'calculated', expected: totalGross, tolerance: 0, points: 3, feedback: { pass: 'Total bruto correcto', fail: `El total bruto era $${fmt(totalGross)}` } },
      { stepId: 'spreadsheet', field: 'row_ISR (15%)', label: 'ISR', type: 'calculated', expected: totalIsr, tolerance: 10, points: 4, feedback: { pass: 'ISR correcto', fail: `ISR = $${fmt(totalGross)} × 15% = $${fmt(totalIsr)}` } },
      { stepId: 'spreadsheet', field: 'row_IMSS (5%)', label: 'IMSS', type: 'calculated', expected: totalImss, tolerance: 10, points: 4, feedback: { pass: 'IMSS correcto', fail: `IMSS = $${fmt(totalGross)} × 5% = $${fmt(totalImss)}` } },
      { stepId: 'spreadsheet', field: 'row_Total neto', label: 'Total neto', type: 'calculated', expected: totalNeto, tolerance: 20, points: 5, feedback: { pass: 'Total neto correcto', fail: `Neto = $${fmt(totalGross)} - $${fmt(totalIsr)} - $${fmt(totalImss)} = $${fmt(totalNeto)}` } },
    ],
  };
}

function generateSupplierInvoiceWorkflow(userId?: string): Workflow {
  const supplier = resolveSupplier(userId);
  const amount = r(5000, 60000);
  const iva = Math.round(amount * 0.16);
  const total = amount + iva;
  const folio = `CFDI-${r(100000, 999999)}`;

  return {
    taskId: `wf-supp-${r(1000, 9999)}`, taskTitle: 'Registro de Factura de Proveedor', taskType: 'supplier_invoice', difficulty: 1, estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo — Factura de proveedor', description: 'Has recibido una factura CFDI de un proveedor',
        data: {
          from: supplier.name, to: 'proveedores@logistica.com', subject: `Factura ${folio} — Servicios julio 2026`,
          body: `Estimados,\nAdjuntamos nuestra factura electrónica (CFDI) por los servicios prestados en julio.\n\nFolio fiscal: ${folio}\nProveedor: ${supplier.name}\nSubtotal: $${fmt(amount)}\nIVA (16%): $${fmt(iva)}\nTotal: $${fmt(total)}\n\nQuedamos atentos a su programación de pago.\n\nSaludos,\n${supplier.name}`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Registro de CFDI', description: 'Registra la factura del proveedor',
        data: {
          fields: [
            { key: 'supplierName', label: 'Proveedor', type: 'choice', options: resolveSupplierList(userId), correct: supplier.name, validation: { required: true } },
            { key: 'folio', label: 'Folio fiscal', type: 'text', correct: folio, validation: { required: true } },
            { key: 'amount', label: 'Subtotal ($)', type: 'currency', correct: amount, validation: { required: true, min: 1 } },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'calculated', correct: iva, formula: 'amount * 0.16', dependsOn: 'amount' },
            { key: 'total', label: 'Total ($)', type: 'calculated', correct: total, formula: 'amount + iva', dependsOn: 'iva' },
            { key: 'category', label: 'Categoría', type: 'choice', options: ['Servicios', 'Papelería', 'Transporte', 'Mantenimiento'], correct: 'Servicios', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'CFDI registrado', description: 'La factura del proveedor ha sido registrada',
        data: { supplier: supplier.name, folio, amount, iva, total, category: 'Servicios', date: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'supplierName', type: 'choice', expected: supplier.name, label: 'Proveedor', points: 3, feedback: { pass: 'Proveedor correcto', fail: 'El proveedor no coincide' } },
      { stepId: 'form', field: 'amount', type: 'calculated', expected: amount, tolerance: 0, label: 'Subtotal', points: 4, feedback: { pass: 'Subtotal correcto', fail: `El subtotal era $${fmt(amount)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(amount)} × 16% = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Total', points: 4, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(amount)} + $${fmt(iva)} = $${fmt(total)}` } },
    ],
  };
}

function generatePaymentSchedulingWorkflow(): Workflow {
  const suppliers = [
    { name: 'Transportes Express S.A.', amount: 85000, dueDate: '2026-08-05' },
    { name: 'Servicios Tech MX', amount: 32000, dueDate: '2026-08-07' },
    { name: 'Papelería del Norte', amount: 12000, dueDate: '2026-08-10' },
  ];
  const total = suppliers.reduce((s, p) => s + p.amount, 0);

  return {
    taskId: `wf-sch-${r(1000, 9999)}`, taskTitle: 'Programación de Pagos', taskType: 'payment_scheduling', difficulty: 1, estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucciones de pago', description: 'Programa los pagos de la semana',
        data: {
          from: 'Tesorería', to: 'pagos@logistica.com', subject: 'Programación de pagos — Semana',
          body: `Buenos días,\nFacturas de proveedores que vencen esta semana:\n\n${suppliers.map(p => `- **${p.name}:** $${fmt(p.amount)} (vence: ${p.dueDate})`).join('\n')}\n\nTotal a programar: $${fmt(total)}\n\nSaludos,\nTesorería`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Programar Pagos', description: 'Confirma la programación',
        data: {
          fields: [
            { key: 'totalToPay', label: 'Total a pagar ($)', type: 'currency', correct: total, validation: { required: true, min: 1 } },
            { key: 'paymentMethod', label: 'Método de pago', type: 'choice', options: ['SPEUI', 'Cheque', 'Efectivo'], correct: 'SPEUI', validation: { required: true } },
            { key: 'scheduleDate', label: 'Fecha de dispersión', type: 'choice', options: [suppliers[0].dueDate, suppliers[1].dueDate, suppliers[2].dueDate], correct: suppliers[0].dueDate, validation: { required: true } },
            { key: 'prioritySupplier', label: 'Proveedor prioritario', type: 'choice', options: suppliers.map(s => s.name), correct: suppliers[0].name, validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Pagos programados', description: 'La programación ha sido registrada',
        data: { total, suppliers: suppliers.length, paymentMethod: 'SPEUI', scheduleDate: suppliers[0].dueDate },
      },
    ],
    validation: [
      { stepId: 'form', field: 'totalToPay', type: 'calculated', expected: total, tolerance: 10, label: 'Total a pagar', points: 6, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(total)}` } },
      { stepId: 'form', field: 'paymentMethod', type: 'choice', expected: 'SPEUI', label: 'Método de pago', points: 4, feedback: { pass: 'Método correcto', fail: 'Los pagos se hacen vía SPEUI' } },
    ],
  };
}

function generateAPReconciliationWorkflow(): Workflow {
  const invoices = r(8, 15);
  const matched = r(5, invoices);
  const unmatched = invoices - matched;

  return {
    taskId: `wf-ap-${r(1000, 9999)}`, taskTitle: 'Conciliación de Cuentas por Pagar', taskType: 'ap_reconciliation', difficulty: 2, estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud de conciliación', description: 'Concilia las cuentas por pagar',
        data: {
          from: 'Lic. Gómez', to: 'cuentasporpagar@logistica.com', subject: 'Conciliación AP — Julio 2026',
          body: `Buenos días,\nRealiza la conciliación de cuentas por pagar del periodo.\n\nTotal facturas: ${invoices}\nFacturas conciliadas: ${matched}\nFacturas sin conciliar: ${unmatched}\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de conciliación AP', description: 'Completa la conciliación',
        data: {
          rows: [
            { label: 'Total facturas', cell_B: invoices },
            { label: 'Facturas conciliadas', cell_B: matched },
            { label: 'Facturas sin conciliar', cell_B: unmatched, formula: '=B1-B2' },
            { label: '% Conciliación', cell_B: Math.round((matched / invoices) * 100), formula: '=B2/B1*100' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Conciliación completada', description: 'La conciliación AP ha sido procesada',
        data: { invoices, matched, unmatched, percentage: Math.round((matched / invoices) * 100) },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Facturas sin conciliar', label: 'Sin conciliar', type: 'calculated', expected: unmatched, tolerance: 0, points: 5, feedback: { pass: 'Correcto', fail: `Sin conciliar = ${invoices} - ${matched} = ${unmatched}` } },
      { stepId: 'spreadsheet', field: 'row_% Conciliación', label: '% Conciliación', type: 'calculated', expected: Math.round((matched / invoices) * 100), tolerance: 1, points: 5, feedback: { pass: 'Porcentaje correcto', fail: `% = ${matched}/${invoices} × 100 = ${Math.round((matched / invoices) * 100)}%` } },
    ],
  };
}

function generateCFDIWorkflow(): Workflow {
  const uuid = `${r(10000000, 99999999)}-${r(1000, 9999)}-${r(1000, 9999)}-${r(1000, 9999)}-${r(100000000000, 999999999999)}`;
  const provider = pick(['Transportes Express S.A.', 'Servicios Tech MX']);
  const rfc = provider === 'Transportes Express S.A.' ? 'TEX-920101-ABC' : 'STM-900303-GHI';
  const subtotal = r(10000, 80000);
  const iva = Math.round(subtotal * 0.16);
  const isr = Math.round(subtotal * 0.01);
  const total = subtotal + iva - isr;

  return {
    taskId: `wf-cfdi-${r(1000, 9999)}`, taskTitle: 'Recepción de CFDI', taskType: 'cfdi_reception', difficulty: 1, estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'CFDI recibido', description: 'Has recibido un CFDI 4.0',
        data: {
          from: provider, to: 'facturacion@logistica.com', subject: `CFDI 4.0 — ${uuid}`,
          body: `Se ha recibido un Comprobante Fiscal Digital (CFDI) versión 4.0.\n\nUUID: ${uuid}\nEmisor: ${provider}\nRFC: ${rfc}\nSubtotal: $${fmt(subtotal)}\nIVA (16%): $${fmt(iva)}\nISR retenido (1%): $${fmt(isr)}\nTotal: $${fmt(total)}\n\nUso CFDI: D03 - Gastos en general\nForma de pago: Transferencia Electrónica`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Validación de CFDI', description: 'Registra y valida la factura electrónica',
        data: {
          fields: [
            { key: 'providerName', label: 'Emisor', type: 'choice', options: ['Transportes Express S.A.', 'Papelería del Norte', 'Servicios Tech MX', 'Combustibles del Bajío'], correct: provider, validation: { required: true } },
            { key: 'rfc', label: 'RFC Emisor', type: 'rfc', correct: rfc, validation: { required: true } },
            { key: 'subtotal', label: 'Subtotal ($)', type: 'currency', correct: subtotal, validation: { required: true, min: 1 } },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'calculated', correct: iva, formula: 'subtotal * 0.16', dependsOn: 'subtotal' },
            { key: 'isr', label: 'ISR retenido (1%) ($)', type: 'calculated', correct: isr, formula: 'subtotal * 0.01', dependsOn: 'subtotal' },
            { key: 'total', label: 'Total ($)', type: 'calculated', correct: total, formula: 'subtotal + iva - isr', dependsOn: 'isr' },
            { key: 'usoCFDI', label: 'Uso del CFDI', type: 'choice', options: ['D03 - Gastos en general', 'G01 - Adquisición de mercancías', 'I01 - Inversiones'], correct: 'D03 - Gastos en general', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'CFDI registrado y validado', description: 'La factura electrónica ha sido procesada',
        data: { provider, rfc, uuid, subtotal, iva, isr, total, usoCFDI: 'D03 - Gastos en general' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'providerName', type: 'choice', expected: provider, label: 'Emisor', points: 3, feedback: { pass: 'Emisor correcto', fail: 'El emisor no coincide' } },
      { stepId: 'form', field: 'subtotal', type: 'calculated', expected: subtotal, tolerance: 0, label: 'Subtotal', points: 4, feedback: { pass: 'Subtotal correcto', fail: `El subtotal era $${fmt(subtotal)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(subtotal)} × 16% = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Total', points: 4, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(subtotal)} + $${fmt(iva)} - $${fmt(isr)} = $${fmt(total)}` } },
    ],
  };
}

function generateCreditNoteWorkflow(userId?: string): Workflow {
  const client = resolveClient(userId);
  const invNum = userId ? getNextInvoiceNumber(userId) : getConsecutive();
  const creditAmount = r(1000, 15000);
  const iva = Math.round(creditAmount * 0.16);
  const total = creditAmount + iva;
  const reason = pick(['Devolución parcial', 'Descuento por volumen', 'Error en facturación', 'Bonificación']);

  return {
    taskId: `wf-cn-${r(1000, 9999)}`, taskTitle: 'Nota de Crédito', taskType: 'credit_note', difficulty: 2, estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud del cliente', description: 'El cliente solicita una nota de crédito',
        data: {
          from: client.name, to: 'facturacion@logistica.com', subject: `Solicitud nota de crédito — ${invNum}`,
          body: `Buenos días,\nSolicitamos la emisión de una nota de crédito por **$${fmt(creditAmount)}** (+IVA) respecto a la factura **${invNum}**.\n\nMotivo: ${reason}\n\nFavor de confirmar la emisión.\n\nSaludos,\n${client.name}`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Nota de Crédito', description: 'Genera la nota de crédito',
        data: {
          fields: [
            { key: 'clientName', label: 'Cliente', type: 'choice', options: resolveClientList(userId), correct: client.name, validation: { required: true } },
            { key: 'originalInvoice', label: 'Factura original', type: 'text', correct: invNum, validation: { required: true } },
            { key: 'reason', label: 'Motivo', type: 'choice', options: ['Devolución parcial', 'Descuento por volumen', 'Error en facturación', 'Bonificación'], correct: reason, validation: { required: true } },
            { key: 'creditAmount', label: 'Monto del crédito ($)', type: 'currency', correct: creditAmount, validation: { required: true, min: 1 } },
            { key: 'iva', label: 'IVA (16%) ($)', type: 'calculated', correct: iva, formula: 'creditAmount * 0.16', dependsOn: 'creditAmount' },
            { key: 'total', label: 'Total nota de crédito ($)', type: 'calculated', correct: total, formula: 'creditAmount + iva', dependsOn: 'iva' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Nota de crédito emitida', description: 'La nota de crédito ha sido generada',
        data: { client: client.name, invoice: invNum, reason, creditAmount, iva, total, date: new Date().toISOString().split('T')[0] },
      },
    ],
    validation: [
      { stepId: 'form', field: 'clientName', type: 'choice', expected: client.name, label: 'Cliente', points: 3, feedback: { pass: 'Cliente correcto', fail: 'Verifica el cliente' } },
      { stepId: 'form', field: 'originalInvoice', type: 'exact', expected: invNum, label: 'Factura original', points: 3, feedback: { pass: 'Factura correcta', fail: `La factura era ${invNum}` } },
      { stepId: 'form', field: 'creditAmount', type: 'calculated', expected: creditAmount, tolerance: 0, label: 'Monto del crédito', points: 4, feedback: { pass: 'Monto correcto', fail: `El monto era $${fmt(creditAmount)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(creditAmount)} × 0.16 = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Total', points: 3, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(creditAmount)} + $${fmt(iva)} = $${fmt(total)}` } },
    ],
  };
}

function generateCashCutWorkflow(): Workflow {
  const cashInBox = r(5000, 15000);
  const salesCash = r(8000, 25000);
  const salesCard = r(3000, 12000);
  const expenses = r(500, 3000);
  const deposits = r(2000, 8000);
  const totalSales = salesCash + salesCard;
  const expectedCash = cashInBox + salesCash - expenses - deposits;
  const actualCash = expectedCash + r(-200, 200);
  const difference = actualCash - expectedCash;

  return {
    taskId: `wf-cc-${r(1000, 9999)}`, taskTitle: 'Corte de Caja', taskType: 'cash_cut', difficulty: 2, estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucciones de corte', description: 'El supervisor solicita el corte de caja',
        data: {
          from: 'Lic. Gómez', to: 'cajero@logistica.com', subject: 'Corte de caja — fin de turno',
          body: `Buenos días,\nRealiza el corte de caja del turno de la mañana.\n\nFondo inicial: $${fmt(cashInBox)}\n\nIngresa los datos de ventas, gastos y depósitos.\n\nSaludos,\nLic. Gómez`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de cálculo — Corte de Caja', description: 'Completa la hoja de corte',
        data: {
          rows: [
            { label: 'Fondo inicial', cell_B: cashInBox },
            { label: 'Ventas en efectivo', cell_B: salesCash },
            { label: 'Ventas con tarjeta', cell_B: salesCard },
            { label: 'Total ventas', cell_B: totalSales, formula: '=SUMA(B2:B3)' },
            { label: 'Gastos del turno', cell_B: expenses },
            { label: 'Depósitos realizados', cell_B: deposits },
            { label: 'Efectivo esperado', cell_B: expectedCash, formula: '=B1+B2-B5-B6' },
            { label: 'Efectivo contado', cell_B: actualCash },
            { label: 'Diferencia', cell_B: difference, formula: '=B8-B7' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Corte de caja completado', description: 'El corte ha sido registrado',
        data: { cashInBox, salesCash, salesCard, totalSales, expenses, deposits, expectedCash, actualCash, difference, date: new Date().toISOString().split('T')[0], status: Math.abs(difference) <= 100 ? 'Cuadrado' : 'Descuadrado' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Efectivo esperado', label: 'Efectivo esperado', type: 'calculated', expected: expectedCash, tolerance: 10, points: 8, feedback: { pass: 'Efectivo esperado correcto', fail: `Efectivo esperado = $${fmt(expectedCash)}` } },
      { stepId: 'spreadsheet', field: 'row_Diferencia', label: 'Diferencia', type: 'calculated', expected: difference, tolerance: 10, points: 7, feedback: { pass: 'Diferencia correcta', fail: `Diferencia = $${fmt(actualCash)} - $${fmt(expectedCash)} = $${fmt(difference)}` } },
    ],
  };
}

function generateGenericWorkflow(taskType: string): Workflow {
  return {
    taskId: `wf-gen-${r(1000, 9999)}`, taskTitle: taskType.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), taskType, difficulty: 1, estimatedMinutes: 10,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucción', description: 'Revisa las instrucciones',
        data: {
          from: 'Sistema', to: 'usuario@logistica.com',
          subject: taskType.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
          body: `Realiza la tarea: ${taskType.replace(/_/g, ' ')}.`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Registrar operación', description: 'Completa la información',
        data: {
          fields: [
            { key: 'clientName', label: 'Cliente', type: 'choice', options: resolveClientList(undefined), correct: 'Comercial del Norte S.A.', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Tarea completada', description: 'Operación registrada',
        data: { client: 'Comercial del Norte S.A.', status: 'Completado' },
      },
    ],
    validation: [
      { stepId: 'form', field: 'clientName', type: 'choice', expected: 'Comercial del Norte S.A.', label: 'Cliente', points: 5, feedback: { pass: 'Cliente correcto', fail: 'Verifica el cliente seleccionado' } },
    ],
  };
}

// ─── MAIN ENTRY ───────────────────────────────────────────────

export function generateWorkflow(taskType: string, userId?: string): Workflow {
  switch (taskType) {
    case 'invoice_emission': return generateInvoiceWorkflow(userId);
    case 'payment_registration': return generatePaymentWorkflow(userId);
    case 'tax_calculation': return generateIVAWorkflow();
    case 'bank_reconciliation': return generateBankReconciliationWorkflow();
    case 'journal_entry': return generateJournalEntryWorkflow();
    case 'payroll': return generatePayrollWorkflow();
    case 'supplier_invoice': return generateSupplierInvoiceWorkflow(userId);
    case 'payment_scheduling': return generatePaymentSchedulingWorkflow();
    case 'ap_reconciliation': return generateAPReconciliationWorkflow();
    case 'cfdi_reception': return generateCFDIWorkflow();
    case 'credit_note': return generateCreditNoteWorkflow(userId);
    case 'cash_cut': return generateCashCutWorkflow();
    default: return generateGenericWorkflow(taskType);
  }
}
