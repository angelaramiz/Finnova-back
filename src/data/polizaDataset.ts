// ─── Dataset de operaciones para el Sim de Pólizas (Contalink) ──────
// 21 filas CFDI ↔ estado de cuenta conectadas como el Excel del curso:
// cada PUE trae su fila de banco (mismo mes, mismo total); cada PPD es
// promesa sin banco. El UUID del CFDI es el id del caso: nunca se repite.
// Fila 1 = MARCELO golden intacto. Resto = operación realista de LNO
// (diesel, fletes, rentas, refacciones, papelería, viáticos, honorarios,
// ventas, capital) en ventana sim 01→08-jul-2026.
import type { CfdiRow, EdoCtaRow } from '../services/polizaEngine';

export interface PolizaCaso {
  id: string;          // = cfdi.uuid (folio fiscal único, no se repite)
  nombre: string;      // etiqueta corta para el selector
  categoria: 'gasto' | 'ingreso' | 'capital';
  cfdi: CfdiRow;
  edo: EdoCtaRow | null;  // null = PPD (promesa, sin tocar el banco)
}

const U = (i: number) => `C5070101-${String(i).padStart(4, '0')}-4000-8000-${String(i).padStart(12, '0')}`;

function pue(
  id: string, nombre: string, categoria: PolizaCaso['categoria'],
  cfdi: Omit<CfdiRow, 'iva8' | 'ivaRet' | 'moneda'> & { moneda?: string },
  edo: { fecha: string; concepto: string; banco: string },
): PolizaCaso {
  return {
    id,
    nombre,
    categoria,
    cfdi: { iva8: 0, ivaRet: 0, moneda: 'MXN', ...cfdi },
    edo: { ...edo, totalPagado: cfdi.total, banco: edo.banco },
  };
}

function ppd(
  id: string, nombre: string, categoria: PolizaCaso['categoria'],
  cfdi: Omit<CfdiRow, 'iva8' | 'ivaRet' | 'moneda'> & { moneda?: string },
): PolizaCaso {
  return {
    id,
    nombre,
    categoria,
    cfdi: { iva8: 0, ivaRet: 0, moneda: 'MXN', ...cfdi },
    edo: null,
  };
}

