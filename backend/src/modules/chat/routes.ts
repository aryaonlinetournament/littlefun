import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { EntitlementService } from '../../services/EntitlementService';
import { NotificationService } from '../../services/notifications/NotificationService';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';

export const chatRouter = Router();

const uploadAttachmentMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── POST /api/conversations ───────────────────────────────────────
// Creates a new conversation OR returns the existing one between two users
chatRouter.post(
  '/',
  requireAuth,
  validateBody(z.object({ otherUserId: z.string().min(1) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const userId = req.user!.id;
    const { otherUserId } = req.body;

    // Check if a conversation already exists between these two users
    const { data: existing } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    const myConvIds = (existing ?? []).map((m: { conversation_id: string }) => m.conversation_id);

    let foundConvId: string | null = null;
    if (myConvIds.length > 0) {
      const { data: otherMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds);

      if (otherMemberships && otherMemberships.length > 0) {
        foundConvId = (otherMemberships[0] as { conversation_id: string }).conversation_id;
      }
    }

    if (foundConvId) {
      return res.json({ success: true, conversationId: foundConvId, isNew: false });
    }

    // ── Authorization: must be matched before chatting ──────────
    // Prevents spam DMs to strangers
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(user_a_id.eq.${userId},user_b_id.eq.${otherUserId}),` +
        `and(user_a_id.eq.${otherUserId},user_b_id.eq.${userId})`
      )
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!match) {
      res.status(403).json({
        success: false,
        error: { code: 'NOT_MATCHED', message: 'You must be matched to start a conversation.' },
      });
      return;
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single();

    if (convErr) throw convErr;

    // Add both members
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    return res.status(201).json({ success: true, conversationId: conv.id, isNew: true });
  }
);

// ── POST /api/conversations/:id/attachments ───────────────────────
chatRouter.post(
  '/:id/attachments',
  requireAuth,
  uploadAttachmentMiddleware.single('file'),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No file provided' } });
      return;
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!membership) throw new ForbiddenError('You are not a member of this conversation.');

    const ext = req.file.mimetype.split('/')[1] ?? 'jpg';
    const filePath = `${req.params.id}/${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (storageError) throw storageError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    res.status(201).json({ success: true, url: publicUrl });
  }
);


chatRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      conversation_id,
      muted,
      conversations(
        id, created_at, updated_at,
        messages(id, content, message_type, sender_id, created_at)
      )
    `)
    .eq('user_id', userId)
    .order('conversations(updated_at)', { ascending: false });

  if (error) throw error;

  // For each conversation, get the other member's profile
  const convIds = (data || []).map((m: { conversation_id: string }) => m.conversation_id);
  
  const { data: otherMembers } = convIds.length > 0
    ? await supabase
        .from('conversation_members')
        .select('conversation_id, user_id, profiles(id, display_name, profile_photos(url, is_primary))')
        .in('conversation_id', convIds)
        .neq('user_id', userId)
    : { data: [] };

  const otherMap = new Map(
    (otherMembers || []).map((m: { conversation_id: string; profiles: unknown }) => [m.conversation_id, m.profiles])
  );

  const conversations = (data || []).map((m: Record<string, unknown>) => ({
    ...(m.conversations as Record<string, unknown>),
    muted: m.muted,
    otherUser: otherMap.get(m.conversation_id as string) ?? null,
    // Return last message only
    lastMessage: ((m.conversations as Record<string, unknown[]>)?.messages ?? []).slice(-1)[0] ?? null,
    messages: undefined,
  }));

  res.json({ success: true, conversations });
});

// ── GET /api/conversations/:id/messages ──────────────────────────
chatRouter.get('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;

  // Verify membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', req.params.id)
    .eq('user_id', userId)
    .single();

  if (!membership) throw new ForbiddenError('You are not a member of this conversation.');

  const { before, limit = 50 } = req.query;
  // Clamp: max 100 messages per page request
  const safeLimit = Math.min(Math.max(1, Number(limit)), 100);

  let query = supabase
    .from('messages')
    .select(`
      id, conversation_id, sender_id, message_type, content, attachment_url,
      created_at, edited_at, deleted_at,
      profiles(display_name, profile_photos(url, is_primary))
    `)
    .eq('conversation_id', req.params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (before) {
    query = query.lt('created_at', before as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Mark as read
  const messageIds = (data || []).map((m: { id: string }) => m.id);
  if (messageIds.length > 0) {
    await supabase.from('message_reads').upsert(
      messageIds.map((id) => ({ message_id: id, user_id: userId })),
      { onConflict: 'message_id,user_id' }
    );
  }

  res.json({ success: true, messages: (data || []).reverse() });
});

// ── POST /api/conversations/:id/messages ─────────────────────────
const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  message_type: z.enum(['TEXT', 'IMAGE', 'AUDIO']).default('TEXT'),
  attachment_url: z.string().url().optional(),
}).refine((d) => d.content || d.attachment_url, {
  message: 'Message must have content or attachment.',
});

chatRouter.post(
  '/:id/messages',
  requireAuth,
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const userId = req.user!.id;

    // Check chat entitlement
    const canChat = await EntitlementService.canSendMessage(req.user!);
    if (!canChat) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CHAT_NOT_AVAILABLE',
          message: 'Upgrade your plan to send messages.',
        },
      });
      return;
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!membership) throw new ForbiddenError('You are not a member of this conversation.');

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: req.params.id,
        sender_id: userId,
        message_type: req.body.message_type,
        content: req.body.content ?? null,
        attachment_url: req.body.attachment_url ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation updated_at (for sorting)
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    // Notify the other member
    const { data: otherMember } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', req.params.id)
      .neq('user_id', userId)
      .single();

    if (otherMember) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();

      await NotificationService.newMessage(
        otherMember.user_id,
        myProfile?.display_name ?? 'Someone',
        req.params.id
      );
    }

    res.status(201).json({ success: true, message });
  }
);

// ── DELETE /api/conversations/:convId/messages/:msgId ────────────
chatRouter.delete(
  '/:convId/messages/:msgId',
  requireAuth,
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();

    const { data: msg } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('id', req.params.msgId)
      .eq('conversation_id', req.params.convId)
      .single();

    if (!msg) throw new NotFoundError('Message');
    if (msg.sender_id !== req.user!.id) throw new ForbiddenError('Cannot delete another user\'s message.');

    // Soft delete
    await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', msg.id);

    res.json({ success: true });
  }
);

// ── POST /api/conversations/:id/mute ─────────────────────────────
chatRouter.post('/:id/mute', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('conversation_members')
    .update({ muted: true })
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user!.id);

  res.json({ success: true });
});
