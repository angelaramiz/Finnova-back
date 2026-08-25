import { getClients, getSuppliers, getProducts } from './persistentData';
import { simToday, simIso } from '../lib/simTime';

// ─── Utilidades ──────────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function formatCurrency(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const COMPANY_NAME = 'Operadora Logística del Norte S.A. de C.V.';
const COMPANY_RFC = 'OLN-220701-ABC';

// ─── Contexto ────────────────────────────────────────────────
interface DocContext {
  companyName: string;
  companyTaxId: string;
  invoiceNumber: string;
  dateSim: string;
}

function getContext(): DocContext {
  return {
    companyName: COMPANY_NAME,
    companyTaxId: COMPANY_RFC,
    invoiceNumber: `FAC-2026-${String(rand(100, 999)).padStart(3, '0')}`,
    dateSim: simShort(),
  };
}

function simShort(): string {
  const d = simToday();
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()}-${meses[d.getMonth()]}`;
}

// ─── Factura CFDI ────────────────────────────────────────────
export function generateInvoice(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const clients = getClients(userId || 'default');
  const products = getProducts(userId || 'default');
  const client = pick(clients);
  const lines = rand(1, 3);
  let subtotal = 0;
  const items: any[] = [];
  for (let i = 0; i < lines; i++) {
    const p = pick(products);
    const qty = rand(1, 10);
    const unitPrice = p.price;
    const amount = qty * unitPrice;
    items.push({ code: p.name.substring(0, 8).toUpperCase(), desc: p.name, qty, unit: p.unit, unitPrice, amount });
    subtotal += amount;
  }
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const rows = items.map(item => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px">${item.code}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px">${item.desc}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${item.qty}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${item.unit}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">$${formatCurrency(item.unitPrice)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">$${formatCurrency(item.amount)}</td>
    </tr>`).join('');
  const uuid = `${rand(10000000,99999999)}-${rand(1000,9999)}-${rand(1000,9999)}-${rand(1000,9999)}-${rand(100000,999999)}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:12px;padding:40px;color:#1a1a1a}
  h1{font-size:20px;text-align:center;border-bottom:3px double #000;padding-bottom:10px}
  table{width:100%;border-collapse:collapse;margin:15px 0}
  th{background:#e0e0e0;font-size:11px;padding:6px 8px;border:1px solid #ccc;text-align:center}
  .totals{width:300px;margin-left:auto}.totals td{padding:4px 8px;border:1px solid #ccc;font-size:12px}
  .totals .final{font-weight:bold;font-size:14px;background:#f0f0f0}
  .footer{margin-top:30px;font-size:10px;text-align:center;color:#666;border-top:1px solid #ccc;padding-top:10px}
</style></head><body>
<h1>FACTURA</h1>
<p style="text-align:center;font-size:11px;margin-top:-5px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<hr>
<table style="width:100%;border:none"><tr>
<td style="border:none;width:50%"><strong>Cliente:</strong> ${client.name}<br><strong>RFC:</strong> ${client.rfc}<br><strong>Fecha:</strong> ${ctx.dateSim}</td>
<td style="border:none;width:50%;text-align:right"><strong>Factura:</strong> ${ctx.invoiceNumber}<br><strong>Método:</strong> Transferencia Electrónica (SPEI)<br><strong>Uso CFDI:</strong> D03 - Gastos en general</td>
</tr></table>
<table><thead><tr><th>Código</th><th>Descripción</th><th>Cant</th><th>Unidad</th><th>P.Unitario</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table>
<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">$${formatCurrency(subtotal)}</td></tr>
  <tr><td>IVA (16%)</td><td style="text-align:right">$${formatCurrency(iva)}</td></tr>
  <tr class="final"><td>TOTAL</td><td style="text-align:right">$${formatCurrency(total)}</td></tr>
</table>
<div class="footer">Folio Fiscal: ${uuid}<br>Sello Digital: Simulado · Documento educativo</div>
</body></html>`;
  return { html, data: { invoiceNumber: ctx.invoiceNumber, client: client.name, clientRfc: client.rfc, subtotal, iva, total, items, uuid } };
}

