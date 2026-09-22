// ─── Motor de datos del asiento contable ────────────────────────────
// 5 etapas: [1] INGESTA (CFDI + EDOCTA) → [2] CONCILIACIÓN (monto+fecha) →
// [3] CLASIFICACIÓN (producto→agrupador) → [4] CÁLCULO (impuestos y
// retenciones con reglas fiscales, PUE vs PPD) → [5] PÓLIZA + BALANZA.
// Regla de oro R-09: montos y validaciones salen de MOTORES o del Anexo 24;
// cada error trae lección 📚 (P1 pedagogía practicantes). Cero LLM.

import { getSatCuenta, resolverAgrupador, clasificarProducto, desambiguarArrendamiento, METODOS_PAGO_SAT } from './satCatalog';

// ─── Etapa 1: ingesta ──────────────────────────────────────────────
export interface CfdiRow {
  rfc: string;
  emisor: string;
  fecha: string;          // DD-MM-AAAA
  uuid: string;
  metodo: 'PUE' | 'PPD';  // método de pago CFDI
  producto: string;
  moneda: string;         // catálogo F (MXN…)
  subtotal: number;
  iva16: number;
  iva8: number;
  ivaRet: number;
  isrRet: number;
  total: number;
  cuentaBanco?: string;   // etiqueta de bancos y cajas del Excel
}

export interface EdoCtaRow {
  fecha: string;          // DD-MM-AAAA
  concepto: string;
  totalPagado: number;
  banco: string;
}

export interface Leccion {
  codigo: string;
  mensaje: string;
  porQue: string;   // 📚 explicación pedagógica
}

function leccion(codigo: string, mensaje: string, porQue: string): Leccion {
  return { codigo, mensaje, porQue };
}

// ─── Etapa 2: conciliación (CFDI vs EDO DE CUENTA) ─────────────────
export interface Conciliacion {
  confirmado: boolean;
  banco?: string;
  fechaPago?: string;
  diferencia?: number;
  leccion?: Leccion;
}

const TOLERANCIA = 0.01;

function mismoMes(fechaA: string, fechaB: string): boolean {
  const p = (f: string) => f.split('-');
  const [, mA, yA] = p(fechaA);
  const [, mB, yB] = p(fechaB);
  return mA === mB && yA === yB;
}

export function conciliarPago(cfdi: CfdiRow, edoCta: EdoCtaRow[]): Conciliacion {
  const candidatos = edoCta.filter(e => mismoMes(e.fecha, cfdi.fecha));
  let mejor: EdoCtaRow | null = null;
  let mejorDif = Infinity;
  for (const e of candidatos) {
    const dif = Math.abs(e.totalPagado - cfdi.total);
    if (dif < mejorDif) { mejorDif = dif; mejor = e; }
  }
  if (mejor && mejorDif <= TOLERANCIA) {
    return { confirmado: true, banco: mejor.banco, fechaPago: mejor.fecha, diferencia: mejorDif };
  }
  if (cfdi.metodo === 'PPD') {
    return {
      confirmado: false,
      leccion: leccion('PPD_SIN_PAGO',
        'Sin pago en el estado de cuenta: es provisión, no egreso.',
        '📚 Un CFDI PPD (pago en parcialidades o diferido) aún no se cobra/paga: solo se provisiona el gasto contra proveedores (201.01) y el IVA va a 119.01 pendiente, no a 118.01 acreditable. El banco se afecta hasta que el dinero sale.'),
    };
  }
  return {
    confirmado: false, diferencia: mejor ? mejorDif : undefined,
    leccion: leccion('PAGO_NO_CONCILIA',
      `El total del CFDI (${cfdi.total}) no casa con ningún pago del estado de cuenta.`,
      '📚 La póliza de egresos exige el cotejo registro-contra-estado-de-cuenta: si el monto no aparece en el banco, no puedes afectar 102.01. Revisa fecha, banco y si el pago es parcial.'),
  };
}

