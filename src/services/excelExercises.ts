// ─── Ejercicios Excel Puros ──────────────────────────────────
// Ejercicios tradicionales de contabilidad usando solo hojas de cálculo.
// Estos son los ejercicios clásicos que se hacían "a mano" antes de los sistemas.

export interface ExcelExercise {
  id: string;
  title: string;
  type: ExerciseType;
  difficulty: number;
  description: string;
  instructions: string[];
  initialData: ExerciseData[];
  solution: ExerciseSolution;
  hints: string[];
  commonErrors: string[];
  timeMinutes: number;
}

export type ExerciseType =
  | 'balanza_comprobacion'     // Balanza de comprobación
  | 'poliza_diario'            // Captura de pólizas
  | 'poliza_diario_multi'      // Pólizas múltiples
  | 'mayor_general'            // Mayor general
  | 'balance_general'          // Balance general
  | 'estado_resultados'        // Estado de resultados
  | 'conciliacion_bancaria'    // Conciliación bancaria
  | 'calculadora_iva'          // Cálculo de IVA
  | 'calculadora_nomina'       // Cálculo de nómina
  | 'depreciacion'             // Depreciación de activos
  | 'cuentas_por_cobrar'       // Edad de saldos por cobrar
  | 'cuentas_por_pagar'        // Edad de saldos por pagar
  | 'diot'                     // Declaración informativa de operaciones con terceros

export interface ExerciseData {
  cell: string;    // Ej: "A1", "B3"
  value: any;
  formula?: string;
  format?: string;
  isInput?: boolean; // true = el alumno debe llenar
}

export interface ExerciseSolution {
  expectedCells: Record<string, any>;
  validationRules: ValidationRule[];
}

interface ValidationRule {
  cell: string;
  type: 'exact' | 'formula' | 'range' | 'balanced';
  expected?: any;
  tolerance?: number;
  label: string;
}

// ─── EJERCICIO 1: Balanza de Comprobación ────────────────────

const BALANZA_COMPROBACION: ExcelExercise = {
  id: 'excel-balanza-001',
  title: 'Balanza de Comprobación — Julio 2026',
  type: 'balanza_comprobacion',
  difficulty: 1,
  description: 'Elabora una balanza de comprobación con los saldos proporcionados. Verifica que DEBE = HABER.',
  instructions: [
    '1. Captura las cuentas en la columna A',
    '2. Ingresa los saldos deudores en columna B',
    '3. Ingresa los saldos acreedores en columna C',
    '4. Calcula los totales al final',
    '5. Verifica que Total DEBE = Total HABER',
  ],
  initialData: [
    { cell: 'A1', value: 'CUENTA', isInput: false },
    { cell: 'B1', value: 'DEBE', isInput: false },
    { cell: 'C1', value: 'HABER', isInput: false },
    { cell: 'A2', value: '1-01 Caja' },
    { cell: 'A3', value: '1-02 Bancos' },
    { cell: 'A4', value: '1-03 Clientes' },
    { cell: 'A5', value: '1-05 Inventarios' },
    { cell: 'A6', value: '1-06 IVA acreditable' },
    { cell: 'A7', value: '2-01 Proveedores' },
    { cell: 'A8', value: '2-03 IVA por pagar' },
    { cell: 'A9', value: '3-01 Capital social' },
    { cell: 'A10', value: '4-01 Ventas' },
    { cell: 'A11', value: '5-01 Costo de ventas' },
    { cell: 'A12', value: '5-03 Gastos de administración' },
    { cell: 'B2', value: 28500, isInput: true },
    { cell: 'B3', value: 248000, isInput: true },
    { cell: 'B4', value: 125000, isInput: true },
    { cell: 'B5', value: 210000, isInput: true },
    { cell: 'B6', value: 45000, isInput: true },
    { cell: 'C7', value: 175000, isInput: true },
    { cell: 'C8', value: 58000, isInput: true },
    { cell: 'C9', value: 1000000, isInput: true },
    { cell: 'C10', value: 980000, isInput: true },
    { cell: 'B11', value: 480000, isInput: true },
    { cell: 'B12', value: 285000, isInput: true },
    { cell: 'A13', value: 'TOTALES' },
    { cell: 'B13', value: '=SUMA(B2:B12)', formula: '=SUMA(B2:B12)' },
    { cell: 'C13', value: '=SUMA(C2:C12)', formula: '=SUMA(C2:C12)' },
  ],
  solution: {
    expectedCells: {
      'B13': 1421500,
      'C13': 1421500,
    },
    validationRules: [
      { cell: 'B13', type: 'exact', expected: 1421500, label: 'Total DEBE' },
      { cell: 'C13', type: 'exact', expected: 1421500, label: 'Total HABER' },
      { cell: 'B13', type: 'balanced', label: 'DEBE = HABER' },
    ],
  },
  hints: ['Recuerda que las cuentas de activo y gasto son DEUDORAS (saldo en DEBE)', 'Las cuentas de pasivo, capital e ingreso son ACREEDORAS (saldo en HABER)'],
  commonErrors: ['Invertir DEBE y HABER', 'Olvidar una cuenta', 'Error en sumas'],
  timeMinutes: 20,
};

