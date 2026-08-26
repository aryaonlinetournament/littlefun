/**
 * Earn Hub Dedicated Module — Telemetry, Client Bidding & Direct Chats Controller
 */

'use strict';

let earnDashboardData = null;
let allActiveClientsCache = [];
let allEarnChatThreadsCache = [];
let currentActiveThreadId = null;

function formatInr(amount) {
  return `INR ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

async function loadEarnDashboard() {
  try {
    const res = await fetch('/api/earn/dashboard');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;

    earnDashboardData = data;

    // Update Dashboard KPI Cards
    const totalEarnEl = document.getElementById('earnTotalEarnings');
    const payoutPendingEl = document.getElementById('earnPayoutPending');
    const mtgsSummaryEl = document.getElementById('earnMeetingsSummary');
    const pendingMtgsEl = document.getElementById('earnPendingMeetingsCount');
    const viewsCountEl = document.getElementById('earnProfileViewsCount');
    const conversionEl = document.getElementById('earnConversionRate');

    if (totalEarnEl) totalEarnEl.textContent = formatInr(data.earnings.totalEarnings);
    if (payoutPendingEl) payoutPendingEl.textContent = formatInr(data.earnings.pendingPayout);
    if (mtgsSummaryEl) mtgsSummaryEl.textContent = `${data.meetings.confirmedCount} Confirmed`;
    if (pendingMtgsEl) pendingMtgsEl.textContent = `${data.meetings.pendingCount} Pending`;
    if (viewsCountEl) viewsCountEl.textContent = `${data.profileViews.totalViews.toLocaleString('en-IN')} Views`;
    if (conversionEl) conversionEl.textContent = `${data.profileViews.viewToMeetingConversion}%`;

    // Update Profile Telemetry
    const profTotalEarnEl = document.getElementById('earnProfTotalEarnings');
    const profPayoutPendingEl = document.getElementById('earnProfPendingPayout');
    const profMtgsSummaryEl = document.getElementById('earnProfMeetingsSummary');
    const profPendingMtgsEl = document.getElementById('earnProfPendingMeetingsCount');
    const profViewsCountEl = document.getElementById('earnProfViewsCount');
    const profConversionEl = document.getElementById('earnProfConversionRate');

    if (profTotalEarnEl) profTotalEarnEl.textContent = formatInr(data.earnings.totalEarnings);
    if (profPayoutPendingEl) profPayoutPendingEl.textContent = formatInr(data.earnings.pendingPayout);
    if (profMtgsSummaryEl) profMtgsSummaryEl.textContent = `${data.meetings.confirmedCount} Confirmed`;
    if (profPendingMtgsEl) profPendingMtgsEl.textContent = `${data.meetings.pendingCount} Pending`;
    if (profViewsCountEl) profViewsCountEl.textContent = `${data.profileViews.totalViews.toLocaleString('en-IN')} Views`;
    if (profConversionEl) profConversionEl.textContent = `${data.profileViews.viewToMeetingConversion}%`;

    updateEarnProfileUserInfo();
  } catch (e) {
    console.error("Error loading Earn dashboard:", e);
  }
}

function switchEarnSubTab(tabKey, btnEl) {
  const buttons = document.querySelectorAll('.earn-sub-tab');
  buttons.forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const sections = document.querySelectorAll('.earn-sub-section');
  sections.forEach(s => s.style.display = 'none');

  if (tabKey === 'profile') {
    const sec = document.getElementById('earnSubSectionProfile');
    if (sec) sec.style.display = 'block';
    loadEarnProfile();
  } else if (tabKey === 'clients') {
    const sec = document.getElementById('earnSubSectionClients');
    if (sec) sec.style.display = 'block';
    loadActiveClients();
  } else if (tabKey === 'chats') {
    const sec = document.getElementById('earnSubSectionChats');
    if (sec) sec.style.display = 'block';
    loadEarnChats();
  }
}

window.openEarnMyProfile = function() {
  const profileTabBtn = document.querySelector(".earn-sub-tab[onclick*='profile']");
  switchEarnSubTab('profile', profileTabBtn);
  const profileCard = document.querySelector('.earn-profile-header-card');
  if (profileCard) {
    profileCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

async function loadEarnProfile() {
  if (!earnDashboardData) {
    await loadEarnDashboard();
  } else {
    updateEarnProfileUserInfo();
  }
}

async function loadActiveClients() {
  try {
    const res = await fetch('/api/earn/active-clients');
    const data = await res.json();
    if (data.success && data.clients) {
      allActiveClientsCache = data.clients;
      renderActiveClients(data.clients);
    }
  } catch (e) {
    console.error("Error loading active clients:", e);
  }
}

function renderActiveClients(clients) {
  const container = document.getElementById('earnActiveClientsGrid');
  if (!container) return;

  if (!clients || clients.length === 0) {
    container.innerHTML = `<p style="font-size:13px; color:#64748B; padding:20px;">No online active clients matched your search.</p>`;
    return;
  }

  let html = '';
  clients.forEach(cli => {
    const skillsHtml = (cli.skills || []).map(s => `<span class="skill-chip">${s}</span>`).join('');
    html += `
      <div class="client-card">
        <div>
          <div class="client-card-top">
            <div class="client-avatar-wrap">
              <img src="${cli.avatar}" class="client-avatar-img" alt="${cli.name}">
              ${cli.isOnline ? '<div class="online-dot" title="Online Verified"></div>' : ''}
            </div>
            <div>
              <div class="client-name">${cli.name}</div>
              <div class="client-cat">${cli.category} · ★ ${cli.rating} (${cli.reviewsCount})</div>
              <div style="font-size:11px; color:#16A34A; font-weight:700; margin-top:2px;">📍 ${cli.distanceKm} km away · ${cli.location}</div>
            </div>
          </div>
          <p style="font-size:12px; color:#475569; margin-top:10px; font-style:italic;">"${cli.statusText}"</p>
          <div class="client-skills">${skillsHtml}</div>
        </div>
        <div class="client-footer">
          <span style="font-size:13px; font-weight:800; color:#D97706;">₹${cli.hourlyRate.toLocaleString('en-IN')}/hr</span>
          <button class="btn-primary-earn" style="font-size:12px; padding:6px 14px;" onclick="startDirectClientChat('${cli.id}', '${cli.name.replace(/'/g, "\\'")}', '${cli.avatar}')">
            <i class="fa-regular fa-comment-dots"></i> Direct Chat
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function loadEarnChats() {
  try {
    const res = await fetch('/api/earn/chats');
    const data = await res.json();
    if (data.success && data.threads) {
      allEarnChatThreadsCache = data.threads;
    }
  } catch (e) {
    console.error("Error loading chat threads:", e);
  }
}