// ─── Validadores fiscales (Anexo 24 + LISR + LIVA) ─────────────────
const UUID_CFDI = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
const RFC_PF = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const RFC_PM = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

export function validarUuid(uuid: string): Leccion | null {
  if (!UUID_CFDI.test((uuid || '').trim())) {
    return leccion('UUID_INVALIDO',
      `El UUID "${uuid}" no tiene formato de folio fiscal (8-4-4-4-12 hexadecimal).`,
      '📚 El UUID es la llave que amarra la póliza con su CFDI (Anexo 24 C). Un folio mal formado no existe en el SAT: se corrige el documento, no se contabiliza.');
  }
  return null;
}

export function validarRfc(rfc: string): Leccion | null {
  const limpio = (rfc || '').trim().toUpperCase();
  if (!RFC_PF.test(limpio) && !RFC_PM.test(limpio)) {
    return leccion('RFC_INVALIDO',
      `El RFC "${rfc}" no tiene formato válido (PF 13 o PM 12 caracteres).`,
      '📚 El RFC del tercero identifica al emisor ante el SAT. Además define PF vs PM: de eso depende la cuenta (601.45 vs 601.46) y si hay retención del 10%.');
  }
  return null;
}

// ─── Etapa 3: clasificación ────────────────────────────────────────
export interface Clasificacion {
  agrupador: string | null;
  nota: string;
  aviso?: string;
  leccion?: Leccion;
}

export function clasificar(cfdi: CfdiRow): Clasificacion {
  const hit = clasificarProducto(cfdi.producto);
  if (!hit) {
    return {
      agrupador: null, nota: 'sin clasificar',
      leccion: leccion('SIN_CLASIFICAR',
        `El producto "${cfdi.producto}" no tiene regla de clasificación.`,
        '📚 El motor nunca adivina la cuenta: un concepto ambiguo (ej. "PIERNA" sin desglose) se deja sin clasificar y se pide aclaración al proveedor. Clasificar a ojo contamina la balanza electrónica.'),
    };
  }
  // Desambiguación PF/PM con el RFC (arrendamiento 601.45 vs 601.46)
  if (hit.requiereDesambiguacion === 'PF_PM') {
    const d = desambiguarArrendamiento(cfdi.rfc);
    const sinRfc = !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test((cfdi.rfc || '').trim());
    return {
      agrupador: d.agrupador,
      nota: `${hit.nota} → ${d.agrupador} (${d.como})`,
      aviso: sinRfc ? 'Sin RFC válido no puedo distinguir PF/PM: se propone 601.45, confírmalo.' : undefined,
    };
  }
  return { agrupador: hit.agrupador, nota: hit.nota };
}

// ─── Etapa 4: cálculo ──────────────────────────────────────────────
export interface LineaPoliza {
  cuentaInterna: string;
  agrupador: string;
  descripcion: string;
  debe: number;
  haber: number;
}

export interface Calculo {
  lineas: LineaPoliza[];
  errores: Leccion[];
}

// Retención ISR arrendamiento a PF: 10% del subtotal (Art. 116 LISR).
const TASA_ISR_ARRENDAMIENTO = 0.10;

export interface OpcionesCalculo {
  cuentaGasto?: string;     // cuenta interna del gasto (default '601-83')
  cuentaBanco?: string;     // cuenta interna del banco (default '102-01-002')
  cuentaRetIsr?: string;    // cuenta interna retención (default '216-03')
  agrupadorRetIsr?: string; // default '216.03'
}