// ─── EJERCICIO 2: Póliza de Diario Multiple ──────────────────

const POLIZA_DIARIO_MULTI: ExcelExercise = {
  id: 'excel-poliza-001',
  title: 'Pólizas de Diario — Operaciones de julio',
  type: 'poliza_diario_multi',
  difficulty: 2,
  description: 'Registra las siguientes operaciones en pólizas de diario. Cada operación debe tener DEBE = HABER.',
  instructions: [
    '1. Para cada operación, identifica las cuentas afectadas',
    '2. Registra el DEBE en la columna correspondiente',
    '3. Registra el HABER en la columna correspondiente',
    '4. Verifica que cada póliza cuadre',
  ],
  initialData: [
    { cell: 'A1', value: 'PÓLIZA DE DIARIO — JULIO 2026', isInput: false },
    { cell: 'A3', value: 'Fecha', isInput: false },
    { cell: 'B3', value: 'Cuenta', isInput: false },
    { cell: 'C3', value: 'DEBE', isInput: false },
    { cell: 'D3', value: 'HABER', isInput: false },
    { cell: 'A4', value: '01/07' },
    { cell: 'B4', value: '1-02 Bancos', isInput: true },
    { cell: 'C4', value: 150000, isInput: true },
    { cell: 'B5', value: '4-01 Ventas', isInput: true },
    { cell: 'D5', value: 129310, isInput: true },
    { cell: 'B6', value: '2-03 IVA por pagar', isInput: true },
    { cell: 'D6', value: 20690, isInput: true },
    { cell: 'A8', value: '05/07' },
    { cell: 'B8', value: '5-01 Costo de ventas', isInput: true },
    { cell: 'C8', value: 75000, isInput: true },
    { cell: 'B9', value: '1-05 Inventarios', isInput: true },
    { cell: 'D9', value: 75000, isInput: true },
    { cell: 'A11', value: '10/07' },
    { cell: 'B11', value: '1-03 Clientes', isInput: true },
    { cell: 'C11', value: 85000, isInput: true },
    { cell: 'B12', value: '4-01 Ventas', isInput: true },
    { cell: 'D12', value: 73276, isInput: true },
    { cell: 'B13', value: '2-03 IVA por pagar', isInput: true },
    { cell: 'D13', value: 11724, isInput: true },
  ],
  solution: {
    expectedCells: {
      'C4': 150000,
      'D5': 129310,
      'D6': 20690,
      'C8': 75000,
      'D9': 75000,
      'C11': 85000,
      'D12': 73276,
      'D13': 11724,
    },
    validationRules: [
      { cell: 'C4', type: 'exact', expected: 150000, label: 'Póliza 1 DEBE' },
      { cell: 'D5', type: 'exact', expected: 129310, label: 'Póliza 1 HABER Ventas' },
      { cell: 'D6', type: 'exact', expected: 20690, label: 'Póliza 1 HABER IVA' },
    ],
  },
  hints: [
    'En una venta: DEBE Bancos/Clientes, HABER Ventas + IVA',
    'El IVA es 16% sobre el subtotal',
    'Costo de ventas: DEBE Costo de ventas, HABER Inventarios',
  ],
  commonErrors: ['Error en cálculo de IVA', 'Invertir DEBE y HABER', 'Olvidar el IVA'],
  timeMinutes: 30,
};