function updateEarnProfileUserInfo() {
  const nameEl = document.getElementById('earnProfileName');
  const avatarEl = document.getElementById('earnProfileAvatar');
  const headerNameEl = document.getElementById('earnHeaderName');
  const headerAvatarEl = document.getElementById('earnHeaderAvatar');
  const locEl = document.getElementById('earnProfileLocation');
  const catEl = document.getElementById('earnProfileCategory');
  const titleEl = document.getElementById('earnProfileTitle');

  const prof = earnDashboardData?.providerProfile;
  if (prof) {
    if (nameEl) nameEl.textContent = prof.displayName;
    if (avatarEl) avatarEl.src = prof.avatar;
    if (headerNameEl) headerNameEl.textContent = prof.displayName;
    if (headerAvatarEl) headerAvatarEl.src = prof.avatar;
    if (locEl) locEl.textContent = prof.location;
    if (catEl) catEl.textContent = prof.category;
    if (titleEl) titleEl.textContent = prof.title || `${prof.category} • Executive Provider`;
  }
}

async function requestPayoutFromBackend(amount) {
  try {
    const res = await fetch('/api/earn/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) window.showToast(`💸 Payout of ₹${data.amount.toLocaleString('en-IN')} requested successfully!`);
      await loadEarnDashboard();
    }
    return data;
  } catch (e) {
    console.error("Error requesting payout:", e);
  }
}

async function submitRequirementToBackend(requirementData) {
  try {
    const res = await fetch('/api/earn/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requirementData)
    });
    const data = await res.json();
    if (data.success && window.showToast) {
      window.showToast(`✨ Service requirement "${data.requirement.title}" posted!`);
    }
    return data;
  } catch (e) {
    console.error("Error submitting requirement:", e);
  }
}

async function submitBidToBackend(bidData) {
  try {
    const res = await fetch('/api/earn/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bidData)
    });
    const data = await res.json();
    if (data.success && window.showToast) {
      window.showToast(`🎯 Proposal submitted for ₹${data.bid.bidAmount}!`);
    }
    return data;
  } catch (e) {
    console.error("Error submitting bid:", e);
  }
}

// --- ADMIN PANEL CLIENT CONTROLLERS ---

let adminOverviewData = null;
let adminUsersCache = [];
let adminBotsCache = [];
let adminAssignmentsCache = [];
let adminChatThreadsCache = [];
let activeAdminChatThreadId = null;
let activeAdminBotId = null;

async function loadAdminData(tabKey = 'overview') {
  if (tabKey === 'overview') await loadAdminOverview();
  else if (tabKey === 'users') await loadAdminUsers();
  else if (tabKey === 'companions') await loadAdminCompanions();
  else if (tabKey === 'settings') await loadAdminAppConfig();
}