export function calcularLineas(cfdi: CfdiRow, clasif: Clasificacion, conc: Conciliacion, opts: OpcionesCalculo = {}): Calculo {
  const errores: Leccion[] = [];
  const r = (n: number) => Math.round(n * 100) / 100;

  // Validación previa: el CFDI debe cuadrar solo
  const esperado = r(cfdi.subtotal + cfdi.iva16 + cfdi.iva8 - cfdi.ivaRet - cfdi.isrRet);
  if (Math.abs(esperado - cfdi.total) > TOLERANCIA) {
    errores.push(leccion('CFDI_NO_CUADRA',
      `Subtotal + IVA − retenciones (${esperado}) ≠ total (${cfdi.total}).`,
      '📚 Antes de contabilizar se valida el documento fuente: si el CFDI no cuadra solo, el error viene del emisor o de la captura, no de la contabilidad. Nunca se "ajusta" con centavos fantasma.'));
    return { lineas: [], errores };
  }
  if (!clasif.agrupador) {
    if (clasif.leccion) errores.push(clasif.leccion);
    return { lineas: [], errores };
  }
  const satGasto = getSatCuenta(clasif.agrupador);
  if (!satGasto) {
    errores.push(leccion('AGRUPADOR_DESCONOCIDO',
      `La cuenta ${clasif.agrupador} no está en el catálogo SAT operativo.`,
      '📚 Solo se contabiliza con códigos del Anexo 24: si el agrupador no existe en el catálogo, la póliza no puede ir a la contabilidad electrónica.'));
    return { lineas: [], errores };
  }
  // Gasto no deducible: el IVA forma parte del gasto, jamás se acredita
  if (clasif.agrupador === '601.83' && (cfdi.iva16 > 0 || cfdi.iva8 > 0)) {
    errores.push(leccion('IVA_NO_DEDUCIBLE',
      `Gasto 601.83 con IVA ${cfdi.iva16}: sin requisitos fiscales no hay acreditamiento.`,
      '📚 Sin requisitos fiscales no hay acreditamiento (Art. 28 LISR + Art. 5 LIVA): el IVA se vuelve costo y se suma al gasto en una sola línea. Llevarlo a 118.01 es pedir devolución de lo indebido (Art. 22 CFF).'));
    return { lineas: [], errores };
  }

  const ctaBanco = opts.cuentaBanco ?? '102-01-002';
  const lineas: LineaPoliza[] = [];

  // Ruta ingreso/capital (naturaleza acreedora: el cobro entra en DEBE)
  if (satGasto.naturaleza === 'H') {
    if (!conc.confirmado && cfdi.metodo === 'PUE') {
      if (conc.leccion) errores.push(conc.leccion);
      return { lineas: [], errores };
    }
    const esProvision = cfdi.metodo === 'PPD' || !conc.confirmado;
    if (esProvision) {
      // PPD no cobrado: clientes + IVA trasladado NO cobrado (209.01)
      lineas.push({ cuentaInterna: '1-03', agrupador: '105.01', descripcion: 'Clientes nacionales', debe: cfdi.total, haber: 0 });
      lineas.push({ cuentaInterna: clasif.agrupador.replace('.', '-'), agrupador: clasif.agrupador, descripcion: satGasto.nombre, debe: 0, haber: cfdi.subtotal });
      if (cfdi.iva16 > 0) {
        lineas.push({ cuentaInterna: '209-01', agrupador: '209.01', descripcion: 'IVA trasladado no cobrado', debe: 0, haber: cfdi.iva16 });
      }
    } else {
      lineas.push({ cuentaInterna: ctaBanco, agrupador: '102.01', descripcion: `Bancos nacionales${conc.banco ? ` (${conc.banco})` : ''}`, debe: cfdi.total, haber: 0 });
      lineas.push({ cuentaInterna: clasif.agrupador.replace('.', '-'), agrupador: clasif.agrupador, descripcion: satGasto.nombre, debe: 0, haber: cfdi.subtotal });
      if (cfdi.iva16 > 0) {
        lineas.push({ cuentaInterna: '208-01', agrupador: '208.01', descripcion: 'IVA trasladado cobrado', debe: 0, haber: cfdi.iva16 });
      }
    }
    const debe = r(lineas.reduce((s, l) => s + l.debe, 0));
    const haber = r(lineas.reduce((s, l) => s + l.haber, 0));
    if (Math.abs(debe - haber) > TOLERANCIA) {
      errores.push(leccion('POLIZA_DESCUADRADA',
        `DEBE (${debe}) ≠ HABER (${haber}).`,
        '📚 Partida doble: toda póliza cuadra o no existe.'));
      return { lineas: [], errores };
    }
    return { lineas, errores };
  }

  const ctaGasto = opts.cuentaGasto ?? '601-83';
  const ctaRet = opts.cuentaRetIsr ?? '216-03';
  const agrRet = opts.agrupadorRetIsr ?? '216.03';

  if (cfdi.metodo === 'PPD' || !conc.confirmado) {
    // Ruta provisión: gasto + IVA pendiente contra proveedores
    lineas.push({ cuentaInterna: ctaGasto, agrupador: clasif.agrupador, descripcion: satGasto.nombre, debe: cfdi.subtotal, haber: 0 });
    if (cfdi.iva16 > 0) {
      lineas.push({ cuentaInterna: '119-01', agrupador: '119.01', descripcion: 'IVA pendiente de pago', debe: cfdi.iva16, haber: 0 });
    }
    lineas.push({ cuentaInterna: '201-01', agrupador: '201.01', descripcion: 'Proveedores nacionales', debe: 0, haber: cfdi.subtotal + cfdi.iva16 });
  } else {
    // Ruta egreso pagado (PUE conciliado): gasto + retenciones + bancos
    lineas.push({ cuentaInterna: ctaGasto, agrupador: clasif.agrupador, descripcion: satGasto.nombre, debe: cfdi.subtotal, haber: 0 });
    if (cfdi.iva16 > 0) {
      lineas.push({ cuentaInterna: '118-01', agrupador: '118.01', descripcion: 'IVA acreditable pagado', debe: cfdi.iva16, haber: 0 });
    }
    if (cfdi.isrRet > 0) {
      const esperadoRet = r(cfdi.subtotal * TASA_ISR_ARRENDAMIENTO);
      if (Math.abs(esperadoRet - cfdi.isrRet) > TOLERANCIA && clasif.agrupador === '601.45') {
        errores.push(leccion('RET_ISR_ARRENDAMIENTO',
          `La retención ISR (${cfdi.isrRet}) no es el 10% del subtotal (${esperadoRet}).`,
          '📚 El arrendamiento a persona física retiene 10% de ISR (Art. 116 LISR): 70,900 × 10% = 7,090 exactos. Si el CFDI trae otra cifra, el comprobante está mal timbrado y se pide corrección, no se contabiliza.'));
        return { lineas: [], errores };
      }
      lineas.push({ cuentaInterna: ctaRet, agrupador: agrRet, descripcion: 'Impuestos retenidos de ISR por arrendamiento', debe: 0, haber: cfdi.isrRet });
    }
    if (cfdi.ivaRet > 0) {
      lineas.push({ cuentaInterna: '216-10', agrupador: '216.10', descripcion: 'Impuestos retenidos de IVA', debe: 0, haber: cfdi.ivaRet });
    }
    lineas.push({ cuentaInterna: ctaBanco, agrupador: '102.01', descripcion: `Bancos nacionales${conc.banco ? ` (${conc.banco})` : ''}`, debe: 0, haber: cfdi.total });
  }

  // Gate: debe = haber (story-coherence balancedEntry)
  const debe = r(lineas.reduce((s, l) => s + l.debe, 0));
  const haber = r(lineas.reduce((s, l) => s + l.haber, 0));
  if (Math.abs(debe - haber) > TOLERANCIA) {
    errores.push(leccion('POLIZA_DESCUADRADA',
      `DEBE (${debe}) ≠ HABER (${haber}).`,
      '📚 Partida doble: toda póliza cuadra o no existe. Si descuadra, falta una línea (típico: olvidar la retención en el haber) o sobra un cargo.'));
    return { lineas: [], errores };
  }
  return { lineas, errores };
}

