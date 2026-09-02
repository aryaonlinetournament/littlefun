import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type City = {
  id: string;
  name: string;
  state: string | null;
  max_profiles: number;
  is_active?: boolean;
  disabled_areas?: string[];
  areas: { id: string; name: string }[];
};

export default function CitiesPage() {
  const queryClient = useQueryClient();
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddArea, setShowAddArea] = useState<string | null>(null);
  const [cityForm, setCityForm] = useState({ name: '', state: '' });
  const [areaForm, setAreaForm] = useState({ name: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['cities-admin'],
    queryFn: () => adminApi.cities() as Promise<{ cities: City[] }>,
  });

  const cities: City[] = (data as { cities: City[] })?.cities ?? [
    { id: 'c-delhi', name: 'Delhi', state: 'Delhi NCR', max_profiles: 15, is_active: true, areas: [{ id: 'a1', name: 'Connaught Place' }, { id: 'a2', name: 'Hauz Khas' }, { id: 'a3', name: 'Saket' }] },
    { id: 'c-mumbai', name: 'Mumbai', state: 'Maharashtra', max_profiles: 15, is_active: true, areas: [{ id: 'a4', name: 'Bandra West' }, { id: 'a5', name: 'Juhu' }, { id: 'a6', name: 'Lower Parel' }] },
    { id: 'c-gurgaon', name: 'Gurgaon', state: 'Haryana', max_profiles: 10, is_active: true, areas: [{ id: 'a7', name: 'DLF Cyber City' }, { id: 'a8', name: 'Golf Course Road' }] },
    { id: 'c-blru', name: 'Bengaluru', state: 'Karnataka', max_profiles: 12, is_active: true, areas: [{ id: 'a9', name: 'Koramangala' }, { id: 'a10', name: 'Indiranagar' }] },
  ];

  const addCityMutation = useMutation({
    mutationFn: () => adminApi.createCity({ name: cityForm.name, state: cityForm.state }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities-admin'] }); setShowAddCity(false); setCityForm({ name: '', state: '' }); },
  });

  const addAreaMutation = useMutation({
    mutationFn: (cityId: string) => adminApi.createArea({ cityId, name: areaForm.name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities-admin'] }); setShowAddArea(null); setAreaForm({ name: '' }); },
  });

  const updateCityMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      adminApi.updateCity(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cities-admin'] }),
  });

  const toggleCityActive = (city: City) => {
    updateCityMutation.mutate({ id: city.id, updates: { is_active: !(city.is_active ?? true) } });
  };

  const updateMaxProfiles = (city: City, delta: number) => {
    const newMax = Math.max(1, (city.max_profiles ?? 10) + delta);
    updateCityMutation.mutate({ id: city.id, updates: { max_profiles: newMax } });
  };


  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Master Cities & Area Controls</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Enable or disable entire cities and control area profile limits.
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddCity(true)}>➕ Add City</button>
      </div>

      <div className="admin-page-content">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {cities.map((city: City) => {
              const isActive = city.is_active ?? true;
              const maxProf = city.max_profiles ?? 15;

              return (
                <div
                  key={city.id}
                  className="admin-table-wrap"
                  style={{
                    overflow: 'hidden',
                    border: isActive ? '1px solid var(--border)' : '1px solid var(--color-error)',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {city.name}
                          <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
                            {isActive ? '✓ Active' : '🚫 City Disabled'}
                          </span>
                        </div>
                        {city.state && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{city.state}</div>}
                      </div>

                      {/* Master City Toggle */}
                      <button
                        className={`btn btn-xs ${isActive ? 'btn-ghost' : 'btn-primary'}`}
                        style={{ color: isActive ? 'var(--color-error)' : 'white' }}
                        onClick={() => toggleCityActive(city)}
                      >
                        {isActive ? 'Disable City' : 'Enable City'}
                      </button>
                    </div>

                    {/* Max Visible Profiles per City Control */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '6px 12px', borderRadius: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)' }}>
                        Max Profiles Shown:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn btn-xs btn-outline"
                          style={{ padding: '2px 8px' }}
                          onClick={() => updateMaxProfiles(city, -1)}
                        >
                          -
                        </button>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{maxProf}</strong>
                        <button
                          className="btn btn-xs btn-outline"
                          style={{ padding: '2px 8px' }}
                          onClick={() => updateMaxProfiles(city, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)' }}>
                        NEIGHBORHOOD AREAS ({city.areas.length})
                      </span>
                      <button className="btn btn-xs btn-outline" onClick={() => setShowAddArea(city.id)}>+ Add Area</button>
                    </div>

                    {(city.areas ?? []).length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>No areas defined yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(city.areas ?? []).map((area) => (
                          <span
                            key={area.id}
                            style={{
                              padding: '4px 10px', borderRadius: 99, background: 'var(--surface)',
                              border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 500,
                            }}
                          >
                            📍 {area.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add City Modal */}
      {showAddCity && (
        <div className="modal-overlay" onClick={() => setShowAddCity(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add New City</div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">City Name</label>
              <input className="form-input" placeholder="e.g. Mumbai" value={cityForm.name}
                onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">State (optional)</label>
              <input className="form-input" placeholder="e.g. Maharashtra" value={cityForm.state}
                onChange={(e) => setCityForm({ ...cityForm, state: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAddCity(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => addCityMutation.mutate()}
                disabled={addCityMutation.isPending || !cityForm.name}>
                {addCityMutation.isPending ? 'Adding…' : 'Add City'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Area Modal */}
      {showAddArea && (
        <div className="modal-overlay" onClick={() => setShowAddArea(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add Area</div>
            <div className="modal-sub">
              {cities.find((c) => c.id === showAddArea)?.name}
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Area Name</label>
              <input className="form-input" placeholder="e.g. Bandra West" value={areaForm.name}
                onChange={(e) => setAreaForm({ name: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAddArea(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => addAreaMutation.mutate(showAddArea)}
                disabled={addAreaMutation.isPending || !areaForm.name}>
                {addAreaMutation.isPending ? 'Adding…' : 'Add Area'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

