function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RFC_CLIENTS = ['CNS-990101-HIJ', 'TRA-880202-KLM', 'ALB-770303-NOP', 'INV-660404-QRS', 'CTR-550505-TUV'];
const CLIENT_NAMES = ['Comercial del Norte S.A.', 'Transportes Rápidos S.A.', 'Almacenes del Bajío S.P.R.', 'Inversiones del Valle S.A.', 'Corporativo Trust S.A.'];
const PRODUCTS = [
  { code: 'S-LOG-001', desc: 'Servicio de transporte de carga nacional', unit: 'VIAJE', price: 8500 },
  { code: 'S-LOG-002', desc: 'Almacenaje temporal por metro cuadrado', unit: 'M2', price: 320 },
  { code: 'S-LOG-003', desc: 'Manejo de carga especializada', unit: 'TON', price: 12500 },
  { code: 'S-LOG-004', desc: 'Servicio de inventario y consolidación', unit: 'HORA', price: 1800 },
  { code: 'S-LOG-005', desc: 'Flete express nacional', unit: 'VIAJE', price: 15000 },
  { code: 'S-LOG-006', desc: 'Seguro de carga', unit: '%', price: 0.02 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface DocContext {
  companyName: string;
  companyTaxId: string;
  clientIdx: number;
  invoiceNumber: string;
}

function getContext(clientIdx?: number): DocContext {
  const idx = clientIdx ?? rand(0, CLIENT_NAMES.length - 1);
  return {
    companyName: 'Operadora Logística del Norte S.A. de C.V.',
    companyTaxId: 'OLN-220701-ABC',
    clientIdx: idx,
    invoiceNumber: `FAC-2026-${String(rand(100, 999)).padStart(3, '0')}`,
  };
}

export function generateInvoice(clientIdx?: number): { html: string; data: any } {
  const ctx = getContext(clientIdx);
  const lines = rand(2, 4);
  let subtotal = 0;
  const items: any[] = [];
  for (let i = 0; i < lines; i++) {
    const p = pick(PRODUCTS);
    const qty = rand(1, 10);
    const unitPrice = p.price * (p.code === 'S-LOG-006' ? subtotal || 50000 : 1);
    const amount = p.code === 'S-LOG-006' ? Math.round(subtotal * p.price) : qty * unitPrice;
    items.push({ code: p.code, desc: p.desc, qty, unit: p.unit, unitPrice: Math.round(amount / qty), amount: Math.round(amount) });
    subtotal += Math.round(amount);
  }
  const iva = Math.round(subtotal * 0.16);
  const total = subtotal + iva;

  const rows = items.map(item => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px">${item.code}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px">${item.desc}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:center">${item.qty}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:center">${item.unit}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:right">$${formatCurrency(item.unitPrice)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:right">$${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #e0e0e0; font-size: 11px; padding: 6px 8px; border: 1px solid #ccc; text-align: center; }
  .totals { width: 300px; margin-left: auto; }
  .totals td { padding: 4px 8px; border: 1px solid #ccc; font-size: 12px; }
  .totals .final { font-weight: bold; font-size: 14px; background: #f0f0f0; }
  .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
</style></head><body>
<h1>FACTURA</h1>
<p style="text-align:center;font-size:11px;margin-top:-5px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<hr>
<table style="width:100%;border:none"><tr>
<td style="border:none;width:50%">
  <strong>Cliente:</strong> ${CLIENT_NAMES[ctx.clientIdx]}<br>
  <strong>RFC:</strong> ${RFC_CLIENTS[ctx.clientIdx]}<br>
  <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}
</td>
<td style="border:none;width:50%;text-align:right">
  <strong>Factura:</strong> ${ctx.invoiceNumber}<br>
  <strong>Método de pago:</strong> Transferencia Electrónica<br>
  <strong>Uso CFDI:</strong> D03 - Gastos en general
</td>
</tr></table>
<table><thead><tr>
  <th>Código</th><th>Descripción</th><th>Cant</th><th>Unidad</th><th>P. Unitario</th><th>Importe</th>
</tr></thead><tbody>${rows}</tbody></table>
<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">$${formatCurrency(subtotal)}</td></tr>
  <tr><td>IVA (16%)</td><td style="text-align:right">$${formatCurrency(iva)}</td></tr>
  <tr class="final"><td>TOTAL</td><td style="text-align:right">$${formatCurrency(total)}</td></tr>
</table>
<div class="footer">
  Este documento es una representación simulada de una factura real para fines educativos.<br>
  Folio Fiscal SIM-${ctx.invoiceNumber}-${rand(100000, 999999)} | Sello Digital: Simulado
</div>
</body></html>`;

  return { html, data: { invoiceNumber: ctx.invoiceNumber, client: CLIENT_NAMES[ctx.clientIdx], subtotal, iva, total, items } };
}

export function generateBankStatement(): { html: string; data: any } {
  const ctx = getContext();
  const balance = rand(50000, 500000);
  const movements = rand(5, 10);
  let current = balance;
  const rows: string[] = [];
  const dataRows: any[] = [];
  for (let i = 0; i < movements; i++) {
    const day = String(rand(1, 28)).padStart(2, '0');
    const isIn = Math.random() > 0.4;
    const amount = rand(1000, 50000);
    current += isIn ? amount : -amount;
    const desc = isIn
      ? pick(['Depósito transferencia SPEUA', 'Pago cliente domiciliado', 'Abono nómina', 'Devolución proveedor'])
      : pick(['Retiro cajero automático', 'Cargo comisión mensual', 'Transferencia emitida', 'Pago proveedor', 'Compra TPV']);
    rows.push(`<tr>
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
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 40px; }
  h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
  th { background: #1a1a2e; color: #fff; padding: 6px 8px; border: 1px solid #1a1a2e; }
  td { padding: 4px 8px; border: 1px solid #ccc; }
  .header-info { font-size: 11px; margin: 10px 0; }
  .balance-final { font-weight: bold; font-size: 14px; text-align: right; margin-top: 10px; }
</style></head><body>
<h1>ESTADO DE CUENTA BANCARIO</h1>
<p style="text-align:center;font-size:11px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<div class="header-info">
  <strong>Banco:</strong> Banco Nacional de México | <strong>Cuenta:</strong> 6550 ${rand(1000,9999)} ${rand(1000,9999)} ${rand(1000,9999)}<br>
  <strong>Periodo:</strong> Julio 2026 | <strong>Saldo inicial:</strong> $${formatCurrency(balance)}
</div>
<table><thead><tr>
  <th>Fecha</th><th>Descripción</th><th>Depósitos</th><th>Retiros</th><th>Saldo</th>
</tr></thead><tbody>${rows.join('')}</tbody></table>
<div class="balance-final">Saldo Final: $${formatCurrency(current)}</div>
<div style="margin-top:20px;font-size:9px;text-align:center;color:#888">
  Estado de cuenta simulado para fines educativos.
</div>
</body></html>`;

  return { html, data: { account: `6550 **** ${rand(1000,9999)}`, initialBalance: balance, finalBalance: current, movements: dataRows } };
}

export function generateTrialBalance(): { html: string; data: any } {
  const ctx = getContext();
  const accounts = [
    { code: '1000-01', name: 'Caja', balance: rand(5000, 50000) },
    { code: '1000-02', name: 'Bancos', balance: rand(100000, 500000) },
    { code: '1000-03', name: 'Clientes', balance: rand(50000, 200000) },
    { code: '1000-04', name: 'Deudores diversos', balance: rand(5000, 30000) },
    { code: '1000-05', name: 'Inventarios', balance: rand(100000, 300000) },
    { code: '1000-06', name: 'Equipo de cómputo', balance: rand(50000, 150000) },
    { code: '1000-07', name: 'Mobiliario y equipo', balance: rand(30000, 100000) },
    { code: '1000-08', name: 'Depreciación acumulada', balance: -rand(20000, 60000) },
    { code: '2000-01', name: 'Proveedores', balance: -rand(40000, 150000) },
    { code: '2000-02', name: 'Acreedores', balance: -rand(10000, 50000) },
    { code: '2000-03', name: 'IVA por pagar', balance: -rand(5000, 30000) },
    { code: '2000-04', name: 'ISR por pagar', balance: -rand(10000, 40000) },
    { code: '2000-05', name: 'PTU por pagar', balance: -rand(5000, 20000) },
    { code: '3000-01', name: 'Capital social', balance: -rand(200000, 500000) },
    { code: '3000-02', name: 'Utilidad del ejercicio', balance: -rand(30000, 100000) },
    { code: '4000-01', name: 'Ventas', balance: -rand(200000, 500000) },
    { code: '5000-01', name: 'Compras', balance: rand(100000, 300000) },
    { code: '5000-02', name: 'Gastos de venta', balance: rand(20000, 60000) },
    { code: '5000-03', name: 'Gastos de administración', balance: rand(30000, 80000) },
    { code: '5000-04', name: 'Gastos financieros', balance: rand(5000, 15000) },
  ];
  const totalDebe = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalHaber = Math.abs(accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const now = new Date();
  const month = now.toLocaleString('es-MX', { month: 'long' }).toUpperCase();
  const year = now.getFullYear();

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
  body { font-family: 'Courier New', monospace; font-size: 10px; padding: 30px; }
  h1 { font-size: 14px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #e0e0e0; font-size: 9px; padding: 4px 6px; border: 1px solid #999; }
  .ttl { font-weight: bold; border-top: 2px solid #000; }
</style></head><body>
<h1>BALANZA DE COMPROBACIÒN</h1>
<p style="text-align:center;font-size:9px">${ctx.companyName} · RFC: ${ctx.companyTaxId} · ${month} ${year}</p>
<table><thead><tr><th>Código</th><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>
<tr class="ttl"><td colspan="2" style="padding:3px 6px;border:1px solid #999;text-align:right">TOTALES</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalDebe)}</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalHaber)}</td></tr>
</tfoot></table>
<div style="margin-top:15px;font-size:7px;text-align:center;color:#888">Balanza de comprobación simulada · Fines educativos</div>
</body></html>`;

  return { html, data: { company: ctx.companyName, period: `${month} ${year}`, accounts: accounts.length, totalDebe, totalHaber } };
}

export function generatePayroll(): { html: string; data: any } {
  const employees = [
    { name: 'Juan Carlos Martínez', position: 'Auxiliar Contable', daily: 350, days: 30 },
    { name: 'María García López', position: 'Analista de CxP', daily: 420, days: 30 },
    { name: 'Roberto Sánchez Pérez', position: 'Asistente Administrativo', daily: 280, days: 30 },
    { name: 'Ana Patricia Ruiz', position: 'Supervisor de Operaciones', daily: 520, days: 30 },
    { name: 'Carlos Hernández Gómez', position: 'Coordinador de Logística', daily: 480, days: 30 },
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
  const ctx = getContext();

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: 'Courier New', monospace; font-size: 10px; padding: 30px; }
  h1 { font-size: 14px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #1a1a2e; color: #fff; font-size: 8px; padding: 4px 6px; border: 1px solid #1a1a2e; }
  .ttl { font-weight: bold; border-top: 2px solid #000; background: #f0f0f0; }
</style></head><body>
<h1>NÒMINA QUINCENAL</h1>
<p style="text-align:center;font-size:9px">${ctx.companyName} · Periodo: Julio 2026</p>
<table><thead><tr><th>Empleado</th><th>Puesto</th><th>Sueldo Bruto</th><th>ISR</th><th>IMSS</th><th>Neto</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>
<tr class="ttl"><td colspan="2" style="padding:3px 6px;border:1px solid #999;text-align:right">TOTALES</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalGross)}</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">-</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">-</td>
<td style="padding:3px 6px;border:1px solid #999;text-align:right">$${formatCurrency(totalNeto)}</td></tr>
</tfoot></table>
<div style="margin-top:15px;font-size:7px;text-align:center;color:#888">Nómina simulada · Fines educativos</div>
</body></html>`;
  return { html, data: { company: ctx.companyName, employees: employees.length, totalGross, totalNeto } };
}

export function generatePaymentReceipt(clientIdx?: number): { html: string; data: any } {
  const ctx = getContext(clientIdx);
  const amount = rand(5000, 50000);
  const iva = Math.round(amount * 0.16);
  const total = amount + iva;
  const ref = `SPEI-${rand(100000, 999999)}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 40px; }
  h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #000; }
  table { width: 100%; margin: 10px 0; font-size: 11px; }
  td { padding: 4px 8px; }
  .recibo { border: 2px solid #000; padding: 20px; margin-top: 15px; }
</style></head><body>
<div class="recibo">
<h1>RECIBO DE PAGO</h1>
<p style="text-align:center;font-size:11px"><strong>${ctx.companyName}</strong> | RFC: ${ctx.companyTaxId}</p>
<hr>
<table>
  <tr><td><strong>Recibimos de:</strong></td><td>${CLIENT_NAMES[ctx.clientIdx]}</td></tr>
  <tr><td><strong>RFC:</strong></td><td>${RFC_CLIENTS[ctx.clientIdx]}</td></tr>
  <tr><td><strong>Por concepto de:</strong></td><td>Pago de servicios de logística - Factura ${ctx.invoiceNumber}</td></tr>
  <tr><td><strong>Subtotal:</strong></td><td>$${formatCurrency(amount)}</td></tr>
  <tr><td><strong>IVA (16%):</strong></td><td>$${formatCurrency(iva)}</td></tr>
  <tr><td><strong>TOTAL:</strong></td><td><strong>$${formatCurrency(total)}</strong></td></tr>
  <tr><td><strong>Forma de pago:</strong></td><td>Transferencia Electrónica (SPEI)</td></tr>
  <tr><td><strong>Referencia:</strong></td><td>${ref}</td></tr>
  <tr><td><strong>Fecha:</strong></td><td>${new Date().toLocaleDateString('es-MX')}</td></tr>
</table>
<hr>
<p style="text-align:center;font-size:10px;color:#666">Recibo simulado para fines educativos</p>
</div>
</body></html>`;

  return { html, data: { receiptRef: ref, client: CLIENT_NAMES[ctx.clientIdx], amount, iva, total } };
}

export function generateDocument(type: string, clientIdx?: number): { html: string; data: any } {
  switch (type) {
    case 'invoice': return generateInvoice(clientIdx);
    case 'bank_statement': return generateBankStatement();
    case 'payment_receipt': return generatePaymentReceipt(clientIdx);
    case 'trial_balance': return generateTrialBalance();
    case 'payroll': return generatePayroll();
    default: return generateInvoice(clientIdx);
  }
}
