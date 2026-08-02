// ─── Datos Persistentes del Simulador ──────────────────────────
// Datos coherentes que persisten entre llamadas.
// Cada usuario tiene su propia "empresa" con clientes, proveedores e historial.

export interface Company {
  name: string;
  rfc: string;
  address: string;
  phone: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  rfc: string;
  contact: string;
  email: string;
  phone: string;
  creditLimit: number;
  paymentTerms: string; // 'Contado', '15 días', '30 días', '60 días'
  status: 'activo' | 'inactivo';
  totalPurchases: number;
  outstandingBalance: number;
  invoicesCount: number;
  lastTransaction: string;
}

export interface Supplier {
  id: string;
  name: string;
  rfc: string;
  contact: string;
  email: string;
  phone: string;
  paymentTerms: string;
  status: 'activo' | 'inactivo';
  totalPurchases: number;
  outstandingBalance: number;
  invoicesCount: number;
  lastTransaction: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  ivaRate: number;
  category: string;
  active: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'supplier_invoice' | 'credit_note' | 'payroll';
  clientId?: string;
  supplierId?: string;
  invoiceNumber?: string;
  amount: number;
  status: 'completada' | 'pendiente' | 'cancelada';
  description: string;
}

// ─── Seed Data ────────────────────────────────────────────────

const COMPANY: Company = {
  name: 'Logística del Norte S.A. de C.V.',
  rfc: 'LNO-080515-TYU',
  address: 'Av. Industrial 1250, Parque Industrial Santa Teresa, C.P. 32575, Ciudad Juárez, Chihuahua',
  phone: '(656) 123-4567',
  email: 'contabilidad@logisticadelnorte.com.mx',
};

const CLIENTS: Client[] = [
  { id: 'c1', name: 'Comercial del Norte S.A.', rfc: 'CNS-990101-HIJ', contact: 'Ing. Roberto Méndez', email: 'rmendez@comercialnorte.com', phone: '(656) 234-5678', creditLimit: 500000, paymentTerms: '30 días', status: 'activo', totalPurchases: 456000, outstandingBalance: 125000, invoicesCount: 8, lastTransaction: '2026-07-28' },
  { id: 'c2', name: 'Transportes Rápidos S.A.', rfc: 'TRA-880202-KLM', contact: 'Lic. María Fernández', email: 'mfernandez@transportesrapidos.com', phone: '(656) 345-6789', creditLimit: 300000, paymentTerms: '15 días', status: 'activo', totalPurchases: 289000, outstandingBalance: 45000, invoicesCount: 12, lastTransaction: '2026-07-25' },
  { id: 'c3', name: 'Almacenes del Bajío S.P.R.', rfc: 'ALB-770303-NOP', contact: 'C.P. Ana García', email: 'agarcia@almacenesbajio.com', phone: '(656) 456-7890', creditLimit: 200000, paymentTerms: 'Contado', status: 'activo', totalPurchases: 178000, outstandingBalance: 0, invoicesCount: 15, lastTransaction: '2026-07-30' },
  { id: 'c4', name: 'Inversiones del Valle S.A.', rfc: 'INV-660404-QRS', contact: 'Ing. Carlos López', email: 'clopez@inversionesvalle.com', phone: '(656) 567-8901', creditLimit: 750000, paymentTerms: '60 días', status: 'activo', totalPurchases: 892000, outstandingBalance: 210000, invoicesCount: 5, lastTransaction: '2026-07-20' },
  { id: 'c5', name: 'Corporativo Trust S.A.', rfc: 'CTR-550505-TUV', contact: 'Lic. Fernando Ruiz', email: 'fruiz@corporativotrust.com', phone: '(656) 678-9012', creditLimit: 1000000, paymentTerms: '30 días', status: 'activo', totalPurchases: 1250000, outstandingBalance: 350000, invoicesCount: 3, lastTransaction: '2026-07-15' },
];

