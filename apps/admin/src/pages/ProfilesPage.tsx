import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  profile_type: string;
  discovery_status: string;
  verification_status: string;
  profile_completion: number;
  is_featured: boolean;
  city_id: string | null;
  created_at: string;
};

export type DummyProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  avatar: string;
  state: string;
  city: string;
  area: string;
  distanceKm: number;
  hourlyRate: number;
  bio: string;
  occupation: string;
  likes?: string[];
  isActive: boolean;
  visibleInAreas: string[];
};

export const ALL_INDIAN_STATES = [
  'Delhi NCR', 'Maharashtra', 'Karnataka', 'Haryana', 'Uttar Pradesh',
  'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Telangana',
  'Punjab', 'Kerala', 'Madhya Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh',
  'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Himachal Pradesh',
  'Jammu & Kashmir', 'Jharkhand', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Sikkim', 'Tripura', 'Uttarakhand', 'Chandigarh'
];

const DISC_OPTIONS = ['VISIBLE', 'HIDDEN', 'PAUSED', 'PENDING_REVIEW'];

const INITIAL_DUMMY_PROFILES: DummyProfile[] = [
  {
    id: 'dp-1',
    name: 'Priya Sharma',
    age: 24,
    gender: 'FEMALE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop',
    state: 'Delhi NCR',
    city: 'Delhi',
    area: 'Connaught Place',
    distanceKm: 25,
    hourlyRate: 2500,
    bio: 'Coffee walks, art galleries & tech networking in CP / South Delhi.',
    occupation: 'UI/UX Designer',
    isActive: true,
    visibleInAreas: ['Connaught Place', 'Hauz Khas', 'Saket'],
  },
  {
    id: 'dp-2',
    name: 'Meera Nair',
    age: 26,
    gender: 'FEMALE',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80&auto=format&fit=crop',
    state: 'Maharashtra',
    city: 'Mumbai',
    area: 'Bandra West',
    distanceKm: 32,
    hourlyRate: 3500,
    bio: 'Foodie, concert lover, and spontaneous city explorer.',
    occupation: 'Marketing Manager',
    isActive: true,
    visibleInAreas: ['Bandra West', 'Juhu', 'Lower Parel'],
  },
  {
    id: 'dp-3',
    name: 'Ananya Patel',
    age: 23,
    gender: 'FEMALE',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80&auto=format&fit=crop',
    state: 'Haryana',
    city: 'Gurgaon',
    area: 'DLF Cyber City',
    distanceKm: 45,
    hourlyRate: 2800,
    bio: 'Yoga instructor & tech enthusiast. Love weekend coffee dates.',
    occupation: 'Yoga Instructor',
    isActive: true,
    visibleInAreas: ['DLF Cyber City', 'Golf Course Road'],
  }
];

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'real' | 'dummy'>('dummy');
  const [search, setSearch] = useState('');
  const [discoveryStatus, setDiscoveryStatus] = useState('');
  const [type, setType] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dummy Profiles State connected to Backend API
  const { data: dummyData } = useQuery({
    queryKey: ['admin-dummy-profiles'],
    queryFn: () => adminApi.dummyProfiles() as Promise<{ profiles: DummyProfile[] }>,
  });

  const dummyProfiles: DummyProfile[] = (dummyData as { profiles: DummyProfile[] })?.profiles ?? INITIAL_DUMMY_PROFILES;

  const [editingDummy, setEditingDummy] = useState<DummyProfile | null>(null);
  const [showDummyModal, setShowDummyModal] = useState(false);

  const [dummyForm, setDummyForm] = useState<Partial<DummyProfile>>({
    name: '',
    age: 24,
    gender: 'FEMALE',
    avatar: '',
    state: 'Delhi NCR',
    city: 'Delhi',
    area: 'Connaught Place',
    distanceKm: 25,
    hourlyRate: 2500,
    bio: '',
    occupation: 'Software Engineer',
    isActive: true,
    visibleInAreas: [],
  });

  const saveDummyMutation = useMutation({
    mutationFn: (data: Partial<DummyProfile>) =>
      editingDummy
        ? adminApi.updateDummyProfile(editingDummy.id, data as Record<string, unknown>)
        : adminApi.createDummyProfile(data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dummy-profiles'] });
      setShowDummyModal(false);
    },
  });

  const deleteDummyMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDummyProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-dummy-profiles'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateDummyProfile(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-dummy-profiles'] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['profiles-admin', search, discoveryStatus, type],
    queryFn: () => adminApi.profiles({ search, discovery_status: discoveryStatus, profile_type: type }) as Promise<{ profiles: Profile[]; total: number }>,
  });

  const profiles: Profile[] = (data as { profiles: Profile[] })?.profiles ?? [];

  const discoveryMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.setProfileDiscovery(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles-admin'] }),
  });

  const featuredMutation = useMutation({
    mutationFn: ({ id, is_featured }: { id: string; is_featured: boolean }) => adminApi.setProfileFeatured(id, is_featured),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles-admin'] }),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ action }: { action: string }) => adminApi.bulkUpdateProfiles(Array.from(selectedIds), action),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles-admin'] }); setSelectedIds(new Set()); },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const openCreateDummyModal = () => {
    setEditingDummy(null);
    setDummyForm({
      name: '',
      age: 24,
      gender: 'FEMALE',
      hourlyRate: 2500,
      bio: 'Loves coffee, cafe hangouts, and good conversations.',
      isActive: true,
    });
    setShowDummyModal(true);
  };

  const openEditDummyModal = (dp: DummyProfile) => {
    setEditingDummy(dp);
    setDummyForm({ ...dp });
    setShowDummyModal(true);
  };

  const handleSaveDummyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dummyForm.name) return;
    saveDummyMutation.mutate(dummyForm);
  };

  const deleteDummyProfile = (id: string) => {
    if (confirm('Delete this dummy companion profile?')) {
      deleteDummyMutation.mutate(id);
    }
  };

  const toggleDummyActive = (dp: DummyProfile) => {
    toggleActiveMutation.mutate({ id: dp.id, isActive: !dp.isActive });
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Profile Management</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Design dummy companion profiles, edit rates, and control area visibility.
          </div>
        </div>

        {activeTab === 'dummy' ? (
          <button className="btn btn-primary btn-sm" onClick={openCreateDummyModal}>
            ✨ + Design Dummy Profile
          </button>
        ) : selectedIds.size > 0 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-3)', alignSelf: 'center' }}>{selectedIds.size} selected</span>
            <button className="btn btn-success btn-sm" onClick={() => bulkMutation.mutate({ action: 'VISIBLE' })}>Show All</button>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkMutation.mutate({ action: 'HIDDEN' })}>Hide All</button>
          </div>
        ) : null}
      </div>

      <div className="admin-page-content">
        {/* Navigation Tabs: Dummy Companion Profiles vs Real User Profiles */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            className={`btn ${activeTab === 'dummy' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('dummy')}
          >
            🎭 Dummy Companion Profiles ({dummyProfiles.length})
          </button>
          <button
            className={`btn ${activeTab === 'real' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('real')}
          >
            👥 Registered User Profiles ({profiles.length})
          </button>
        </div>

        {activeTab === 'dummy' ? (
          /* Dummy Profiles Manager */
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Companion</th>
                  <th>Dynamic Location (Auto ~25 km)</th>
                  <th>Hourly Rate (₹)</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dummyProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>
                      No dummy companion profiles designed yet. Click <strong>"+ Design Dummy Profile"</strong> above.
                    </td>
                  </tr>
                ) : (
                  dummyProfiles.map((dp) => (
                    <tr key={dp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%', background: '#FCE7F3',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', border: '2px solid #EC4899', flexShrink: 0
                          }}>
                            👤
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{dp.name}, {dp.age}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{dp.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#EFF6FF', color: '#1D4ED8', padding: '3px 9px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                          📍 Customer Nearby (~25 km)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                          🌐 Auto-matches viewer (Delhi, Mumbai, etc.)
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#16A34A', fontSize: '0.95rem' }}>
                          ₹{dp.hourlyRate.toLocaleString('en-IN')} / hr
                        </strong>
                      </td>
                      <td>
                        <button
                          className={`btn btn-xs ${dp.isActive ? 'btn-success' : 'btn-ghost'}`}
                          onClick={() => toggleDummyActive(dp)}
                        >
                          {dp.isActive ? '✓ Active in Discovery' : '⬤ Hidden'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => openEditDummyModal(dp)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-xs btn-outline"
                            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                            onClick={() => deleteDummyProfile(dp.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Real User Profiles View */
          <>
            <div className="filters-bar">
              <input className="filter-input" placeholder="Search name, email…" value={search}
                onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 280 }} />
              <select className="filter-input" value={discoveryStatus} onChange={(e) => setDiscoveryStatus(e.target.value)} style={{ minWidth: 'auto' }}>
                <option value="">All Discovery</option>
                {DISC_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="filter-input" value={type} onChange={(e) => setType(e.target.value)} style={{ minWidth: 'auto' }}>
                <option value="">All Types</option>
                {['REAL_PERSON', 'PROVIDER', 'AI_ASSISTED', 'SIMULATED'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="admin-table-wrap">
              {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(profiles.map((p) => p.id)));
                        else setSelectedIds(new Set());
                      }} /></th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Discovery</th>
                      <th>Verification</th>
                      <th>Completion</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p: Profile) => (
                      <tr key={p.id}>
                        <td><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                        <td style={{ fontWeight: 500 }}>{p.display_name}</td>
                        <td><span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{p.profile_type}</span></td>
                        <td>
                          <select className="filter-input" value={p.discovery_status}
                            onChange={(e) => discoveryMutation.mutate({ id: p.id, status: e.target.value })}
                            style={{ padding: '4px 10px', minWidth: 'auto', fontSize: '0.78rem' }}>
                            {DISC_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <span className={`badge ${p.verification_status === 'APPROVED' ? 'badge-success' : p.verification_status === 'PENDING' ? 'badge-info' : 'badge-neutral'}`}>
                            {p.verification_status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p.profile_completion}%`, background: p.profile_completion >= 50 ? 'var(--success)' : 'var(--warning)', borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{p.profile_completion}%</span>
                          </div>
                        </td>
                        <td>
                          <button className={`btn btn-xs ${p.is_featured ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => featuredMutation.mutate({ id: p.id, is_featured: !p.is_featured })}>
                            {p.is_featured ? '⭐ Yes' : '☆ No'}
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-xs btn-outline"
                            onClick={() => window.open(`/api/profiles/${p.id}`, '_blank')}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Dummy Profile Modal */}
      {showDummyModal && (
        <div className="modal-overlay" onClick={() => setShowDummyModal(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editingDummy ? '✏️ Edit Dummy Companion Profile' : '✨ Design New Dummy Profile'}
            </div>

            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8,
              padding: '10px 14px', fontSize: '0.8rem', color: '#1E40AF', marginTop: 10,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <div>
                <strong>Dynamic Location Active:</strong> Location ya city target karne ki jarurat nahi hai. Yeh profile har customer ko unke <strong>25 km nearby</strong> show hogi (Delhi customer ko Delhi me, Mumbai wale ko Mumbai me).
              </div>
            </div>

            <form onSubmit={handleSaveDummyProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Priya Sharma"
                    value={dummyForm.name || ''}
                    onChange={(e) => setDummyForm({ ...dummyForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-input"
                    value={dummyForm.age || 24}
                    onChange={(e) => setDummyForm({ ...dummyForm, age: Number(e.target.value) })}
                    required
                    min="18"
                    max="60"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="2500"
                    value={dummyForm.hourlyRate || 2500}
                    onChange={(e) => setDummyForm({ ...dummyForm, hourlyRate: Number(e.target.value) })}
                    required
                    min="500"
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={dummyForm.isActive ? 'active' : 'hidden'}
                    onChange={(e) => setDummyForm({ ...dummyForm, isActive: e.target.value === 'active' })}
                  >
                    <option value="active">Active in Discovery</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Bio & Interests</label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'none' }}
                  placeholder="e.g. Coffee walks, art galleries, fine dining & exploring cafes..."
                  value={dummyForm.bio || ''}
                  onChange={(e) => setDummyForm({ ...dummyForm, bio: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowDummyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDummy ? 'Save Changes' : 'Create Dummy Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

