import { getSupabaseAdmin } from '../supabase/supabaseClient';
import { sendFcmMulticast } from '../firebase/firebaseAdmin';
import type { NotificationType } from '../../types';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class NotificationService {
  /**
   * Sends a notification to a user:
   * 1. Persists to `notifications` table (source of truth)
   * 2. Delivers via FCM if device tokens exist
   */
  static async send(params: SendNotificationParams): Promise<void> {
    const supabase = getSupabaseAdmin();

    // 1. Persist to database
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
    });

    if (dbError) {
      console.error('[NotificationService] Failed to persist notification:', dbError);
    }

    // 2. Fetch device tokens for FCM delivery
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', params.userId);

    if (!tokens || tokens.length === 0) return;

    const tokenStrings = tokens.map((t: { token: string }) => t.token);

    try {
      const response = await sendFcmMulticast({
        tokens: tokenStrings,
        title: params.title,
        body: params.body,
        data: params.data,
      });

      // Remove invalid/expired tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokenStrings[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await supabase
          .from('device_tokens')
          .delete()
          .in('token', invalidTokens);
      }
    } catch (err) {
      console.error('[NotificationService] FCM delivery failed:', err);
      // Notification already in DB — not a critical failure
    }
  }

  /**
   * Sends to multiple users (e.g., both match parties).
   */
  static async sendBulk(notifications: SendNotificationParams[]): Promise<void> {
    await Promise.allSettled(notifications.map((n) => NotificationService.send(n)));
  }

  /**
   * Convenience factories for common notification types.
   */
  static newMatch(userId: string, matchedName: string, matchId: string) {
    return NotificationService.send({
      userId,
      type: 'NEW_MATCH',
      title: "It's a Match! 🎉",
      body: `You and ${matchedName} liked each other.`,
      data: { matchId, type: 'NEW_MATCH' },
    });
  }

  static newMessage(userId: string, senderName: string, conversationId: string) {
    return NotificationService.send({
      userId,
      type: 'NEW_MESSAGE',
      title: `New message from ${senderName}`,
      body: 'Tap to view your conversation.',
      data: { conversationId, type: 'NEW_MESSAGE' },
    });
  }

  static requestReceived(userId: string, senderName: string, requestId: string) {
    return NotificationService.send({
      userId,
      type: 'REQUEST_RECEIVED',
      title: 'New Connection Request',
      body: `${senderName} sent you a connection request.`,
      data: { requestId, type: 'REQUEST_RECEIVED' },
    });
  }

  static requestAccepted(userId: string, profileName: string, requestId: string) {
    return NotificationService.send({
      userId,
      type: 'REQUEST_ACCEPTED',
      title: 'Request Accepted! ✅',
      body: `${profileName} accepted your connection request.`,
      data: { requestId, type: 'REQUEST_ACCEPTED' },
    });
  }

  static requestRejected(userId: string, requestId: string) {
    return NotificationService.send({
      userId,
      type: 'REQUEST_REJECTED',
      title: 'Request Update',
      body: 'Your connection request could not be fulfilled.',
      data: { requestId, type: 'REQUEST_REJECTED' },
    });
  }

  static profileVerified(userId: string) {
    return NotificationService.send({
      userId,
      type: 'PROFILE_VERIFIED',
      title: 'Profile Verified ✅',
      body: 'Your profile has been verified. You now appear in discovery.',
      data: { type: 'PROFILE_VERIFIED' },
    });
  }
}
