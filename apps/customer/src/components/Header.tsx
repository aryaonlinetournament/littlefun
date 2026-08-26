import { useQuery } from '@tanstack/react-query';
import { notificationsApi, chatApi } from '../lib/api';
import { Link } from 'react-router-dom';

export default function Header() {
  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notificationsApi.list() as Promise<{ unreadCount: number }>,
    refetchInterval: 30_000,
  });

  const { data: chatData } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: () => chatApi.getConversations() as Promise<any[]>,
    refetchInterval: 15_000,
  });

  const notifUnread = (notifData as { unreadCount: number })?.unreadCount ?? 0;
  
  const chatConversations = Array.isArray(chatData) ? chatData : (chatData as any)?.conversations;
  const chatUnread = Array.isArray(chatConversations)
    ? chatConversations.reduce((acc: number, c: any) => acc + (c.unread_count || c.unreadCount || 0), 0)
    : 0;

  return (
    <header className="earnhub-header">
      {/* Left: Brand Logo matching screenshot */}
      <Link to="/discover" className="earnhub-brand">
        <div className="earnhub-logo-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="earnhub-logo-text">
          L<span className="dot-i-wrap">ı<svg className="i-heart-dot" viewBox="0 0 24 24" fill="#FF2A7A"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>ttle&nbsp;<span className="pink-text">Fun</span>
        </div>
      </Link>

      {/* Right Action Buttons matching screenshot */}
      <div className="earnhub-header-actions">
        <Link to="/notifications" className="earnhub-action-btn" title="Notifications">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifUnread > 0 && <span className="action-badge">{notifUnread > 9 ? '9+' : notifUnread}</span>}
        </Link>

        <Link to="/chat" className="earnhub-action-btn" title="Messages">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {chatUnread > 0 && <span className="action-badge">{chatUnread > 9 ? '9+' : chatUnread}</span>}
        </Link>
      </div>
    </header>
  );
}