// ─── Estado de cuenta bancario ───────────────────────────────
export function generateBankStatement(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const clients = getClients(userId || 'default');
  const balance = rand(50000, 500000);
  const movements = rand(5, 10);
  let current = balance;
  const movRows: string[] = [];
  const dataRows: any[] = [];
  for (let i = 0; i < movements; i++) {
    const day = String(rand(1, 28)).padStart(2, '0');
    const isIn = Math.random() > 0.4;
    const amount = rand(1000, 50000);
    current += isIn ? amount : -amount;
    const desc = isIn
      ? pick(['Depósito transferencia SPEI', `Pago de ${pick(clients).name}`, 'Abono nómina', 'Devolución proveedor'])
      : pick(['Retiro cajero automático', 'Comisión bancaria mensual', 'Transferencia emitida', 'Pago a proveedor', 'Compra con tarjeta TPV']);
    movRows.push(`<tr>
      <td style="padding:4px 8px;border:1px solid #ccc">2026-07-${day}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px">${desc}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;text-align:right">${isIn ? '$' + formatCurrency(amount) : '-'}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;text-align:right">${!isIn ? '$' + formatCurrency(amount) : '-'}</td>
      <td style="padding:4px 8px;border:1px solid #ccc;text-align:right">$${formatCurrency(current)}</td>
    </tr>`);
    dataRows.push({ date: `2026-07-${day}`, desc, in: isIn ? amount : 0, out: !isIn ? amount : 0, balance: current });
  }
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:12px;padding:40px}
  h1{font-size:18px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin:15px 0;font-size:11px}
  th{background:#1a1a2e;color:#fff;padding:6px 8px;border:1px solid #1a1a2e}
  td{padding:4px 8px;border:1px solid #ccc}.header-info{font-size:11px;margin:10px 0}
  .balance-final{font-weight:bold;font-size:14px;text-align:right;margin-top:10px}
</style></head><body>
<h1>ESTADO DE CUENTA BANCARIO</h1>
<p style="text-align:center;font-size:11px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<div class="header-info"><strong>Banco:</strong> Banco Nacional de México | <strong>Cuenta:</strong> 6550 ${rand(1000,9999)} ${rand(1000,9999)} ${rand(1000,9999)}<br><strong>Periodo:</strong> Julio 2026 | <strong>Saldo inicial:</strong> $${formatCurrency(balance)}</div>
<table><thead><tr><th>Fecha</th><th>Descripción</th><th>Depósitos</th><th>Retiros</th><th>Saldo</th></tr></thead><tbody>${movRows.join('')}</tbody></table>
<div class="balance-final">Saldo Final: $${formatCurrency(current)}</div>
<div style="margin-top:20px;font-size:9px;text-align:center;color:#888">Estado de cuenta simulado · Fines educativos</div>
</body></html>`;
  return { html, data: { account: `6550 **** ${rand(1000,9999)}`, initialBalance: balance, finalBalance: current, movements: dataRows } };
}

// ─── Balanza de comprobación ─────────────────────────────────
export function generateTrialBalance(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const accounts = [
    { code: '1-01', name: 'Caja', balance: rand(5000, 50000) },
    { code: '1-02', name: 'Bancos', balance: rand(100000, 500000) },
    { code: '1-03', name: 'Clientes', balance: rand(50000, 200000) },
    { code: '1-04', name: 'Deudores diversos', balance: rand(5000, 30000) },
    { code: '1-05', name: 'Inventarios', balance: rand(100000, 300000) },
    { code: '1-06', name: 'Equipo de cómputo', balance: rand(50000, 150000) },
    { code: '1-07', name: 'Mobiliario y equipo', balance: rand(30000, 100000) },
    { code: '1-08', name: 'Depreciación acumulada', balance: -rand(20000, 60000) },
    { code: '2-01', name: 'Proveedores', balance: -rand(40000, 150000) },
    { code: '2-03', name: 'IVA por pagar', balance: -rand(5000, 30000) },
    { code: '2-04', name: 'ISR por pagar', balance: -rand(10000, 40000) },
    { code: '2-08', name: 'IMSS por pagar', balance: -rand(5000, 20000) },
    { code: '3-01', name: 'Capital social', balance: -rand(200000, 500000) },
    { code: '4-01', name: 'Ventas', balance: -rand(200000, 500000) },
    { code: '5-01', name: 'Compras', balance: rand(100000, 300000) },
    { code: '5-03', name: 'Gastos de administración', balance: rand(30000, 80000) },
    { code: '5-04', name: 'Gastos de nómina', balance: rand(50000, 150000) },
    { code: '5-07', name: 'Gastos de depreciación', balance: rand(5000, 15000) },
  ];
  const totalDebe = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalHaber = Math.abs(accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const d = simToday();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const month = meses[d.getMonth()];
  const rows = accounts.map(a => {
    const debe = a.balance > 0 ? a.balance : 0;
    const haber = a.balance < 0 ? Math.abs(a.balance) : 0;
    return `<tr>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;font-family:monospace">${a.code}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px">${a.name}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right">${debe ? '$' + formatCurrency(debe) : ''}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right">${haber ? '$' + formatCurrency(haber) : ''}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:10px;padding:30px}
  h1{font-size:14px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  th{background:#e0e0e0;font-size:9px;padding:4px 6px;border:1px solid #999}
  .ttl{font-weight:bold;border-top:2px solid #000}
</style></head><body>
<h1>BALANZA DE COMPROBACIÓN</h1>
<p style="text-align:center;font-size:9px">${ctx.companyName} · RFC: ${ctx.companyTaxId} · ${month} ${d.getFullYear()}</p>
<table><thead><tr><th>Código</th><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="ttl"><td colspan="2" style="padding:3px 6px;border:1px solid #999;text-align:right">TOTALES</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalDebe)}</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalHaber)}</td></tr></tfoot></table>
<div style="margin-top:15px;font-size:7px;text-align:center;color:#888">Balanza de comprobación · Documento educativo</div>
</body></html>`;
  return { html, data: { company: ctx.companyName, period: `${month} ${d.getFullYear()}`, accounts: accounts.length, totalDebe, totalHaber } };
}

// ─── Nómina quincenal ────────────────────────────────────────
export function generatePayroll(): { html: string; data: any } {
  const ctx = getContext();
  const employees = [
    { name: 'Juan Carlos Martínez', position: 'Auxiliar Contable', daily: 350, days: 15 },
    { name: 'María García López', position: 'Analista de CxP', daily: 420, days: 15 },
    { name: 'Roberto Sánchez Pérez', position: 'Asistente Administrativo', daily: 280, days: 15 },
    { name: 'Ana Patricia Ruiz', position: 'Supervisor de Operaciones', daily: 520, days: 15 },
    { name: 'Carlos Hernández Gómez', position: 'Coordinador de Logística', daily: 480, days: 15 },
  ];
  const rows = employees.map(e => {
    const gross = e.daily * e.days;
    const isr = Math.round(gross * 0.12);
    const imss = Math.round(gross * 0.08);
    const neto = gross - isr - imss;
    return `<tr>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px">${e.name}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px">${e.position}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right">$${formatCurrency(gross)}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right">$${formatCurrency(isr)}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right">$${formatCurrency(imss)}</td>
      <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;font-weight:bold">$${formatCurrency(neto)}</td>
    </tr>`;
  }).join('');
  const totalGross = employees.reduce((s, e) => s + e.daily * e.days, 0);
  const totalNeto = employees.reduce((s, e) => s + (e.daily * e.days - Math.round(e.daily * e.days * 0.12) - Math.round(e.daily * e.days * 0.08)), 0);
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:10px;padding:30px}
  h1{font-size:14px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  th{background:#1a1a2e;color:#fff;font-size:8px;padding:4px 6px;border:1px solid #1a1a2e}
  .ttl{font-weight:bold;border-top:2px solid #000;background:#f0f0f0}
</style></head><body>
<h1>NÓMINA QUINCENAL</h1>
<p style="text-align:center;font-size:9px">${ctx.companyName} · Periodo: Julio 2026</p>
<table><thead><tr><th>Empleado</th><th>Puesto</th><th>Sueldo Bruto</th><th>ISR</th><th>IMSS</th><th>Neto</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="ttl"><td colspan="2" style="padding:3px 6px;border:1px solid #999;text-align:right">TOTALES</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalGross)}</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">-</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">-</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalNeto)}</td></tr></tfoot></table>
<div style="margin-top:15px;font-size:7px;text-align:center;color:#888">Nómina simulada · Documento educativo</div>
</body></html>`;
  return { html, data: { company: ctx.companyName, employees: employees.length, totalGross, totalNeto } };
}

