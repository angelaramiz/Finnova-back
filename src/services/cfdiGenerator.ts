// ─── Generador PDF + XML simbólico del CFDI ──────────────────
// Genera una representación XML (como el SAT lo emite) y un "PDF"
// (representación visual del comprobante). Ambos simbólicos.

function formatCurrency(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad(n: number): string { return String(n).padStart(4, '0'); }

export function generateCfdiXml(data: any): string {
  const uuid = data.uuid || `${pad(Math.floor(Math.random()*10000))}${pad(Math.floor(Math.random()*10000))}-${Math.floor(Math.random()*1000)}`;
  const fecha = data.date || '2026-07-08T10:32:00';
  const serie = data.invoiceNumber || `FAC-2026-${pad(Math.floor(Math.random()*900)+100)}`;
  const emisor = data.client || 'Empresa Emisora';
  const emisorRfc = data.clientRfc || 'XXX000000XXX';
  const receptor = 'Operadora Logística del Norte S.A. de C.V.';
  const receptorRfc = 'OLN-220701-ABC';
  const subtotal = data.subtotal || 0;
  const iva = data.iva || Math.round(subtotal * 0.16);
  const total = data.total || subtotal + iva;

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
    Version="4.0" Serie="${serie}" Folio="${pad(Math.floor(Math.random()*9000)+1000)}"
    Fecha="${fecha}" FormaPago="03" MetodoPago="PUE" TipoDeComprobante="I"
    Moneda="MXN" Exportacion="01" LugarExpedicion="32575"
    SubTotal="${subtotal.toFixed(2)}" Total="${total.toFixed(2)}"
    TipoCambio="1" UUID="${uuid}">
  <cfdi:Emisor Rfc="${emisorRfc}" Nombre="${emisor}" RegimenFiscal="601" />
  <cfdi:Receptor Rfc="${receptorRfc}" Nombre="${receptor}" UsoCFDI="D03" DomicilioFiscalReceptor="32575" RegimenFiscalReceptor="601" />
  <cfdi:Conceptos>
    ${(data.items || []).map((it: any, i: number) => `
    <cfdi:Concepto ClaveProdServ="78102201" NoIdentificacion="P${i+1}" Cantidad="${it.qty || 1}" ClaveUnidad="H87"
      Unidad="${it.unit || 'Servicio'}" Descripcion="${it.desc || 'Servicio'}"
      ValorUnitario="${(it.unitPrice || 0).toFixed(2)}" Importe="${(it.amount || 0).toFixed(2)}"
      ObjetoImp="02">
      <cfdi:Impuestos><cfdi:Traslados>
        <cfdi:Traslado Base="${(it.amount || 0).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${((it.amount||0)*0.16).toFixed(2)}" />
      </cfdi:Traslados></cfdi:Impuestos>
    </cfdi:Concepto>`).join('')}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva.toFixed(2)}">
    <cfdi:Traslados><cfdi:Traslado Base="${subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva.toFixed(2)}" /></cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
    xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/timbrefiscaldigital/TimbreFiscalDigitalv11.xsd"
    Version="1.1" UUID="${uuid}" FechaTimbrado="${fecha}" SelloCFD="Simulado" NoCertificado="0000100000040" SelloSAT="Simulado" /></cfdi:Complemento>
</cfdi:Comprobante>`;
}

export function generateCfdiPdfHtml(data: any): string {
  const subtotal = data.subtotal || 0;
  const iva = data.iva || Math.round(subtotal * 0.16);
  const total = data.total || subtotal + iva;
  const uuid = data.uuid || 'Generado';
  const fecha = data.date || '08-jul-2026';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:'Courier New',monospace;font-size:11px;padding:30px;color:#1a1a1a}
  h1{font-size:16px;text-align:center;border-bottom:3px double #000;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#e0e0e0;font-size:10px;padding:5px 8px;border:1px solid #ccc;text-align:left}
  td{padding:5px 8px;border:1px solid #ccc;font-size:10px}
  .totals{width:300px;margin-left:auto}
  .final{font-weight:bold;background:#f0f0f0}
  .footer{margin-top:20px;font-size:9px;text-align:center;color:#666;border-top:1px solid #ccc;padding-top:10px}
</style></head><body>
<h1>COMPROBANTE FISCAL DIGITAL (CFDI 4.0)</h1>
<p style="text-align:center;font-size:10px">Representación impresa del CFDI · ${fecha}</p>
<hr>
<table><tr>
  <td style="width:50%"><strong>Emisor:</strong> ${data.client || 'Empresa'}<br><strong>RFC:</strong> ${data.clientRfc || 'XXX'}</td>
  <td style="width:50%;text-align:right"><strong>Receptor:</strong> Operadora Logística del Norte<br><strong>RFC:</strong> OLN-220701-ABC<br><strong>UUID:</strong> ${uuid}</td>
</tr></table>
<table><thead><tr><th>#</th><th>Concepto</th><th>Cant</th><th>P.Unitario</th><th>Importe</th><th>IVA</th></tr></thead>
<tbody>
${(data.items || []).map((it: any, i: number) => `<tr><td>${i+1}</td><td>${it.desc || 'Servicio'}</td><td>${it.qty || 1}</td><td>$${formatCurrency(it.unitPrice || 0)}</td><td>$${formatCurrency(it.amount || 0)}</td><td>$${formatCurrency((it.amount||0)*0.16)}</td></tr>`).join('')}
</tbody></table>
<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">$${formatCurrency(subtotal)}</td></tr>
  <tr><td>IVA (16%)</td><td style="text-align:right">$${formatCurrency(iva)}</td></tr>
  <tr class="final"><td>TOTAL</td><td style="text-align:right">$${formatCurrency(total)}</td></tr>
</table>
<div class="footer">CFDI simulado para fines educativos · Sello digital: Simulado<br>Timbre fiscal: Simulado · No tiene validez fiscal real</div>
</body></html>`;
}