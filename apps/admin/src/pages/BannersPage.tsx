import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  bg_color?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
};

const BG_PRESETS = [
  { label: 'Rose Gradient', value: 'linear-gradient(135deg, #C8386D 0%, #E85A8F 100%)' },
  { label: 'Violet Glow', value: 'linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)' },
  { label: 'Teal Flow', value: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)' },
  { label: 'Amber Warm', value: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' },
  { label: 'Dark Premium', value: 'linear-gradient(135deg, #1A1228 0%, #3B1D6B 100%)' },
];

const emptyForm = (): Partial<Banner> => ({
  title: '',
  subtitle: '',
  image_url: '',
  cta_text: '',
  cta_link: '',
  bg_color: BG_PRESETS[0].value,
  priority: 0,
  is_active: true,
});

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<Partial<Banner>>(emptyForm());

  const { data, isLoading } = useQuery<{ banners: Banner[] }>({
    queryKey: ['admin-banners'],
    queryFn: () => adminApi.banners() as Promise<{ banners: Banner[] }>,
  });
  const banners = data?.banners ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? adminApi.updateBanner(editing.id, form as Record<string, unknown>)
        : adminApi.createBanner(form as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateBanner(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ ...b });
    setShowModal(true);
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">App Banners</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Manage promotional banners shown in the customer discovery feed
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>✨ Create Banner</button>
      </div>

      <div className="admin-page-content">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : banners.length === 0 ? (
          <div className="empty-state" style={{ padding: 80 }}>
            <div className="empty-icon">🎨</div>
            <div className="empty-title">No banners yet</div>
            <div className="empty-body">Create your first app banner to promote features or events</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>✨ Create First Banner</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {[...banners].sort((a, b) => a.priority - b.priority).map((banner) => (
              <div
                key={banner.id}
                className="admin-table-wrap"
                style={{ padding: 0, overflow: 'hidden', opacity: banner.is_active ? 1 : 0.55 }}
              >
                {/* Banner Preview */}
                <div
                  style={{
                    background: banner.bg_color || BG_PRESETS[0].value,
                    padding: '24px 20px',
                    minHeight: 120,
                    display: 'flex',
                    alignItems: 'flex-end',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {banner.image_url && (
                    <img
                      src={banner.image_url}
                      alt=""
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0,
                        width: '40%', objectFit: 'cover', opacity: 0.35,
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{banner.title}</div>
                    {banner.subtitle && (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{banner.subtitle}</div>
                    )}
                    {banner.cta_text && (
                      <div style={{
                        display: 'inline-block', marginTop: 10, padding: '6px 14px',
                        background: 'rgba(255,255,255,0.2)', borderRadius: 99,
                        color: 'white', fontSize: '0.78rem', fontWeight: 700, backdropFilter: 'blur(4px)',
                      }}>
                        {banner.cta_text} →
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer controls */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-neutral">Priority {banner.priority}</span>
                  <span className={`badge ${banner.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {banner.is_active ? '● Live' : '○ Hidden'}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      className={`btn btn-xs ${banner.is_active ? 'btn-ghost' : 'btn-success'}`}
                      onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                    >
                      {banner.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button className="btn btn-xs btn-outline" onClick={() => openEdit(banner)}>✏️ Edit</button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color: 'var(--error)' }}
                      onClick={() => { if (confirm(`Delete "${banner.title}"?`)) deleteMutation.mutate(banner.id); }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editing ? '✏️ Edit Banner' : '✨ Create New Banner'}</div>
            <div className="modal-sub">Customize the banner that appears in the customer discovery feed.</div>

            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}
            >
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g. 🎉 Meet New Companions Near You"
                  value={form.title ?? ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subtitle</label>
                <input
                  className="form-input"
                  placeholder="e.g. Explore verified profiles in your city"
                  value={form.subtitle ?? ''}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">CTA Button Text</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Explore Now"
                    value={form.cta_text ?? ''}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority (lower = first)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.priority ?? 0}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Image URL (optional overlay)</label>
                <input
                  className="form-input"
                  placeholder="https://..."
                  value={form.image_url ?? ''}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Background Gradient</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      title={p.label}
                      onClick={() => setForm({ ...form, bg_color: p.value })}
                      style={{
                        width: 40, height: 40,
                        borderRadius: 'var(--radius-md)',
                        background: p.value,
                        border: form.bg_color === p.value ? '3px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live Preview Mini */}
              {form.title && (
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    background: form.bg_color || BG_PRESETS[0].value,
                    color: 'white',
                    marginTop: 4,
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{form.title}</div>
                  {form.subtitle && <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 3 }}>{form.subtitle}</div>}
                  {form.cta_text && (
                    <div style={{
                      display: 'inline-block', marginTop: 8, padding: '4px 12px',
                      background: 'rgba(255,255,255,0.2)', borderRadius: 99,
                      fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {form.cta_text} →
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active ?? true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.82rem' }}>Live (visible to users)</span>
                </label>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !form.title}>
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
