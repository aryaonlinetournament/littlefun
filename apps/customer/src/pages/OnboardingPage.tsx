import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi, discoveryApi } from '../lib/api';

const INTERESTS = [
  'Dining', 'Coffee', 'Travel', 'Art', 'Music', 'Fitness', 'Reading', 'Cinema',
  'Cooking', 'Dance', 'Photography', 'Adventure', 'Yoga', 'Concerts', 'Nature',
  'Fashion', 'Games', 'Sports', 'Comedy', 'Theatre'
];

const STEPS = ['About You', 'Location', 'Interests', 'Done'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    display_name: '',
    date_of_birth: '',
    gender: '',
    bio: '',
    city_id: '',
    area_id: '',
    interests: [] as string[],
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => discoveryApi.getCities() as Promise<{ cities: { id: string; name: string; state: string; areas: { id: string; name: string }[] }[] }>,
  });

  const cities = (citiesData as { cities: { id: string; name: string; state: string; areas: { id: string; name: string }[] }[] })?.cities ?? [];
  const selectedCity = cities.find((c) => c.id === form.city_id);
  const areas = selectedCity?.areas ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => profilesApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/discover');
    },
  });

  const toggleInterest = (interest: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const canAdvance = [
    form.display_name.length >= 2 && form.date_of_birth && form.gender,
    form.city_id,
    form.interests.length >= 3,
    true,
  ][step];

  const handleNext = () => {
    if (step < STEPS.length - 2) {
      setStep((s) => s + 1);
    } else {
      updateMutation.mutate(form);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gradient-surface)' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-lg)', background: 'var(--gradient-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', marginBottom: 'var(--space-md)' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 700 }}>Complete your profile</span>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{step + 1}/{STEPS.length}</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`, background: 'white', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ marginTop: 'var(--space-sm)', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>{STEPS[step]}</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 'var(--space-lg)', overflowY: 'auto' }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" placeholder="How should we call you?" value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-input" type="date" value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((g) => (
                  <button key={g} type="button"
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 'var(--radius-md)', border: '2px solid',
                      borderColor: form.gender === g ? 'var(--color-primary)' : 'var(--color-border)',
                      background: form.gender === g ? 'var(--color-primary-bg)' : 'transparent',
                      color: form.gender === g ? 'var(--color-primary)' : 'var(--color-text-2)',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onClick={() => setForm({ ...form, gender: g })}>{g}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">About You <span style={{ color: 'var(--color-text-3)' }}>(optional)</span></label>
              <textarea className="form-input" placeholder="Tell people what makes you unique…" rows={3}
                value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                style={{ resize: 'none' }} />
              <span className="form-hint">{form.bio.length}/500</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem' }}>Where are you located? This helps us find the best matches near you.</p>
            <div className="form-group">
              <label className="form-label">City</label>
              <select className="form-input" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value, area_id: '' })}>
                <option value="">Select your city</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>)}
              </select>
            </div>
            {areas.length > 0 && (
              <div className="form-group">
                <label className="form-label">Neighbourhood <span style={{ color: 'var(--color-text-3)' }}>(optional)</span></label>
                <select className="form-input" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
                  <option value="">Select area</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
              Select at least 3 interests — they help us match you with compatible people.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {INTERESTS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <button key={interest} type="button"
                    onClick={() => toggleInterest(interest)}
                    style={{
                      padding: '8px 16px', borderRadius: 'var(--radius-full)', border: '2px solid',
                      borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                      background: selected ? 'var(--color-primary)' : 'transparent',
                      color: selected ? 'white' : 'var(--color-text-2)',
                      fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}>{interest}</button>
                );
              })}
            </div>
            <p style={{ marginTop: 'var(--space-md)', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
              {form.interests.length} selected {form.interests.length < 3 ? `(need ${3 - form.interests.length} more)` : '✓'}
            </p>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🎉</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>You're all set!</h2>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.95rem' }}>
              Your profile is ready. Start discovering amazing people near you.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 'var(--space-lg)', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={handleNext}
          disabled={!canAdvance || updateMutation.isPending}>
          {step === STEPS.length - 2 ? (updateMutation.isPending ? 'Saving…' : 'Complete Profile') : 'Continue →'}
        </button>
        {step > 0 && step < STEPS.length - 1 && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 'var(--space-sm)' }} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