export const POLIZA_CASOS: PolizaCaso[] = [
  // ── R-01 golden del curso (intacto) ──────────────────────────────
  {
    id: '1317D7E0-38AC-489F-9082-E75019D8975E',
    nombre: 'MARCELO F · Arrendamiento PUE (ASIENTO 1)',
    categoria: 'gasto',
    cfdi: {
      rfc: 'FOFM8406126X3', emisor: 'MARCELO F', fecha: '02-01-2025',
      uuid: '1317D7E0-38AC-489F-9082-E75019D8975E', metodo: 'PUE',
      producto: 'Arrendamiento de residencias DEL 15 de enero al 14 de febrero del 2025',
      moneda: 'MXN', subtotal: 70900, iva16: 0, iva8: 0, ivaRet: 0, isrRet: 7090, total: 63810,
    },
    edo: { fecha: '02-01-2025', concepto: 'Arrendamiento de residencias', totalPagado: 63810, banco: 'RITO FINANCIERA' },
  },
  // ── Diesel y patio (Combustibles del Bajío, PM) ──────────────────
  pue(U(2), 'Diesel T-07 · 55,680', 'gasto', {
    rfc: 'CDB780404JKL', emisor: 'COMBUSTIBLES DEL BAJIO', fecha: '01-07-2026', uuid: U(2), metodo: 'PUE',
    producto: 'Combustible diésel tractocamión T-07, 2,400 litros', subtotal: 48000, iva16: 7680, isrRet: 0, total: 55680,
  }, { fecha: '01-07-2026', concepto: 'Diesel T-07 semana 27', banco: 'BBVA · Cta 0111' }),
  pue(U(3), 'Diesel T-12 · 60,900', 'gasto', {
    rfc: 'CDB780404JKL', emisor: 'COMBUSTIBLES DEL BAJIO', fecha: '03-07-2026', uuid: U(3), metodo: 'PUE',
    producto: 'Combustible diésel tractocamión T-12, 2,625 litros', subtotal: 52500, iva16: 8400, isrRet: 0, total: 60900,
  }, { fecha: '03-07-2026', concepto: 'Diesel T-12 semana 27', banco: 'BBVA · Cta 0111' }),
  pue(U(4), 'Gas LP montacargas · 3,712', 'gasto', {
    rfc: 'CDB780404JKL', emisor: 'COMBUSTIBLES DEL BAJIO', fecha: '08-07-2026', uuid: U(4), metodo: 'PUE',
    producto: 'Gas LP montacargas almacén, 30 litros de gas', subtotal: 3200, iva16: 512, isrRet: 0, total: 3712,
  }, { fecha: '08-07-2026', concepto: 'Gas LP almacén', banco: 'Banorte · Cta 2203' }),
  // ── Fletes subcontratados (Transportes Express, PM) ──────────────
  pue(U(5), 'Flete Juárez–MTY · 37,120', 'gasto', {
    rfc: 'TEX920101ABC', emisor: 'TRANSPORTES EXPRESS SA', fecha: '02-07-2026', uuid: U(5), metodo: 'PUE',
    producto: 'Flete subcontratado Juárez–Monterrey, caja 53 pies', subtotal: 32000, iva16: 5120, isrRet: 0, total: 37120,
  }, { fecha: '02-07-2026', concepto: 'Flete subcontratado MTY', banco: 'Banorte · Cta 2203' }),
  pue(U(6), 'Acarreo local · 5,220', 'gasto', {
    rfc: 'TEX920101ABC', emisor: 'TRANSPORTES EXPRESS SA', fecha: '07-07-2026', uuid: U(6), metodo: 'PUE',
    producto: 'Acarreo local de contenedor puerto–almacén', subtotal: 4500, iva16: 720, isrRet: 0, total: 5220,
  }, { fecha: '07-07-2026', concepto: 'Acarreo local contenedor', banco: 'BBVA · Cta 0111' }),
  ppd(U(7), 'Acarreo pendiente PPD · 10,324', 'gasto', {
    rfc: 'TEX920101ABC', emisor: 'TRANSPORTES EXPRESS SA', fecha: '06-07-2026', uuid: U(7), metodo: 'PPD',
    producto: 'Acarreo local pendiente de pago, semana 27', subtotal: 8900, iva16: 1424, isrRet: 0, total: 10324,
  }),
  // ── Rentas: PM directa vs PF con retención ───────────────────────
  pue(U(8), 'Renta bodega julio · 32,480', 'gasto', {
    rfc: 'BJU190202BJ1', emisor: 'BODEGAS JUAREZ SA', fecha: '01-07-2026', uuid: U(8), metodo: 'PUE',
    producto: 'Renta local bodega Parque Industrial, julio 2026', subtotal: 28000, iva16: 4480, isrRet: 0, total: 32480,
  }, { fecha: '01-07-2026', concepto: 'Renta bodega julio', banco: 'Banorte · Cta 2203' }),
  pue(U(9), 'Arrend. oficinas PF · 16,200', 'gasto', {
    rfc: 'MOLM750505MOL', emisor: 'MOLINA MARQUEZ', fecha: '01-07-2026', uuid: U(9), metodo: 'PUE',
    producto: 'Arrendamiento de oficinas administrativas julio 2026', subtotal: 18000, iva16: 0, isrRet: 1800, total: 16200,
  }, { fecha: '01-07-2026', concepto: 'Renta oficinas julio', banco: 'Santander · Cta 3304' }),
  ppd(U(10), 'Bodega anexa PPD · 13,920', 'gasto', {
    rfc: 'BJU190202BJ1', emisor: 'BODEGAS JUAREZ SA', fecha: '08-07-2026', uuid: U(10), metodo: 'PPD',
    producto: 'Arrendamiento de bodega anexa, anticipo agosto 2026', subtotal: 12000, iva16: 1920, isrRet: 0, total: 13920,
  }),
  // ── Taller (Tracto Mecánica El Pistón, PM) ───────────────────────
  pue(U(11), 'Filtros T-03 · 11,368', 'gasto', {
    rfc: 'TME110304PST', emisor: 'TRACTO MECANICA EL PISTON', fecha: '04-07-2026', uuid: U(11), metodo: 'PUE',
    producto: 'Mantenimiento preventivo tractocamión T-03: filtros y cartucho', subtotal: 9800, iva16: 1568, isrRet: 0, total: 11368,
  }, { fecha: '04-07-2026', concepto: 'Manto. preventivo T-03', banco: 'BBVA · Cta 0111' }),
  pue(U(12), 'Manto. caja seca · 28,536', 'gasto', {
    rfc: 'TME110304PST', emisor: 'TRACTO MECANICA EL PISTON', fecha: '06-07-2026', uuid: U(12), metodo: 'PUE',
    producto: 'Mantenimiento correctivo caja seca tractocamión T-09', subtotal: 24600, iva16: 3936, isrRet: 0, total: 28536,
  }, { fecha: '06-07-2026', concepto: 'Manto. correctivo T-09', banco: 'Banorte · Cta 2203' }),
  // ── Oficina, viaje y profesionales ───────────────────────────────
  pue(U(13), 'Papelería julio · 7,482', 'gasto', {
    rfc: 'PAN850202DEF', emisor: 'PAPELERIA DEL NORTE', fecha: '02-07-2026', uuid: U(13), metodo: 'PUE',
    producto: 'Papelería y artículos de oficina, pedido julio', subtotal: 6450, iva16: 1032, isrRet: 0, total: 7482,
  }, { fecha: '02-07-2026', concepto: 'Papelería oficina', banco: 'Santander · Cta 3304' }),
  pue(U(14), 'Viáticos + hospedaje · 8,352', 'gasto', {
    rfc: 'HST200303HTL', emisor: 'HOTEL SANTA TERESA', fecha: '05-07-2026', uuid: U(14), metodo: 'PUE',
    producto: 'Viáticos choferes ruta Juárez–Chihuahua más hospedaje', subtotal: 7200, iva16: 1152, isrRet: 0, total: 8352,
  }, { fecha: '05-07-2026', concepto: 'Viáticos ruta Chihuahua', banco: 'BBVA · Cta 0111' }),
  pue(U(15), 'Honorarios contador · 17,400', 'gasto', {
    rfc: 'GARA800101AAA', emisor: 'GARCIA ANA', fecha: '03-07-2026', uuid: U(15), metodo: 'PUE',
    producto: 'Honorarios contador, cierre mensual junio 2026', subtotal: 15000, iva16: 2400, isrRet: 0, total: 17400,
  }, { fecha: '03-07-2026', concepto: 'Honorarios junio', banco: 'Santander · Cta 3304' }),
  ppd(U(16), 'Auditoría PPD · 25,520', 'gasto', {
    rfc: 'GARA800101AAA', emisor: 'GARCIA ANA', fecha: '07-07-2026', uuid: U(16), metodo: 'PPD',
    producto: 'Honorarios auditoría externa segundo trimestre', subtotal: 22000, iva16: 3520, isrRet: 0, total: 25520,
  }),
  pue(U(17), 'Comisión bancaria · 1,032.40', 'gasto', {
    rfc: 'BBA830831LJ2', emisor: 'BBVA MEXICO', fecha: '01-07-2026', uuid: U(17), metodo: 'PUE',
    producto: 'Comisión bancaria manejo de cuenta junio 2026', subtotal: 890, iva16: 142.4, isrRet: 0, total: 1032.4,
  }, { fecha: '01-07-2026', concepto: 'Comisión manejo cuenta', banco: 'BBVA · Cta 0111' }),
  // ── Ingresos: fletes cobrados y por cobrar ───────────────────────
  pue(U(18), 'Flete cobrado · 98,600', 'ingreso', {
    rfc: 'CNO990101HIJ', emisor: 'LNO (propia)', fecha: '04-07-2026', uuid: U(18), metodo: 'PUE',
    producto: 'Ventas y/o servicios gravados a la tasa general: flete Juárez–Chihuahua', subtotal: 85000, iva16: 13600, isrRet: 0, total: 98600,
  }, { fecha: '04-07-2026', concepto: 'Cobro flete Comercial del Norte', banco: 'BBVA · Cta 0111' }),
  ppd(U(19), 'Flete a crédito · 74,240', 'ingreso', {
    rfc: 'TRA880202KLM', emisor: 'LNO (propia)', fecha: '05-07-2026', uuid: U(19), metodo: 'PPD',
    producto: 'Ingresos por ventas a crédito 30 días: flete Chihuahua–Monterrey', subtotal: 64000, iva16: 10240, isrRet: 0, total: 74240,
  }),
  pue(U(20), 'Distribución local · 26,680', 'ingreso', {
    rfc: 'TRA880202KLM', emisor: 'LNO (propia)', fecha: '07-07-2026', uuid: U(20), metodo: 'PUE',
    producto: 'Ventas y/o servicios gravados: distribución local 6 rutas', subtotal: 23000, iva16: 3680, isrRet: 0, total: 26680,
  }, { fecha: '07-07-2026', concepto: 'Cobro distribución local', banco: 'Santander · Cta 3304' }),
  // ── Capital ──────────────────────────────────────────────────────
  pue(U(21), 'Aportación socio · 150,000', 'capital', {
    rfc: 'SOA800101AAA', emisor: 'SOCIO APORTANTE', fecha: '02-07-2026', uuid: U(21), metodo: 'PUE',
    producto: 'Aportación de capital fijo, socio fundador', subtotal: 150000, iva16: 0, isrRet: 0, total: 150000,
  }, { fecha: '02-07-2026', concepto: 'Aportación de capital', banco: 'Banorte · Cta 2203' }),
];

export function getPolizaCasos(): PolizaCaso[] {
  return POLIZA_CASOS;
}

/** Primera semilla cuyo UUID no esté en `usados`. Determinista: mismo
 *  orden siempre → mismo resultado para los mismos usados. null = agotadas. */
export function getPolizaSemilla(usados: string[] = []): PolizaCaso | null {
  const set = new Set((usados || []).map((u) => String(u).trim().toUpperCase()));
  return POLIZA_CASOS.find((c) => !set.has(c.id.toUpperCase())) ?? null;
}