// ─── Recibo de pago ──────────────────────────────────────────
export function generatePaymentReceipt(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const clients = getClients(userId || 'default');
  const client = pick(clients);
  const amount = rand(5000, 50000);
  const iva = Math.round(amount * 0.16);
  const total = amount + iva;
  const ref = `SPEI-${rand(100000, 999999)}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:12px;padding:40px}
  h1{font-size:18px;text-align:center;border-bottom:2px solid #000}
  table{width:100%;margin:10px 0;font-size:11px}td{padding:4px 8px}
  .recibo{border:2px solid #000;padding:20px;margin-top:15px}
</style></head><body>
<div class="recibo">
<h1>RECIBO DE PAGO</h1>
<p style="text-align:center;font-size:11px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<hr>
<table>
  <tr><td><strong>Recibimos de:</strong></td><td>${client.name}</td></tr>
  <tr><td><strong>RFC:</strong></td><td>${client.rfc}</td></tr>
  <tr><td><strong>Concepto:</strong></td><td>Pago de servicios de logística - Factura ${ctx.invoiceNumber}</td></tr>
  <tr><td><strong>Subtotal:</strong></td><td>$${formatCurrency(amount)}</td></tr>
  <tr><td><strong>IVA (16%):</strong></td><td>$${formatCurrency(iva)}</td></tr>
  <tr><td><strong>TOTAL:</strong></td><td><strong>$${formatCurrency(total)}</strong></td></tr>
  <tr><td><strong>Forma de pago:</strong></td><td>Transferencia Electrónica (SPEI)</td></tr>
  <tr><td><strong>Referencia:</strong></td><td>${ref}</td></tr>
  <tr><td><strong>Fecha:</strong></td><td>${ctx.dateSim}</td></tr>
</table>
<hr>
<p style="text-align:center;font-size:10px;color:#666">Recibo simulado · Documento educativo</p>
</div></body></html>`;
  return { html, data: { receiptRef: ref, client: client.name, clientRfc: client.rfc, amount, iva, total } };
}

