// ─── Catálogo SAT operativo (Anexo 24 RMF 2026) ─────────────────────
// Subconjunto real del DOF 13-ene-2026: solo las cuentas que aparecen en los
// Excels del curso + las de uso diario. Cada cuenta trae su naturaleza (D/H)
// y rubro; las equivalencias ligan la cuenta INTERNA del contribuyente
// (ej. 601-83) con el código AGRUPADOR SAT (ej. 601.45), como exige la
// sección A del Anexo 24. Cero LLM: todo es dato del DOF.

export interface SatCuenta {
  agrupador: string;   // ej. '601.45'
  nombre: string;      // nombre oficial DOF
  rubro: string;       // ej. 'Gastos generales'
  tipo: 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Costo' | 'Gasto' | 'Orden';
  naturaleza: 'D' | 'H';
  nivel: 1 | 2;
}

export const SAT_CUENTAS: SatCuenta[] = [
  // — Activo: bancos e IVA —
  { agrupador: '102.01', nombre: 'Bancos nacionales', rubro: 'Bancos', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  { agrupador: '105.01', nombre: 'Clientes nacionales', rubro: 'Clientes', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  { agrupador: '118.01', nombre: 'IVA acreditable pagado', rubro: 'Impuestos acreditables pagados', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  { agrupador: '119.01', nombre: 'IVA pendiente de pago', rubro: 'Impuestos acreditables por pagar', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  { agrupador: '113.01', nombre: 'IVA a favor', rubro: 'Impuestos a favor', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  { agrupador: '114.01', nombre: 'Pagos provisionales de ISR', rubro: 'Pagos provisionales', tipo: 'Activo', naturaleza: 'D', nivel: 2 },
  // — Pasivo: proveedores, trasladados, retenidos —
  { agrupador: '201.01', nombre: 'Proveedores nacionales', rubro: 'Proveedores', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '207.01', nombre: 'IVA trasladado', rubro: 'Impuestos trasladados', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '208.01', nombre: 'IVA trasladado cobrado', rubro: 'Impuestos trasladados cobrados', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '209.01', nombre: 'IVA trasladado no cobrado', rubro: 'Impuestos trasladados no cobrados', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '213.01', nombre: 'IVA por pagar', rubro: 'Impuestos y derechos por pagar', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '213.03', nombre: 'ISR por pagar', rubro: 'Impuestos y derechos por pagar', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '216.01', nombre: 'Impuestos retenidos de ISR por sueldos y salarios', rubro: 'Impuestos retenidos', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '216.03', nombre: 'Impuestos retenidos de ISR por arrendamiento', rubro: 'Impuestos retenidos', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '216.04', nombre: 'Impuestos retenidos de ISR por servicios profesionales', rubro: 'Impuestos retenidos', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '216.10', nombre: 'Impuestos retenidos de IVA', rubro: 'Impuestos retenidos', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '216.11', nombre: 'Retenciones de IMSS a los trabajadores', rubro: 'Impuestos retenidos', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  { agrupador: '210.01', nombre: 'Provisión de sueldos y salarios por pagar', rubro: 'Provisión de sueldos y salarios por pagar', tipo: 'Pasivo', naturaleza: 'H', nivel: 2 },
  // — Capital e ingresos —
  { agrupador: '301.01', nombre: 'Capital fijo', rubro: 'Capital social', tipo: 'Capital', naturaleza: 'H', nivel: 2 },
  { agrupador: '401.01', nombre: 'Ventas y/o servicios gravados a la tasa general', rubro: 'Ingresos', tipo: 'Ingreso', naturaleza: 'H', nivel: 2 },
  { agrupador: '401.22', nombre: 'Ingresos por arrendamiento', rubro: 'Ingresos', tipo: 'Ingreso', naturaleza: 'H', nivel: 2 },
  // — Costos y gastos del curso —
  { agrupador: '502.01', nombre: 'Compras nacionales', rubro: 'Compras', tipo: 'Costo', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.45', nombre: 'Arrendamiento a personas físicas residentes nacionales', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.46', nombre: 'Arrendamiento a personas morales residentes nacionales', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.48', nombre: 'Combustibles y lubricantes', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.49', nombre: 'Viáticos y gastos de viaje', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.55', nombre: 'Papelería y artículos de oficina', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.56', nombre: 'Mantenimiento y conservación', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.72', nombre: 'Fletes y acarreos', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.83', nombre: 'Gastos no deducibles (sin requisitos fiscales)', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.84', nombre: 'Otros gastos generales', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '601.01', nombre: 'Sueldos y salarios', rubro: 'Gastos generales', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '603.01', nombre: 'Sueldos y salarios', rubro: 'Gastos de administración', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '603.82', nombre: 'Otros gastos de administración', rubro: 'Gastos de administración', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '701.10', nombre: 'Comisiones bancarias', rubro: 'Gastos financieros', tipo: 'Gasto', naturaleza: 'D', nivel: 2 },
  { agrupador: '899.01', nombre: 'Otras cuentas de orden', rubro: 'Otras cuentas de orden', tipo: 'Orden', naturaleza: 'D', nivel: 2 },
];

export interface Equivalencia {
  cuentaInterna: string;  // catálogo del contribuyente (sección A: Número de Cuenta)
  agrupador: string;      // código agrupador SAT (sección A: Código Agrupador)
}

// Caso real del curso: la póliza Contalink usa 601-83 / 102-01-002 / 216-03
// para la misma operación que el Excel registra como 601.45 / 102.01 / 216.03.
export const EQUIVALENCIAS: Equivalencia[] = [
  { cuentaInterna: '601-83', agrupador: '601.45' },
  { cuentaInterna: '102-01-002', agrupador: '102.01' },
  { cuentaInterna: '102-01-001', agrupador: '102.01' },
  { cuentaInterna: '102-01', agrupador: '102.01' },
  { cuentaInterna: '216-03', agrupador: '216.03' },
  { cuentaInterna: '211-01', agrupador: '216.01' },
  { cuentaInterna: '501-01', agrupador: '601.01' },
  { cuentaInterna: '899-04', agrupador: '899.01' },
  { cuentaInterna: '899', agrupador: '899.01' },
  { cuentaInterna: '113', agrupador: '113.01' },
  { cuentaInterna: '118', agrupador: '118.01' },
  { cuentaInterna: '118-01', agrupador: '118.01' },
  { cuentaInterna: '119', agrupador: '119.01' },
  { cuentaInterna: '119-01', agrupador: '119.01' },
  { cuentaInterna: '201-01', agrupador: '201.01' },
  { cuentaInterna: '207', agrupador: '207.01' },
  { cuentaInterna: '208', agrupador: '208.01' },
  { cuentaInterna: '208-01', agrupador: '208.01' },
  { cuentaInterna: '209', agrupador: '209.01' },
  { cuentaInterna: '213', agrupador: '213.01' },
  { cuentaInterna: '216', agrupador: '216.10' },
  { cuentaInterna: '216-10', agrupador: '216.10' },
  // Catálogo interno del simulador (chartOfAccounts) → agrupador SAT
  { cuentaInterna: '1-02', agrupador: '102.01' },
  { cuentaInterna: '1-03', agrupador: '105.01' },
  { cuentaInterna: '1-06', agrupador: '118.01' },
  { cuentaInterna: '2-01', agrupador: '201.01' },
  { cuentaInterna: '2-03', agrupador: '213.01' },
  { cuentaInterna: '2-04', agrupador: '213.03' },
  { cuentaInterna: '2-08', agrupador: '216.11' },
  { cuentaInterna: '4-01', agrupador: '401.01' },
  { cuentaInterna: '5-01', agrupador: '502.01' },
  { cuentaInterna: '5-03', agrupador: '603.82' },
  { cuentaInterna: '5-04', agrupador: '603.01' },
  { cuentaInterna: '5-08', agrupador: '601.83' },
];

export interface BancoSat { clave: string; corto: string; nombre: string; }
// Subconjunto del catálogo G usado en el curso (021 HSBC sale en la póliza).
export const BANCOS_SAT: BancoSat[] = [
  { clave: '002', corto: 'BANAMEX', nombre: 'Banco Nacional de México' },
  { clave: '012', corto: 'BBVA BANCOMER', nombre: 'BBVA Bancomer' },
  { clave: '014', corto: 'SANTANDER', nombre: 'Banco Santander (México)' },
  { clave: '021', corto: 'HSBC', nombre: 'HSBC México' },
  { clave: '030', corto: 'BAJIO', nombre: 'Banco del Bajío' },
  { clave: '072', corto: 'BANORTE', nombre: 'Banco Mercantil del Norte' },
];

export interface MonedaSat { codigo: string; nombre: string; }
export const MONEDAS_SAT: MonedaSat[] = [
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
];

export interface MetodoPagoSat { clave: string; concepto: string; }
// Catálogo H del Anexo 24.
export const METODOS_PAGO_SAT: MetodoPagoSat[] = [
  { clave: '01', concepto: 'Efectivo' },
  { clave: '02', concepto: 'Cheque' },
  { clave: '03', concepto: 'Transferencia' },
  { clave: '04', concepto: 'Tarjetas de crédito' },
  { clave: '98', concepto: 'NA' },
  { clave: '99', concepto: 'Otros' },
];

// ─── Reglas producto → agrupador (del EDO DE CUENTA / CFDI del curso) ────
export interface ReglaClasificacion { patron: RegExp; agrupador: string; nota: string; }
export const REGLAS_CLASIFICACION: ReglaClasificacion[] = [
  { patron: /arrendamiento/i, agrupador: '601.45', nota: 'Arrendamiento a PF (verificar emisor persona física)' },
  { patron: /renta\s*local|bodega/i, agrupador: '601.46', nota: 'Arrendamiento a PM por preponderancia' },
  { patron: /gas\s*l\.?p\.?|combustible|litros\s*de\s*gas/i, agrupador: '601.48', nota: 'Combustibles y lubricantes' },
  { patron: /filtro|mantenimiento|cartucho/i, agrupador: '601.56', nota: 'Mantenimiento y conservación' },
  { patron: /papeler[ií]a|art[ií]culos?\s*de\s*oficina/i, agrupador: '601.55', nota: 'Papelería y artículos de oficina' },
  { patron: /flete|acarreo/i, agrupador: '601.72', nota: 'Fletes y acarreos' },
  { patron: /vi[aá]ticos?|viaje|hospedaje/i, agrupador: '601.49', nota: 'Viáticos y gastos de viaje' },
  { patron: /comisi[oó]n\s*bancaria/i, agrupador: '701.10', nota: 'Comisiones bancarias' },
  { patron: /ventas?\s*y\/o\s*servicios?\s*gravados?|ingresos?\s*por\s*ventas?/i, agrupador: '401.01', nota: 'Ventas a tasa general (ingreso, naturaleza acreedora)' },
  { patron: /aportaci[oó]n|ampliaci[oó]n\s*de\s*capital|capital\s*fijo/i, agrupador: '301.01', nota: 'Aportación de capital (naturaleza acreedora)' },
];

// ─── API ─────────────────────────────────────────────────────────────
export function getSatCuenta(agrupador: string): SatCuenta | undefined {
  return SAT_CUENTAS.find(c => c.agrupador === agrupador);
}

/** Normaliza '601-83', '601_83', '601 83' → '601.83' para comparar. */
export function normalizarCuenta(cuenta: string): string {
  return cuenta.trim().replace(/[-_\s]+/g, '.');
}

/** Resuelve cuenta interna → agrupador SAT (acepta ambos formatos). */
export function resolverAgrupador(cuenta: string): string | null {
  const norm = normalizarCuenta(cuenta);
  const eq = EQUIVALENCIAS.find(e => normalizarCuenta(e.cuentaInterna) === norm);
  if (eq) return eq.agrupador;
  if (SAT_CUENTAS.some(c => c.agrupador === norm)) return norm;
  return null;
}

export function clasificarProducto(producto: string): { agrupador: string; nota: string } | null {
  for (const r of REGLAS_CLASIFICACION) {
    if (r.patron.test(producto)) return { agrupador: r.agrupador, nota: r.nota };
  }
  return null;
}

// ─── Auditoría del catálogo ──────────────────────────────────────────
export interface SatIssue { codigo: string; ok: boolean; error?: string; }

export function auditSatCatalog(): SatIssue[] {
  const issues: SatIssue[] = [];
  for (const c of SAT_CUENTAS) {
    if (!/^\d{3}\.\d{2}$/.test(c.agrupador)) {
      issues.push({ codigo: c.agrupador, ok: false, error: 'formato agrupador inválido (debe ser 000.00)' });
    }
  }
  const vistos = new Set<string>();
  for (const c of SAT_CUENTAS) {
    if (vistos.has(c.agrupador)) issues.push({ codigo: c.agrupador, ok: false, error: 'agrupador duplicado' });
    vistos.add(c.agrupador);
  }
  for (const e of EQUIVALENCIAS) {
    if (!SAT_CUENTAS.some(c => c.agrupador === e.agrupador)) {
      issues.push({ codigo: e.cuentaInterna, ok: false, error: `equivalencia apunta a agrupador inexistente ${e.agrupador}` });
    }
  }
  // Caso real del curso debe resolverse (601-83 → 601.45)
  if (resolverAgrupador('601-83') !== '601.45') issues.push({ codigo: '601-83', ok: false, error: 'caso real del curso no resuelve' });
  if (resolverAgrupador('102-01-002') !== '102.01') issues.push({ codigo: '102-01-002', ok: false, error: 'caso real del curso no resuelve' });
  if (resolverAgrupador('216-03') !== '216.03') issues.push({ codigo: '216-03', ok: false, error: 'caso real del curso no resuelve' });
  return issues;
}
