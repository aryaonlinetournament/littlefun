import { getSupabaseAdmin } from '../services/supabase/supabaseClient';
import { AuthenticatedUser } from '../middleware/auth';

interface AuditParams {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipHash?: string;
  note?: string;
}

export class AuditService {
  /**
   * Records an admin/privileged action to audit_logs.
   * Non-blocking — failures are logged but do not interrupt the main operation.
   */
  static async log(params: AuditParams): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: params.actorUserId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      ip_hash: params.ipHash ?? null,
    });

    if (error) {
      console.error('[AuditService] Failed to write audit log:', error);
    }
  }

  /**
   * Shorthand for admin actions that also writes to admin_actions table.
   */
  static async adminAction(params: {
    actor: AuthenticatedUser;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    note?: string;
    ipHash?: string;
  }): Promise<void> {
    const supabase = getSupabaseAdmin();

    await Promise.allSettled([
      supabase.from('audit_logs').insert({
        actor_user_id: params.actor.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        old_value: params.oldValue ?? null,
        new_value: params.newValue ?? null,
        ip_hash: params.ipHash ?? null,
      }),
      supabase.from('admin_actions').insert({
        actor_user_id: params.actor.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        note: params.note ?? null,
      }),
    ]);
  }
}

/**
 * Express middleware to add ip_hash to requests for audit use.
 */
import crypto from 'crypto';
export function hashIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
