import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

interface Achiever {
  id: string;
  rank_num: number;
  name: string;
  avatar_url: string;
  city: string;
  meetups_count: string;
  rating: string;
  earnings_amount: string;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_ADMIN_ACHIEVERS: Achiever[] = [
  { id: 'ach-1', rank_num: 1, name: 'Priya Sharma', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop', city: 'Delhi NCR', meetups_count: '34 Meets Completed', rating: '4.9 ★', earnings_amount: '34 Meets', is_active: true, created_at: new Date().toISOString() },
  { id: 'ach-2', rank_num: 2, name: 'Meera Nair', avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80&auto=format&fit=crop', city: 'Mumbai', meetups_count: '47 Meets Completed', rating: '5.0 ★', earnings_amount: '47 Meets', is_active: true, created_at: new Date().toISOString() },
  { id: 'ach-3', rank_num: 3, name: 'Ananya Patel', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80&auto=format&fit=crop', city: 'Gurgaon', meetups_count: '22 Meets Completed', rating: '4.8 ★', earnings_amount: '22 Meets', is_active: true, created_at: new Date().toISOString() },
  { id: 'ach-4', rank_num: 4, name: 'Simran Kaur', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80&auto=format&fit=crop', city: 'Chandigarh', meetups_count: '19 Meets Completed', rating: '4.9 ★', earnings_amount: '19 Meets', is_active: true, created_at: new Date().toISOString() },
  { id: 'ach-5', rank_num: 5, name: 'Riya Sen', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80&auto=format&fit=crop', city: 'Bengaluru', meetups_count: '28 Meets Completed', rating: '4.7 ★', earnings_amount: '28 Meets', is_active: true, created_at: new Date().toISOString() },
];

export default function AchieversPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAchiever, setEditingAchiever] = useState<Achiever | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formEarnings, setFormEarnings] = useState('');
  const [formMeetups, setFormMeetups] = useState('20 Meets Completed');
  const [formRating, setFormRating] = useState('4.9 ★');
  const [formRank, setFormRank] = useState(1);
  const [formAvatar, setFormAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop');

  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['admin-achievers'],
    queryFn: () => adminApi.achievers() as Promise<{ achievers: Achiever[] }>,
    retry: 1,
  });

  const apiAchievers: Achiever[] = (queryResult as { achievers: Achiever[] })?.achievers ?? [];
  const achieversList: Achiever[] = apiAchievers.length > 0 ? apiAchievers : DEFAULT_ADMIN_ACHIEVERS;

  const openCreateModal = () => {
    setEditingAchiever(null);
    setFormName('');
    setFormCity('');
    setFormEarnings('25 Meets');
    setFormMeetups('25 Meets Completed');
    setFormRating('4.9 ★');
    setFormRank((achieversList.length || 0) + 1);
    setFormAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop');
    setModalOpen(true);
  };

  const openEditModal = (achiever: Achiever) => {
    setEditingAchiever(achiever);
    setFormName(achiever.name);
    setFormCity(achiever.city);
    setFormEarnings(achiever.earnings_amount);
    setFormMeetups(achiever.meetups_count);
    setFormRating(achiever.rating);
    setFormRank(achiever.rank_num);
    setFormAvatar(achiever.avatar_url);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        city: formCity,
        earnings_amount: formEarnings,
        meetups_count: formMeetups,
        rating: formRating,
        rank_num: formRank,
        avatar_url: formAvatar,
      };

      if (editingAchiever) {
        return adminApi.updateAchiever(editingAchiever.id, payload);
      } else {
        return adminApi.createAchiever(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievers'] });
      queryClient.invalidateQueries({ queryKey: ['top-achievers'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => adminApi.deleteAchiever(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievers'] });
      queryClient.invalidateQueries({ queryKey: ['top-achievers'] });
    },
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">🏆 Top Achievers Leaderboard</h1>
          <p className="admin-page-sub">
            Manage the top activity achievers displayed in the Home page Hall of Fame leaderboard (Ranks, Names, Cities, Earnings & Avatars).
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>➕</span> Add New Top Achiever
        </button>
      </div>

      {isLoading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Rank</th>
                <th>Companion</th>
                <th>City / Location</th>
                <th>Meetups Count</th>
                <th>Monthly Completed Meets</th>
                <th>Rating</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {achieversList.map((achiever) => (
                <tr key={achiever.id}>
                  <td>
                    <span className="badge badge-warning" style={{ fontWeight: 800 }}>
                      #{achiever.rank_num}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={achiever.avatar_url}
                        alt={achiever.name}
                        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-border)' }}
                      />
                      <span style={{ fontWeight: 700 }}>{achiever.name}</span>
                    </div>
                  </td>
                  <td>📍 {achiever.city}</td>
                  <td>{achiever.meetups_count}</td>
                  <td><strong style={{ color: '#16A34A', fontSize: '0.95rem' }}>{achiever.earnings_amount}</strong></td>
                  <td><span style={{ color: '#D97706', fontWeight: 700 }}>{achiever.rating}</span></td>
                  <td>
                    <span className={`badge ${achiever.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {achiever.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEditModal(achiever)}>
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => {
                          if (confirm(`Remove ${achiever.name} from Top Achievers?`)) {
                            deleteMutation.mutate(achiever.id);
                          }
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="admin-modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="admin-modal-content" style={{
            background: 'var(--color-surface)', borderRadius: 12, padding: 24,
            maxWidth: 480, width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>
              {editingAchiever ? '✏️ Edit Top Achiever' : '🏆 Add New Top Achiever'}
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rank Number</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formRank}
                    onChange={(e) => setFormRank(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Companion Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Priya Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>City / Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Delhi NCR"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Monthly Completed Meets</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 34 Meets"
                    value={formEarnings}
                    onChange={(e) => setFormEarnings(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Meetups Count</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 34 Meetups"
                    value={formMeetups}
                    onChange={(e) => setFormMeetups(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rating</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 4.9 ★"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Avatar Image URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingAchiever ? 'Update Achiever' : 'Create Achiever'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