// ─── Etapa 5a: póliza formato Anexo 24 sección C ───────────────────
export interface Poliza24 {
  tipo: 'PROVISION' | 'EGRESOS' | 'DIARIO';
  fecha: string;
  concepto: string;
  uuid: string;
  rfcTercero: string;
  montoTotal: number;
  moneda: string;
  metodoPago: string;   // catálogo H
  banco?: string;
  cuentaOrigen?: string;
  lineas: LineaPoliza[];
  totalDebe: number;
  totalHaber: number;
}

export function armarPoliza(cfdi: CfdiRow, conc: Conciliacion, lineas: LineaPoliza[], opts: { metodoPago?: string; cuentaOrigen?: string } = {}): Poliza24 {
  const r = (n: number) => Math.round(n * 100) / 100;
  const metodo = opts.metodoPago ?? '03';
  if (!METODOS_PAGO_SAT.some(m => m.clave === metodo)) {
    throw new Error(`Método de pago ${metodo} fuera del catálogo H del Anexo 24`);
  }
  return {
    tipo: conc.confirmado ? 'EGRESOS' : 'PROVISION',
    fecha: conc.fechaPago ?? cfdi.fecha,
    concepto: cfdi.producto,
    uuid: cfdi.uuid,
    rfcTercero: cfdi.rfc,
    montoTotal: cfdi.total,
    moneda: cfdi.moneda,
    metodoPago: metodo,
    banco: conc.banco,
    cuentaOrigen: opts.cuentaOrigen,
    lineas,
    totalDebe: r(lineas.reduce((s, l) => s + l.debe, 0)),
    totalHaber: r(lineas.reduce((s, l) => s + l.haber, 0)),
  };
}

