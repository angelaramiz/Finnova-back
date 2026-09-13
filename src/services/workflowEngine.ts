// ─── TYPES ────────────────────────────────────────────────────

export type StepType = 'email' | 'form' | 'spreadsheet' | 'result';

export interface GuideBubble {
  id: string;
  title: string;
  body: string;
  anchor?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  data: any;
  guides?: GuideBubble[];
}

export interface ValidationRule {
  stepId: string;
  field: string;
  type: 'exact' | 'calculated' | 'choice' | 'range' | 'de';
  expected?: any;
  tolerance?: number;
  validator?: string;
  trap?: string;
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
  isTrap?: boolean;
  trapId?: string;
  trapDescription?: string;
}

export interface TrapScenario {
  id: string;
  title: string;
  taskType: string;
  week: number;
  day: number;
  description: string;
  expectedMistake: string;
  specialty: 'accounting' | 'data_engineering';
}

export const TRAP_SCENARIOS: TrapScenario[] = [
  { id: 'iva_incorrecto', title: 'Factura con IVA incorrecto', taskType: 'invoice_emission', week: 1, day: 3, description: 'La factura del cliente viene precapturada con IVA al 10% en lugar de 16%', expectedMistake: 'Multa SAT', specialty: 'accounting' },
  { id: 'pago_mal_aplicado', title: 'Pago mal aplicado', taskType: 'payment_registration', week: 2, day: 3, description: 'El comprobante menciona una factura de otro cliente; el pago debe aplicarse al cliente que realmente transfirió', expectedMistake: 'Saldos incorrectos', specialty: 'accounting' },
  { id: 'conciliacion_no_cuadra', title: 'Conciliación no cuadra', taskType: 'bank_reconciliation', week: 3, day: 4, description: 'Un cheque de $3,500 emitido la semana pasada no aparece en el estado de cuenta', expectedMistake: 'Diferencias bancarias', specialty: 'accounting' },
  { id: 'nomina_isr_mal', title: 'Nómina con ISR mal calculado', taskType: 'payroll', week: 4, day: 1, description: 'La nómina fue precargada con ISR al 15% fijo en lugar de la tabla progresiva del SAT', expectedMistake: 'Demandas laborales', specialty: 'accounting' },
];

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
        guides: [
          { id: 'g-portal', title: 'El flujo en el portal SAT', body: 'En la práctica real emitirías desde el portal facturación del SAT o tu sistema (Odoo). El flujo es: 1) capturas los datos del cliente y del servicio, 2) el sistema valida el RFC y el régimen contra el padrón del SAT, 3) el sistema timbra el CFDI con el sello fiscal, 4) se envía el XML + PDF al cliente y una copia al SAT. Hoy practicarás ese flujo en el sistema contable del simulador.', position: 'top' },
          { id: 'g-datos', title: 'Qué datos debes identificar', body: 'Del correo del jefe extrae: el CLIENTE (nombre y RFC), el CONCEPTO del servicio y el PRECIO UNITARIO. Esos son los insumos que capturarás en el formulario siguiente.', position: 'bottom' },
        ],
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: `Solicitud de factura — ${client.name}`,
          body: `Buenos días,

Necesito que emitas una factura electrónica (CFDI 4.0) a nombre de **${client.name}** por el servicio de transporte que completamos la semana pasada.

**Datos del servicio:**
- Cliente: ${client.name} (RFC: ${client.rfc})
- Concepto: ${product.name}
- Cantidad: ${qty} ${product.unit}(s)
- Precio unitario: $${fmt(unitPrice)}

**Instrucciones:**
1. Selecciona al cliente correcto en el catálogo
2. Captura el RFC exacto del cliente
3. Ingresa cantidad y precio unitario
4. El sistema calculará automáticamente subtotal, IVA y total
5. Verifica que los cálculos sean correctos antes de entregar

La factura debe enviarse al cliente antes de las 14:00 hrs. Si tienes dudas, acércate a mi escritorio.

Saludos,
Lic. Gómez
Contador General
Logística del Norte S.A. de C.V.`,
          urgency: 'alta',
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Nueva Factura', description: 'Llena los campos de la factura',
        guides: [
          { id: 'g-cfdi', title: '¿Qué es un CFDI?', body: 'El CFDI 4.0 (Comprobante Fiscal Digital por Internet) es la factura electrónica que emites ante el SAT. Sin él, el cliente NO puede deducir el gasto. Debe contener: RFC emisor/receptor, uso de CFDI, régimen fiscal, método de pago y los importes.', position: 'top' },
          { id: 'g-cliente', title: 'Selecciona el cliente', body: 'Elige en el catálogo al cliente del correo del Lic. Gómez. Un cliente equivocado emite el CFDI a la persona errónea.', anchor: '[data-guide="clientName"]', position: 'right' },
          { id: 'g-rfc', title: '¿Por qué importa el RFC?', body: 'El RFC del cliente debe ser EXACTO (homoclave incluida). Un RFC con error hace el CFDI inválido ante el SAT y genera una multa. Cópialo del catálogo de clientes.', anchor: '[data-guide="rfc"]', position: 'right' },
          { id: 'g-servicio', title: 'El concepto del servicio', body: 'Selecciona el servicio prestado (el mismo del correo). Define qué se está facturando y su precio unitario.', anchor: '[data-guide="productDesc"]', position: 'right' },
          { id: 'g-cantidad', title: 'Cantidad del servicio', body: 'Ingresa cuántas unidades/veces se prestó el servicio. Es un insumo para el subtotal (cantidad × precio unitario).', anchor: '[data-guide="quantity"]', position: 'right' },
          { id: 'g-precio', title: 'Precio unitario', body: 'El precio de UNA unidad del servicio, del catálogo de productos. No lo inventes: tómnalo del catálogo o del correo.', anchor: '[data-guide="unitPrice"]', position: 'right' },
          { id: 'g-subtotal', title: 'Cómo se calcula el subtotal', body: 'Subtotal = Cantidad × Precio unitario. El sistema lo calcula automáticamente; solo verifica que coincida.', anchor: '[data-guide="subtotal"]', position: 'right' },
          { id: 'g-iva', title: '¿Cómo se calcula el IVA?', body: 'El IVA en México es 16%. Se calcula sobre el subtotal: IVA = subtotal × 0.16. El total es subtotal + IVA. Si el cliente te pide IVA al 10% o 8%, es una TRAMPA: vigila siempre la tasa vigente.', anchor: '[data-guide="iva"]', position: 'bottom' },
          { id: 'g-total', title: 'El total de la factura', body: 'Total = Subtotal + IVA. Es el importe que el cliente pagará. Verifica que los tres importes (subtotal, IVA, total) sean coherentes.', anchor: '[data-guide="total"]', position: 'right' },
        ],
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
          from: client.name, to: 'cobranza@logistica.com',
          subject: `Pago de factura ${invNum} — Transferencia bancaria`,
          body: `Estimados,

Por medio del presente, les confirmo que realizamos el pago de la factura **${invNum}** por un monto de **$${fmt(amountPaid)}** mediante transferencia SPEI.

**Datos de la transferencia:**
- Banco: Banorte
- Cuenta destino: ****4567
- Fecha: ${new Date().toLocaleDateString('es-MX')}
- Referencia: ${r(100000, 999999)}

El monto restante de **$${fmt(remaining)}** será liquidado en los próximos 15 días.

Quedamos atentos a su confirmación de recepción.

Saludos cordiales,
${client.name}
Departamento de Finanzas`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Registro de Pago', description: 'Registra el pago en el sistema',
        guides: [
          { id: 'g-factura', title: '¿Qué factura se paga?', body: 'Escribe el folio de la factura que el cliente dice pagar en su correo. Un folio equivocado aplica el pago a la factura incorrecta.', anchor: '[data-guide="invoiceNumber"]', position: 'right' },
          { id: 'g-cliente', title: '¿Qué cliente pagó?', body: 'Selecciona el cliente que transfirió (el remitente del SPEI en el correo). Aplicar el pago de A a la factura de B corrompe los saldos (trampa #2).', anchor: '[data-guide="clientName"]', position: 'right' },
          { id: 'g-monto', title: 'Monto recibido', body: 'El importe de la transferencia SPEI, del correo del cliente. Es lo que ingresa a tu banco. No lo redondees.', anchor: '[data-guide="amountReceived"]', position: 'right' },
          { id: 'g-metodo', title: 'Método de pago', body: 'Cómo se pagó: el correo indica Transferencia SPEI. Selecciónalo para que el asiento sea coherente (bancos).', anchor: '[data-guide="paymentMethod"]', position: 'right' },
          { id: 'g-saldo', title: 'Saldo pendiente', body: 'Saldo pendiente = total de la factura − monto recibido. Si el cliente pagó de menos, la factura queda como pago parcial. No inventes el saldo: calcúlalo.', anchor: '[data-guide="outstandingBalance"]', position: 'bottom' },
        ],
        data: {
          fields: [
            { key: 'invoiceNumber', label: 'Factura a pagar', type: 'text', correct: invNum, validation: { required: true } },
            { key: 'clientName', label: 'Cliente', type: 'choice', options: resolveClientList(userId), correct: client.name, validation: { required: true } },
            { key: 'amountReceived', label: 'Monto recibido ($)', type: 'currency', correct: amountPaid, validation: { required: true, min: 1 } },
            { key: 'paymentMethod', label: 'Método de pago', type: 'choice', options: ['Transferencia SPEI', 'Cheque', 'Efectivo', 'Tarjeta'], correct: 'Transferencia SPEI', validation: { required: true } },
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
      { stepId: 'form', field: 'paymentMethod', type: 'choice', expected: 'Transferencia SPEI', label: 'Método de pago', points: 2, feedback: { pass: 'Método correcto', fail: 'El pago llegó por Transferencia SPEI' } },
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
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Cálculo IVA mensual — Julio 2026',
          body: `Buenos días,

Necesito que realices el cálculo del IVA mensual para la declaración de julio 2026.

**Datos del periodo:**
- Ventas totales: $${fmt(sales)}
- Compras deducibles: $${fmt(purchases)}

**Pasos a seguir:**
1. Abre la hoja de cálculo del módulo fiscal
2. Ingresa las ventas y compras del periodo
3. Calcula el IVA trasladado (16% sobre ventas)
4. Calcula el IVA acreditable (16% sobre compras)
5. Determina el saldo a pagar o a favor

Recuerda que el IVA por pagar se deposita antes del día 17 del mes siguiente. Si tienes dudas sobre los montos, revisa los CFDI en el módulo de facturación.

Saludos,
Lic. Gómez
Contador General`,
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
        guides: [
          { id: 'g-estado', title: '¿Qué es un estado de cuenta?', body: 'Es el resumen que el banco te envía cada mes con todos los movimientos de tu cuenta: depósitos, cheques cobrados, comisiones y el saldo final. Este saldo es el punto de partida de la conciliación.', position: 'top' },
        ],
        data: {
          from: 'Banco Norte - Notificaciones', to: 'contabilidad@logistica.com',
          subject: 'Estado de cuenta electrónico — Julio 2026',
          body: `Estimado cliente,

Le notificamos que su estado de cuenta correspondiente a julio 2026 está disponible.

**Resumen de la cuenta:**
- Cuenta: ****7890 (Corriente)
- Saldo al corte: $${fmt(bankBalance)}
- Movimientos: ${r(15, 45)} transacciones

**Documentos adjuntos:**
- Estado de cuenta en PDF
- CSV de movimientos

Le recordamos realizar su conciliación bancaria mensual antes del día 5 del mes siguiente.

Si tiene alguna pregunta, comuníquese al (656) 123-4567.

Atentamente,
Banco Norte
Servicio al Cliente`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de conciliación', description: 'Completa la conciliación',
        guides: [
          { id: 'g-saldo', title: 'Saldo bancario', body: 'Es el saldo al corte que reporta el banco en el estado de cuenta (correo). Es el punto de partida de la conciliación. Cópialo tal cual.', anchor: '[data-guide="Saldo bancario"]', position: 'right' },
          { id: 'g-depositos', title: '¿Qué son los depósitos en tránsito?', body: 'Son depósitos que YA registraste en tu contabilidad pero que el banco AÚN NO procesó. Se suman al saldo bancario porque el banco los va a reflejar pronto.', anchor: '[data-guide="Depósitos en tránsito"]', position: 'right' },
          { id: 'g-cheques', title: '¿Qué son los cheques sin cobrar?', body: 'Son cheques que YA emitiste (y registraste como gasto) pero que el beneficiario AÚN NO cobró en el banco. Se restan del saldo bancario porque cuando se cobren, el saldo bajará.', anchor: '[data-guide="Cheques sin cobrar"]', position: 'right' },
          { id: 'g-formula', title: 'Fórmula de conciliación', body: 'Saldo conciliado = Saldo bancario + Depósitos en tránsito − Cheques sin cobrar. Si el resultado coincide con tu saldo en libros, la conciliación cuadra. Calcúlalo tú.', anchor: '[data-guide="Saldo conciliado"]', position: 'bottom' },
        ],
        data: {
          rows: [
            { label: 'Saldo bancario', cell_B: bankBalance, editable: true },
            { label: 'Depósitos en tránsito', cell_B: depositsInTransit, editable: true },
            { label: 'Cheques sin cobrar', cell_B: outstandingChecks, editable: true },
            { label: 'Saldo conciliado', cell_B: adjustedBank, editable: true },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Conciliación completada', description: 'La conciliación bancaria ha sido procesada',
        data: { bankBalance, bookBalance, depositsInTransit, outstandingChecks, adjustedBank, period: 'Julio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Saldo bancario', label: 'Saldo bancario', type: 'exact', expected: bankBalance, tolerance: 0, points: 2, feedback: { pass: 'Saldo bancario correcto', fail: `El saldo bancario del estado de cuenta era $${fmt(bankBalance)}` } },
      { stepId: 'spreadsheet', field: 'row_Depósitos en tránsito', label: 'Depósitos en tránsito', type: 'exact', expected: depositsInTransit, tolerance: 0, points: 3, feedback: { pass: 'Depósitos en tránsito correctos', fail: `Los depósitos en tránsito eran $${fmt(depositsInTransit)}` } },
      { stepId: 'spreadsheet', field: 'row_Cheques sin cobrar', label: 'Cheques sin cobrar', type: 'exact', expected: outstandingChecks, tolerance: 0, points: 3, feedback: { pass: 'Cheques sin cobrar correctos', fail: `Los cheques sin cobrar eran $${fmt(outstandingChecks)}` } },
      { stepId: 'spreadsheet', field: 'row_Saldo conciliado', label: 'Saldo conciliado', type: 'calculated', expected: adjustedBank, tolerance: 10, points: 10, feedback: { pass: 'Conciliación correcta', fail: `Saldo conciliado = $${fmt(bankBalance)} + $${fmt(depositsInTransit)} − $${fmt(outstandingChecks)} = $${fmt(adjustedBank)}` } },
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
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Póliza de depreciación — Julio 2026',
          body: `Buenos días,

Necesito que registres la póliza de depreciación mensual del equipo de cómputo.

**Datos del activo:**
- Descripción: Equipo de cómputo (laptops y desktops)
- Costo original: $${fmt(originalCost)}
- Fecha de adquisición: Enero 2023
- Vida útil: 4 años (48 meses)
- Método: Línea recta

**Cálculo:**
Depreciación mensual = Costo original ÷ Vida útil en meses

**Cuentas contables:**
- Cargo (DEBE): Gastos de depreciación (5-07)
- Abono (HABER): Depreciación acumulada (1-13)

Registra la póliza con el monto correcto y un concepto descriptivo.

Saludos,
Lic. Gómez
Contador General`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Póliza de Diario', description: 'Llena los datos de la póliza',
        guides: [
          { id: 'g-debe', title: '¿Qué es el DEBE (cargo)?', body: 'El DEBE es el lado izquierdo del asiento. Se registra aquí cuando la empresa GASTA o pierde valor. La depreciación es un gasto, por eso va en DEBE.', anchor: '[data-guide="debitAccount"]', position: 'right' },
          { id: 'g-haber', title: '¿Qué es el HABER (abono)?', body: 'El HABER es el lado derecho del asiento. La Depreciación Acumulada es una cuenta que REDUCE el valor del activo (contra-activo), por eso va en HABER.', anchor: '[data-guide="creditAccount"]', position: 'left' },
          { id: 'g-monto', title: '¿Cómo calculo el monto?', body: 'Depreciación mensual = Costo original ÷ Vida útil en meses. Si el equipo costó $120,000 y su vida útil es 4 años (48 meses), la depreciación mensual es $120,000 ÷ 48 = $2,500.', anchor: '[data-guide="amount"]', position: 'bottom' },
        ],
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

function isrProgresivo(bruto: number): number {
  // Tarifa mensual ISR ilustrativa (progresiva, NO % fijo — trampa #4).
  // LISR tarifa: cuota fija + % sobre excedente por rango de ingreso.
  if (bruto <= 6000) return 0;
  if (bruto <= 30000) return Math.round(115.2 + (bruto - 6000) * 0.064);
  return Math.round(1651.2 + (bruto - 30000) * 0.1088);
}

function generatePayrollWorkflow(): Workflow {
  const employees = [
    { name: 'Ana García', salary: 25000 },
    { name: 'Carlos López', salary: 32000 },
    { name: 'María Fernández', salary: 28000 },
    { name: 'Roberto Méndez', salary: 35000 },
  ].map(e => ({
    ...e,
    isr: isrProgresivo(e.salary),
    imss: Math.round(e.salary * 0.05),
    neto: e.salary - isrProgresivo(e.salary) - Math.round(e.salary * 0.05),
  }));
  const totalGross = employees.reduce((s, e) => s + e.salary, 0);
  const totalIsr = employees.reduce((s, e) => s + e.isr, 0);
  const totalImss = employees.reduce((s, e) => s + e.imss, 0);
  const totalNeto = employees.reduce((s, e) => s + e.neto, 0);

  return {
    taskId: `wf-nom-${r(1000, 9999)}`, taskTitle: 'Cálculo de Nómina', taskType: 'payroll', difficulty: 2, estimatedMinutes: 30,
    steps: [
      {
        id: 'email', type: 'email', title: 'Instrucciones de nómina', description: 'Calcula la nómina del mes',
        data: {
          from: 'Lic. Gómez', to: 'nomina@logistica.com',
          subject: 'Cálculo nómina quincenal — Julio 2026',
          body: `Buenos días,

Es hora de calcular la nómina de la quincena del 1 al 15 de julio.

**Empleados y sueldos brutos:**
${employees.map(e => `- ${e.name}: $${fmt(e.salary)}/quincena`).join('\n')}

**Retenciones (TARIFA PROGRESIVA del SAT — NUNCA un % fijo):**
- ISR: tarifa mensual → tramo 1: hasta 6,000 cuota 0; tramo 2: 6,000–30,000 cuota 115.20 + 6.4% del excedente; tramo 3: +30,000 cuota 1,651.20 + 10.88% del excedente.
- IMSS: 5% cuota del trabajador.

**Instrucciones:**
1. Ingresa a la hoja de nómina y verifica los sueldos brutos.
2. Calcula el ISR de CADA empleado con la tarifa (no un 15% fijo: eso es una trampa laboral).
3. Calcula el IMSS (5%) y el neto (bruto − ISR − IMSS) de cada uno.
4. Determina los totales de la nómina.

La nómina debe estar lista antes del viernes para programar los depósitos del lunes.

Saludos,
Lic. Gómez
Contador General`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de nómina', description: 'Completa la nómina con tarifa progresiva',
        guides: [
          { id: 'g-tarifa', title: 'ISR con tarifa progresiva (no % fijo)', body: 'Aplica la tarifa por empleado según su sueldo. Ej: $25,000 cae en tramo 2: cuota $115.20 + 6.4% de (25,000−6,000)=1,216 → ISR ≈ $1,331. Un % fijo (15%) es la trampa #4: puede demandarte el trabajador.', position: 'top' },
          { id: 'g-bruto', title: 'Sueldo bruto', body: 'Es lo pactado con cada empleado, antes de retenciones. Cópialo del correo del Lic. Gómez y verifica que coincida.', anchor: '[data-guide="Ana García"]', position: 'right' },
          { id: 'g-isr', title: '¿Qué es el ISR?', body: 'El ISR se retiene con la TARIFA PROGRESIVA del SAT (cuota fija + % del excedente por tramo), NO con un porcentaje fijo. Cada empleado cae en un tramo distinto según su ingreso.', anchor: '[data-guide="ISR Ana García"]', position: 'right' },
          { id: 'g-imss', title: '¿Qué es el IMSS?', body: 'El IMSS es la cuota del trabajador al Instituto Mexicano del Seguro Social (5%). Se descuenta del sueldo bruto junto con el ISR.', anchor: '[data-guide="IMSS Ana García"]', position: 'left' },
          { id: 'g-neto', title: '¿Cómo se calcula el neto?', body: 'Sueldo neto = Sueldo bruto − ISR − IMSS. Es lo que finalmente se deposita al empleado. Verifica la resta antes de aprobar.', anchor: '[data-guide="Neto Ana García"]', position: 'bottom' },
        ],
        data: {
          rows: [
            ...employees.map(e => ({ label: e.name, cell_B: e.salary, editable: true })),
            ...employees.map(e => ({ label: `ISR ${e.name}`, cell_B: e.isr, editable: true })),
            ...employees.map(e => ({ label: `IMSS ${e.name}`, cell_B: e.imss, editable: true })),
            ...employees.map(e => ({ label: `Neto ${e.name}`, cell_B: e.neto, editable: true })),
            { label: 'Total bruto', cell_B: totalGross, editable: true },
            { label: 'Total ISR', cell_B: totalIsr, editable: true },
            { label: 'Total neto', cell_B: totalNeto, editable: true },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Nómina calculada', description: 'La nómina ha sido procesada',
        data: { employees: employees.length, totalGross, totalIsr, totalImss, totalNeto, period: 'Julio 2026' },
      },
    ],
    validation: [
      ...employees.flatMap(e => ([
        { stepId: 'spreadsheet', field: `row_${e.name}`, label: `Bruto ${e.name}`, type: 'exact' as const, expected: e.salary, tolerance: 0, points: 1, feedback: { pass: 'Bruto correcto', fail: `El bruto de ${e.name} era $${fmt(e.salary)}` } },
        { stepId: 'spreadsheet', field: `row_ISR ${e.name}`, label: `ISR ${e.name}`, type: 'calculated' as const, expected: e.isr, tolerance: 20, points: 3, feedback: { pass: `ISR de ${e.name} correcto (tarifa)`, fail: `ISR de ${e.name} con tarifa = $${fmt(e.isr)} (no un % fijo)` } },
        { stepId: 'spreadsheet', field: `row_IMSS ${e.name}`, label: `IMSS ${e.name}`, type: 'calculated' as const, expected: e.imss, tolerance: 10, points: 2, feedback: { pass: `IMSS de ${e.name} correcto`, fail: `IMSS de ${e.name} = $${fmt(e.salary)} × 5% = $${fmt(e.imss)}` } },
        { stepId: 'spreadsheet', field: `row_Neto ${e.name}`, label: `Neto ${e.name}`, type: 'calculated' as const, expected: e.neto, tolerance: 30, points: 3, feedback: { pass: `Neto de ${e.name} correcto`, fail: `Neto de ${e.name} = $${fmt(e.salary)} − $${fmt(e.isr)} − $${fmt(e.imss)} = $${fmt(e.neto)}` } },
      ])),
      { stepId: 'spreadsheet', field: 'row_Total bruto', label: 'Total bruto', type: 'calculated', expected: totalGross, tolerance: 0, points: 2, feedback: { pass: 'Total bruto correcto', fail: `El total bruto era $${fmt(totalGross)}` } },
      { stepId: 'spreadsheet', field: 'row_Total ISR', label: 'Total ISR', type: 'calculated', expected: totalIsr, tolerance: 50, points: 2, feedback: { pass: 'Total ISR correcto', fail: `Total ISR = $${fmt(totalIsr)}` } },
      { stepId: 'spreadsheet', field: 'row_Total neto', label: 'Total neto', type: 'calculated', expected: totalNeto, tolerance: 80, points: 2, feedback: { pass: 'Total neto correcto', fail: `Total neto = $${fmt(totalNeto)}` } },
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
          from: supplier.name, to: 'proveedores@logistica.com',
          subject: `Factura ${folio} — Servicios de ${supplier.name}`,
          body: `Estimados,

Adjuntamos nuestra factura electrónica (CFDI 4.0) por los servicios prestados durante el mes de julio.

**Datos de la factura:**
- Folio fiscal: ${folio}
- Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}
- Concepto: Servicios de transporte y logística
- Subtotal: $${fmt(amount)}
- IVA (16%): $${fmt(iva)}
- Total: $${fmt(total)}

**Datos fiscales:**
- RFC emisor: ${supplier.rfc}
- Régimen fiscal: 601 - General de Ley Personas Morales

Favor de programar el pago conforme a los términos acordados (30 días).

Quedamos a sus órdenes para cualquier aclaración.

Atentamente,
${supplier.name}
Departamento de Facturación`,
        },
      },
      {
        id: 'form', type: 'form', title: 'Sistema Contable — Registro de CFDI', description: 'Registra la factura del proveedor',
        guides: [
          { id: 'g-cfdi-prov', title: 'CFDI de gasto vs CFDI de ingreso', body: 'Esta factura es un CFDI RECIBIDO: te permite ACREDITAR el IVA (reducir lo que pagas de IVA al SAT). Requisitos: que el proveedor esté en el padrón, que el RFC sea correcto y que la tasa de IVA sea 16%.', position: 'top' },
          { id: 'g-proveedor', title: 'Selecciona el proveedor', body: 'Elige al proveedor que emitió el CFDI (remitente del correo). Registrar un proveedor equivocado invalida la acreditación del IVA.', anchor: '[data-guide="supplierName"]', position: 'right' },
          { id: 'g-folio', title: 'Folio fiscal', body: 'El folio CFDI-xxxxxx del encabezado del correo. Identifica el comprobante ante el SAT.', anchor: '[data-guide="folio"]', position: 'right' },
          { id: 'g-subtotal', title: 'Subtotal', body: 'El importe antes de IVA, del CFDI del proveedor. Sobre este monto se calcula el IVA acreditable.', anchor: '[data-guide="amount"]', position: 'right' },
          { id: 'g-iva-acred', title: 'IVA acreditable', body: 'El IVA acreditable = subtotal × 0.16. Se suma a la cuenta de IVA por pagar en el DEBE (lo reduces). Un CFDI con IVA mayor/menor es señal de error.', anchor: '[data-guide="iva"]', position: 'bottom' },
          { id: 'g-total', title: 'Total', body: 'Total = Subtotal + IVA. Es el pasivo que registrarás con el proveedor (abono a 2-01).', anchor: '[data-guide="total"]', position: 'right' },
          { id: 'g-categoria', title: 'Categoría', body: 'Clasifica el gasto (Servicios, Papelería, Transporte, Mantenimiento). Influye en qué cuenta de gasto se carga.', anchor: '[data-guide="category"]', position: 'right' },
        ],
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
      { stepId: 'form', field: 'folio', type: 'exact', expected: folio, label: 'Folio fiscal', points: 2, feedback: { pass: 'Folio correcto', fail: `El folio fiscal era ${folio}` } },
      { stepId: 'form', field: 'amount', type: 'calculated', expected: amount, tolerance: 0, label: 'Subtotal', points: 4, feedback: { pass: 'Subtotal correcto', fail: `El subtotal era $${fmt(amount)}` } },
      { stepId: 'form', field: 'iva', type: 'calculated', expected: iva, tolerance: 1, label: 'IVA', points: 4, feedback: { pass: 'IVA correcto', fail: `IVA = $${fmt(amount)} × 16% = $${fmt(iva)}` } },
      { stepId: 'form', field: 'total', type: 'calculated', expected: total, tolerance: 1, label: 'Total', points: 4, feedback: { pass: 'Total correcto', fail: `Total = $${fmt(amount)} + $${fmt(iva)} = $${fmt(total)}` } },
      { stepId: 'form', field: 'category', type: 'choice', expected: 'Servicios', label: 'Categoría', points: 2, feedback: { pass: 'Categoría correcta', fail: 'La categoría correcta era Servicios' } },
    ],
  };
}

// ─── Gasto interno: comida empresarial ─────────────────────────
// Escenario del Módulo 2: leer un ticket de restaurante, separar
// deducible/no deducible y registrar el gasto con IVA acreditable.
export function generateBusinessExpenseWorkflow(userId?: string): Workflow {
  const subtotal = r(800, 6000);            // consumos deducibles
  const iva = Math.round(subtotal * 0.16);  // IVA acreditable
  const propina = Math.round(subtotal * 0.1); // propina NO deducible
  const total = subtotal + iva + propina;
  const ticket = `TK-${r(10000, 99999)}`;
  const razon = pick(['Comida de trabajo con cliente Comercial del Norte', 'Comida de equipo del departamento', 'Reunión de trabajo con proveedor Transportes Express']);

  return {
    taskId: `wf-bexp-${r(1000, 9999)}`, taskTitle: 'Gasto por Comida Empresarial', taskType: 'business_expense', difficulty: 2, estimatedMinutes: 15,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo — Solicitud de gasto', description: 'Registra el gasto por comida empresarial',
        guides: [
          { id: 'g-porque', title: '¿Por qué importa este gasto?', body: 'Los gastos por comida de trabajo son DEDUCIBLES para la empresa (65% en restaurantes), pero el IVA y la propina se tratan distinto. Si lo registras mal, la empresa paga de más de impuestos o cae en una observación de auditoría.', position: 'top' },
          { id: 'g-ticket', title: 'Cómo leer el ticket', body: 'En el ticket del restaurante identifica 4 datos: SUBTOTAL (consumo), IVA desglosado (16%), PROPINA (no deducible y sin IVA) y TOTAL. El ticket lo emite el restaurante a nombre del establecimiento; solo es válido como soporte si el RFC del establecimiento aparece impreso.', position: 'top' },
        ],
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: `Reembolso de gasto por comida — Ticket ${ticket}`,
          body: `Buenos días,

Adjunto el ticket del restaurante por una comida de trabajo del equipo.

**Datos del ticket:**
- Establecimiento: La Parrilla del Norte (RFC: LPN-880707-ABC)
- Ticket: ${ticket}
- Fecha: ${new Date().toLocaleDateString('es-MX')}
- Subtotal (consumos): $${fmt(subtotal)}
- IVA (16%): $${fmt(iva)}
- Propina: $${fmt(propina)}
- Total pagado: $${fmt(total)}

**Instrucciones:**
1. Revisa el ticket y separa lo deducible de lo no deducible
2. Registra el gasto en el sistema contable (cuenta de gastos de administración)
3. El IVA de este consumo es acreditable
4. La propina NO es deducible y tampoco genera IVA acreditable
5. La comida fue: ${razon}

Saludos,
Lic. Gómez
Contador General`,
          urgency: 'media',
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de cálculo — Registro de gasto', description: 'Calcula el gasto deducible y el IVA acreditable',
        guides: [
          { id: 'g-extract', title: '🧾 Qué extraer del ticket', body: 'Mira el ticket (panel derecho): cada línea marca "→ campo X". El encabezado trae Empresa, RFC y Folio; la tabla trae Subtotal, IVA, Propina y Total. Todo lo extraído va al portal izquierdo, en su campo. Avanza la guía para ver campo por campo.', anchor: '[data-guide="ticket"]', position: 'left' },
          { id: 'g-empresa', title: '🏢 Empresa / Razón social', body: 'La razón social está en el encabezado del ticket. Cópiala tal cual aparece: "La Parrilla del Norte". Es el establecimiento que emitió el ticket.', anchor: '[data-guide="Empresa / Razón social"]', position: 'right' },
          { id: 'g-rfc', title: '🪪 RFC del establecimiento', body: 'El RFC impreso en el ticket es "LPN-880707-ABC". Sin RFC válido el ticket no es soporte fiscal. Cópialo exacto, con guiones.', anchor: '[data-guide="RFC del establecimiento"]', position: 'right' },
          { id: 'g-folio', title: '🎫 Folio del ticket', body: 'El folio (TK-xxxxx) identifica el ticket. Está en el encabezado después de "Folio:". Servirá como referencia del gasto.', anchor: '[data-guide="Folio del ticket"]', position: 'right' },
          { id: 'g-subtotal', title: '📋 Subtotal del ticket', body: 'El consumo sin IVA ni propina. En el ticket es la línea "Subtotal (consumos)". Esse es el monto deducible base (el 65% se aplica sobre él).', anchor: '[data-guide="Subtotal del ticket"]', position: 'right' },
          { id: 'g-propina', title: '💡 Propina (no deducible)', body: 'La propina es voluntaria, NO es deducible y NO genera IVA. En el ticket es la línea "Propina". Se liquida pero se reclasifica como gasto no deducible.', anchor: '[data-guide="Propina (no deducible)"]', position: 'right' },
          { id: 'g-iva', title: '🧮 IVA del consumo (16%)', body: 'IVA = Subtotal × 16%. Solo del consumo, sin propina. Si subtotal=$1,563, IVA=$250 (redondeo). Este IVA SÍ es acreditable.', anchor: '[data-guide="IVA del consumo (16%)"]', position: 'right' },
          { id: 'g-total', title: '💰 Total pagado', body: 'Total = Subtotal + IVA + Propina. Todo lo que se pagó con la tarjeta. Abona a "1-02 Bancos" por este monto.', anchor: '[data-guide="Total pagado"]', position: 'right' },
          { id: 'g-deducible', title: '📊 Gasto deducible (65%)', body: 'En restaurantes solo el 65% del subtotal es deducible (LISR). Ej: $1,563 × 65% = $1,016. La propina no entra. Va a "5-03 Gastos de administración".', anchor: '[data-guide="Gasto deducible (65% restaurantes)"]', position: 'right' },
          { id: 'g-acreditable', title: '✅ IVA acreditable', body: 'El IVA acreditable es el mismo IVA del consumo ($250). Es el IVA que reduces de tu IVA por pagar al SAT. La propina no genera IVA acreditable.', anchor: '[data-guide="IVA acreditable"]', position: 'right' },
        ],
        data: {
          rows: [
            { label: 'Empresa / Razón social', cell_B: 'La Parrilla del Norte', editable: true },
            { label: 'RFC del establecimiento', cell_B: 'LPN-880707-ABC', editable: true },
            { label: 'Folio del ticket', cell_B: ticket, editable: true },
            { label: 'Subtotal del ticket', cell_B: subtotal, editable: true },
            { label: 'Propina (no deducible)', cell_B: propina, editable: true },
            { label: 'IVA del consumo (16%)', cell_B: iva, editable: true },
            { label: 'Total pagado', cell_B: total, editable: true },
            { label: 'Gasto deducible (65% restaurantes)', cell_B: Math.round(subtotal * 0.65), editable: true },
            { label: 'IVA acreditable', cell_B: iva, editable: true },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Gasto registrado', description: 'El gasto se registró con su asiento contable',
        guides: [
          { id: 'g-asiento', title: 'Tu asiento contable', body: 'Cargo 5-03 Gastos de administración por $' + fmt(subtotal) + ', cargo 2-03 IVA por pagar por $' + fmt(iva) + ', abono 1-02 Bancos por $' + fmt(total) + '. La propina de $' + fmt(propina) + ' se liquidó pero NO es deducible: se reclasifica como gasto no deducible en la conciliación fiscal.', position: 'center' },
        ],
        data: { ticket, establecimiento: 'La Parrilla del Norte', subtotal, iva, propina, total, gastoDeducible: Math.round(subtotal * 0.65), ivaAcreditable: iva, razon, date: new Date().toISOString().split('T')[0] },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Empresa / Razón social', label: 'Empresa / Razón social', type: 'exact', expected: 'La Parrilla del Norte', points: 1, feedback: { pass: 'Empresa correcta', fail: 'La razón social está en el encabezado del ticket.' } },
      { stepId: 'spreadsheet', field: 'row_RFC del establecimiento', label: 'RFC del establecimiento', type: 'exact', expected: 'LPN-880707-ABC', points: 2, feedback: { pass: 'RFC correcto', fail: 'El RFC del establecimiento está impreso en el encabezado del ticket.' } },
      { stepId: 'spreadsheet', field: 'row_Folio del ticket', label: 'Folio del ticket', type: 'exact', expected: ticket, points: 1, feedback: { pass: 'Folio correcto', fail: `El folio del ticket (${ticket}) está en el encabezado.` } },
      { stepId: 'spreadsheet', field: 'row_Subtotal del ticket', label: 'Subtotal del ticket', type: 'exact', expected: subtotal, tolerance: 0, points: 2, feedback: { pass: 'Subtotal correcto', fail: `Subtotal del ticket = $${fmt(subtotal)}` } },
      { stepId: 'spreadsheet', field: 'row_Propina (no deducible)', label: 'Propina (no deducible)', type: 'exact', expected: propina, tolerance: 0, points: 2, feedback: { pass: 'Propina correcta', fail: `Propina = $${fmt(propina)} (no deducible, sin IVA)` } },
      { stepId: 'spreadsheet', field: 'row_IVA del consumo (16%)', label: 'IVA del consumo', type: 'calculated', expected: iva, tolerance: 1, points: 4, feedback: { pass: 'IVA del consumo correcto', fail: `IVA = $${fmt(subtotal)} × 16% = $${fmt(iva)}` } },
      { stepId: 'spreadsheet', field: 'row_Total pagado', label: 'Total pagado', type: 'calculated', expected: total, tolerance: 1, points: 4, feedback: { pass: 'Total pagado correcto', fail: `Total = $${fmt(subtotal)} + $${fmt(iva)} + $${fmt(propina)} = $${fmt(total)}` } },
      { stepId: 'spreadsheet', field: 'row_Gasto deducible (65% restaurantes)', label: 'Gasto deducible', type: 'calculated', expected: Math.round(subtotal * 0.65), tolerance: 1, points: 5, feedback: { pass: 'Gasto deducible correcto (65%)', fail: `Gasto deducible = $${fmt(subtotal)} × 65% = $${fmt(Math.round(subtotal * 0.65))}. La propina NO es deducible.` } },
      { stepId: 'spreadsheet', field: 'row_IVA acreditable', label: 'IVA acreditable', type: 'calculated', expected: iva, tolerance: 1, points: 5, feedback: { pass: 'IVA acreditable correcto', fail: `El IVA acreditable es el IVA del consumo: $${fmt(iva)} (la propina no genera IVA acreditable).` } },
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
          from: client.name, to: 'facturacion@logistica.com',
          subject: `Solicitud nota de crédito — Factura ${invNum}`,
          body: `Estimados,

Por medio del presente, solicito la emisión de una nota de crédito referente a la factura **${invNum}**.

**Detalles de la solicitud:**
- Motivo: ${reason}
- Monto solicitado: $${fmt(creditAmount)} (+IVA)
- Fecha de la factura original: ${new Date(Date.now() - r(5, 30) * 86400000).toLocaleDateString('es-MX')}

**Justificación:**
${reason === 'Devolución parcial' ? 'Se devolvió parcialmente el servicio contratado por incumplimiento de las especificaciones acordadas.' : reason === 'Descuento por volumen' ? 'Por acuerdo comercial, se otorga un descuento por el volumen de operaciones del trimestre.' : reason === 'Error en facturación' ? 'Se detectó un error en el monto facturado, por favor corregir.' : 'Se otorga bonificación por fidelidad y antigüedad como cliente.'}

Favor de emitir la nota de crédito y enviarnos el XML correspondiente.

Saludos cordiales,
${client.name}
Departamento de Compras`,
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
          from: 'Lic. Gómez', to: 'cajero@logistica.com',
          subject: 'Corte de caja diario — Turno matutino',
          body: `Buenos días,

Es momento de realizar el corte de caja del turno matutino.

**Datos iniciales:**
- Fondo de caja: $${fmt(cashInBox)}
- Turno: 09:00 - 14:00 hrs

**Actividad del turno:**
- Pagos en efectivo recibidos
- Pagos con tarjeta bancaria
- Gastos menores del turno
- Depósitos bancarios realizados

**Instrucciones:**
1. Ingresa a la hoja de cálculo de corte de caja
2. Registra todas las entradas y salidas de efectivo
3. El sistema calculará el efectivo esperado
4. Cuenta el efectivo físico y regístralo
5. Verifica si hay diferencias

Si hay una diferencia mayor a $100, avísame inmediatamente.

Saludos,
Lic. Gómez
Contador General`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de cálculo — Corte de Caja', description: 'Completa la hoja de corte',
        guides: [
          { id: 'g-tarjeta', title: '¿Por qué las ventas con tarjeta no cuentan?', body: 'Las ventas con tarjeta van directamente al banco (no pasan por la caja física). Se registran para el total de ventas, pero NO se suman al efectivo esperado. Solo el efectivo recibido afecta la caja.', anchor: '[data-guide="Ventas con tarjeta"]', position: 'right' },
          { id: 'g-esperado', title: '¿Cómo se calcula el efectivo esperado?', body: 'Efectivo esperado = Fondo inicial + Ventas en efectivo - Gastos del turno - Depósitos realizados. Las tarjetas NO entran en esta fórmula porque no son efectivo.', anchor: '[data-guide="Efectivo esperado"]', position: 'bottom' },
          { id: 'g-diferencia', title: '¿Qué pasa si hay diferencia?', body: 'Si la diferencia es mayor a $100, hay un descuadre que debe reportarse. Puede ser por cambio mal dado, cobro incorrecto o efectivo faltante. La diferencia se registra como "Sobrante" o "Faltante".', anchor: '[data-guide="Diferencia"]', position: 'top' },
        ],
        data: {
          rows: [
            { label: 'Fondo inicial', cell_B: cashInBox, editable: true },
            { label: 'Ventas en efectivo', cell_B: salesCash, editable: true },
            { label: 'Ventas con tarjeta', cell_B: salesCard, editable: true },
            { label: 'Total ventas', cell_B: totalSales, editable: true },
            { label: 'Gastos del turno', cell_B: expenses, editable: true },
            { label: 'Depósitos realizados', cell_B: deposits, editable: true },
            { label: 'Efectivo esperado', cell_B: expectedCash, editable: true },
            { label: 'Efectivo contado', cell_B: actualCash, editable: true },
            { label: 'Diferencia', cell_B: difference, editable: true },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Corte de caja completado', description: 'El corte ha sido registrado',
        data: { cashInBox, salesCash, salesCard, totalSales, expenses, deposits, expectedCash, actualCash, difference, date: new Date().toISOString().split('T')[0], status: Math.abs(difference) <= 100 ? 'Cuadrado' : 'Descuadrado' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Fondo inicial', label: 'Fondo inicial', type: 'exact', expected: cashInBox, tolerance: 0, points: 2, feedback: { pass: 'Fondo correcto', fail: `El fondo de caja era $${fmt(cashInBox)}` } },
      { stepId: 'spreadsheet', field: 'row_Ventas en efectivo', label: 'Ventas en efectivo', type: 'exact', expected: salesCash, tolerance: 0, points: 2, feedback: { pass: 'Ventas en efectivo correctas', fail: `Las ventas en efectivo eran $${fmt(salesCash)}` } },
      { stepId: 'spreadsheet', field: 'row_Ventas con tarjeta', label: 'Ventas con tarjeta', type: 'exact', expected: salesCard, tolerance: 0, points: 1, feedback: { pass: 'Ventas con tarjeta correctas', fail: `Las ventas con tarjeta eran $${fmt(salesCard)}` } },
      { stepId: 'spreadsheet', field: 'row_Total ventas', label: 'Total ventas', type: 'calculated', expected: totalSales, tolerance: 0, points: 2, feedback: { pass: 'Total ventas correcto', fail: `Total ventas = $${fmt(salesCash)} + $${fmt(salesCard)} = $${fmt(totalSales)}` } },
      { stepId: 'spreadsheet', field: 'row_Gastos del turno', label: 'Gastos del turno', type: 'exact', expected: expenses, tolerance: 0, points: 1, feedback: { pass: 'Gastos correctos', fail: `Los gastos del turno eran $${fmt(expenses)}` } },
      { stepId: 'spreadsheet', field: 'row_Depósitos realizados', label: 'Depósitos realizados', type: 'exact', expected: deposits, tolerance: 0, points: 1, feedback: { pass: 'Depósitos correctos', fail: `Los depósitos realizados eran $${fmt(deposits)}` } },
      { stepId: 'spreadsheet', field: 'row_Efectivo esperado', label: 'Efectivo esperado', type: 'calculated', expected: expectedCash, tolerance: 10, points: 8, feedback: { pass: 'Efectivo esperado correcto', fail: `Efectivo esperado = $${fmt(cashInBox)} + $${fmt(salesCash)} − $${fmt(expenses)} − $${fmt(deposits)} = $${fmt(expectedCash)}` } },
      { stepId: 'spreadsheet', field: 'row_Efectivo contado', label: 'Efectivo contado', type: 'exact', expected: actualCash, tolerance: 0, points: 2, feedback: { pass: 'Efectivo contado correcto', fail: `El efectivo físico contado era $${fmt(actualCash)}` } },
      { stepId: 'spreadsheet', field: 'row_Diferencia', label: 'Diferencia', type: 'calculated', expected: difference, tolerance: 10, points: 7, feedback: { pass: 'Diferencia correcta', fail: `Diferencia = $${fmt(actualCash)} − $${fmt(expectedCash)} = $${fmt(difference)}` } },
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

function generateDepreciationWorkflow(): Workflow {
  const assets = [
    { name: 'Maquinaria de carga', cost: 280000, years: 10 },
    { name: 'Equipo de cómputo', cost: 95000, years: 3 },
    { name: 'Vehículo reparto', cost: 320000, years: 5 },
  ];
  const depr = assets.map(a => ({ ...a, annual: Math.round(a.cost / a.years) }));
  const totalAnnual = depr.reduce((s, a) => s + a.annual, 0);

  return {
    taskId: `wf-dep-${r(1000, 9999)}`, taskTitle: 'Depreciación de Activos', taskType: 'depreciation', difficulty: 2, estimatedMinutes: 20,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud de depreciación', description: 'Calcula la depreciación anual de los activos',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Depreciación de activos fijos — Ejercicio 2026',
          body: `Buenos días,

Para el cierre del ejercicio necesito el cálculo de depreciación anual de nuestros activos fijos por el método de **línea recta** (costo ÷ vida útil).

**Activos a depreciar:**
${assets.map(a => `- ${a.name}: costo $${fmt(a.cost)} · vida útil ${a.years} años`).join('\n')}

**Instrucciones:**
1. Abre la hoja de depreciación en el módulo de activos fijos
2. Calcula la depreciación anual de cada activo (costo ÷ años)
3. Calcula el total anual del periodo
4. Registra el asiento de depreciación en la póliza de diario

Recuerda que la depreciación acumulada se refleja en el balance general como cuenta acreedora de activo.

Saludos,
Lic. Gómez
Contador General`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja de depreciación', description: 'Completa la depreciación anual',
        data: {
          rows: [
            ...depr.map(a => ({ label: a.name, cell_B: a.cost, cell_C: a.years })),
            { label: 'Total depreciación anual', cell_B: totalAnnual, formula: '=SUMA(B1:B3)' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Depreciación calculada', description: 'La depreciación ha sido procesada',
        data: { assets: depr.map(a => ({ name: a.name, cost: a.cost, years: a.years, annual: a.annual })), totalAnnual, method: 'Línea recta', period: 'Ejercicio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Maquinaria de carga', label: 'Dep. Maquinaria', type: 'calculated', expected: depr[0].annual, tolerance: 10, points: 4, feedback: { pass: 'Depreciación de maquinaria correcta', fail: `Maquinaria = $${fmt(depr[0].cost)} ÷ ${depr[0].years} años = $${fmt(depr[0].annual)}` } },
      { stepId: 'spreadsheet', field: 'row_Equipo de cómputo', label: 'Dep. Equipo de cómputo', type: 'calculated', expected: depr[1].annual, tolerance: 10, points: 4, feedback: { pass: 'Depreciación de equipo correcta', fail: `Equipo = $${fmt(depr[1].cost)} ÷ ${depr[1].years} años = $${fmt(depr[1].annual)}` } },
      { stepId: 'spreadsheet', field: 'row_Vehículo reparto', label: 'Dep. Vehículo', type: 'calculated', expected: depr[2].annual, tolerance: 10, points: 4, feedback: { pass: 'Depreciación de vehículo correcta', fail: `Vehículo = $${fmt(depr[2].cost)} ÷ ${depr[2].years} años = $${fmt(depr[2].annual)}` } },
      { stepId: 'spreadsheet', field: 'row_Total depreciación anual', label: 'Total depreciación', type: 'calculated', expected: totalAnnual, tolerance: 30, points: 5, feedback: { pass: 'Total de depreciación correcto', fail: `Total = $${fmt(depr[0].annual)} + $${fmt(depr[1].annual)} + $${fmt(depr[2].annual)} = $${fmt(totalAnnual)}` } },
    ],
  };
}

function generateFinancialStatementsWorkflow(): Workflow {
  const sales = r(900000, 1500000);
  const costOfSales = Math.round(sales * 0.55);
  const grossProfit = sales - costOfSales;
  const opex = Math.round(sales * 0.25);
  const operatingProfit = grossProfit - opex;
  const taxes = Math.round(operatingProfit * 0.30);
  const netProfit = operatingProfit - taxes;

  return {
    taskId: `wf-fs-${r(1000, 9999)}`, taskTitle: 'Estados Financieros', taskType: 'financial_statements', difficulty: 2, estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email', title: 'Solicitud de estados financieros', description: 'Prepara el estado de resultados del periodo',
        data: {
          from: 'Lic. Gómez', to: 'auxiliar@logistica.com',
          subject: 'Estado de resultados — Ejercicio 2026',
          body: `Buenos días,

Para la junta de accionistas necesito el **estado de resultados** del ejercicio con los siguientes datos del sistema:

**Datos del periodo:**
- Ventas netas: $${fmt(sales)}
- Costo de ventas: $${fmt(costOfSales)} (55% de ventas)
- Gastos de operación: $${fmt(opex)} (25% de ventas)
- Tasa de ISR: 30%

**Instrucciones:**
1. Abre la hoja de estado de resultados
2. Calcula la utilidad bruta (ventas − costo de ventas)
3. Calcula la utilidad de operación (bruta − gastos)
4. Calcula el ISR (30% sobre utilidad de operación)
5. Determina la utilidad neta del ejercicio

Saludos,
Lic. Gómez
Contador General`,
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Estado de Resultados', description: 'Completa el estado de resultados',
        data: {
          rows: [
            { label: 'Ventas netas', cell_B: sales },
            { label: 'Costo de ventas', cell_B: costOfSales },
            { label: 'Utilidad bruta', cell_B: grossProfit, formula: '=B1-B2' },
            { label: 'Gastos de operación', cell_B: opex },
            { label: 'Utilidad de operación', cell_B: operatingProfit, formula: '=B3-B4' },
            { label: 'ISR (30%)', cell_B: taxes, formula: '=B5*0.30' },
            { label: 'Utilidad neta', cell_B: netProfit, formula: '=B5-B6' },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Estado de resultados preparado', description: 'Los estados financieros están listos',
        data: { sales, costOfSales, grossProfit, opex, operatingProfit, taxes, netProfit, period: 'Ejercicio 2026' },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Utilidad bruta', label: 'Utilidad bruta', type: 'calculated', expected: grossProfit, tolerance: 20, points: 5, feedback: { pass: 'Utilidad bruta correcta', fail: `Utilidad bruta = $${fmt(sales)} - $${fmt(costOfSales)} = $${fmt(grossProfit)}` } },
      { stepId: 'spreadsheet', field: 'row_Utilidad de operación', label: 'Utilidad de operación', type: 'calculated', expected: operatingProfit, tolerance: 20, points: 5, feedback: { pass: 'Utilidad de operación correcta', fail: `Utilidad de operación = $${fmt(grossProfit)} - $${fmt(opex)} = $${fmt(operatingProfit)}` } },
      { stepId: 'spreadsheet', field: 'row_ISR (30%)', label: 'ISR', type: 'calculated', expected: taxes, tolerance: 20, points: 5, feedback: { pass: 'ISR correcto', fail: `ISR = $${fmt(operatingProfit)} × 30% = $${fmt(taxes)}` } },
      { stepId: 'spreadsheet', field: 'row_Utilidad neta', label: 'Utilidad neta', type: 'calculated', expected: netProfit, tolerance: 30, points: 5, feedback: { pass: 'Utilidad neta correcta', fail: `Utilidad neta = $${fmt(operatingProfit)} - $${fmt(taxes)} = $${fmt(netProfit)}` } },
    ],
  };
}

// ─── TRAPS ────────────────────────────────────────────────────
// Las trampas inyectan el error en el documento (email) y exigen que el
// estudiante lo detecte (campo de detección + regla de validación).

function applyTrap(wf: Workflow, trap: string): Workflow {
  const email = wf.steps.find(s => s.id === 'email');
  const form = wf.steps.find(s => s.id === 'form');
  const spread = wf.steps.find(s => s.id === 'spreadsheet');

  switch (trap) {
    case 'iva_incorrecto': {
      if (email) {
        email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nEl cliente nos envió la factura precapturada con **IVA al 10%** (error del sistema de ellos).\nVerifica que la tasa que registres sea la correcta antes de timbrar. Un CFDI con tasa equivocada se cancela con multa.\n`;
      }
      if (form) {
        form.data.fields.push({ key: 'ivaRate', label: 'Tasa de IVA en la factura del cliente', type: 'choice', options: ['10%', '16%', '0%'], correct: '16%', validation: { required: true } });
      }
      wf.validation.push({ stepId: 'form', field: 'ivaRate', type: 'choice', expected: '16%', label: 'Detección de tasa de IVA', points: 5, feedback: { pass: 'Correcto: la factura del cliente decía 10% pero la tasa legal es 16%', fail: 'La factura del cliente mostraba IVA al 10%. La tasa correcta es 16% — timbrar con 10% genera multa del SAT.' } });
      break;
    }
    case 'pago_mal_aplicado': {
      const clientField = form?.data?.fields?.find((f: any) => f.key === 'clientName');
      const payer = clientField?.correct as string | undefined;
      const wrongRef = payer ? pick((clientField?.options || []).filter((o: string) => o !== payer)) : undefined;
      if (email && payer && wrongRef) {
        email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nEl comprobante de pago menciona la factura de **${wrongRef}**, pero la transferencia la realizó **${payer}**.\nVerifica a qué cliente corresponde realmente el pago antes de aplicarlo en el sistema.\n`;
      }
      if (form && payer) {
        form.data.fields.push({ key: 'applyToClient', label: 'Cliente al que se debe aplicar el pago', type: 'choice', options: clientField?.options || resolveClientList(undefined), correct: payer, validation: { required: true } });
      }
      wf.validation.push({ stepId: 'form', field: 'applyToClient', type: 'choice', expected: payer, label: 'Detección de pago mal aplicado', points: 5, feedback: { pass: `Correcto: el pago es de ${payer} y se aplicó al cliente indicado`, fail: `El comprobante mencionaba a ${wrongRef}, pero el pago lo hizo ${payer}. Aplicar el pago a la factura equivocada deja saldos incorrectos.` } });
      break;
    }
    case 'conciliacion_no_cuadra': {
      const missingCheck = 3500;
      const rows = spread?.data?.rows as any[] | undefined;
      const bankBalance = Number(rows?.[0]?.cell_B) || 0;
      const depositsInTransit = Number(rows?.[1]?.cell_B) || 0;
      const outstandingChecks = Number(rows?.[2]?.cell_B) || 0;
      const correctChecks = outstandingChecks + missingCheck;
      if (email) {
        email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nLa semana pasada se emitió un cheque de **$${fmt(missingCheck)}** a Transportes Express que aún no aparece cobrado en el estado de cuenta.\nVerifica que esté considerado en los cheques sin cobrar de la conciliación.\n`;
      }
      // Actualiza la regla base (existe gracias a la comprobación de tarea) en vez de duplicarla.
      const cheqRule = wf.validation.find(v => v.field === 'row_Cheques sin cobrar');
      if (cheqRule) {
        cheqRule.expected = correctChecks;
        cheqRule.points = 6;
        cheqRule.label = 'Cheques sin cobrar (cheque faltante)';
        cheqRule.feedback = { pass: 'Correcto: incluiste el cheque de $3,500 que faltaba', fail: `El cheque de $3,500 emitido la semana pasada no estaba en el estado de cuenta. Cheques sin cobrar = $${fmt(outstandingChecks)} + $3,500 = $${fmt(correctChecks)}` };
      }
      const saldoRule = wf.validation.find(v => v.field === 'row_Saldo conciliado');
      if (saldoRule) {
        saldoRule.expected = bankBalance + depositsInTransit - correctChecks;
        saldoRule.feedback.fail = `Saldo conciliado = $${fmt(bankBalance)} + $${fmt(depositsInTransit)} - $${fmt(correctChecks)} (incluye el cheque faltante de $3,500) = $${fmt(bankBalance + depositsInTransit - correctChecks)}`;
      }
      break;
    }
    case 'nomina_isr_mal': {
      if (email) {
        email.data.body += `\n\n**IMPORTANTE — REVISAR:**\nLa nómina fue precargada por el sistema anterior con **ISR al 15% fijo**.\nCorrige el método de cálculo en la hoja: la ley exige la **tabla progresiva del SAT** antes de aprobar la dispersión.\n`;
      }
      if (spread) {
        spread.data.rows.push({ label: 'Método ISR aplicado', cell_B: '15% fijo' });
      }
      wf.validation.push({ stepId: 'spreadsheet', field: 'row_Método ISR aplicado', type: 'exact', expected: 'Tabla SAT progresiva', label: 'Detección de ISR mal calculado', points: 5, feedback: { pass: 'Correcto: el ISR debe calcularse con la tabla progresiva del SAT', fail: 'La nómina usaba ISR fijo de 15%. La ley exige la tabla progresiva del SAT — el método fijo puede generar demandas laborales.' } });
      break;
    }
    default: break;
  }

  const scenario = TRAP_SCENARIOS.find(s => s.id === trap);
  return {
    ...wf,
    isTrap: true,
    trapId: trap,
    trapDescription: scenario?.description || 'Error intencional en el documento',
  };
}

// ─── WORKFLOW STORE ───────────────────────────────────────────
// El GET genera un workflow y lo guarda; el POST validate usa EL MISMO
// workflow (por workflowId) para que las pistas del formulario (correct)
// coincidan con las reglas de validación.

const workflowStore = new Map<string, { wf: any; at: number }>();
const STORE_TTL_MS = 30 * 60 * 1000;

export function workflowIdOf(wf: any): string {
  return wf.taskId || wf.id;
}

export function registerWorkflow(userId: string | undefined, wf: any): any {
  const now = Date.now();
  for (const [k, v] of workflowStore) { if (now - v.at > STORE_TTL_MS) workflowStore.delete(k); }
  workflowStore.set(`${userId || 'anon'}:${workflowIdOf(wf)}`, { wf, at: now });
  return wf;
}

export function getStoredWorkflow(userId: string | undefined, workflowId: string): any | undefined {
  const key = `${userId || 'anon'}:${workflowId}`;
  const entry = workflowStore.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > STORE_TTL_MS) { workflowStore.delete(key); return undefined; }
  return entry.wf;
}

// ─── PRÁCTICAS CONTALINK x4 (goldens fijos de los videos, NO random) ───
// mod-conciliacion — Webinar Pedro Castillo: conciliación bancaria real
// (parcial, 1-vs-2, N-vs-1, USD con TC completo, traspaso vía puente,
// rebote, reembolso, fecha póliza = fecha movimiento, cierre con revaluación).

export function generateConciliacionPracticaWorkflow(): Workflow {
  const MOV_FECHA = '2025-06-10';
  return {
    taskId: `wf-conc-prac-${r(1000, 9999)}`, taskTitle: 'Conciliación bancaria (webinar Pedro Castillo)', taskType: 'conciliacion_practica', difficulty: 2, estimatedMinutes: 25,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo — Extracto y casos a conciliar', description: 'Concilia el extracto BBVA contra los registros',
        guides: [
          { id: 'g-que', title: '¿Qué es conciliar?', body: 'Comparar cada movimiento del banco contra tu registro interno hasta que ambos cuadren. Todo lo que no cuadra se investiga: parciales, pagos agrupados, dólares, traspasos, rebotes y reembolsos.', position: 'top' },
          { id: 'g-casos', title: 'Los 6 casos del extracto', body: 'Parcial (factura 4419.60 vs movimiento 1219.60), 1-vs-2 (89.50 + 65.98, resto 626.20), N-vs-1 (4062 + 4000 vs folio 51010), USD 45 (TC con todos los decimales), traspaso vía puente 899/104, rebote 150/150 y reembolso al socio 2018.40.', position: 'top' },
        ],
        data: {
          from: 'Pedro Castillo', to: 'auxiliar@logistica.com',
          subject: 'Conciliación BBVA 102-01-001 — periodo 13-may al 13-jun-2025',
          body: `Buenos días,

Te paso el extracto de la cuenta **102-01 / 102-01-001 (BBVA débito)** del periodo **13-may al 13-jun-2025**. Saldo inicial: **$50000**.

**Casos a conciliar:**
1. **Parcial:** factura por **4419.60**, movimiento por **1219.60** (calcula el resto).
2. **1-vs-2:** dos pagos **89.50 + 65.98** contra una factura; resto **626.20**.
3. **N-vs-1:** cobros **4062 + 4000** aplicados al folio **51010**.
4. **USD:** compra por **45 USD**; el banco muestra **789** y **789.01**. TC = 789/45 con TODOS los decimales; el centavo va a cuenta.
5. **Traspaso:** se movió dinero entre bancos vía cuenta puente **Traspaso bancario 899 y 104**. OJO: nunca directo a otro banco.
6. **Rebote:** cargo y abono por **150/150**.
7. **Reembolso al socio:** **2018.40**.

**Reglas de cierre:** la fecha de cada póliza = fecha del movimiento (movimiento de referencia: ${MOV_FECHA}); la contrapartida NUNCA es la cuenta del banco; cierra marcando la casilla de revaluación.

Saludos,
Pedro Castillo`,
          urgency: 'alta',
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja — Conciliación del extracto', description: 'Calcula cada caso con los montos exactos',
        guides: [
          { id: 'g-parcial', title: 'Resto parcial', body: 'Resto = Factura − Movimiento = 4419.60 − 1219.60 = 3200.00. El resto queda pendiente de cobro.', anchor: '[data-guide="Resto parcial"]', position: 'right' },
          { id: 'g-1v2', title: 'Suma y resto 1-vs-2', body: 'Suma = 89.50 + 65.98 = 155.48. Resto = 626.20 (dato del extracto). Dos pagos, una factura.', anchor: '[data-guide="Suma 1-vs-2"]', position: 'right' },
          { id: 'g-nv1', title: 'Suma N-vs-1', body: 'Suma = 4062 + 4000 = 8062 aplicados al folio 51010. Varios cobros, una referencia.', anchor: '[data-guide="Suma N-vs-1"]', position: 'right' },
          { id: 'g-tc', title: 'TC con todos los decimales', body: 'TC = 789/45 = 17.5333... NO lo redondees a 2 decimales: ese redondeo es el error típico. El centavo de diferencia (0.01) va a cuenta, no se ignora.', anchor: '[data-guide="TC aplicado"]', position: 'right' },
          { id: 'g-puente', title: 'Cuenta puente, no directo', body: 'El traspaso entre bancos pasa por la cuenta puente (Traspaso bancario 899 y 104). Registrarlo directo a otro banco descuadra la conciliación.', anchor: '[data-guide="Contrapartida traspaso"]', position: 'right' },
        ],
        data: {
          rows: [
            { label: 'Saldo inicial', cell_B: 50000, editable: true },
            { label: 'Factura parcial', cell_B: 4419.60, editable: true },
            { label: 'Movimiento parcial', cell_B: 1219.60, editable: true },
            { label: 'Resto parcial', cell_B: 3200.00, editable: true },
            { label: 'Pago 1 (1-vs-2)', cell_B: 89.50, editable: true },
            { label: 'Pago 2 (1-vs-2)', cell_B: 65.98, editable: true },
            { label: 'Suma 1-vs-2', cell_B: 155.48, editable: true },
            { label: 'Resto 1-vs-2', cell_B: 626.20, editable: true },
            { label: 'Cobro A (N-vs-1)', cell_B: 4062, editable: true },
            { label: 'Cobro B (N-vs-1)', cell_B: 4000, editable: true },
            { label: 'Suma N-vs-1', cell_B: 8062, editable: true },
            { label: 'Folio referencia N-vs-1', cell_B: '51010', editable: true },
            { label: 'Compra USD', cell_B: 45, editable: true },
            { label: 'Monto referencia MXN', cell_B: 789, editable: true },
            { label: 'TC aplicado', cell_B: Math.round((789 / 45) * 10000) / 10000, editable: true },
            { label: 'Monto convertido MXN', cell_B: 789.01, editable: true },
            { label: 'Diferencia centavo', cell_B: 0.01, editable: true },
            { label: 'Rebote (cargo y abono)', cell_B: 150, editable: true },
            { label: 'Reembolso al socio', cell_B: 2018.40, editable: true },
          ],
        },
      },
      {
        id: 'form', type: 'form', title: 'Decisión — Banco, periodo y cierre', description: 'Confirma banco, contrapartida, periodo y cierre',
        data: {
          fields: [
            { key: 'banco', label: 'Banco correcto', type: 'choice', options: ['BBVA débito 102-01-001', 'Santander crédito 102-02-001', 'Banorte débito 102-03-001'], correct: 'BBVA débito 102-01-001', validation: { required: true } },
            { key: 'contrapartida', label: 'Contrapartida traspaso', type: 'choice', options: ['102-01-001 (directo a otro banco)', 'Traspaso bancario 899 y 104 (puente)', '2018.40 reembolso al socio'], correct: 'Traspaso bancario 899 y 104 (puente)', validation: { required: true } },
            { key: 'periodo', label: 'Periodo', type: 'choice', options: ['13-may al 13-jun-2025', '01 al 30-jun-2025', '13-may al 13-jul-2025'], correct: '13-may al 13-jun-2025', validation: { required: true } },
            { key: 'fechaPoliza', label: 'Fecha póliza', type: 'choice', options: [MOV_FECHA, '2025-06-30', '2025-05-13'], correct: MOV_FECHA, validation: { required: true } },
            { key: 'revaluacion', label: 'Cierre con revaluación', type: 'choice', options: ['Sí', 'No'], correct: 'Sí', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Conciliación cerrada', description: 'Extracto conciliado con el periodo y la revaluación',
        data: { cuenta: '102-01-001', periodo: '13-may al 13-jun-2025', casos: 7, revaluacion: true },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Saldo inicial', label: 'Saldo inicial', type: 'exact', expected: 50000, points: 1, feedback: { pass: 'Saldo correcto', fail: 'El saldo inicial es $50000 (dato del extracto).' } },
      { stepId: 'spreadsheet', field: 'row_Factura parcial', label: 'Factura parcial', type: 'exact', expected: 4419.60, points: 1, feedback: { pass: 'Factura correcta', fail: 'La factura parcial es 4419.60.' } },
      { stepId: 'spreadsheet', field: 'row_Movimiento parcial', label: 'Movimiento parcial', type: 'exact', expected: 1219.60, points: 1, feedback: { pass: 'Movimiento correcto', fail: 'El movimiento parcial es 1219.60.' } },
      { stepId: 'spreadsheet', field: 'row_Resto parcial', label: 'Resto parcial', type: 'calculated', expected: 3200.00, tolerance: 0.01, points: 3, feedback: { pass: 'Resto parcial correcto', fail: 'Resto = 4419.60 − 1219.60 = 3200.00' } },
      { stepId: 'spreadsheet', field: 'row_Pago 1 (1-vs-2)', label: 'Pago 1', type: 'exact', expected: 89.50, points: 1, feedback: { pass: 'Pago 1 correcto', fail: 'El pago 1 es 89.50.' } },
      { stepId: 'spreadsheet', field: 'row_Pago 2 (1-vs-2)', label: 'Pago 2', type: 'exact', expected: 65.98, points: 1, feedback: { pass: 'Pago 2 correcto', fail: 'El pago 2 es 65.98.' } },
      { stepId: 'spreadsheet', field: 'row_Suma 1-vs-2', label: 'Suma 1-vs-2', type: 'calculated', expected: 155.48, tolerance: 0.01, points: 3, feedback: { pass: 'Suma correcta', fail: 'Suma = 89.50 + 65.98 = 155.48' } },
      { stepId: 'spreadsheet', field: 'row_Resto 1-vs-2', label: 'Resto 1-vs-2', type: 'calculated', expected: 626.20, tolerance: 0.01, points: 2, feedback: { pass: 'Resto correcto', fail: 'El resto 1-vs-2 es 626.20 (dato del extracto).' } },
      { stepId: 'spreadsheet', field: 'row_Cobro A (N-vs-1)', label: 'Cobro A', type: 'exact', expected: 4062, points: 1, feedback: { pass: 'Cobro A correcto', fail: 'El cobro A es 4062.' } },
      { stepId: 'spreadsheet', field: 'row_Cobro B (N-vs-1)', label: 'Cobro B', type: 'exact', expected: 4000, points: 1, feedback: { pass: 'Cobro B correcto', fail: 'El cobro B es 4000.' } },
      { stepId: 'spreadsheet', field: 'row_Folio referencia N-vs-1', label: 'Folio referencia', type: 'exact', expected: '51010', points: 1, feedback: { pass: 'Folio correcto', fail: 'El folio de referencia es 51010.' } },
      { stepId: 'spreadsheet', field: 'row_Suma N-vs-1', label: 'Suma N-vs-1', type: 'calculated', expected: 8062, tolerance: 0.01, points: 3, feedback: { pass: 'Suma correcta', fail: 'Suma = 4062 + 4000 = 8062 contra el folio 51010.' } },
      { stepId: 'spreadsheet', field: 'row_Compra USD', label: 'Compra USD', type: 'exact', expected: 45, points: 1, feedback: { pass: 'Monto USD correcto', fail: 'La compra es 45 USD.' } },
      { stepId: 'spreadsheet', field: 'row_Monto referencia MXN', label: 'Monto referencia MXN', type: 'exact', expected: 789, points: 1, feedback: { pass: 'Referencia correcta', fail: 'El banco muestra 789.' } },
      { stepId: 'spreadsheet', field: 'row_Monto convertido MXN', label: 'Monto convertido MXN', type: 'exact', expected: 789.01, points: 1, feedback: { pass: 'Convertido correcto', fail: 'El convertido es 789.01.' } },
      { stepId: 'spreadsheet', field: 'row_TC aplicado', label: 'TC aplicado', type: 'calculated', expected: Math.round((789 / 45) * 10000) / 10000, tolerance: 0.001, points: 4, feedback: { pass: 'TC correcto con todos los decimales', fail: 'TC = 789/45 = 17.5333... (todos los decimales, no 17.53).' } },
      { stepId: 'spreadsheet', field: 'row_Diferencia centavo', label: 'Diferencia centavo', type: 'calculated', expected: 0.01, tolerance: 0.005, points: 3, feedback: { pass: 'Centavo a cuenta, correcto', fail: 'La diferencia de 0.01 va a cuenta, no se ignora.' } },
      { stepId: 'spreadsheet', field: 'row_Rebote (cargo y abono)', label: 'Rebote', type: 'calculated', expected: 150, tolerance: 0.01, points: 2, feedback: { pass: 'Rebote correcto', fail: 'Rebote: cargo y abono por 150/150.' } },
      { stepId: 'spreadsheet', field: 'row_Reembolso al socio', label: 'Reembolso al socio', type: 'calculated', expected: 2018.40, tolerance: 0.01, points: 2, feedback: { pass: 'Reembolso correcto', fail: 'Reembolso al socio: 2018.40.' } },
      { stepId: 'form', field: 'banco', label: 'Banco correcto', type: 'choice', expected: 'BBVA débito 102-01-001', points: 3, feedback: { pass: 'Banco correcto', fail: 'La cuenta es BBVA débito 102-01-001.' } },
      { stepId: 'form', field: 'contrapartida', label: 'Contrapartida traspaso', type: 'choice', expected: 'Traspaso bancario 899 y 104 (puente)', points: 4, feedback: { pass: 'Puente correcto', fail: 'El traspaso va por la cuenta puente 899/104, nunca directo a otro banco.' } },
      { stepId: 'form', field: 'periodo', label: 'Periodo', type: 'choice', expected: '13-may al 13-jun-2025', points: 2, feedback: { pass: 'Periodo correcto', fail: 'El periodo es 13-may al 13-jun-2025.' } },
      { stepId: 'form', field: 'fechaPoliza', label: 'Fecha póliza', type: 'choice', expected: MOV_FECHA, points: 3, feedback: { pass: 'Fecha correcta', fail: `La fecha de la póliza = fecha del movimiento (${MOV_FECHA}).` } },
      { stepId: 'form', field: 'revaluacion', label: 'Cierre con revaluación', type: 'choice', expected: 'Sí', points: 2, feedback: { pass: 'Cierre correcto', fail: 'El cierre lleva la casilla de revaluación marcada.' } },
    ],
  };
}

// mod-auditoria — Webinar (directora + Pedro): M1/M2/M3 con M1 bloqueando
// DIOT, auditoría cobrado/pagado, deducibilidad, DIOT 4606, hoja de trabajo,
// IVA a cargo 194.67, cuadre, portal, póliza de cierre y casos a/b/c.
// Goldens FIJOS del input (NO random).

export function generateAuditoriaPracticaWorkflow(): Workflow {
  return {
    taskId: `wf-aud-prac-${r(1000, 9999)}`, taskTitle: 'Auditoría e impuestos (webinar)', taskType: 'auditoria_practica', difficulty: 3, estimatedMinutes: 30,
    steps: [
      {
        id: 'email', type: 'email', title: 'Correo — Módulos y números a auditar', description: 'Valida M1/M2/M3 y audita cobrado vs pagado',
        guides: [
          { id: 'g-m123', title: 'M1, M2 y M3', body: 'El sistema trabaja por módulos: M1, M2 y M3. OJO: M1 BLOQUEA la DIOT — sin M1 cerrado no hay declaración. Verifica el estatus de cada módulo antes de seguir.', position: 'top' },
          { id: 'g-cobrado', title: 'Cobrado vs pagado', body: 'Audita lo cobrado (10000 con IVA 1600) contra lo pagado/egresos (2787.88 con IVA pagado 424.22). La diferencia entre IVA cobrado e IVA pagado es tu IVA a cargo: 194.67.', position: 'top' },
        ],
        data: {
          from: 'Directora Fiscal', to: 'auxiliar@logistica.com',
          subject: 'Auditoría mensual: M1/M2/M3, DIOT e IVA a cargo 194.67',
          body: `Buenos días,

Cierra la auditoría del mes con estos números (todos verificados):

**Módulos:** M1, M2 y M3. Recuerda: **M1 bloquea la DIOT**.

**Cobrado:** 10000 con IVA 1600.
**Egresos:** 2787.88 con IVA pagado 424.22.
**IVA a cargo:** 194.67.

**DIOT:** base 16% = 4606 (incluye operaciones 0% solo informativas).
**Parcial:** 2507 al 60%. **Coeficiente:** 0.32 mensual. **Prorrateo:** 50%.
**Retenciones:** ISR 1000 / IVA 1066.67.
**Neto:** 99.11 (132 con recargos).
**Balanza:** 464 = 464, diferencia 0. IVA trasladado: 1600.
**Portal:** compras 2714, IVA 434.
**Conteos:** 1 PUE ingresos / 7 PPD ingresos / 7 PUE compras − 3 no deducibles.

**Casos:** a) 72h, b) corte bancario, c) sin complemento.

Saludos,
Directora Fiscal`,
          urgency: 'alta',
        },
      },
      {
        id: 'spreadsheet', type: 'spreadsheet', title: 'Hoja — Auditoría y DIOT', description: 'Registra los importes auditados',
        guides: [
          { id: 'g-iva', title: 'IVA a cargo 194.67', body: 'IVA cobrado 1600 − IVA pagado y ajustes = 194.67 a cargo. Si te da otro número, revisa deducibilidad y retenciones.', anchor: '[data-guide="IVA a cargo"]', position: 'right' },
          { id: 'g-diot', title: 'DIOT base 4606', body: 'Base al 16% = 4606. Las operaciones al 0% se informan pero no suman base. El parcial 2507 va al 60% = 1504.20.', anchor: '[data-guide="DIOT base 16%"]', position: 'right' },
          { id: 'g-balanza', title: 'Balanza que cuadra en 0', body: 'Debe 464 = Haber 464, diferencia 0. Si no cuadra, falta una póliza (revisa el cierre).', anchor: '[data-guide="Diferencia balanza"]', position: 'right' },
        ],
        data: {
          rows: [
            { label: 'Cobrado', cell_B: 10000, editable: true },
            { label: 'IVA cobrado', cell_B: 1600, editable: true },
            { label: 'Egresos', cell_B: 2787.88, editable: true },
            { label: 'IVA pagado', cell_B: 424.22, editable: true },
            { label: 'IVA a cargo', cell_B: 194.67, editable: true },
            { label: 'DIOT base 16%', cell_B: 4606, editable: true },
            { label: 'Parcial', cell_B: 2507, editable: true },
            { label: 'Parcial al 60%', cell_B: 1504.20, editable: true },
            { label: 'Coeficiente mensual', cell_B: 0.32, editable: true },
            { label: 'Prorrateo %', cell_B: 50, editable: true },
            { label: 'Retención ISR', cell_B: 1000, editable: true },
            { label: 'Retención IVA', cell_B: 1066.67, editable: true },
            { label: 'Neto', cell_B: 99.11, editable: true },
            { label: 'Neto con recargos', cell_B: 132, editable: true },
            { label: 'Balanza debe', cell_B: 464, editable: true },
            { label: 'Balanza haber', cell_B: 464, editable: true },
            { label: 'Diferencia balanza', cell_B: 0, editable: true },
            { label: 'IVA trasladado', cell_B: 1600, editable: true },
            { label: 'Portal compras', cell_B: 2714, editable: true },
            { label: 'Portal IVA', cell_B: 434, editable: true },
            { label: 'Conteo PUE ingresos', cell_B: 1, editable: true },
            { label: 'Conteo PPD ingresos', cell_B: 7, editable: true },
            { label: 'Conteo PUE compras', cell_B: 7, editable: true },
            { label: 'No deducibles', cell_B: 3, editable: true },
          ],
        },
      },
      {
        id: 'form', type: 'form', title: 'Decisión — Módulos, deducibilidad y casos', description: 'Confirma bloqueos, cuadre y casos',
        data: {
          fields: [
            { key: 'bloqueo', label: 'Módulo que bloquea DIOT', type: 'choice', options: ['M1', 'M2', 'M3'], correct: 'M1', validation: { required: true } },
            { key: 'deducibilidad', label: 'Deducibilidad', type: 'choice', options: ['3 no deducibles fuera de base', 'Todo deducible', 'Solo M1 deducible'], correct: '3 no deducibles fuera de base', validation: { required: true } },
            { key: 'cuadre', label: 'Cuadre hoja vs portal', type: 'choice', options: ['Cuadra (dif 0)', 'Dif 464 pendiente', 'Dif 132 con recargos'], correct: 'Cuadra (dif 0)', validation: { required: true } },
            { key: 'poliza', label: 'Póliza de cierre', type: 'choice', options: ['Cierre con IVA 194.67 a cargo', 'Cierre en ceros', 'Sin póliza de cierre'], correct: 'Cierre con IVA 194.67 a cargo', validation: { required: true } },
            { key: 'casoA', label: 'Caso a', type: 'choice', options: ['72h', 'Corte bancario', 'Sin complemento'], correct: '72h', validation: { required: true } },
            { key: 'casoB', label: 'Caso b', type: 'choice', options: ['72h', 'Corte bancario', 'Sin complemento'], correct: 'Corte bancario', validation: { required: true } },
            { key: 'casoC', label: 'Caso c', type: 'choice', options: ['72h', 'Corte bancario', 'Sin complemento'], correct: 'Sin complemento', validation: { required: true } },
          ],
        },
      },
      {
        id: 'result', type: 'result', title: 'Auditoría cerrada', description: 'DIOT liberada e IVA a cargo determinado',
        data: { ivaACargo: 194.67, diotBase: 4606, balanza: 0 },
      },
    ],
    validation: [
      { stepId: 'spreadsheet', field: 'row_Cobrado', label: 'Cobrado', type: 'exact', expected: 10000, points: 1, feedback: { pass: 'Cobrado correcto', fail: 'Lo cobrado es 10000.' } },
      { stepId: 'spreadsheet', field: 'row_IVA cobrado', label: 'IVA cobrado', type: 'exact', expected: 1600, points: 1, feedback: { pass: 'IVA cobrado correcto', fail: 'El IVA cobrado es 1600.' } },
      { stepId: 'spreadsheet', field: 'row_Egresos', label: 'Egresos', type: 'exact', expected: 2787.88, points: 1, feedback: { pass: 'Egresos correctos', fail: 'Los egresos son 2787.88.' } },
      { stepId: 'spreadsheet', field: 'row_IVA pagado', label: 'IVA pagado', type: 'exact', expected: 424.22, points: 1, feedback: { pass: 'IVA pagado correcto', fail: 'El IVA pagado es 424.22.' } },
      { stepId: 'spreadsheet', field: 'row_IVA a cargo', label: 'IVA a cargo', type: 'calculated', expected: 194.67, tolerance: 0.01, points: 5, feedback: { pass: 'IVA a cargo correcto', fail: 'El IVA a cargo es 194.67.' } },
      { stepId: 'spreadsheet', field: 'row_DIOT base 16%', label: 'DIOT base 16%', type: 'calculated', expected: 4606, tolerance: 0.01, points: 4, feedback: { pass: 'Base DIOT correcta', fail: 'La base DIOT al 16% es 4606 (el 0% solo informa).' } },
      { stepId: 'spreadsheet', field: 'row_Parcial', label: 'Parcial', type: 'exact', expected: 2507, points: 1, feedback: { pass: 'Parcial correcto', fail: 'El parcial es 2507.' } },
      { stepId: 'spreadsheet', field: 'row_Parcial al 60%', label: 'Parcial al 60%', type: 'calculated', expected: 1504.20, tolerance: 0.01, points: 3, feedback: { pass: 'Parcial al 60% correcto', fail: 'Parcial = 2507 × 60% = 1504.20' } },
      { stepId: 'spreadsheet', field: 'row_Coeficiente mensual', label: 'Coeficiente mensual', type: 'exact', expected: 0.32, points: 1, feedback: { pass: 'Coeficiente correcto', fail: 'El coeficiente mensual es 0.32.' } },
      { stepId: 'spreadsheet', field: 'row_Prorrateo %', label: 'Prorrateo', type: 'exact', expected: 50, points: 1, feedback: { pass: 'Prorrateo correcto', fail: 'El prorrateo es 50%.' } },
      { stepId: 'spreadsheet', field: 'row_Retención ISR', label: 'Retención ISR', type: 'exact', expected: 1000, points: 1, feedback: { pass: 'Retención ISR correcta', fail: 'La retención ISR es 1000.' } },
      { stepId: 'spreadsheet', field: 'row_Retención IVA', label: 'Retención IVA', type: 'exact', expected: 1066.67, points: 1, feedback: { pass: 'Retención IVA correcta', fail: 'La retención IVA es 1066.67.' } },
      { stepId: 'spreadsheet', field: 'row_Neto', label: 'Neto', type: 'exact', expected: 99.11, points: 2, feedback: { pass: 'Neto correcto', fail: 'El neto es 99.11.' } },
      { stepId: 'spreadsheet', field: 'row_Neto con recargos', label: 'Neto con recargos', type: 'exact', expected: 132, points: 2, feedback: { pass: 'Neto con recargos correcto', fail: 'Con recargos el neto es 132.' } },
      { stepId: 'spreadsheet', field: 'row_Balanza debe', label: 'Balanza debe', type: 'exact', expected: 464, points: 1, feedback: { pass: 'Debe correcto', fail: 'La balanza debe 464.' } },
      { stepId: 'spreadsheet', field: 'row_Balanza haber', label: 'Balanza haber', type: 'exact', expected: 464, points: 1, feedback: { pass: 'Haber correcto', fail: 'La balanza haber 464.' } },
      { stepId: 'spreadsheet', field: 'row_Diferencia balanza', label: 'Diferencia balanza', type: 'calculated', expected: 0, tolerance: 0.01, points: 3, feedback: { pass: 'Balanza cuadra en 0', fail: 'Diferencia = 464 − 464 = 0.' } },
      { stepId: 'spreadsheet', field: 'row_IVA trasladado', label: 'IVA trasladado', type: 'exact', expected: 1600, points: 1, feedback: { pass: 'Trasladado correcto', fail: 'El IVA trasladado es 1600.' } },
      { stepId: 'spreadsheet', field: 'row_Portal compras', label: 'Portal compras', type: 'exact', expected: 2714, points: 1, feedback: { pass: 'Portal compras correcto', fail: 'El portal muestra compras 2714.' } },
      { stepId: 'spreadsheet', field: 'row_Portal IVA', label: 'Portal IVA', type: 'exact', expected: 434, points: 1, feedback: { pass: 'Portal IVA correcto', fail: 'El portal muestra IVA 434.' } },
      { stepId: 'spreadsheet', field: 'row_Conteo PUE ingresos', label: 'Conteo PUE ingresos', type: 'exact', expected: 1, points: 1, feedback: { pass: 'Conteo correcto', fail: '1 PUE en ingresos.' } },
      { stepId: 'spreadsheet', field: 'row_Conteo PPD ingresos', label: 'Conteo PPD ingresos', type: 'exact', expected: 7, points: 1, feedback: { pass: 'Conteo correcto', fail: '7 PPD en ingresos.' } },
      { stepId: 'spreadsheet', field: 'row_Conteo PUE compras', label: 'Conteo PUE compras', type: 'exact', expected: 7, points: 1, feedback: { pass: 'Conteo correcto', fail: '7 PUE en compras.' } },
      { stepId: 'spreadsheet', field: 'row_No deducibles', label: 'No deducibles', type: 'exact', expected: 3, points: 1, feedback: { pass: 'No deducibles correctos', fail: '3 no deducibles fuera de base.' } },
      { stepId: 'form', field: 'bloqueo', label: 'Módulo que bloquea DIOT', type: 'choice', expected: 'M1', points: 4, feedback: { pass: 'M1 bloquea, correcto', fail: 'Sin M1 cerrado no hay DIOT.' } },
      { stepId: 'form', field: 'deducibilidad', label: 'Deducibilidad', type: 'choice', expected: '3 no deducibles fuera de base', points: 3, feedback: { pass: 'Deducibilidad correcta', fail: 'Los 3 no deducibles van fuera de la base.' } },
      { stepId: 'form', field: 'cuadre', label: 'Cuadre hoja vs portal', type: 'choice', expected: 'Cuadra (dif 0)', points: 3, feedback: { pass: 'Cuadre correcto', fail: 'La hoja cuadra con el portal (dif 0).' } },
      { stepId: 'form', field: 'poliza', label: 'Póliza de cierre', type: 'choice', expected: 'Cierre con IVA 194.67 a cargo', points: 3, feedback: { pass: 'Póliza correcta', fail: 'La póliza de cierre lleva el IVA 194.67 a cargo.' } },
      { stepId: 'form', field: 'casoA', label: 'Caso a', type: 'choice', expected: '72h', points: 2, feedback: { pass: 'Caso a correcto', fail: 'El caso a es 72h.' } },
      { stepId: 'form', field: 'casoB', label: 'Caso b', type: 'choice', expected: 'Corte bancario', points: 2, feedback: { pass: 'Caso b correcto', fail: 'El caso b es corte bancario.' } },
      { stepId: 'form', field: 'casoC', label: 'Caso c', type: 'choice', expected: 'Sin complemento', points: 2, feedback: { pass: 'Caso c correcto', fail: 'El caso c es sin complemento.' } },
    ],
  };
}

// ─── MAIN ENTRY ───────────────────────────────────────────────

export function generateWorkflow(taskType: string, userId?: string, trap?: string): Workflow {
  let wf: Workflow;
  switch (taskType) {
    case 'invoice_emission': wf = generateInvoiceWorkflow(userId); break;
    case 'payment_registration': wf = generatePaymentWorkflow(userId); break;
    case 'tax_calculation': wf = generateIVAWorkflow(); break;
    case 'bank_reconciliation': wf = generateBankReconciliationWorkflow(); break;
    case 'journal_entry': wf = generateJournalEntryWorkflow(); break;
    case 'payroll': wf = generatePayrollWorkflow(); break;
    case 'supplier_invoice': wf = generateSupplierInvoiceWorkflow(userId); break;
    case 'business_expense': wf = generateBusinessExpenseWorkflow(userId); break;
    case 'payment_scheduling': wf = generatePaymentSchedulingWorkflow(); break;
    case 'ap_reconciliation': wf = generateAPReconciliationWorkflow(); break;
    case 'cfdi_reception': wf = generateCFDIWorkflow(); break;
    case 'credit_note': wf = generateCreditNoteWorkflow(userId); break;
    case 'cash_cut': wf = generateCashCutWorkflow(); break;
    case 'conciliacion_practica': wf = generateConciliacionPracticaWorkflow(); break;
    case 'auditoria_practica': wf = generateAuditoriaPracticaWorkflow(); break;
    case 'depreciation': wf = generateDepreciationWorkflow(); break;
    case 'financial_statements': wf = generateFinancialStatementsWorkflow(); break;
    default: wf = generateGenericWorkflow(taskType);
  }
  return trap ? applyTrap(wf, trap) : wf;
}