// ─── EJERCICIO 3: Estado de Resultados ───────────────────────

const ESTADO_RESULTADOS: ExcelExercise = {
  id: 'excel-er-001',
  title: 'Estado de Resultados — Julio 2026',
  type: 'estado_resultados',
  difficulty: 2,
  description: 'Elabora el Estado de Resultados con los datos de ingresos y gastos del periodo.',
  instructions: [
    '1. Clasifica los ingresos y gastos',
    '2. Calcula la utilidad bruta (Ingresos - Costo de ventas)',
    '3. Calcula la utilidad operativa (Bruta - Gastos de operación)',
    '4. Calcula la utilidad neta (Operativa - Impuestos)',
  ],
  initialData: [
    { cell: 'A1', value: 'ESTADO DE RESULTADOS', isInput: false },
    { cell: 'A2', value: 'Logística del Norte S.A. de C.V.', isInput: false },
    { cell: 'A3', value: 'Periodo: Julio 2026', isInput: false },
    { cell: 'A5', value: 'INGRESOS', isInput: false },
    { cell: 'A6', value: 'Ventas netas', isInput: true },
    { cell: 'B6', value: 980000, isInput: true },
    { cell: 'A7', value: 'Otros ingresos', isInput: true },
    { cell: 'B7', value: 45000, isInput: true },
    { cell: 'A8', value: 'Total ingresos', isInput: false },
    { cell: 'B8', value: '=SUMA(B6:B7)', formula: '=SUMA(B6:B7)' },
    { cell: 'A10', value: 'COSTO DE VENTAS', isInput: false },
    { cell: 'A11', value: 'Costo de mercancía vendida', isInput: true },
    { cell: 'B11', value: 480000, isInput: true },
    { cell: 'A12', value: 'UTILIDAD BRUTA', isInput: false },
    { cell: 'B12', value: '=B8-B11', formula: '=B8-B11' },
    { cell: 'A14', value: 'GASTOS DE OPERACIÓN', isInput: false },
    { cell: 'A15', value: 'Gastos de administración', isInput: true },
    { cell: 'B15', value: 185000, isInput: true },
    { cell: 'A16', value: 'Gastos de venta', isInput: true },
    { cell: 'B16', value: 95000, isInput: true },
    { cell: 'A17', value: 'Total gastos de operación', isInput: false },
    { cell: 'B17', value: '=SUMA(B15:B16)', formula: '=SUMA(B15:B16)' },
    { cell: 'A18', value: 'UTILIDAD OPERATIVA', isInput: false },
    { cell: 'B18', value: '=B12-B17', formula: '=B12-B17' },
    { cell: 'A20', value: 'IMPUESTOS', isInput: false },
    { cell: 'A21', value: 'ISR (30%)', isInput: true },
    { cell: 'B21', value: '=B18*0.3', formula: '=B18*0.3' },
    { cell: 'A22', value: 'PTU (10%)', isInput: true },
    { cell: 'B22', value: '=B18*0.1', formula: '=B18*0.1' },
    { cell: 'A23', value: 'Total impuestos', isInput: false },
    { cell: 'B23', value: '=SUMA(B21:B22)', formula: '=SUMA(B21:B22)' },
    { cell: 'A25', value: 'UTILIDAD NETA', isInput: false },
    { cell: 'B25', value: '=B18-B23', formula: '=B18-B23' },
  ],
  solution: {
    expectedCells: {
      'B8': 1025000,
      'B12': 545000,
      'B17': 280000,
      'B18': 265000,
      'B21': 79500,
      'B22': 26500,
      'B23': 106000,
      'B25': 159000,
    },
    validationRules: [
      { cell: 'B8', type: 'exact', expected: 1025000, label: 'Total ingresos' },
      { cell: 'B12', type: 'exact', expected: 545000, label: 'Utilidad bruta' },
      { cell: 'B18', type: 'exact', expected: 265000, label: 'Utilidad operativa' },
      { cell: 'B25', type: 'exact', expected: 159000, label: 'Utilidad neta' },
    ],
  },
  hints: [
    'Utilidad bruta = Ingresos - Costo de ventas',
    'Utilidad operativa = Bruta - Gastos de operación',
    'ISR = Utilidad operativa × 30%',
    'PTU = Utilidad operativa × 10%',
  ],
  commonErrors: ['Error en clasificación de gastos', 'Cálculo incorrecto de impuestos', 'Olvidar restar el costo de ventas'],
  timeMinutes: 25,
};

