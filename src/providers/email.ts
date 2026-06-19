/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class EmailProvider {
  /**
   * Envía un correo electrónico utilizando el webhook de n8n o imprimiendo en consola como fallback.
   */
  static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: 'credentials' | 'otp';
  }): Promise<boolean> {
    const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log(`
[Email Sandbox Fallback]
Destinatario: ${params.to}
Asunto: ${params.subject}
Tipo: ${params.type}
--------------------------------------------------
${params.text}
--------------------------------------------------
(Configura la variable de entorno N8N_EMAIL_WEBHOOK_URL en producción para enviar correos reales)
`);
      return true;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-n8n-webhook-secret': process.env.N8N_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          type: params.type,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.error(`[Email Provider] Error al llamar al webhook de n8n: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log(`[Email Provider] Correo enviado exitosamente a ${params.to} vía n8n webhook.`);
      return true;
    } catch (err) {
      console.error('[Email Provider] Fallo de red al conectar con n8n:', err);
      return false;
    }
  }
}
