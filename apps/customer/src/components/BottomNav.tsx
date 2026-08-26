import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../lib/api';

export default function BottomNav() {
  const { data: chatData } = useQuery({
    queryKey: ['chat-unread-count-bottom'],
    queryFn: () => chatApi.getConversations() as Promise<any[]>,
    refetchInterval: 15_000,
  });

  const chatConversations = Array.isArray(chatData) ? chatData : (chatData as any)?.conversations;
  const chatUnread = Array.isArray(chatConversations)
    ? chatConversations.reduce((acc: number, c: any) => acc + (c.unread_count || c.unreadCount || 0), 0)
    : 0;

  return (
    <div className="tab-bottom-nav-wrap">
      <nav className="tab-bottom-nav" aria-label="Main navigation">
        {/* Home */}
        <NavLink
          to="/discover"
          className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}
        >
          <div className="tab-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className="tab-nav-label">Home</span>
        </NavLink>

        {/* Discover */}
        <NavLink
          to="/requests"
          className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}
        >
          <div className="tab-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <span className="tab-nav-label">Discover</span>
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/chat"
          className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}
        >
          <div className="tab-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {chatUnread > 0 && (
              <span className="tab-nav-badge">{chatUnread > 9 ? '9+' : chatUnread}</span>
            )}
          </div>
          <span className="tab-nav-label">Messages</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}
        >
          <div className="tab-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className="tab-nav-label">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}