// ─── EJERCICIO 4: Conciliación Bancaria ──────────────────────

const CONCILIACION_BANCARIA: ExcelExercise = {
  id: 'excel-conc-001',
  title: 'Conciliación Bancaria — Julio 2026',
  type: 'conciliacion_bancaria',
  difficulty: 2,
  description: 'Elabora la conciliación bancaria comparando el estado de cuenta con el libro mayor.',
  instructions: [
    '1. Ingresa el saldo del estado de cuenta bancario',
    '2. Ingresa el saldo del libro mayor',
    '3. Registra depósitos en tránsito',
    '4. Registra cheques sin cobrar',
    '5. Calcula el saldo conciliado',
  ],
  initialData: [
    { cell: 'A1', value: 'CONCILIACIÓN BANCARIA', isInput: false },
    { cell: 'A2', value: 'Cuenta: ****7890 (Banorte)', isInput: false },
    { cell: 'A3', value: 'Periodo: Julio 2026', isInput: false },
    { cell: 'A5', value: 'SALDO SEGÚN ESTADO DE CUENTA', isInput: false },
    { cell: 'B5', value: 285000, isInput: true },
    { cell: 'A7', value: '(+) Depósitos en tránsito', isInput: false },
    { cell: 'A8', value: 'Depósito 31/07', isInput: true },
    { cell: 'B8', value: 45000, isInput: true },
    { cell: 'A9', value: 'Depósito 30/07', isInput: true },
    { cell: 'B9', value: 28000, isInput: true },
    { cell: 'A11', value: '(-) Cheques sin cobrar', isInput: false },
    { cell: 'A12', value: 'Cheque #1234', isInput: true },
    { cell: 'B12', value: 15000, isInput: true },
    { cell: 'A13', value: 'Cheque #1235', isInput: true },
    { cell: 'B13', value: 8500, isInput: true },
    { cell: 'A15', value: 'SALDO CONCILIADO', isInput: false },
    { cell: 'B15', value: '=B5+SUMA(B8:B9)-SUMA(B12:B13)', formula: '=B5+SUMA(B8:B9)-SUMA(B12:B13)' },
    { cell: 'A17', value: 'SALDO SEGÚN LIBRO MAYOR', isInput: false },
    { cell: 'B17', value: 334500, isInput: true },
    { cell: 'A19', value: 'DIFERENCIA', isInput: false },
    { cell: 'B19', value: '=B15-B17', formula: '=B15-B17' },
  ],
  solution: {
    expectedCells: {
      'B15': 334500,
      'B17': 334500,
      'B19': 0,
    },
    validationRules: [
      { cell: 'B15', type: 'exact', expected: 334500, label: 'Saldo conciliado' },
      { cell: 'B19', type: 'exact', expected: 0, label: 'Diferencia debe ser 0' },
      { cell: 'B19', type: 'balanced', label: 'Conciliación cuadrada' },
    ],
  },
  hints: [
    'Saldo conciliado = Saldo banco + Depósitos en tránsito - Cheques sin cobrar',
    'La diferencia debe ser 0 para que esté conciliado',
  ],
  commonErrors: ['Invertir depósitos y cheques', 'Error en sumas', 'No cuadrar la conciliación'],
  timeMinutes: 20,
};

