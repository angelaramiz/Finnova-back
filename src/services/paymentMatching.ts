// ─── Matching de Pagos con Facturas ─────────────────────────────
// Empareja pagos recibidos con facturas pendientes por cobrar.

export interface Invoice {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate: string;
}

export interface Payment {
  id: string;
  clientName: string;
  amount: number;
  date: string;
  reference: string;
  invoiceNumber?: string;
}

export interface MatchSuggestion {
  invoice: Invoice;
  matchScore: number;      // 0-100 — 100 = match perfecto
  matchReason: string[];   // Razones del match
}

// In-memory store de facturas pendientes por usuario
const invoiceStore = new Map<string, Invoice[]>();

// Seed inicial
function getInvoices(userId: string): Invoice[] {
  if (!invoiceStore.has(userId)) {
    invoiceStore.set(userId, [
      { invoiceNumber: 'FAC-001', clientName: 'TechCorp SA', amount: 45600, status: 'pending', dueDate: '2026-08-15' },
      { invoiceNumber: 'FAC-002', clientName: 'Distribuidora Luna', amount: 12800, status: 'pending', dueDate: '2026-08-10' },
      { invoiceNumber: 'FAC-003', clientName: 'Constructora del Norte', amount: 89200, status: 'partial', dueDate: '2026-07-30' },
      { invoiceNumber: 'FAC-004', clientName: 'Comercializadora Valle', amount: 23500, status: 'pending', dueDate: '2026-08-20' },
      { invoiceNumber: 'FAC-005', clientName: 'TechCorp SA', amount: 15000, status: 'paid', dueDate: '2026-07-25' },
    ]);
  }
  return invoiceStore.get(userId)!;
}

// Matching por monto exacto
function matchByAmount(invoices: Invoice[], amount: number): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  for (const inv of invoices) {
    if (inv.status === 'paid') continue;
    const diff = Math.abs(inv.amount - amount);
    if (diff === 0) {
      suggestions.push({ invoice: inv, matchScore: 100, matchReason: ['Monto exacto'] });
    } else if (diff < 100) {
      suggestions.push({ invoice: inv, matchScore: 85, matchReason: ['Monto casi exacto (diferencia < $100)'] });
    }
  }
  return suggestions;
}

// Matching por nombre de cliente
function matchByClient(invoices: Invoice[], clientName: string): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  for (const inv of invoices) {
    if (inv.status === 'paid') continue;
    const invNorm = inv.clientName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const payNorm = clientName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (invNorm.includes(payNorm) || payNorm.includes(invNorm)) {
      suggestions.push({ invoice: inv, matchScore: 70, matchReason: ['Cliente coincide'] });
    }
  }
  return suggestions;
}

// Matching por fecha de vencimiento (facturas vencidas o por vencer pronto)
function matchByDueDate(invoices: Invoice[]): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const today = new Date();
  for (const inv of invoices) {
    if (inv.status === 'paid') continue;
    const due = new Date(inv.dueDate);
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      suggestions.push({ invoice: inv, matchScore: 40, matchReason: ['Factura vencida'] });
    } else if (daysUntil <= 7) {
      suggestions.push({ invoice: inv, matchScore: 50, matchReason: [`Vence en ${daysUntil} días`] });
    }
  }
  return suggestions;
}

// Combinar scores — toma el score más alto de cada razón
function mergeSuggestions(suggestions: MatchSuggestion[]): MatchSuggestion[] {
  const map = new Map<string, MatchSuggestion>();
  for (const s of suggestions) {
    const key = s.invoice.invoiceNumber;
    const existing = map.get(key);
    if (!existing || s.matchScore > existing.matchScore) {
      map.set(key, { ...s, matchReason: s.matchReason });
    } else if (existing) {
      existing.matchReason.push(...s.matchReason);
      existing.matchScore = Math.max(existing.matchScore, s.matchScore);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.matchScore - a.matchScore);
}

// ─── API pública ──────────────────────────────────────────────
export function suggestMatches(userId: string, payment: { clientName: string; amount: number }): MatchSuggestion[] {
  const invoices = getInvoices(userId);
  const byAmount = matchByAmount(invoices, payment.amount);
  const byClient = matchByClient(invoices, payment.clientName);
  const byDate = matchByDueDate(invoices);
  return mergeSuggestions([...byAmount, ...byClient, ...byDate]);
}

export function confirmMatch(userId: string, invoiceNumber: string, paymentId: string): boolean {
  const invoices = getInvoices(userId);
  const idx = invoices.findIndex(i => i.invoiceNumber === invoiceNumber);
  if (idx === -1) return false;
  invoices[idx].status = 'paid';
  return true;
}

export function getPendingInvoices(userId: string): Invoice[] {
  return getInvoices(userId).filter(i => i.status !== 'paid');
}
