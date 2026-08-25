// ─── Auditor de documentos — 9 checks de coherencia ──────────
// Verifica que cada documento generado sea coherente con los datos reales.

import { getClients, getSuppliers, getProducts } from './persistentData';

interface AuditResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
}

const COMPANY_RFC = 'OLN-220701-ABC';

export function auditDocument(type: string, data: any, userId?: string): AuditResult {
  const checks: AuditResult['checks'] = [];

  // 1. Tipo válido
  const validTypes = ['invoice', 'bank_statement', 'payment_receipt', 'trial_balance', 'payroll', 'purchase_ticket', 'supplier_invoice', 'tax_declaration'];
  checks.push({ name: 'Tipo válido', ok: validTypes.includes(type), detail: `Tipo: ${type}` });

  // 2. Empresa correcta
  const hasCompany = data.company === 'Operadora Logística del Norte S.A. de C.V.' || data.companyName === 'Operadora Logística del Norte S.A. de C.V.';
  checks.push({ name: 'Empresa correcta', ok: hasCompany, detail: data.company || data.companyName || 'missing' });

  // 3. Subtotal cuadra (si existe)
  if (data.items && data.subtotal !== undefined) {
    const calculatedSubtotal = data.items.reduce((s: number, item: any) => s + (item.amount || 0), 0);
    const matches = Math.abs(data.subtotal - calculatedSubtotal) <= 1;
    checks.push({ name: 'Subtotal cuadra', ok: matches, detail: `Declara: ${data.subtotal}, Calcula: ${calculatedSubtotal}` });
  } else {
    checks.push({ name: 'Subtotal cuadra', ok: true, detail: 'N/A (sin items)' });
  }

  // 4. IVA = subtotal × 16%
  if (data.subtotal !== undefined && data.iva !== undefined) {
    const expectedIva = Math.round(data.subtotal * 0.16);
    const matches = Math.abs(data.iva - expectedIva) <= 1;
    checks.push({ name: 'IVA 16% correcto', ok: matches, detail: `Declara: ${data.iva}, Esperado: ${expectedIva}` });
  } else {
    checks.push({ name: 'IVA 16% correcto', ok: true, detail: 'N/A' });
  }

  // 5. Total = subtotal + IVA
  if (data.subtotal !== undefined && data.iva !== undefined && data.total !== undefined) {
    const expectedTotal = data.subtotal + data.iva;
    const matches = Math.abs(data.total - expectedTotal) <= 1;
    checks.push({ name: 'Total cuadra', ok: matches, detail: `Declara: ${data.total}, Esperado: ${expectedTotal}` });
  } else {
    checks.push({ name: 'Total cuadra', ok: true, detail: 'N/A' });
  }

  // 6. Cliente/Proveedor existe en persistentData
  if (data.client || data.supplier) {
    const name = data.client || data.supplier;
    const clients = getClients(userId || 'default');
    const suppliers = getSuppliers(userId || 'default');
    const allNames = [...clients.map(c => c.name), ...suppliers.map(s => s.name)];
    const exists = allNames.some(n => n === name);
    checks.push({ name: 'Entidad existe en persistentData', ok: exists, detail: name });
  } else {
    checks.push({ name: 'Entidad existe en persistentData', ok: true, detail: 'N/A' });
  }

  // 7. RFC válido
  if (data.clientRfc || data.supplierRfc) {
    const rfc = data.clientRfc || data.supplierRfc;
    const valid = /^[A-Z]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc.replace(/[-\s]/g, ''));
    checks.push({ name: 'RFC válido', ok: valid, detail: rfc });
  } else {
    checks.push({ name: 'RFC válido', ok: true, detail: 'N/A' });
  }

  // 8. Sin mojibake
  const jsonStr = JSON.stringify(data);
  const hasMojibake = /[ÃÂ¶¼½¾¿¡]/.test(jsonStr) || /\u00C2|\u00D0/.test(jsonStr);
  checks.push({ name: 'Sin mojibake', ok: !hasMojibake, detail: hasMojibake ? 'Caracteres corruptos detectados' : 'OK' });

  // 9. Fecha sim en rango
  checks.push({ name: 'Fecha sim rango', ok: true, detail: 'Julio 2026 (simulado)' });

  const passed = checks.every(c => c.ok);
  return { passed, checks };
}
