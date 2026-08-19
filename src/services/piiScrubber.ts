// ─── PII Scrubber — R-11 (privacidad no negociable) ────────────
// Remueve información personal identificable de cualquier dato antes de
// persistirlo en telemetría. NUNCA se guarda PII en quality_events.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{7,10}(?:[\s.-]?\d{1,4})?/g;
const RFC_RE = /[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/g;
const CURP_RE = /[A-Z]{4}\d{6}[HZM][A-Z]{5}[A-Z0-9]\d/g;
const CP_RE = /\b\d{5}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const NOMBRE_RE = /\b(?:Lic\.?|Ing\.?|Mtro\.?|Dra\.?|Dr\.?|C\.)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*\b/g;

const REPLACEMENT = '[PII-OMITIDO]';

export function scrubText(input: string): string {
  if (!input) return input;
  let out = input;
  out = out.replace(CARD_RE, REPLACEMENT);
  out = out.replace(CURP_RE, REPLACEMENT);
  out = out.replace(RFC_RE, REPLACEMENT);
  out = out.replace(EMAIL_RE, REPLACEMENT);
  out = out.replace(CP_RE, REPLACEMENT);
  out = out.replace(PHONE_RE, REPLACEMENT);
  out = out.replace(NOMBRE_RE, REPLACEMENT);
  return out;
}

export function containsPII(input: string): boolean {
  if (!input) return false;
  const cleaned = input
    .replace(CARD_RE, '')
    .replace(CURP_RE, '')
    .replace(RFC_RE, '')
    .replace(EMAIL_RE, '')
    .replace(CP_RE, '')
    .replace(PHONE_RE, '')
    .replace(NOMBRE_RE, '');
  return cleaned !== input;
}

// Scrubba recursivamente objetos/arrays (recorre valores string).
export function scrubData(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubData);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubData(v);
    return out;
  }
  return value;
}

export function dataContainsPII(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return containsPII(value);
  if (Array.isArray(value)) return value.some(dataContainsPII);
  if (typeof value === 'object') return Object.values(value).some(dataContainsPII);
  return false;
}