// ─── EJERCICIO 5: DIOT ──────────────────────────────────────

const DIOT_EJERCICIO: ExcelExercise = {
  id: 'excel-diot-001',
  title: 'DIOT — Declaración Informativa Operaciones con Terceros',
  type: 'diot',
  difficulty: 3,
  description: 'Elabora la DIOT mensual con las operaciones de proveedores del periodo.',
  instructions: [
    '1. Clasifica las operaciones por tipo de proveedor',
    '2. Registra el IVA acreditable de cada operación',
    '3. Calcula el total de operaciones con IVA',
    '4. Verifica que la suma de IVA acreditable sea correcta',
  ],
  initialData: [
    { cell: 'A1', value: 'DIOT — JULIO 2026', isInput: false },
    { cell: 'A2', value: 'RFC: LNO-080515-TYU', isInput: false },
    { cell: 'A4', value: 'RFC Proveedor', isInput: false },
    { cell: 'B4', value: 'Nombre', isInput: false },
    { cell: 'C4', value: 'Tipo', isInput: false },
    { cell: 'D4', value: 'Subtotal', isInput: false },
    { cell: 'E4', value: 'IVA', isInput: false },
    { cell: 'F4', value: 'Total', isInput: false },
    { cell: 'A5', value: 'TEX-920101-ABC', isInput: true },
    { cell: 'B5', value: 'Transportes Express', isInput: true },
    { cell: 'C5', value: 'Nacional', isInput: true },
    { cell: 'D5', value: 85000, isInput: true },
    { cell: 'E5', value: '=D5*0.16', formula: '=D5*0.16' },
    { cell: 'F5', value: '=D5+E5', formula: '=D5+E5' },
    { cell: 'A6', value: 'PAN-850202-DEF', isInput: true },
    { cell: 'B6', value: 'Papelería del Norte', isInput: true },
    { cell: 'C6', value: 'Nacional', isInput: true },
    { cell: 'D6', value: 12000, isInput: true },
    { cell: 'E6', value: '=D6*0.16', formula: '=D6*0.16' },
    { cell: 'F6', value: '=D6+E6', formula: '=D6+E6' },
    { cell: 'A7', value: 'STM-900303-GHI', isInput: true },
    { cell: 'B7', value: 'Servicios Tech MX', isInput: true },
    { cell: 'C7', value: 'Nacional', isInput: true },
    { cell: 'D7', value: 32000, isInput: true },
    { cell: 'E7', value: '=D7*0.16', formula: '=D7*0.16' },
    { cell: 'F7', value: '=D7+E7', formula: '=D7+E7' },
    { cell: 'A9', value: 'TOTALES', isInput: false },
    { cell: 'D9', value: '=SUMA(D5:D7)', formula: '=SUMA(D5:D7)' },
    { cell: 'E9', value: '=SUMA(E5:E7)', formula: '=SUMA(E5:E7)' },
    { cell: 'F9', value: '=SUMA(F5:F7)', formula: '=SUMA(F5:F7)' },
  ],
  solution: {
    expectedCells: {
      'E5': 13600,
      'E6': 1920,
      'E7': 5120,
      'D9': 129000,
      'E9': 20640,
      'F9': 149640,
    },
    validationRules: [
      { cell: 'E5', type: 'exact', expected: 13600, label: 'IVA Proveedor 1' },
      { cell: 'E9', type: 'exact', expected: 20640, label: 'Total IVA acreditable' },
      { cell: 'F9', type: 'exact', expected: 149640, label: 'Total operaciones' },
    ],
  },
  hints: [
    'IVA = Subtotal × 16%',
    'Total = Subtotal + IVA',
    'La DIOT se presenta mensualmente antes del día 17',
  ],
  commonErrors: ['Error en cálculo de IVA', 'No incluir todos los proveedores', 'Error en sumas'],
  timeMinutes: 25,
};

// ─── EJERCICIO 6: Depreciación ───────────────────────────────