// ─── Ticket de compra ────────────────────────────────────────
export function generatePurchaseTicket(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const suppliers = getSuppliers(userId || 'default');
  const products = getProducts(userId || 'default');
  const supplier = pick(suppliers);
  const lines = rand(2, 4);
  let subtotal = 0;
  const items: any[] = [];
  for (let i = 0; i < lines; i++) {
    const p = pick(products);
    const qty = rand(1, 5);
    const amount = qty * p.price;
    items.push({ desc: p.name, qty, unit: p.unit, unitPrice: p.price, amount });
    subtotal += amount;
  }
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const ticketNum = `TICK-${String(rand(1, 999)).padStart(5, '0')}`;
  const rows = items.map(item => `
    <tr>
      <td style="padding:5px 6px;border:1px solid #999;font-size:10px">${item.desc}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:center;font-size:10px">${item.qty} ${item.unit}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:right;font-size:10px">$${formatCurrency(item.unitPrice)}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:right;font-size:10px;font-weight:bold">$${formatCurrency(item.amount)}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:11px;padding:30px;color:#333;max-width:400px}
  h2{text-align:center;font-size:16px;margin-bottom:5px}
  .header{text-align:center;font-size:9px;color:#666;border-bottom:1px dashed #ccc;padding-bottom:10px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  .total-row{border-top:2px solid #000;font-weight:bold;font-size:13px}
  .footer{margin-top:15px;font-size:8px;text-align:center;color:#999;border-top:1px dashed #ccc;padding-top:8px}
</style></head><body>
<h2>TICKET DE COMPRA</h2>
<div class="header">
  <strong>${supplier.name}</strong><br>
  RFC: ${supplier.rfc}<br>
  ${supplier.phone ? 'Tel: ' + supplier.phone : ''}<br>
  Fecha: ${ctx.dateSim} | Hora: 14:32
</div>
<table><thead><tr><th>Descripción</th><th>Cant</th><th>P.Unit</th><th>Importe</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="total-row">
  <td colspan="3" style="padding:6px;text-align:right">SUBTOTAL</td>
  <td style="padding:6px;text-align:right">$${formatCurrency(subtotal)}</td>
</tr>
<tr class="total-row">
  <td colspan="3" style="padding:6px;text-align:right">IVA (16%)</td>
  <td style="padding:6px;text-align:right">$${formatCurrency(iva)}</td>
</tr>
<tr class="total-row">
  <td colspan="3" style="padding:6px;text-align:right">TOTAL</td>
  <td style="padding:6px;text-align:right;font-size:14px">$${formatCurrency(total)}</td>
</tr></tfoot></table>
<p style="font-size:10px"><strong>Forma de pago:</strong> Tarjeta de débito/crédito</p>
<p style="font-size:10px"><strong>Folio fiscal:</strong> ${rand(10000000,99999999)}-${rand(1000,9999)}-${rand(1000,9999)}</p>
<div class="footer">Ticket de compra · Documento educativo</div>
</body></html>`;
  return { html, data: { ticketNum, supplier: supplier.name, supplierRfc: supplier.rfc, subtotal, iva, total, items } };
}

// ─── CFDI de proveedor ───────────────────────────────────────
export function generateSupplierInvoice(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const suppliers = getSuppliers(userId || 'default');
  const products = getProducts(userId || 'default');
  const supplier = pick(suppliers);
  const lines = rand(1, 3);
  let subtotal = 0;
  const items: any[] = [];
  for (let i = 0; i < lines; i++) {
    const p = pick(products);
    const qty = rand(1, 10);
    const amount = qty * p.price;
    items.push({ code: p.name.substring(0, 8).toUpperCase(), desc: p.name, qty, unit: p.unit, unitPrice: p.price, amount });
    subtotal += amount;
  }
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;
  const folio = `CFDI-${rand(10000, 99999)}`;
  const uuid = `${rand(10000000,99999999)}-${rand(1000,9999)}-${rand(1000,9999)}-${rand(1000,9999)}-${rand(100000,999999)}`;
  const rows = items.map(item => `
    <tr>
      <td style="padding:5px 6px;border:1px solid #999;font-size:9px">${item.desc}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:center;font-size:9px">${item.qty}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:right;font-size:9px">$${formatCurrency(item.unitPrice)}</td>
      <td style="padding:5px 6px;border:1px solid #999;text-align:right;font-size:9px">$${formatCurrency(item.amount)}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:10px;padding:30px}
  h1{font-size:16px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  th{background:#1a1a2e;color:#fff;font-size:8px;padding:4px 6px;border:1px solid #1a1a2e}
  .ttl{font-weight:bold;border-top:2px solid #000;background:#f0f0f0}
</style></head><body>
<h1>CFDI RECIBIDO</h1>
<p style="text-align:center;font-size:9px"><strong>Emisor:</strong> ${supplier.name} | RFC: ${supplier.rfc}</p>
<p style="text-align:center;font-size:9px"><strong>Receptor:</strong> ${ctx.companyName} | RFC: ${ctx.companyTaxId}</p>
<table><thead><tr><th>Descripción</th><th>Cant</th><th>P.Unitario</th><th>Importe</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="ttl"><td colspan="3" style="text-align:right">Subtotal</td><td style="text-align:right">$${formatCurrency(subtotal)}</td></tr>
<tr class="ttl"><td colspan="3" style="text-align:right">IVA (16%)</td><td style="text-align:right">$${formatCurrency(iva)}</td></tr>
<tr class="ttl"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right;font-size:12px">$${formatCurrency(total)}</td></tr></tfoot></table>
<p style="font-size:8px"><strong>Folio:</strong> ${folio} | <strong>UUID:</strong> ${uuid}</p>
<p style="font-size:8px"><strong>Uso CFDI:</strong> D03 - Gastos en general | <strong>Método:</strong> PUE</p>
<div style="margin-top:10px;font-size:7px;text-align:center;color:#888">CFDI simulado · Documento educativo</div>
</body></html>`;
  return { html, data: { folio, supplier: supplier.name, supplierRfc: supplier.rfc, subtotal, iva, total, items, uuid } };
}

// ─── Declaración de impuestos (cierre de mes) ────────────────
export function generateTaxDeclaration(userId?: string): { html: string; data: any } {
  const ctx = getContext();
  const d = simToday();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const month = meses[d.getMonth()];
  const ventasNetas = rand(800000, 2000000);
  const costoVentas = Math.round(ventasNetas * 0.6);
  const utilidadBruta = ventasNetas - costoVentas;
  const gastosAdmin = rand(100000, 300000);
  const gastosVenta = rand(80000, 200000);
  const utilidadOperativa = utilidadBruta - gastosAdmin - gastosVenta;
  const isr = Math.round(utilidadOperativa * 0.30);
  const ivaCobrado = Math.round(ventasNetas * 0.16);
  const ivaPagado = Math.round(costoVentas * 0.16);
  const ivaPorPagar = ivaCobrado - ivaPagado;
  const isrPorPagar = isr;
  const totalImpuestos = ivaPorPagar + isrPorPagar;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:10px;padding:30px}
  h1{font-size:14px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  th{background:#1a1a2e;color:#fff;font-size:8px;padding:4px 6px;border:1px solid #1a1a2e}
  .ttl{font-weight:bold;border-top:2px solid #000;background:#f0f0f0}
  .result{margin-top:15px;padding:10px;border:2px solid #22c55e;background:#22c55e10;text-align:center}
</style></head><body>
<h1>DECLARACIÓN DE IMPUESTOS</h1>
<p style="text-align:center;font-size:9px"><strong>${ctx.companyName}</strong> · RFC: ${ctx.companyTaxId}</p>
<p style="text-align:center;font-size:9px">Periodo: ${month} ${d.getFullYear()} · Mensual</p>
<table><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
<tbody>
  <tr><td>Ventas netas</td><td style="text-align:right">$${formatCurrency(ventasNetas)}</td></tr>
  <tr><td>Costo de ventas</td><td style="text-align:right">($${formatCurrency(costoVentas)})</td></tr>
  <tr><td>Utilidad bruta</td><td style="text-align:right">$${formatCurrency(utilidadBruta)}</td></tr>
  <tr><td>Gastos de administración</td><td style="text-align:right">($${formatCurrency(gastosAdmin)})</td></tr>
  <tr><td>Gastos de venta</td><td style="text-align:right">($${formatCurrency(gastosVenta)})</td></tr>
  <tr><td style="font-weight:bold">Utilidad de operación</td><td style="text-align:right;font-weight:bold">$${formatCurrency(utilidadOperativa)}</td></tr>
</tbody></table>
<table style="margin-top:15px"><thead><tr><th>Impuesto</th><th style="text-align:right">Monto</th></tr></thead>
<tbody>
  <tr><td>IVA cobrado (16%)</td><td style="text-align:right">$${formatCurrency(ivaCobrado)}</td></tr>
  <tr><td>IVA pagado (16%)</td><td style="text-align:right">($${formatCurrency(ivaPagado)})</td></tr>
  <tr><td>IVA por pagar</td><td style="text-align:right;font-weight:bold">$${formatCurrency(ivaPorPagar)}</td></tr>
  <tr><td>ISR (30% sobre utilidad)</td><td style="text-align:right;font-weight:bold">$${formatCurrency(isrPorPagar)}</td></tr>
  <tr class="ttl"><td>TOTAL IMPUESTOS A PAGAR</td><td style="text-align:right;font-size:13px;color:#ef4444">$${formatCurrency(totalImpuestos)}</td></tr>
</tbody></table>
<div class="result"><p style="font-size:12px;font-weight:bold;color:#22c55e">Utilidad neta después de impuestos: $${formatCurrency(utilidadOperativa - totalImpuestos)}</p></div>
<div style="margin-top:20px;font-size:7px;text-align:center;color:#888">Declaración simulada · Documento educativo</div>
</body></html>`;
  return { html, data: { period: `${month} ${d.getFullYear()}`, ventasNetas, utilidadOperativa, ivaPorPagar, isrPorPagar, totalImpuestos, utilidadNeta: utilidadOperativa - totalImpuestos } };
}

// ─── Dispatcher ──────────────────────────────────────────────
export function generateDocument(type: string, userId?: string): { html: string; data: any } {
  switch (type) {
    case 'invoice': return generateInvoice(userId);
    case 'bank_statement': return generateBankStatement(userId);
    case 'payment_receipt': return generatePaymentReceipt(userId);
    case 'trial_balance': return generateTrialBalance(userId);
    case 'payroll': return generatePayroll();
    case 'purchase_ticket': return generatePurchaseTicket(userId);
    case 'supplier_invoice': return generateSupplierInvoice(userId);
    case 'tax_declaration': return generateTaxDeclaration(userId);
    default: return generateInvoice(userId);
  }
}
