/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EmailQueue — Cola persistente de correos con reintentos automáticos.
 *
 * Flujo:
 *  1. EmailProvider intenta enviar via n8n webhook.
 *  2. Si n8n no responde (offline / dormido en free tier), el correo
 *     se encola en Supabase (tabla email_queue) o en memoria como fallback.
 *  3. El worker (startEmailQueueWorker) se ejecuta cada RETRY_INTERVAL_MS
 *     e intenta reenviar los correos pendientes.
 *  4. Una vez enviado exitosamente, el item se marca como 'sent' o se elimina.
 *  5. Después de MAX_RETRIES intentos fallidos, se marca como 'dead' para
 *     evitar acumulación infinita.
 */

import { supabaseAdmin, isSupabaseReady } from './supabaseClient.js';

// ─── Configuración ────────────────────────────────────────────────────────────
const RETRY_INTERVAL_MS  = 2 * 60 * 1000;  // Intentar cada 2 minutos
const MAX_RETRIES        = 10;              // Máximo 10 intentos (~20 min)
const TABLE_NAME         = 'email_queue';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  type: 'credentials' | 'otp';
  retries: number;
  status: 'pending' | 'sent' | 'dead';
  createdAt: string;
  lastAttemptAt?: string;
}

// ─── Fallback en memoria (cuando Supabase no está disponible) ─────────────────
const memoryQueue: QueuedEmail[] = [];

// ─── Helpers internos ─────────────────────────────────────────────────────────

