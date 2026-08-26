/* ═══════════════════════════════════════════════════════════════════
   EARN HUB — CLIENT AUTHENTICATION & PROFILE MANAGER
   Admin-Generated Credentials: Login by ID (#EH-1001) or Email
   Profile Update: name, photo, bio, phone, email, city
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const CLIENT_API = '/api';
let currentClientToken = localStorage.getItem('client_token') || '';
let currentClientUser = JSON.parse(localStorage.getItem('client_user') || 'null');

// ── Login Function (ID #EH-1001 or Email + Password) ────────────
async function clientLogin() {
  const loginId  = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  const errorDiv  = document.getElementById('client-auth-error');
  const errorText = document.getElementById('client-auth-error-text');
  const btn       = document.getElementById('btn-login-submit');

  if (!loginId || !password) {
    if (errorText) errorText.textContent = 'Please enter your Client ID (or Email) and Password.';
    if (errorDiv)  errorDiv.style.display = 'block';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Logging in…'; }
  if (errorDiv) errorDiv.style.display = 'none';

  try {
    const res = await fetch(CLIENT_API + '/auth/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginId, password }) // server accepts ID or email in the "email" field
    });
    const data = await res.json();

    if (!data.success) {
      if (errorText) errorText.textContent = data.message || 'Invalid ID/Email or Password.';
      if (errorDiv)  errorDiv.style.display = 'block';
      if (btn) { btn.disabled = false; btn.textContent = '🔑 Login to Earn Hub'; }
      return;
    }

    currentClientToken = data.token;
    currentClientUser  = data.client;
    localStorage.setItem('client_token', currentClientToken);
    localStorage.setItem('client_user', JSON.stringify(currentClientUser));

    const gate = document.getElementById('client-auth-gate');
    if (gate) gate.style.display = 'none';

    updateClientUserHeader(currentClientUser);
    showClientToast(`👋 Welcome, ${currentClientUser.name}! (${currentClientUser.uniqueId || ''})`, 'success');

    if (window.loadCityProfiles) window.loadCityProfiles(currentClientUser.city);
    startClientNotificationPolling();
  } catch (e) {
    if (errorText) errorText.textContent = 'Connection failed. Is the server running?';
    if (errorDiv)  errorDiv.style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Login to Earn Hub'; }
  }
}

// ── Logout Function ───────────────────────────────────────────────
function clientLogout() {
  currentClientToken = '';
  currentClientUser  = null;
  localStorage.removeItem('client_token');
  localStorage.removeItem('client_user');

  const gate = document.getElementById('client-auth-gate');
  if (gate) gate.style.display = 'flex';

  const badge = document.getElementById('client-user-badge');
  if (badge) badge.style.display = 'none';

  showClientToast('Logged out successfully', 'info');
}

// ── Update Profile (name, bio, phone, email, city, avatar) ───────
async function updateClientProfile(profileData) {
  if (!currentClientToken) {
    showClientToast('Please login first', 'error');
    return null;
  }
  try {
    const res = await fetch(CLIENT_API + '/auth/client/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentClientToken
      },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();

    if (!data.success) {
      showClientToast('❌ ' + (data.message || 'Profile update failed'), 'error');
      return null;
    }

    // Sync updated user to memory + storage
    currentClientUser = { ...currentClientUser, ...data.client };
    localStorage.setItem('client_user', JSON.stringify(currentClientUser));
    updateClientUserHeader(currentClientUser);
    showClientToast('✅ Profile updated successfully!', 'success');
    return data.client;
  } catch (e) {
    showClientToast('Connection failed. Please try again.', 'error');
    return null;
  }
}

// Expose globally for profile page and other modules
window.updateClientProfile = updateClientProfile;
window.clientLogout        = clientLogout;
window.clientLogin         = clientLogin;
window.getCurrentClient    = () => currentClientUser;
window.getClientToken      = () => currentClientToken;

// ── Update Header Badge ───────────────────────────────────────────
function updateClientUserHeader(user) {
  const badge    = document.getElementById('client-user-badge');
  const nameEl   = document.getElementById('client-user-name');
  const avatarEl = document.getElementById('client-user-avatar');
  const idEl     = document.getElementById('client-user-id');
  const greetingEl = document.getElementById('dashboard-greeting');

  if (user) {
    if (nameEl)   nameEl.textContent = user.name;
    if (idEl)     idEl.textContent   = user.uniqueId || '';
    if (avatarEl) avatarEl.src = user.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7c5cfc&color=fff&size=64`;
    if (badge)    badge.style.display = 'flex';
    
    if (greetingEl) {
      const hour = new Date().getHours();
      let timeOfDay = 'Good evening';
      if (hour < 12) timeOfDay = 'Good morning';
      else if (hour < 18) timeOfDay = 'Good afternoon';
      const firstName = (user.name || 'User').split(' ')[0];
      greetingEl.textContent = `${timeOfDay}, ${firstName} 👋`;
    }
    
    // Update Main Profile Page fields to show the logged-in user's profile
    const pName = document.getElementById('mainProfileName');
    const pBio = document.getElementById('mainProfileBio');
    const pAvatar = document.getElementById('mainProfileAvatar');
    const pTagline = document.getElementById('mainProfileTagline');
    const pLoc = document.getElementById('mainProfileLocation');
    
    if (pName) pName.textContent = user.name;
    if (pBio) pBio.textContent = user.bio || 'No bio yet.';
    if (pAvatar) pAvatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=7c5cfc&color=fff&size=200`;
    if (pTagline) pTagline.textContent = `${user.city || 'Location'} • Client Profile`;
    if (pLoc) pLoc.innerHTML = `<span class="tag-pill">${user.city || 'Location'}</span>`;
  }
}

// ── Client Toast Notification ─────────────────────────────────────
function showClientToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 10000;
    background: ${type==='success'?'#10b981':type==='error'?'#ef4444':'#7c5cfc'};
    color: #fff; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3); transition: opacity 0.3s;
    max-width: 340px; word-break: break-word;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}
window.showClientToast = showClientToast;

// ── Notification Polling (Realtime Updates from Admin Decisions) ─
function startClientNotificationPolling() {
  setInterval(async () => {
    if (!currentClientToken) return;
    try {
      const res = await fetch(CLIENT_API + '/meeting-requests/notify', {
        headers: { 'Authorization': 'Bearer ' + currentClientToken }
      });
      const data = await res.json();
      if (data.success && data.hasNotification && data.notifications.length > 0) {
        data.notifications.forEach(n => {
          const msg = n.status === 'ACCEPTED'
            ? `✅ Meeting ACCEPTED by ${n.toFakeProfileName}! Note: ${n.adminNote || 'Get ready!'}`
            : `❌ Meeting declined. Note: ${n.adminNote || 'Profile unavailable.'}`;
          showClientToast(msg, n.status === 'ACCEPTED' ? 'success' : 'error');
        });
      }
    } catch {}
  }, 10000);
}

// ── Bootstrap Session Check ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (currentClientToken) {
    try {
      const res = await fetch(CLIENT_API + '/auth/client/me', {
        headers: { 'Authorization': 'Bearer ' + currentClientToken }
      });
      const data = await res.json();
      if (data.success && data.client) {
        currentClientUser = data.client;
        localStorage.setItem('client_user', JSON.stringify(currentClientUser));
        const gate = document.getElementById('client-auth-gate');
        if (gate) gate.style.display = 'none';
        updateClientUserHeader(currentClientUser);
        startClientNotificationPolling();
        return;
      }
    } catch {}
  }

  // Not logged in — show Auth Gate Overlay
  localStorage.removeItem('client_token');
  localStorage.removeItem('client_user');
  currentClientToken = '';
  currentClientUser  = null;
  const authGate = document.getElementById('client-auth-gate');
  if (authGate) authGate.style.display = 'flex';
});
