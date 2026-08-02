// ─── Catálogo de Cuentas Jerárquico ────────────────────────────
// Modelo real mexicano: tipo de cuenta, código, subcuentas, saldos.

export interface Account {
  code: string;          // Ej: '1', '1-01', '1-01-01'
  name: string;
  type: AccountType;     // Activo, Pasivo, Capital, Ingreso, Gasto
  parentCode?: string;   // Código de la cuenta padre
  level: number;         // 1 = raíz, 2 = subcuenta, 3 = sub-subcuenta
  nature: 'D' | 'H';    // Deudora o Acreedora
  balance: number;       // Saldo actual
  isDetail: boolean;     // ¿Se puede Registrar? (hoja del árbol)
  children?: Account[];
}

export type AccountType = 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Gasto';

function n(s: string) { return Number(s); }

// ─── Seed data ────────────────────────────────────────────────
const SEED: Account[] = [
  // ACTIVO
  { code: '1', name: 'ACTIVO', type: 'Activo', level: 1, nature: 'D', balance: 2510000, isDetail: false },
  { code: '1-01', name: 'Caja', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 28500, isDetail: true },
  { code: '1-02', name: 'Bancos', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 248000, isDetail: true },
  { code: '1-03', name: 'Clientes', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 125000, isDetail: true },
  { code: '1-04', name: 'Deudores diversos', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 18000, isDetail: true },
  { code: '1-05', name: 'Inventarios', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 210000, isDetail: true },
  { code: '1-06', name: 'IVA acreditable', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 45000, isDetail: true },
  { code: '1-07', name: 'Terrenos', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 850000, isDetail: true },
  { code: '1-08', name: 'Edificios', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 620000, isDetail: true },
  { code: '1-09', name: 'Maquinaria y equipo', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 280000, isDetail: true },
  { code: '1-10', name: 'Equipo de cómputo', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 55000, isDetail: true },
  { code: '1-11', name: 'Mobiliario y equipo', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 42000, isDetail: true },
  { code: '1-12', name: 'Vehículos', type: 'Activo', parentCode: '1', level: 2, nature: 'D', balance: 220000, isDetail: true },
  { code: '1-13', name: 'Depreciación acumulada', type: 'Activo', parentCode: '1', level: 2, nature: 'H', balance: -185000, isDetail: true },

  // PASIVO
  { code: '2', name: 'PASIVO', type: 'Pasivo', level: 1, nature: 'H', balance: 660000, isDetail: false },
  { code: '2-01', name: 'Proveedores', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 175000, isDetail: true },
  { code: '2-02', name: 'Acreedores diversos', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 32000, isDetail: true },
  { code: '2-03', name: 'IVA por pagar', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 58000, isDetail: true },
  { code: '2-04', name: 'ISR por pagar', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 42000, isDetail: true },
  { code: '2-05', name: 'PTU por pagar', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 18000, isDetail: true },
  { code: '2-06', name: 'Sueldos por pagar', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 85000, isDetail: true },
  { code: '2-07', name: 'Préstamos bancarios', type: 'Pasivo', parentCode: '2', level: 2, nature: 'H', balance: 250000, isDetail: true },

  // CAPITAL
  { code: '3', name: 'CAPITAL', type: 'Capital', level: 1, nature: 'H', balance: 1850000, isDetail: false },
  { code: '3-01', name: 'Capital social', type: 'Capital', parentCode: '3', level: 2, nature: 'H', balance: 1000000, isDetail: true },
  { code: '3-02', name: 'Resultados no distribuidos', type: 'Capital', parentCode: '3', level: 2, nature: 'H', balance: 650000, isDetail: true },
  { code: '3-03', name: 'Utilidad del ejercicio', type: 'Capital', parentCode: '3', level: 2, nature: 'H', balance: 200000, isDetail: true },

  // INGRESO
  { code: '4', name: 'INGRESOS', type: 'Ingreso', level: 1, nature: 'H', balance: 1435500, isDetail: false },
  { code: '4-01', name: 'Ventas', type: 'Ingreso', parentCode: '4', level: 2, nature: 'H', balance: 1120000, isDetail: true },
  { code: '4-02', name: 'Servicios', type: 'Ingreso', parentCode: '4', level: 2, nature: 'H', balance: 205500, isDetail: true },
  { code: '4-03', name: 'Otros ingresos', type: 'Ingreso', parentCode: '4', level: 2, nature: 'H', balance: 110000, isDetail: true },

  // GASTO
  { code: '5', name: 'GASTOS', type: 'Gasto', level: 1, nature: 'D', balance: 1435500, isDetail: false },
  { code: '5-01', name: 'Costo de ventas', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 480000, isDetail: true },
  { code: '5-02', name: 'Gastos de venta', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 185000, isDetail: true },
  { code: '5-03', name: 'Gastos de administración', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 285000, isDetail: true },
  { code: '5-04', name: 'Gastos de nómina', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 320000, isDetail: true },
  { code: '5-05', name: 'Gastos financieros', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 42000, isDetail: true },
  { code: '5-06', name: 'Impuestos y derechos', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 85000, isDetail: true },
  { code: '5-07', name: 'Depreciación', type: 'Gasto', parentCode: '5', level: 2, nature: 'D', balance: 38500, isDetail: true },
];