const DEPRECIACION_EJERCICIO: ExcelExercise = {
  id: 'excel-deprec-001',
  title: 'Tabla de Depreciación — Equipo de cómputo',
  type: 'depreciacion',
  difficulty: 2,
  description: 'Elabora la tabla de depreciación mensual del equipo de cómputo usando línea recta.',
  instructions: [
    '1. Registra el costo original del activo',
    '2. Establece la vida útil en meses',
    '3. Calcula la depreciación mensual',
    '4. Registra la depreciación acumulada mes a mes',
  ],
  initialData: [
    { cell: 'A1', value: 'TABLA DE DEPRECIACIÓN', isInput: false },
    { cell: 'A2', value: 'Equipo de cómputo — Línea recta', isInput: false },
    { cell: 'A4', value: 'Costo original', isInput: false },
    { cell: 'B4', value: 180000, isInput: true },
    { cell: 'A5', value: 'Vida útil (meses)', isInput: false },
    { cell: 'B5', value: 48, isInput: true },
    { cell: 'A6', value: 'Depreciación mensual', isInput: false },
    { cell: 'B6', value: '=B4/B5', formula: '=B4/B5' },
    { cell: 'A8', value: 'Mes', isInput: false },
    { cell: 'B8', value: 'Depreciación', isInput: false },
    { cell: 'C8', value: 'Acumulado', isInput: false },
    { cell: 'D8', value: 'Valor neto', isInput: false },
    { cell: 'A9', value: 'Ene 2026', isInput: true },
    { cell: 'B9', value: '=B6', formula: '=B6' },
    { cell: 'C9', value: '=B9', formula: '=B9' },
    { cell: 'D9', value: '=$B$4-C9', formula: '=$B$4-C9' },
    { cell: 'A10', value: 'Feb 2026', isInput: true },
    { cell: 'B10', value: '=B6', formula: '=B6' },
    { cell: 'C10', value: '=C9+B10', formula: '=C9+B10' },
    { cell: 'D10', value: '=$B$4-C10', formula: '=$B$4-C10' },
    { cell: 'A11', value: 'Mar 2026', isInput: true },
    { cell: 'B11', value: '=B6', formula: '=B6' },
    { cell: 'C11', value: '=C10+B11', formula: '=C10+B11' },
    { cell: 'D11', value: '=$B$4-C11', formula: '=$B$4-C11' },
  ],
  solution: {
    expectedCells: {
      'B6': 3750,
      'B9': 3750,
      'C9': 3750,
      'D9': 176250,
      'B10': 3750,
      'C10': 7500,
      'D10': 172500,
    },
    validationRules: [
      { cell: 'B6', type: 'exact', expected: 3750, label: 'Depreciación mensual' },
      { cell: 'D9', type: 'exact', expected: 176250, label: 'Valor neto mes 1' },
    ],
  },
  hints: [
    'Depreciación mensual = Costo original ÷ Vida útil en meses',
    'Acumulado = Acumulado anterior + Depreciación actual',
    'Valor neto = Costo original - Acumulado',
  ],
  commonErrors: ['Error en división', 'No usar referencias absolutas', 'Error en acumulado'],
  timeMinutes: 20,
};

// ─── EJERCICIO 7: Edad de Saldos por Cobrar ─────────────────