// ─── Etapa 5b: balanza formato Anexo 24 sección B ──────────────────
export interface SaldoBalanza {
  agrupador: string;
  nombre: string;
  saldoInicial: number;
  debe: number;
  haber: number;
  saldoFinal: number;
}

export function agregarABalanza(saldos: Map<string, SaldoBalanza>, poliza: Poliza24): Map<string, SaldoBalanza> {
  const out = new Map(saldos);
  for (const l of poliza.lineas) {
    const sat = getSatCuenta(l.agrupador);
    if (!sat) continue;
    const actual = out.get(l.agrupador) ?? { agrupador: l.agrupador, nombre: sat.nombre, saldoInicial: 0, debe: 0, haber: 0, saldoFinal: 0 };
    actual.debe += l.debe;
    actual.haber += l.haber;
    // Naturaleza deudora: final = inicial + debe − haber; acreedora al revés
    actual.saldoFinal = sat.naturaleza === 'D'
      ? actual.saldoInicial + actual.debe - actual.haber
      : actual.saldoInicial + actual.haber - actual.debe;
    out.set(l.agrupador, actual);
  }
  return out;
}

// ─── Orquestador ───────────────────────────────────────────────────
export interface ResultadoPoliza {
  poliza: Poliza24 | null;
  conciliacion: Conciliacion;
  clasificacion: Clasificacion;
  errores: Leccion[];
  avisos: Leccion[];
}

export function generarPoliza(cfdi: CfdiRow, edoCta: EdoCtaRow[] = [], opts: OpcionesCalculo & { metodoPago?: string; cuentaOrigen?: string } = {}): ResultadoPoliza {
  // BLOQUEA: el documento fuente debe ser válido antes de calcular
  const docErrores: Leccion[] = [];
  const eUuid = validarUuid(cfdi.uuid);
  if (eUuid) docErrores.push(eUuid);
  const eRfc = validarRfc(cfdi.rfc);
  if (eRfc) docErrores.push(eRfc);
  if (docErrores.length > 0) {
    return { poliza: null, conciliacion: conciliarPago(cfdi, edoCta), clasificacion: clasificar(cfdi), errores: docErrores, avisos: [] };
  }
  // El agrupador de cada línea debe existir en el catálogo (coherencia R-09)
  const conc = conciliarPago(cfdi, edoCta);
  const clasif = clasificar(cfdi);
  const calc = calcularLineas(cfdi, clasif, conc, opts);
  const errores = [...calc.errores];
  const avisos: Leccion[] = [];
  if (clasif.aviso) {
    avisos.push(leccion('AVISO_CLASIFICACION', clasif.aviso,
      '📚 Sin RFC válido el motor propone por preponderancia (601.45), pero la cuenta correcta depende de quién factura: PF 13 caracteres → 601.45, PM 12 → 601.46.'));
  }
  if (!conc.confirmado && conc.leccion && cfdi.metodo === 'PUE') errores.push(conc.leccion);
  if (calc.lineas.length === 0) return { poliza: null, conciliacion: conc, clasificacion: clasif, errores, avisos };
  for (const l of calc.lineas) {
    if (!resolverAgrupador(l.cuentaInterna)) {
      errores.push(leccion('CUENTA_SIN_AGRUPADOR',
        `La cuenta ${l.cuentaInterna} no tiene código agrupador SAT.`,
        '📚 El Anexo 24 sección A obliga a asociar cada cuenta del contribuyente a un agrupador por naturaleza y preponderancia. Sin equivalencia, la cuenta no puede ir a la balanza electrónica.'));
      return { poliza: null, conciliacion: conc, clasificacion: clasif, errores, avisos };
    }
  }
  return { poliza: armarPoliza(cfdi, conc, calc.lineas, opts), conciliacion: conc, clasificacion: clasif, errores, avisos };
}

