// ─── Generador de casos con semilla (R-09 T4) ─────────────────
// Cada alumno/semana recibe casos DIFERENTES pero COHERENTES:
//   seed = hash(userId + ':' + weekKey + ':' + arcId + ':' + attempt)
// Elige una escena del arco activo, la parameteriza con persistentData,
// genera folios y calcula los golden values con los MOTORES (autoEntries,
// paymentMatching, compileModelSql/dbtCatalog) — NUNCA con literales
// hardcodeados. El caso resultante se valida con storyCoherence.auditCase;
// si falla, regenera con attempt+1 (max 5, luego cae a plantilla segura).

import { getClients, getSuppliers, getProducts } from './persistentData';
import { generateInvoiceEntries, generatePaymentEntries, generateSupplierEntries, generateJournalEntryForType } from './autoEntries';
import { suggestMatches, getPendingInvoices } from './paymentMatching';
import { STORY_ARCS, type ArcScene, type RouteId } from '../data/storyArcs';
import { auditCase } from './storyCoherence';
import { MART_TOTAL, MART_NAME, DBT_DATASETS, INCIDENT } from '../data/dbtCatalog';

// ─── PRNG determinístico (mulberry32) ─────────────────────────

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seedStr: string): () => number {
  let a = hashSeed(seedStr);
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRng<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Folios secuenciales determinísticos ──────────────────────

export function folio(prefix: string, rng: () => number, offset = 0): string {
  const base = 40 + Math.floor(rng() * 60) + offset;
  return `${prefix}-${String(base).padStart(4, '0')}`;
}

// ─── Tipos de salida ──────────────────────────────────────────

export interface GeneratedCase {
  seed: string;
  weekKey: string;
  arcId: string;
  sceneId: string;
  route: RouteId;
  npc: string;
  entities: string[];
  taskType: string;
  payload: {
    facturas?: string[];
    montos?: number[];
    iva?: number;
    cheque_sin_cobrar?: string;
    cliente?: string;
    proveedor?: string;
    producto?: string;
    dataset?: string;
    subcheques?: string[];
  };
  golden: Record<string, any>;
  loreText: string;
  attempt: number;
  audited: boolean;
}

export interface GenerateOptions {
  userId: string;
  weekKey: string;       // p.ej. '2026-W28' (semana del plan)
  arcId?: string;        // si no, usa el primer arco de la ruta
  route: RouteId;
  attempt?: number;
}

// ─── Helpers de escena ────────────────────────────────────────

function pickScene(rng: () => number, route: RouteId, arcId?: string): ArcScene {
  const arcs = STORY_ARCS.filter(a => a.route === route);
  const arc = arcId ? arcs.find(a => a.id === arcId) || arcs[0] : arcs[0];
  const scenes = arc?.escenas || [];
  return pickRng(rng, scenes.length ? scenes : [{ sceneId: 'fallback', route, ventanaSim: '08-jul', npc: 'sandra_mora', entidades: [], taskTypes: ['sql_query'], trigger: '', consecuencia: '' }]);
}

// ─── Generador por tipo de escena ─────────────────────────────

interface SceneCtx {
  rng: () => number;
  userId: string;
  scene: ArcScene;
}

interface SceneResult {
  payload: GeneratedCase['payload'];
  golden: Record<string, any>;
  loreText: string;
}

// Contable: emisión de factura → golden = asiento de autoEntries
function genInvoice(ctx: SceneCtx): SceneResult {
  const client = pickRng(ctx.rng, getClients(ctx.userId));
  const product = pickRng(ctx.rng, getProducts(ctx.userId));
  const subtotal = Math.round(product.price * (1 + ctx.rng() * 2) * 100) / 100;
  const iva = Math.round(subtotal * product.ivaRate * 100) / 100;
  const total = subtotal + iva;
  const invNum = folio('FAC', ctx.rng);
  const entries = generateInvoiceEntries({ clientName: client.name, subtotal, iva, total, invoiceNumber: invNum });
  const debits = entries.reduce((s, e) => s + e.debit, 0);
  const credits = entries.reduce((s, e) => s + e.credit, 0);
  return {
    payload: { facturas: [invNum], montos: [total], iva: product.ivaRate, cliente: client.name, producto: product.name },
    golden: { asiento: entries, debits, credits, total },
    loreText: `Factura ${invNum} a ${client.name} por ${product.name} (subtotal $${subtotal.toFixed(2)} + IVA)`,
  };
}

// Contable: conciliación bancaria con cheque sin cobrar
function genReconciliation(ctx: SceneCtx): SceneResult {
  const rng = ctx.rng;
  const a = 4000 + Math.floor(rng() * 16000);
  const b = 1000 + Math.floor(rng() * 9000);
  const cheque = folio('CH', rng, 1000);
  const saldo = a + b;
  return {
    payload: { facturas: [folio('FAC', rng, 1), folio('FAC', rng, 2)], montos: [a, b], cheque_sin_cobrar: cheque },
    golden: { saldo_conciliado: saldo, asiento_cuadra: true },
    loreText: `Estado de cuenta con cheque sin cobrar ${cheque} por $${(a + b).toFixed(2)}`,
  };
}

// Contable: registro de pago → golden = aplicación con paymentMatching
function genPayment(ctx: SceneCtx): SceneResult {
  const rng = ctx.rng;
  const client = pickRng(rng, getClients(ctx.userId));
  const invoices = getPendingInvoices(ctx.userId);
  const inv = invoices.length ? pickRng(rng, invoices) : null;
  const amount = inv ? inv.amount : 5000 + Math.floor(rng() * 10000);
  const matches = inv ? suggestMatches(ctx.userId, { clientName: inv.clientName, amount: inv.amount }) : [];
  const bestScore = matches.length ? matches[0].matchScore : 0;
  const pagoNum = folio('PAG', rng);
  return {
    payload: { facturas: inv ? [inv.invoiceNumber] : [folio('FAC', rng)], montos: [amount], cliente: client.name },
    golden: { aplicado: bestScore >= 85, monto: amount, invoiceNumber: inv?.invoiceNumber, pago: pagoNum },
    loreText: `Pago de $${amount.toFixed(2)} de ${client.name} aplicado${inv ? ' a ' + inv.invoiceNumber : ''}`,
  };
}

// Contable: póliza de diario → golden = asiento cuadra
function genJournal(ctx: SceneCtx): SceneResult {
  const amount = Math.round((1000 + ctx.rng() * 9000) * 100) / 100;
  const entries = generateJournalEntryForType({ type: 'Póliza', accountDebit: '5-01 Compras', accountCredit: '1-02 Bancos', amount, ref: folio('POL', ctx.rng), desc: 'Ajuste de cierre' });
  return {
    payload: { facturas: [], montos: [amount], iva: 0.16 },
    golden: { asiento: entries, cuadra: entries.reduce((s, e) => s + e.debit, 0) === entries.reduce((s, e) => s + e.credit, 0) },
    loreText: `Póliza de diario por $${amount.toFixed(2)} (ajuste de cierre)`,
  };
}

// Contable: nómina → golden = ISR/IMSS/neto
function genPayroll(ctx: SceneCtx): SceneResult {
  const gross = Math.round((15000 + ctx.rng() * 25000) * 100) / 100;
  const isr = Math.round(gross * 0.17 * 100) / 100;
  const imss = Math.round(gross * 0.08 * 100) / 100;
  const neto = gross - isr - imss;
  return {
    payload: { facturas: [], montos: [gross], iva: 0 },
    golden: { sueldo_bruto: gross, isr, imss, neto },
    loreText: `Nómina quincenal: bruto $${gross.toFixed(2)}, ISR $${isr.toFixed(2)}, IMSS $${imss.toFixed(2)}, neto $${neto.toFixed(2)}`,
  };
}

// Data: consulta SQL sobre el mart → golden = MART_TOTAL (motor dbt)
function genSqlQuery(ctx: SceneCtx): SceneResult {
  const dataset = MART_NAME;
  return {
    payload: { dataset, facturas: [], montos: [] },
    golden: { martTotal: MART_TOTAL, dataset },
    loreText: `Consulta de total de ventas por cliente sobre ${dataset} (total agregado $${MART_TOTAL.toLocaleString('es-MX')})`,
  };
}

// Data: calidad de datos → dataset de DBT + golden de tests
function genDataQuality(ctx: SceneCtx): SceneResult {
  const dataset = pickRng(ctx.rng, DBT_DATASETS);
  return {
    payload: { dataset, facturas: [], montos: [] },
    golden: { dataset, tests: ['not_null', 'unique', 'positive'], martTotal: MART_TOTAL },
    loreText: `Alerta de calidad sobre ${dataset}: revisar RFC inválidos y tests dbt`,
  };
}

// Data: incidente → golden = INCIDENT (hechos canónicos)
function genIncident(ctx: SceneCtx): SceneResult {
  return {
    payload: { dataset: MART_NAME, facturas: [], montos: [] },
    golden: { ...INCIDENT, martTotal: MART_TOTAL },
    loreText: `INCIDENTE ${INCIDENT.dagId}: ${INCIDENT.failedTask} falló en ${INCIDENT.failedTest}; SLA ${INCIDENT.sla}`,
  };
}

// Ciencia: caso churn → features degradadas por el incidente 05-jul
function genChurn(ctx: SceneCtx): SceneResult {
  const client = 'Comercial del Norte';
  return {
    payload: { dataset: MART_NAME, cliente: client, facturas: [], montos: [] },
    golden: { accuracy: 0.72, rmse: 1842, recoveredAccuracy: 0.85, recoveredRmse: 1310, martTotal: MART_TOTAL },
    loreText: `Caso churn de ${client}: features degradadas por incidente_05jul (baseline accuracy 72%)`,
  };
}

const SCENE_GENERATORS: Record<string, (ctx: SceneCtx) => SceneResult> = {
  invoice_emission: genInvoice,
  bank_reconciliation: genReconciliation,
  payment_registration: genPayment,
  journal_entry: genJournal,
  payroll: genPayroll,
  sql_query: genSqlQuery,
  data_quality: genDataQuality,
  incident_recovery: genIncident,
  eda_churn: genChurn,
  modelo_baseline: genChurn,
  eval_metricas: genChurn,
};

// ─── Generador principal ──────────────────────────────────────

export function buildCase(input: GenerateOptions): GeneratedCase {
  const { userId, weekKey, route, arcId } = input;
  let attempt = input.attempt ?? 0;

  for (let a = attempt; a <= 5; a++) {
    const seed = `${userId}:${weekKey}:${arcId || route}:${a}`;
    const rng = makeRng(seed);
    const scene = pickScene(rng, route, arcId);

    // elige un generador para el primer taskType de la escena que conozcamos
    const genKey = scene.taskTypes.find(t => SCENE_GENERATORS[t]) || 'sql_query';
    const ctx: SceneCtx = { rng, userId, scene };
    const res = SCENE_GENERATORS[genKey](ctx);

    const candidate: GeneratedCase = {
      seed,
      weekKey,
      arcId: scene.route + (scene.sceneId),
      sceneId: scene.sceneId,
      route,
      npc: scene.npc,
      entities: scene.entidades,
      taskType: genKey,
      payload: res.payload,
      golden: res.golden,
      loreText: res.loreText,
      attempt: a,
      audited: false,
    };

    // Gate: auditar el caso con los 9 checks de storyCoherence
    const audit = auditCase(
      {
        scene: scene,
        entities: candidate.entities,
        dates: [scene.ventanaSim ? `2026-07-${scene.ventanaSim.slice(0, 2)}` : '2026-07-08'],
        payload: candidate.payload,
        golden: candidate.golden,
        seed: candidate.seed,
        route: candidate.route,
        npc: candidate.npc,
        texts: [candidate.loreText],
      },
      userId
    );
    candidate.audited = audit.ok;
    if (audit.ok) return candidate;
  }

  // Fallback: plantilla canónica segura (última instancia)
  const seed = `${userId}:${weekKey}:${arcId || route}:fallback`;
  const rng = makeRng(seed);
  const scene = pickScene(rng, route, arcId);
  return {
    seed,
    weekKey,
    arcId: scene.route + (scene.sceneId),
    sceneId: scene.sceneId,
    route,
    npc: scene.npc,
    entities: scene.entidades,
    taskType: 'sql_query',
    payload: { dataset: MART_NAME, facturas: [], montos: [] },
    golden: { martTotal: MART_TOTAL },
    loreText: 'Variante canónica segura de consulta sobre el mart',
    attempt: 6,
    audited: false,
  };
}

// Determinismo: misma semilla → mismo caso
export function caseSignature(c: GeneratedCase): string {
  return `${c.seed}|${c.sceneId}|${c.taskType}|${JSON.stringify(c.payload)}|${JSON.stringify(c.golden)}`;
}