const EDAD_SALDOS_COBRAR: ExcelExercise = {
  id: 'excel-edad-cc-001',
  title: 'Edad de Saldos — Cuentas por Cobrar',
  type: 'cuentas_por_cobrar',
  difficulty: 3,
  description: 'Clasifica los saldos de clientes por antigüedad para análisis de cobranza.',
  instructions: [
    '1. Ingresa los saldos de cada cliente',
    '2. Clasifica por antigüedad (0-30, 31-60, 61-90, +90 días)',
    '3. Calcula el total por rango de antigüedad',
    '4. Calcula el porcentaje de cada rango',
  ],
  initialData: [
    { cell: 'A1', value: 'EDAD DE SALDOS — CUENTAS POR COBRAR', isInput: false },
    { cell: 'A3', value: 'Cliente', isInput: false },
    { cell: 'B3', value: 'Total', isInput: false },
    { cell: 'C3', value: '0-30 días', isInput: false },
    { cell: 'D3', value: '31-60 días', isInput: false },
    { cell: 'E3', value: '61-90 días', isInput: false },
    { cell: 'F3', value: '+90 días', isInput: false },
    { cell: 'A4', value: 'Comercial del Norte', isInput: true },
    { cell: 'B4', value: 125000, isInput: true },
    { cell: 'C4', value: 85000, isInput: true },
    { cell: 'D4', value: 40000, isInput: true },
    { cell: 'E4', value: 0, isInput: true },
    { cell: 'F4', value: 0, isInput: true },
    { cell: 'A5', value: 'Transportes Rápidos', isInput: true },
    { cell: 'B5', value: 45000, isInput: true },
    { cell: 'C5', value: 20000, isInput: true },
    { cell: 'D5', value: 15000, isInput: true },
    { cell: 'E5', value: 10000, isInput: true },
    { cell: 'F5', value: 0, isInput: true },
    { cell: 'A6', value: 'Inversiones del Valle', isInput: true },
    { cell: 'B6', value: 210000, isInput: true },
    { cell: 'C6', value: 50000, isInput: true },
    { cell: 'D6', value: 60000, isInput: true },
    { cell: 'E6', value: 50000, isInput: true },
    { cell: 'F6', value: 50000, isInput: true },
    { cell: 'A8', value: 'TOTALES', isInput: false },
    { cell: 'B8', value: '=SUMA(B4:B6)', formula: '=SUMA(B4:B6)' },
    { cell: 'C8', value: '=SUMA(C4:C6)', formula: '=SUMA(C4:C6)' },
    { cell: 'D8', value: '=SUMA(D4:D6)', formula: '=SUMA(D4:D6)' },
    { cell: 'E8', value: '=SUMA(E4:E6)', formula: '=SUMA(E4:E6)' },
    { cell: 'F8', value: '=SUMA(F4:F6)', formula: '=SUMA(F4:F6)' },
    { cell: 'A10', value: 'PORCENTAJE', isInput: false },
    { cell: 'C10', value: '=C8/B8', formula: '=C8/B8' },
    { cell: 'D10', value: '=D8/B8', formula: '=D8/B8' },
    { cell: 'E10', value: '=E8/B8', formula: '=E8/B8' },
    { cell: 'F10', value: '=F8/B8', formula: '=F8/B8' },
  ],
  solution: {
    expectedCells: {
      'B8': 380000,
      'C8': 155000,
      'D8': 115000,
      'E8': 60000,
      'F8': 50000,
    },
    validationRules: [
      { cell: 'B8', type: 'exact', expected: 380000, label: 'Total general' },
      { cell: 'C8', type: 'exact', expected: 155000, label: 'Total 0-30 días' },
    ],
  },
  hints: [
    'Los saldos más antiguos son los de mayor riesgo de incobrabilidad',
    'Los saldos >90 días generalmente requieren provisión',
  ],
  commonErrors: ['Clasificar mal por antigüedad', 'Error en sumas', 'No cuadrar los totales'],
  timeMinutes: 25,
};

// ─── Exportar todos los ejercicios ──────────────────────────

export const ALL_EXERCISES: ExcelExercise[] = [
  BALANZA_COMPROBACION,
  POLIZA_DIARIO_MULTI,
  ESTADO_RESULTADOS,
  CONCILIACION_BANCARIA,
  DIOT_EJERCICIO,
  DEPRECIACION_EJERCICIO,
  EDAD_SALDOS_COBRAR,
];

export function getExerciseById(id: string): ExcelExercise | undefined {
  return ALL_EXERCISES.find(e => e.id === id);
}

export function getExercisesByType(type: ExerciseType): ExcelExercise[] {
  return ALL_EXERCISES.filter(e => e.type === type);
}

export function getExercisesByDifficulty(difficulty: number): ExcelExercise[] {
  return ALL_EXERCISES.filter(e => e.difficulty === difficulty);
}