const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Transportes Express S.A.', rfc: 'TEX-920101-ABC', contact: 'Ing. Javier Morales', email: 'jmorales@transportesexpress.com', phone: '(656) 111-2233', paymentTerms: '30 días', status: 'activo', totalPurchases: 345000, outstandingBalance: 85000, invoicesCount: 6, lastTransaction: '2026-07-28' },
  { id: 's2', name: 'Papelería del Norte', rfc: 'PAN-850202-DEF', contact: 'Lic. Patricia Herrera', email: 'pherrera@papelerianorte.com', phone: '(656) 222-3344', paymentTerms: 'Contado', status: 'activo', totalPurchases: 45000, outstandingBalance: 0, invoicesCount: 18, lastTransaction: '2026-07-30' },
  { id: 's3', name: 'Servicios Tech MX', rfc: 'STM-900303-GHI', contact: 'Ing. Miguel Sánchez', email: 'msanchez@servicostech.mx', phone: '(656) 333-4455', paymentTerms: '15 días', status: 'activo', totalPurchases: 128000, outstandingBalance: 32000, invoicesCount: 9, lastTransaction: '2026-07-25' },
  { id: 's4', name: 'Combustibles del Bajío', rfc: 'CDB-780404-JKL', contact: 'Lic. Roberto Díaz', email: 'rdiaz@combustiblesbajio.com', phone: '(656) 444-5566', paymentTerms: 'Contado', status: 'activo', totalPurchases: 280000, outstandingBalance: 0, invoicesCount: 24, lastTransaction: '2026-07-31' },
];

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Flete nacional express', unit: 'viaje', price: 8500, ivaRate: 0.16, category: 'Transporte', active: true },
  { id: 'p2', name: 'Almacenaje temporal', unit: 'm2', price: 320, ivaRate: 0.16, category: 'Almacenamiento', active: true },
  { id: 'p3', name: 'Manejo de carga especializada', unit: 'ton', price: 12500, ivaRate: 0.16, category: 'Transporte', active: true },
  { id: 'p4', name: 'Servicio de consolidación', unit: 'hora', price: 1800, ivaRate: 0.16, category: 'Almacenamiento', active: true },
  { id: 'p5', name: 'Transporte internacional', unit: 'contenedor', price: 28500, ivaRate: 0.16, category: 'Transporte', active: true },
  { id: 'p6', name: 'Seguro de carga', unit: '%', price: 2.5, ivaRate: 0.16, category: 'Servicios', active: true },
  { id: 'p7', name: 'Distribución local', unit: 'ruta', price: 4500, ivaRate: 0.16, category: 'Transporte', active: true },
  { id: 'p8', name: 'Cross-docking', unit: 'operación', price: 6500, ivaRate: 0.16, category: 'Almacenamiento', active: true },
];

// ─── In-memory store por usuario ──────────────────────────────
interface UserData {
  company: Company;
  clients: Client[];
  suppliers: Supplier[];
  products: Product[];
  transactions: Transaction[];
  invoiceCounter: number;
}

const userStore = new Map<string, UserData>();

function getUserData(userId: string): UserData {
  if (!userStore.has(userId)) {
    userStore.set(userId, {
      company: { ...COMPANY },
      clients: CLIENTS.map(c => ({ ...c })),
      suppliers: SUPPLIERS.map(s => ({ ...s })),
      products: PRODUCTS.map(p => ({ ...p })),
      transactions: [],
      invoiceCounter: 100,
    });
  }
  return userStore.get(userId)!;
}

// ─── API pública ──────────────────────────────────────────────

export function getCompany(userId: string): Company {
  return getUserData(userId).company;
}

export function getClients(userId: string): Client[] {
  return getUserData(userId).clients.filter(c => c.status === 'activo');
}

export function getClient(userId: string, clientId: string): Client | undefined {
  return getUserData(userId).clients.find(c => c.id === clientId);
}

export function getSuppliers(userId: string): Supplier[] {
  return getUserData(userId).suppliers.filter(s => s.status === 'activo');
}

export function getSupplier(userId: string, supplierId: string): Supplier | undefined {
  return getUserData(userId).suppliers.find(s => s.id === supplierId);
}

export function getProducts(userId: string): Product[] {
  return getUserData(userId).products.filter(p => p.active);
}

export function getProduct(userId: string, productId: string): Product | undefined {
  return getUserData(userId).products.find(p => p.id === productId);
}

export function getTransactions(userId: string): Transaction[] {
  return getUserData(userId).transactions;
}

export function getTransactionsByClient(userId: string, clientId: string): Transaction[] {
  return getUserData(userId).transactions.filter(t => t.clientId === clientId);
}

export function getNextInvoiceNumber(userId: string): string {
  const data = getUserData(userId);
  data.invoiceCounter++;
  return `FAC-2026-${String(data.invoiceCounter).padStart(3, '0')}`;
}

export function addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Transaction {
  const data = getUserData(userId);
  const newTx: Transaction = {
    ...transaction,
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  data.transactions.push(newTx);
  return newTx;
}

export function updateClientBalance(userId: string, clientId: string, amount: number, operation: 'debit' | 'credit'): void {
  const data = getUserData(userId);
  const client = data.clients.find(c => c.id === clientId);
  if (!client) return;
  if (operation === 'debit') {
    client.outstandingBalance += amount;
  } else {
    client.outstandingBalance = Math.max(0, client.outstandingBalance - amount);
  }
}

export function updateSupplierBalance(userId: string, supplierId: string, amount: number, operation: 'debit' | 'credit'): void {
  const data = getUserData(userId);
  const supplier = data.suppliers.find(s => s.id === supplierId);
  if (!supplier) return;
  if (operation === 'debit') {
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);
  } else {
    supplier.outstandingBalance += amount;
  }
}

// ─── Helpers para workflows ───────────────────────────────────

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickClient(userId: string): Client {
  return pickRandom(getClients(userId));
}

export function pickSupplier(userId: string): Supplier {
  return pickRandom(getSuppliers(userId));
}

export function pickProduct(userId: string): Product {
  return pickRandom(getProducts(userId).filter(p => p.name !== 'Seguro de carga'));
}
