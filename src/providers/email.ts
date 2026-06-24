/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EmailProvider — Envía correos vía webhook de n8n.
 * Si n8n no está disponible (dormido en free tier), encola el correo
 * para reintento automático a través del EmailQueueWorker.
 */

import { enqueueEmail } from '../lib/emailQueue.js';

export class EmailProvider {
  /**
   * Envía un correo electrónico utilizando el webhook de n8n.
   *
   * Comportamiento:
   *  - Si N8N_EMAIL_WEBHOOK_URL no está configurada → imprime en consola (sandbox).
   *  - Si n8n responde OK → correo enviado exitosamente.
   *  - Si n8n no responde o da error → correo encolado para reintento automático.
   *
   * Siempre retorna `true` para no bloquear el flujo principal del servidor.
   * El estado real del envío se puede consultar via GET /api/health/email-queue.
   */
  static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: 'credentials' | 'otp';
  }): Promise<boolean> {
    const webhookUrl    = process.env.N8N_EMAIL_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET || '';

    // ── Modo sandbox (sin webhook configurado) ───────────────────────────────
    if (!webhookUrl) {
      console.log(`
[Email Sandbox Fallback]
Destinatario: ${params.to}
Asunto:       ${params.subject}
Tipo:         ${params.type}
--------------------------------------------------
${params.text}
--------------------------------------------------
(Configura N8N_EMAIL_WEBHOOK_URL en producción para enviar correos reales)
`);
      return true;
    }

    // ── Intento directo al webhook de n8n ────────────────────────────────────
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type':          'application/json',
          'x-n8n-webhook-secret':  webhookSecret,
        },
        body: JSON.stringify({
          to:        params.to,
          subject:   params.subject,
          html:      params.html,
          text:      params.text,
          type:      params.type,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(60000), // timeout de 60s (n8n cold start)
      });

      if (response.ok) {
        console.log(`[EmailProvider] ✅ Correo enviado → ${params.to} (${params.type})`);
        return true;
      }

      // n8n respondió pero con error HTTP
      console.warn(`[EmailProvider] ⚠️ n8n respondió con ${response.status} para ${params.to}. Encolando...`);
    } catch (err: any) {
      // n8n no respondió (dormido, timeout, red caída)
      const reason = err?.name === 'TimeoutError' ? 'timeout (n8n dormido)' : err?.message || 'error de red';
      console.warn(`[EmailProvider] ⚠️ n8n no disponible (${reason}). Encolando correo para ${params.to}...`);
    }

    // ── Encolar para reintento automático ────────────────────────────────────
    try {
      await enqueueEmail({
        to:      params.to,
        subject: params.subject,
        html:    params.html,
        text:    params.text,
        type:    params.type,
      });
      console.log(`[EmailProvider] 📬 Correo encolado → ${params.to} (se enviará cuando n8n esté activo)`);
    } catch (queueErr) {
      console.error('[EmailProvider] ❌ Error al encolar correo:', queueErr);
    }

    // Retorna true para no bloquear el flujo principal (la cuenta se crea igual)
    return true;
  }
}
