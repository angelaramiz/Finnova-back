// ─── EXP finanzas: motor financiero mínimo (rama experimental) ───
// Fuente de verdad de TODO número financiero visible (regla de oro R-09).
// Convenciones fijadas con el instructor (2026-09-19):
// - Moneda MXN, redondeo a 2 decimales (centavos) por periodo.
// - Tasa NOMINAL anual con capitalización explícita (periodosPorAnio).
// - Año de 12 meses. La amortización usa tasa mensual = tasaAnual / 12.

export interface PeriodoInteres {
  periodo: number;
  saldo: number;
  interes: number;
}

export interface ResultadoInteresCompuesto {
  capital: number;
  tasaAnual: number;
  periodosPorAnio: number;
  anios: number;
  serie: PeriodoInteres[];
  montoFinal: number;
  interesTotal: number;
}

export interface FilaAmortizacion {
  pagoNumero: number;
  pago: number;
  interes: number;
  capital: number;
  saldo: number;
}

export interface ResultadoAmortizacion {
  monto: number;
  tasaAnual: number;
  pagos: number;
  pagoFijo: number;
  filas: FilaAmortizacion[];
  totalIntereses: number;
  totalPagado: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function exigirPositivo(nombre: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`finanzas: ${nombre} debe ser > 0`);
}

// M = C(1 + tasaAnual/periodosPorAnio)^(periodosPorAnio*anios),
// con redondeo a centavos por periodo (como lo haría una hoja de cálculo).
export function interesCompuesto(
  capital: number,
  tasaAnual: number,
  periodosPorAnio: number,
  anios: number,
): ResultadoInteresCompuesto {
  exigirPositivo('capital', capital);
  if (!Number.isFinite(tasaAnual) || tasaAnual < 0) throw new Error('finanzas: tasaAnual debe ser >= 0');
  exigirPositivo('periodosPorAnio', periodosPorAnio);
  exigirPositivo('anios', anios);

  const r = tasaAnual / periodosPorAnio;
  const total = Math.round(periodosPorAnio * anios);
  let saldo = capital;
  const serie: PeriodoInteres[] = [];
  for (let p = 1; p <= total; p++) {
    const interes = round2(saldo * r);
    saldo = round2(saldo + interes);
    serie.push({ periodo: p, saldo, interes });
  }
  return {
    capital, tasaAnual, periodosPorAnio, anios, serie,
    montoFinal: saldo,
    interesTotal: round2(saldo - capital),
  };
}

// Sistema francés (cuota fija): pago = P*r / (1-(1+r)^-n).
// La última fila se ajusta para que el saldo cierre en 0 exacto.
export function amortizacion(monto: number, tasaAnual: number, pagos: number): ResultadoAmortizacion {
  exigirPositivo('monto', monto);
  if (!Number.isFinite(tasaAnual) || tasaAnual < 0) throw new Error('finanzas: tasaAnual debe ser >= 0');
  exigirPositivo('pagos', pagos);

  const n = Math.round(pagos);
  const r = tasaAnual / 12;
  const pagoFijo = r === 0 ? round2(monto / n) : round2((monto * r) / (1 - Math.pow(1 + r, -n)));
  let saldo = monto;
  const filas: FilaAmortizacion[] = [];
  for (let k = 1; k <= n; k++) {
    const interes = round2(saldo * r);
    if (k === n) {
      const capital = saldo;
      const pago = round2(interes + capital);
      filas.push({ pagoNumero: k, pago, interes, capital, saldo: 0 });
      saldo = 0;
    } else {
      const capital = round2(pagoFijo - interes);
      saldo = round2(saldo - capital);
      filas.push({ pagoNumero: k, pago: pagoFijo, interes, capital, saldo });
    }
  }
  const totalIntereses = round2(filas.reduce((a, f) => a + f.interes, 0));
  const totalPagado = round2(filas.reduce((a, f) => a + f.pago, 0));
  return { monto, tasaAnual, pagos: n, pagoFijo, filas, totalIntereses, totalPagado };
}
