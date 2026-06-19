import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Supabase soporta dos formatos de clave de service role:
//   - Nuevo (recomendado): "sb_secret_..."  — revocable fácilmente desde el dashboard
//   - Legacy (JWT clásico): "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
// Ambos son válidos con @supabase/supabase-js v2. El nuevo formato es preferido
// porque se puede rotar sin regenerar el JWT secret del proyecto.

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      // Fuerza el uso del service role para bypasear RLS en operaciones de admin
      'X-Client-Info': 'aura-fi-backend/1.0'
    }
  }
});

/**
 * Verifica si Supabase está configurado correctamente con credenciales reales.
 * Acepta tanto el formato nuevo (sb_secret_...) como el legacy (eyJ...).
 */
export function isSupabaseReady(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return false;
  if (url.includes('placeholder')) return false;
  if (key.includes('placeholder')) return false;

  // Acepta formato nuevo: sb_secret_...
  const isNewFormat = key.startsWith('sb_secret_');
  // Acepta formato legacy JWT: eyJ...
  const isLegacyJWT = key.startsWith('eyJ');

  return isNewFormat || isLegacyJWT;
}