function switchAdminTab(tabKey) {
  const buttons = document.querySelectorAll('.admin-tab-btn');
  buttons.forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-tab-btn[data-tab='${tabKey}']`);
  if (activeBtn) activeBtn.classList.add('active');

  const contents = document.querySelectorAll('.admin-tab-content');
  contents.forEach(c => c.style.display = 'none');

  const targetContent = document.getElementById(`admin-tab-${tabKey}`);
  if (targetContent) targetContent.style.display = 'block';

  loadAdminData(tabKey);
}

// 1. OVERVIEW & TELEMETRY
async function loadAdminOverview() {
  try {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();
    if (!data.success) return;

    adminOverviewData = data;
    const sys = data.systemTelemetry;

    const statsContainer = document.getElementById('admin-overview-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card" style="border-left:4px solid #6366f1;">
          <div class="stat-icon-wrap" style="background:rgba(99,102,241,0.1); color:#6366f1;"><i class="fa-solid fa-users"></i></div>
          <div>
            <div class="stat-label">Registered Users</div>
            <div class="stat-value">${sys.totalRegisteredUsers}</div>
            <div class="stat-sub">App Profiles Created</div>
          </div>
        </div>

      `;
    }

  } catch (e) {
    console.error("Error loading admin overview:", e);
  }
}



// 2. REGISTERED USERS DIRECTORY
async function loadAdminUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (data.success && data.users) {
      adminUsersCache = data.users;
      renderAdminUsersTable();
    }
  } catch (e) {
    console.error("Error loading admin users:", e);
  }
}

function renderAdminUsersTable() {
  const container = document.getElementById('admin-users-table-container');
  if (!container) return;

  const search = (document.getElementById('adminUserSearch')?.value || '').toLowerCase();
  let users = adminUsersCache.filter(u => {
    return u.name.toLowerCase().includes(search) || u.city.toLowerCase().includes(search) || u.phone.toLowerCase().includes(search);
  });

  if (users.length === 0) {
    container.innerHTML = `<p style="font-size:13px; color:var(--text-muted); padding:20px;">No registered user profiles found.</p>`;
    return;
  }

  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
      <thead>
        <tr style="border-bottom:2px solid var(--surface-border); color:var(--text-muted); font-size:11px; text-transform:uppercase;">
          <th style="padding:10px;">User Profile</th>
          <th style="padding:10px;">Location / Radius</th>
          <th style="padding:10px;">Role &amp; Status</th>

        </tr>
      </thead>
      <tbody>
  `;

  users.forEach(u => {
    html += `
      <tr style="border-bottom:1px solid var(--surface-border);">
        <td style="padding:12px 10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${u.avatar}" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
            <div>
              <strong style="display:block; color:var(--text-primary);">${u.name}</strong>
              <span style="font-size:11px; color:var(--text-muted);">${u.email || u.phone}</span>
            </div>
          </div>
        </td>
        <td style="padding:10px;">
          <strong>${u.city}</strong>
          <div style="font-size:11px; color:var(--text-muted);">${u.location}</div>
        </td>
        <td style="padding:10px;">
          <span class="tag-pill brand" style="font-size:10px;">${u.role}</span>
          <div style="font-size:11px; color:var(--accent-emerald); font-weight:700; margin-top:2px;">✓ ${u.verifiedStatus}</div>
        </td>

      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function toggleUserTargetStatus(userId, isTarget) {
  try {
    const res = await fetch('/api/admin/users/target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isTarget })
    });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) window.showToast(`Target status updated for ${data.user.name}!`);
      await loadAdminUsers();
      await loadAdminOverview();
    }
  } catch (e) {
    console.error("Error setting target user:", e);
  }
}

// 4. ADMIN COMPANIONS (Fake profiles)
let adminCompanionsCache = [];

async function loadAdminCompanions() {
  try {
    const res = await fetch('/api/admin/companions');
    const data = await res.json();
    if (data.success) {
      adminCompanionsCache = data.companions || [];
      renderAdminCompanionsTable();
    }
  } catch (e) {
    console.error("Error loading companions:", e);
  }
}