// ─── Casos semilla del curso (goldens) ─────────────────────────────
export const CASO_MARCELO: CfdiRow = {
  rfc: 'FOFM8406126X3', emisor: 'MARCELO F', fecha: '02-01-2025',
  uuid: '1317D7E0-38AC-489F-9082-E75019D8975E', metodo: 'PUE',
  producto: 'Arrendamiento de residencias DEL 15 de enero al 14 de febrero del 2025',
  moneda: 'MXN', subtotal: 70900, iva16: 0, iva8: 0, ivaRet: 0, isrRet: 7090, total: 63810,
};

export const EDO_MARCELO: EdoCtaRow[] = [
  { fecha: '02-01-2025', concepto: 'Arrendamiento de residencias DEL 15 de enero al 14 de febrero del 2025', totalPagado: 63810, banco: 'RITO FINANCIERA' },
];

export const CASO_PPD: CfdiRow = {
  rfc: 'PROV920101ABC', emisor: 'PROVEEDOR PPD', fecha: '05-01-2025',
  uuid: 'A1B2C3D4-E5F6-4A7B-8C9D-E0F1A2B3C4D5', metodo: 'PPD',
  producto: 'Arrendamiento de bodega enero 2025',
  moneda: 'MXN', subtotal: 1000, iva16: 160, iva8: 0, ivaRet: 0, isrRet: 0, total: 1160,
};

export const CASO_CAPITAL: CfdiRow = {
  rfc: 'SOC800101AAA', emisor: 'SOCIO APORTANTE', fecha: '15-01-2025',
  uuid: 'B2C3D4E5-F6A7-4B8C-9D0E-F1A2B3C4D5E6', metodo: 'PUE',
  producto: 'Aportación de capital fijo',
  moneda: 'MXN', subtotal: 50000, iva16: 0, iva8: 0, ivaRet: 0, isrRet: 0, total: 50000,
};

export const EDO_CAPITAL: EdoCtaRow[] = [
  { fecha: '15-01-2025', concepto: 'Aportación de capital', totalPagado: 50000, banco: 'RITO FINANCIERA' },
];

export const CASO_VENTAS: CfdiRow = {
  rfc: 'TLC750101ABC', emisor: 'EMPRESA (propia)', fecha: '10-01-2025',
  uuid: 'C3D4E5F6-A7B8-4C9D-0E1F-A2B3C4D5E6F7', metodo: 'PUE',
  producto: 'Ventas y/o servicios gravados a la tasa general',
  moneda: 'MXN', subtotal: 23000, iva16: 3680, iva8: 0, ivaRet: 0, isrRet: 0, total: 26680,
};

export const EDO_VENTAS: EdoCtaRow[] = [
  { fecha: '10-01-2025', concepto: 'Cobro ventas enero', totalPagado: 26680, banco: 'RITO FINANCIERA' },
];