function generateId(): string {
  return `eq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Encola un correo fallido en Supabase o en memoria.
 */
export async function enqueueEmail(params: Omit<QueuedEmail, 'id' | 'retries' | 'status' | 'createdAt'>): Promise<void> {
  const item: QueuedEmail = {
    id:        generateId(),
    ...params,
    retries:   0,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseReady()) {
    try {
      const { error } = await supabaseAdmin.from(TABLE_NAME).insert({
        id:            item.id,
        to_email:      item.to,
        subject:       item.subject,
        html_body:     item.html,
        text_body:     item.text,
        email_type:    item.type,
        retries:       item.retries,
        status:        item.status,
        created_at:    item.createdAt,
      });

      if (error) {
        console.warn('[EmailQueue] No se pudo insertar en Supabase, usando memoria:', error.message);
        memoryQueue.push(item);
      } else {
        console.log(`[EmailQueue] Correo encolado en Supabase → ${item.to} (${item.type})`);
      }
    } catch {
      memoryQueue.push(item);
    }
  } else {
    memoryQueue.push(item);
    console.log(`[EmailQueue] Correo encolado en memoria → ${item.to} (${item.type})`);
  }
}

/**
 * Obtiene los correos pendientes de reintentar.
 */
async function fetchPendingEmails(): Promise<QueuedEmail[]> {
  if (isSupabaseReady()) {
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLE_NAME)
        .select('*')
        .eq('status', 'pending')
        .lt('retries', MAX_RETRIES)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.warn('[EmailQueue] Error leyendo Supabase queue:', error.message);
        return memoryQueue.filter(e => e.status === 'pending' && e.retries < MAX_RETRIES);
      }

      return (data || []).map((row: any) => ({
        id:            row.id,
        to:            row.to_email,
        subject:       row.subject,
        html:          row.html_body,
        text:          row.text_body,
        type:          row.email_type,
        retries:       row.retries,
        status:        row.status,
        createdAt:     row.created_at,
        lastAttemptAt: row.last_attempt_at,
      }));
    } catch {
      return memoryQueue.filter(e => e.status === 'pending' && e.retries < MAX_RETRIES);
    }
  }

  return memoryQueue.filter(e => e.status === 'pending' && e.retries < MAX_RETRIES);
}

/**
 * Actualiza el estado de un item en la cola tras un intento.
 */
async function updateQueueItem(id: string, update: { status?: string; retries: number }): Promise<void> {
  const now = new Date().toISOString();

  if (isSupabaseReady()) {
    try {
      await supabaseAdmin.from(TABLE_NAME).update({
        status:          update.status,
        retries:         update.retries,
        last_attempt_at: now,
      }).eq('id', id);
    } catch (err) {
      console.warn('[EmailQueue] Error actualizando Supabase queue item:', err);
    }
  }

  // Actualizar también en memoria si existe
  const memItem = memoryQueue.find(e => e.id === id);
  if (memItem) {
    memItem.retries = update.retries;
    memItem.lastAttemptAt = now;
    if (update.status) memItem.status = update.status as any;
  }
}

// ─── Worker de reintentos ─────────────────────────────────────────────────────

/**
 * Intenta enviar un correo encolado via el webhook de n8n.
 */
async function attemptSend(email: QueuedEmail, webhookUrl: string, webhookSecret: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({
        to:        email.to,
        subject:   email.subject,
        html:      email.html,
        text:      email.text,
        type:      email.type,
        timestamp: new Date().toISOString(),
        queued:    true,        // indica que es un reintento de cola
        queueId:   email.id,
      }),
      signal: AbortSignal.timeout(60000), // timeout de 60s (n8n cold start)
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Ciclo principal del worker. Procesa la cola de correos pendientes.
 */
async function processQueue(): Promise<void> {
  const webhookUrl    = process.env.N8N_EMAIL_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || '';

  if (!webhookUrl) return; // Sin webhook configurado, no hay nada que reintentar

  const pending = await fetchPendingEmails();
  if (pending.length === 0) return;

  console.log(`[EmailQueue] Worker: ${pending.length} correo(s) pendiente(s), intentando reenvío...`);

  for (const email of pending) {
    const newRetries = email.retries + 1;
    const sent = await attemptSend(email, webhookUrl, webhookSecret);

    if (sent) {
      console.log(`[EmailQueue] ✅ Enviado → ${email.to} (intento ${newRetries})`);
      await updateQueueItem(email.id, { status: 'sent', retries: newRetries });
    } else {
      const newStatus = newRetries >= MAX_RETRIES ? 'dead' : 'pending';
      if (newStatus === 'dead') {
        console.warn(`[EmailQueue] ☠️ Correo muerto tras ${newRetries} intentos → ${email.to}`);
      } else {
        console.log(`[EmailQueue] ⏳ Reintento ${newRetries}/${MAX_RETRIES} fallido → ${email.to}`);
      }
      await updateQueueItem(email.id, { status: newStatus, retries: newRetries });
    }

    // Pequeña pausa entre envíos para no saturar n8n
    await new Promise(r => setTimeout(r, 500));
  }
}

/**
 * Inicia el worker de reintentos en segundo plano.
 * Llamar una sola vez al arrancar el servidor.
 */
export function startEmailQueueWorker(): void {
  console.log(`[EmailQueue] Worker iniciado — reintentos cada ${RETRY_INTERVAL_MS / 1000}s, máx ${MAX_RETRIES} intentos`);

  // Primera ejecución al arrancar (por si hay pendientes de antes)
  setTimeout(() => processQueue(), 15_000);

  // Ciclo recurrente
  setInterval(() => processQueue(), RETRY_INTERVAL_MS);
}

/**
 * Retorna estadísticas actuales de la cola (para endpoint de diagnóstico).
 */
export async function getQueueStats(): Promise<{ pending: number; sent: number; dead: number; source: 'supabase' | 'memory' }> {
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin
        .from(TABLE_NAME)
        .select('status');

      if (data) {
        return {
          pending: data.filter((r: any) => r.status === 'pending').length,
          sent:    data.filter((r: any) => r.status === 'sent').length,
          dead:    data.filter((r: any) => r.status === 'dead').length,
          source:  'supabase',
        };
      }
    } catch { /* fallback */ }
  }

  return {
    pending: memoryQueue.filter(e => e.status === 'pending').length,
    sent:    memoryQueue.filter(e => e.status === 'sent').length,
    dead:    memoryQueue.filter(e => e.status === 'dead').length,
    source:  'memory',
  };
}