function renderAdminCompanionsTable() {
  const container = document.getElementById('admin-companions-table-container');
  if (!container) return;

  if (adminCompanionsCache.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">No companions created yet. Click "+ Create Companion" to add one.</div>`;
    return;
  }

  let html = `
    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
      <thead>
        <tr style="border-bottom:1px solid var(--surface-border); color:var(--text-secondary);">
          <th style="padding:10px;">Companion</th>
          <th style="padding:10px;">Details</th>
          <th style="padding:10px;">Reward (₹)</th>
          <th style="padding:10px;">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  adminCompanionsCache.forEach(comp => {
    html += `
      <tr style="border-bottom:1px solid var(--surface-border);">
        <td style="padding:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${comp.photoUrl}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=random'" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
            <strong style="color:var(--text-primary);">${comp.name}</strong>
          </div>
        </td>
        <td style="padding:10px;">
          Age: ${comp.age}<br>
          <span style="color:var(--text-muted); font-size:11px;">${comp.distance} km away</span>
        </td>
        <td style="padding:10px; font-weight:700; color:var(--accent-emerald);">
          ₹${comp.reward}
        </td>
        <td style="padding:10px;">
          <button class="btn btn-outline btn-sm" onclick="editCompanion('${comp.id}')" style="margin-right:8px;"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-outline btn-sm" onclick="deleteCompanion('${comp.id}')" style="color:var(--accent-rose); border-color:var(--accent-rose);"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function showCompanionModal() {
  document.getElementById('companionId').value = '';
  document.getElementById('companionName').value = '';
  document.getElementById('companionAge').value = '';
  document.getElementById('companionDistance').value = '';
  document.getElementById('companionReward').value = '';
  document.getElementById('companionPhotoUrl').value = '';
  document.getElementById('adminCompanionModalTitle').innerHTML = '<i class="fa-solid fa-user-plus" style="color:var(--brand-primary); margin-right:8px;"></i>Create Companion Profile';
  document.getElementById('adminCompanionModal').style.display = 'flex';
}

function closeCompanionModal() {
  document.getElementById('adminCompanionModal').style.display = 'none';
}

function editCompanion(id) {
  const comp = adminCompanionsCache.find(c => c.id === id);
  if (!comp) return;

  document.getElementById('companionId').value = comp.id;
  document.getElementById('companionName').value = comp.name;
  document.getElementById('companionAge').value = comp.age;
  document.getElementById('companionDistance').value = comp.distance;
  document.getElementById('companionReward').value = comp.reward;
  document.getElementById('companionPhotoUrl').value = comp.photoUrl || '';
  
  document.getElementById('adminCompanionModalTitle').innerHTML = '<i class="fa-solid fa-pen" style="color:var(--brand-primary); margin-right:8px;"></i>Edit Companion Profile';
  document.getElementById('adminCompanionModal').style.display = 'flex';
}

async function saveCompanion() {
  const id = document.getElementById('companionId').value;
  const name = document.getElementById('companionName').value;
  const age = Number(document.getElementById('companionAge').value) || 21;
  const distance = Number(document.getElementById('companionDistance').value) || 2.5;
  const reward = Number(document.getElementById('companionReward').value) || 1000;
  const photoUrl = document.getElementById('companionPhotoUrl').value;

  if (!name) return alert("Name is required");

  const payload = { name, age, distance, reward, photoUrl };
  const url = id ? `/api/admin/companions/${id}` : `/api/admin/companions`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) window.showToast(`Companion ${id ? 'updated' : 'created'} successfully!`);
      closeCompanionModal();
      loadAdminCompanions();
    }
  } catch (e) {
    console.error("Error saving companion:", e);
  }
}

async function deleteCompanion(id) {
  if (!confirm("Are you sure you want to delete this companion?")) return;
  try {
    const res = await fetch(`/api/admin/companions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) window.showToast("Companion deleted");
      loadAdminCompanions();
    }
  } catch (e) {
    console.error("Error deleting companion:", e);
  }
}


// 6. APP CONFIG & CONTROLS
async function loadAdminAppConfig() {
  try {
    const res = await fetch('/api/admin/app-config');
    const data = await res.json();
    if (data.success && data.config) {
      const c = data.config;
      const fee = document.getElementById('configFeeInput');
      const saf = document.getElementById('configSafetySelect');

      if (fee) fee.value = c.escrowFeePercent;
      if (saf) saf.value = c.safetyModerationStrictness;
    }
  } catch (e) {
    console.error("Error loading app config:", e);
  }
}

async function saveAdminAppConfig() {
  const escrowFeePercent = Number(document.getElementById('configFeeInput')?.value || 15);
  const safetyModerationStrictness = document.getElementById('configSafetySelect')?.value || 'MEDIUM';

  try {
    const res = await fetch('/api/admin/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escrowFeePercent, safetyModerationStrictness })
    });
    const data = await res.json();
    if (data.success && window.showToast) {
      window.showToast("⚙️ System configuration saved successfully!");
    }
  } catch (e) {
    console.error("Error saving app config:", e);
  }
}

// Export admin functions globally
window.switchAdminTab = switchAdminTab;
window.loadAdminData = loadAdminData;
window.renderAdminUsersTable = renderAdminUsersTable;
window.saveAdminAppConfig = saveAdminAppConfig;
window.showCompanionModal = showCompanionModal;
window.closeCompanionModal = closeCompanionModal;
window.saveCompanion = saveCompanion;
window.editCompanion = editCompanion;
window.deleteCompanion = deleteCompanion;
