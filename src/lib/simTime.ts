// ─── Reloj único de simulación — versión backend ──────────────
// Copia auto-contenida del reloj sim para que el backend (submódulo
// Finnova-back, se despliega solo) NO dependa de alumnos/src/lib/simTime.
// Los valores son idénticos: HOY sim = miércoles 08-jul-2026.
// Usar estas funciones en lugar de new Date() para fechas del mundo simulado.

export const SIM_YEAR = 2026;
export const SIM_MONTH = 6; // 0-based: julio
export const SIM_DAY = 8;   // miércoles 8 de julio de 2026

export const SIM_DATE = new Date(SIM_YEAR, SIM_MONTH, SIM_DAY);

export function simToday(offsetDays = 0): Date {
  return new Date(SIM_YEAR, SIM_MONTH, SIM_DAY - offsetDays);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "03-jul" (estilo DataOps)
export function simShort(offsetDays = 0): string {
  const d = simToday(offsetDays);
  return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}`;
}

// "03/07" (estilo tabla de Airflow)
export function simSlash(offsetDays = 0): string {
  const d = simToday(offsetDays);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// "2026-07-06" (estilo BI / raw_ventas)
export function simIso(offsetDays = 0): string {
  const d = simToday(offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const HOY_ISO = simIso(0); // 2026-07-08