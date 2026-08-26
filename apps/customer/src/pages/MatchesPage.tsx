import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function MatchesPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list() as Promise<{ matches: Match[] }>,
  });

  type Match = {
    id: string;
    created_at: string;
    otherUser: { id: string; display_name: string; profile_photos: { url: string; is_primary: boolean }[] } | null;
    conversations: { id: string; messages: { content: string; created_at: string; sender_id: string }[] }[];
  };

  const matches: Match[] = (data as { matches: Match[] })?.matches ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">Matches</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-3)' }}>{matches.length} connections</span>
      </div>

      <div className="page-content">
        {isLoading ? (
          <div className="app-loading" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : matches.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: '4rem' }}>
            <div className="empty-state-icon">💛</div>
            <div className="empty-state-title">No matches yet</div>
            <div className="empty-state-body">Start discovering and liking profiles to create your first match!</div>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}
              onClick={() => navigate('/discover')}>
              Start Discovering →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {matches.map((match: Match) => {
              const other = match.otherUser;
              const photo = other?.profile_photos?.find((p) => p.is_primary)?.url ??
                            other?.profile_photos?.[0]?.url;
              const lastMsg = match.conversations?.[0]?.messages?.slice(-1)[0];
              const convId = match.conversations?.[0]?.id;

              return (
                <div key={match.id} className="match-card"
                  onClick={() => convId ? navigate(`/chat/${convId}`) : navigate('/chat')}>
                  {photo ? (
                    <img className="match-avatar" src={photo} alt={other?.display_name} />
                  ) : (
                    <div className="match-avatar-placeholder">
                      {(other?.display_name ?? 'U')[0]}
                    </div>
                  )}
                  <div className="match-info">
                    <div className="match-name">{other?.display_name ?? 'Someone'}</div>
                    <div className="match-last-message">
                      {lastMsg?.content ?? 'Tap to say hello! 👋'}
                    </div>
                  </div>
                  <div className="match-time" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'New!'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
