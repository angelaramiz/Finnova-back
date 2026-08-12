// ─── Auto-generación de Asientos Contables ──────────────────────
// Cuando el usuario crea factura, registra pago, o recibe proveedor,
// el sistema genera automáticamente los asientos contables.

export interface JournalEntry {
  date: string;
  ref: string;
  desc: string;
  account: string;
  debit: number;
  credit: number;
  type: string;
}

function fmt(n: number) { return n.toLocaleString('es-MX', { minimumFractionDigits: 2 }); }
function rDate() { return new Date().toISOString().split('T')[0].replace(/-/g, '/').replace(/(\d{4})\/(\d{2})\/(\d{2})/, (_, y, m, d) => `${d}/${m}/${y}`); }

// ─── Invoice auto-entries ──────────────────────────────────────
export function generateInvoiceEntries(data: {
  clientName: string;
  subtotal: number;
  iva: number;
  total: number;
  invoiceNumber: string;
}): JournalEntry[] {
  const date = rDate();
  const ref = `FAC-${data.invoiceNumber.split('-').pop()}`;
  return [
    { date, ref, desc: `Factura a ${data.clientName}`, account: '1-03 Clientes', debit: data.total, credit: 0, type: 'Factura' },
    { date, ref, desc: 'Reconocimiento de venta', account: '4-01 Ventas', debit: 0, credit: data.subtotal, type: 'Factura' },
    { date, ref, desc: 'IVA trasladado', account: '2-03 IVA por pagar', debit: 0, credit: data.iva, type: 'Factura' },
  ];
}

// ─── Payment auto-entries ─────────────────────────────────────
export function generatePaymentEntries(data: {
  clientName: string;
  amount: number;
  invoiceNumber: string;
}): JournalEntry[] {
  const date = rDate();
  const ref = `PAG-${data.invoiceNumber.split('-').pop()}`;
  return [
    { date, ref, desc: `Pago de ${data.clientName}`, account: '1-02 Bancos', debit: data.amount, credit: 0, type: 'Pago' },
    { date, ref, desc: 'Aplicación de pago a factura', account: '1-03 Clientes', debit: 0, credit: data.amount, type: 'Pago' },
  ];
}

// ─── Supplier invoice auto-entries ────────────────────────────
export function generateSupplierEntries(data: {
  supplierName: string;
  subtotal: number;
  iva: number;
  total: number;
  folio: string;
}): JournalEntry[] {
  const date = rDate();
  const ref = `PROV-${data.folio.split('-').pop()}`;
  return [
    { date, ref, desc: `Factura ${data.supplierName}`, account: '5-01 Compras', debit: data.subtotal, credit: 0, type: 'Compra' },
    { date, ref, desc: 'IVA acreditable de proveedor', account: '2-03 IVA por pagar', debit: data.iva, credit: 0, type: 'Compra' },
    { date, ref, desc: `Registro de ${data.supplierName}`, account: '2-01 Proveedores', debit: 0, credit: data.total, type: 'Compra' },
  ];
}

// ─── Payroll auto-entries ─────────────────────────────────────
export function generatePayrollEntries(data: {
  totalGross: number;
  totalIsr: number;
  totalImss: number;
  totalNeto: number;
  employees: number;
}): JournalEntry[] {
  const date = rDate();
  const ref = `NOM-${date.replace(/\//g, '')}`;
  return [
    { date, ref, desc: `Nómina ${data.employees} empleados`, account: '5-03 Gastos de administración', debit: data.totalGross, credit: 0, type: 'Nómina' },
    { date, ref, desc: 'ISR retenido', account: '2-04 ISR por pagar', debit: 0, credit: data.totalIsr, type: 'Nómina' },
    { date, ref, desc: 'IMSS retenido', account: '2-08 IMSS por pagar', debit: 0, credit: data.totalImss, type: 'Nómina' },
    { date, ref, desc: 'Dispersión bancaria nómina', account: '1-02 Bancos', debit: 0, credit: data.totalNeto, type: 'Nómina' },
  ];
}

// ─── Journal entry generator ──────────────────────────────────
export function generateJournalEntryForType(data: {
  type: string;
  accountDebit: string;
  accountCredit: string;
  amount: number;
  ref: string;
  desc: string;
}): JournalEntry[] {
  const date = rDate();
  return [
    { date, ref: data.ref, desc: data.desc, account: data.accountDebit, debit: data.amount, credit: 0, type: 'Póliza' },
    { date, ref: data.ref, desc: data.desc, account: data.accountCredit, debit: 0, credit: data.amount, type: 'Póliza' },
  ];
}