// In-memory store por usuario
const catalogStore = new Map<string, Account[]>();

function getCatalog(userId: string): Account[] {
  if (!catalogStore.has(userId)) {
    catalogStore.set(userId, JSON.parse(JSON.stringify(SEED)));
  }
  return catalogStore.get(userId)!;
}

// ─── API pública ──────────────────────────────────────────────

export function getChartOfAccounts(userId: string): Account[] {
  return getCatalog(userId);
}

export function getAccountsByType(userId: string, type: AccountType): Account[] {
  return getCatalog(userId).filter(a => a.type === type && a.isDetail);
}

export function updateBalance(userId: string, accountCode: string, amount: number, operation: 'debit' | 'credit'): boolean {
  const catalog = getCatalog(userId);
  const account = catalog.find(a => a.code === accountCode);
  if (!account) return false;

  if (operation === 'debit') {
    account.balance += amount; // Deudoras: aumento en DEBE
  } else {
    account.balance -= amount; // Acreedoras: aumento en HABER
  }

  // Actualizar saldo de cuenta padre
  if (account.parentCode) {
    const parent = catalog.find(a => a.code === account.parentCode);
    if (parent) {
      parent.balance = catalog.filter(a => a.parentCode === parent.code).reduce((s, a) => s + a.balance, 0);
    }
  }

  return true;
}

export function getAccountSummary(userId: string) {
  const catalog = getCatalog(userId);
  const activo = catalog.filter(a => a.type === 'Activo' && a.level === 2).reduce((s, a) => s + Math.abs(a.balance), 0);
  const pasivo = catalog.filter(a => a.type === 'Pasivo' && a.level === 2).reduce((s, a) => s + Math.abs(a.balance), 0);
  const capital = catalog.filter(a => a.type === 'Capital' && a.level === 2).reduce((s, a) => s + Math.abs(a.balance), 0);
  const ingresos = catalog.filter(a => a.type === 'Ingreso' && a.level === 2).reduce((s, a) => s + Math.abs(a.balance), 0);
  const gastos = catalog.filter(a => a.type === 'Gasto' && a.level === 2).reduce((s, a) => s + Math.abs(a.balance), 0);

  return { activo, pasivo, capital, ingresos, gastos, utilidad: ingresos - gastos };
}

export function generateBalanceGeneral(userId: string) {
  const catalog = getCatalog(userId);
  const activos = catalog.filter(a => a.type === 'Activo' && a.level === 2).map(a => ({ code: a.code, name: a.name, balance: Math.abs(a.balance) }));
  const pasivos = catalog.filter(a => a.type === 'Pasivo' && a.level === 2).map(a => ({ code: a.code, name: a.name, balance: Math.abs(a.balance) }));
  const capital = catalog.filter(a => a.type === 'Capital' && a.level === 2).map(a => ({ code: a.code, name: a.name, balance: Math.abs(a.balance) }));

  const totalActivos = activos.reduce((s, a) => s + a.balance, 0);
  const totalPasivos = pasivos.reduce((s, a) => s + a.balance, 0);
  const totalCapital = capital.reduce((s, a) => s + a.balance, 0);

  return { activos, pasivos, capital, totalActivos, totalPasivos, totalCapital, balanced: totalActivos === totalPasivos + totalCapital };
}

export function generateEstadoResultados(userId: string) {
  const catalog = getCatalog(userId);
  const ingresos = catalog.filter(a => a.type === 'Ingreso' && a.level === 2).map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) }));
  const gastos = catalog.filter(a => a.type === 'Gasto' && a.level === 2).map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) }));

  const totalIngresos = ingresos.reduce((s, a) => s + a.amount, 0);
  const totalGastos = gastos.reduce((s, a) => s + a.amount, 0);
  const utilidadBruta = totalIngresos - totalGastos;

  return { ingresos, gastos, totalIngresos, totalGastos, utilidadBruta, utilidadNeta: utilidadBruta };
}

export function generateBalanzaComprobacion(userId: string) {
  const catalog = getCatalog(userId);
  const accounts = catalog.filter(a => a.isDetail).map(a => ({
    code: a.code,
    name: a.name,
    type: a.type,
    nature: a.nature,
    debit: a.nature === 'D' && a.balance > 0 ? a.balance : 0,
    credit: a.nature === 'H' && a.balance > 0 ? Math.abs(a.balance) : 0,
  }));

  const totalDebitos = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCreditos = accounts.reduce((s, a) => s + a.credit, 0);

  return { accounts, totalDebitos, totalCreditos, balanced: Math.abs(totalDebitos - totalCreditos) < 1 };
}
