/* ═══════════════════════════════════════════════════════════════════
   EARN HUB — SUPER ADMIN PANEL JavaScript
   Full SPA logic: clients, bots, chat monitor, assignments, modals
   ═══════════════════════════════════════════════════════════════════ */

const API = '/api';

// ── State ──────────────────────────────────────────────────────────
const State = {
  currentTab: 'clients',
  clients: { data: [], total: 0, page: 1, totalPages: 1, limit: 15 },
  bots: { data: [], total: 0, page: 1, totalPages: 1, limit: 20 },
  chatContexts: [],
  selectedThreadId: null,
  selectedClientId: null,
  assignModalClientId: null,
  selectedBotIds: new Set(),
  allBotsForAssign: [],
  stats: null,
  refreshTimer: null
};

// ── Debounce ──────────────────────────────────────────────────────
function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Toast ──────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.style.transition = '0.4s', 100);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; setTimeout(() => el.remove(), 400); }, duration);
}

// ── API Helpers ────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await res.json();
    if (!data.success && !res.ok) throw new Error(data.message || 'API Error');
    return data;
  } catch (e) {
    toast(e.message || 'Network error', 'error');
    throw e;
  }
}

// ── Formatters ─────────────────────────────────────────────────────
const fmt = {
  num: n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : (n||0).toString(),
  date: s => s ? new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' }) : '—',
  planBadge: tier => {
    const map = { PREMIUM: 'badge-premium', PRO: 'badge-pro', BASIC: 'badge-basic', FREE: 'badge-free' };
    return `<span class="badge ${map[tier]||'badge-free'}">${tier}</span>`;
  },
  paidBadge: isPaid => isPaid
    ? `<span class="badge badge-paid"><span class="badge-dot"></span>Paid</span>`
    : `<span class="badge badge-free">Free</span>`,
  onlineBadge: isOnline => isOnline
    ? `<span class="badge badge-online"><span class="badge-dot"></span>Online</span>`
    : `<span class="badge badge-offline">Offline</span>`,
  botsBadge: n => n > 0
    ? `<span class="badge badge-assigned"><i class="fa fa-robot"></i> ${n}</span>`
    : `<span class="badge badge-unassigned">—</span>`,
  avatar: (src, name, size=36) => src
    ? `<img class="user-avatar" src="${src}" alt="${name}" width="${size}" height="${size}" onerror="this.outerHTML='<div class=\'user-avatar-placeholder\' style=\'width:${size}px;height:${size}px;\'>${(name||'?')[0].toUpperCase()}</div>'">`
    : `<div class="user-avatar-placeholder" style="width:${size}px;height:${size}px;">${(name||'?')[0].toUpperCase()}</div>`,
  msgTime: iso => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN APP OBJECT
// ═══════════════════════════════════════════════════════════════
const AdminApp = {

  // ── Init ─────────────────────────────────────────────────────
  async init() {
    await this.loadStats();
    await this.loadClients();
    this.setupAutoRefresh();
  },

  setupAutoRefresh() {
    State.refreshTimer = setInterval(() => {
      if (State.currentTab === 'chat') this.loadChatContexts(true);
    }, 8000);
  },

  async refreshAll() {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
    await Promise.all([this.loadStats(), this.loadClients(), this.loadBots()]);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-rotate-right"></i> Refresh';
    toast('Data refreshed', 'success', 2000);
  },

  // ── Tab Switching ─────────────────────────────────────────────
  switchTab(tab) {
    State.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'bots' && State.bots.data.length === 0) this.loadBots();
    if (tab === 'chat') this.loadChatContexts();
    if (tab === 'assignments') this.loadAssignments();
    if (tab === 'top-activity') this.loadTopActivityUser();
    if (tab === 'provider-profile') this.loadProviderProfile();
    if (tab === 'app-config') this.loadAppConfig();
  },

  // ── App Configuration ───────────────────────────────────────────
  async loadAppConfig() {
    try {
      const data = await apiFetchAuthed('/admin/app-config');
      if (data.config) {
        document.getElementById('config-profile-boost').value = data.config.profileViewsBoostEnabled ? "true" : "false";
      }
    } catch (e) {
      console.error('Failed to load app config:', e);
    }
  },

  async saveAppConfig() {
    try {
      const boostVal = document.getElementById('config-profile-boost').value === "true";
      
      const payload = {
        profileViewsBoostEnabled: boostVal
      };

      const data = await apiFetchAuthed('/admin/app-config', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.success) {
        toast('App settings saved successfully!', 'success');
      }
    } catch (e) {
      toast('Failed to save app settings.', 'error');
    }
  },

  // ── Top Activity User ───────────────────────────────────────────
  async loadTopActivityUser() {
    try {
      const data = await apiFetch('/admin/top-activity');
      if (data.topActivityUsers) {
        const listEl = document.getElementById('top-activity-users-list');
        if (listEl) {
          listEl.innerHTML = '';
          data.topActivityUsers.forEach((u, i) => {
            const rankNum = i + 1;
            let rankBadge = `<span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.08);color:#f0f4ff;">🎖️ Rank #${rankNum}</span>`;
            let cardStyle = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);';

            if (rankNum === 1) {
              rankBadge = `<span style="font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;background:linear-gradient(135deg,rgba(245,158,11,0.3),rgba(249,115,22,0.3));color:#fcd34d;border:1px solid rgba(245,158,11,0.5);box-shadow:0 0 12px rgba(245,158,11,0.2);">🥇 Rank #1 (GOLD CHAMPION)</span>`;
              cardStyle = 'background:linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.02) 100%);border:1px solid rgba(245,158,11,0.3);box-shadow:0 4px 20px rgba(245,158,11,0.1);';
            } else if (rankNum === 2) {
              rankBadge = `<span style="font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;background:linear-gradient(135deg,rgba(148,163,184,0.3),rgba(203,213,225,0.2));color:#e2e8f0;border:1px solid rgba(148,163,184,0.5);">🥈 Rank #2 (SILVER)</span>`;
              cardStyle = 'background:linear-gradient(135deg, rgba(148,163,184,0.06) 0%, rgba(255,255,255,0.02) 100%);border:1px solid rgba(148,163,184,0.25);';
            } else if (rankNum === 3) {
              rankBadge = `<span style="font-size:12px;font-weight:800;padding:4px 12px;border-radius:20px;background:linear-gradient(135deg,rgba(217,119,6,0.3),rgba(180,83,9,0.2));color:#fdba74;border:1px solid rgba(217,119,6,0.5);">🥉 Rank #3 (BRONZE)</span>`;
              cardStyle = 'background:linear-gradient(135deg, rgba(217,119,6,0.06) 0%, rgba(255,255,255,0.02) 100%);border:1px solid rgba(217,119,6,0.25);';
            }

            listEl.innerHTML += `
              <div style="${cardStyle} border-radius:14px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  ${rankBadge}
                  <span style="font-size:11px; color:var(--text-muted);">Position ${rankNum} of ${data.topActivityUsers.length}</span>
                </div>
                <div style="display:grid; grid-template-columns: 2fr 2fr 1.5fr; gap:12px;">
                  <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">USER DISPLAY NAME</label>
                    <input type="text" id="tau-name-${i}" class="search-input" style="width:100%; max-width:100%; padding:9px 12px; font-size:13px; font-weight:600;" value="${u.name || ''}" placeholder="e.g. Aarav" />
                  </div>
                  <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">LOCATION / AREA</label>
                    <input type="text" id="tau-area-${i}" class="search-input" style="width:100%; max-width:100%; padding:9px 12px; font-size:13px;" value="${u.area || ''}" placeholder="e.g. Delhi, IN" />
                  </div>
                  <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">TOTAL EARNINGS (₹)</label>
                    <input type="number" id="tau-earnings-${i}" class="search-input" style="width:100%; max-width:100%; padding:9px 12px; font-size:13px; font-weight:700; color:var(--accent-green);" value="${u.earnings || ''}" placeholder="150000" />
                  </div>
                </div>
              </div>
            `;
          });
        }
      }
    } catch(e) {
      toast('Failed to load top activity users', 'error');
    }
  },

  async updateTopActivityUser() {
    const topActivityUsers = [];
    for (let i = 0; i < 10; i++) {
      const nameEl = document.getElementById(`tau-name-${i}`);
      const areaEl = document.getElementById(`tau-area-${i}`);
      const earnEl = document.getElementById(`tau-earnings-${i}`);
      if (nameEl && earnEl) {
        topActivityUsers.push({
          name: nameEl.value.trim(),
          area: areaEl ? areaEl.value.trim() : undefined,
          earnings: earnEl.value.trim()
        });
      }
    }

    try {
      await apiFetch('/admin/top-activity', {
        method: 'POST',
        body: JSON.stringify({ topActivityUsers })
      });
      toast('Top Activity Users updated successfully!', 'success');
    } catch(e) {
      toast('Failed to update top activity users', 'error');
    }
  },

  // ── Provider Profile ─────────────────────────────────────────────
  async loadProviderProfile() {
    try {
      const data = await apiFetch('/admin/provider-profile');
      if (data.providerProfile) {
        const p = data.providerProfile;
        document.getElementById('pp-displayName').value = p.displayName || '';
        document.getElementById('pp-title').value = p.title || '';
        document.getElementById('pp-category').value = p.category || '';
        document.getElementById('pp-location').value = p.location || '';
        document.getElementById('pp-hourlyRate').value = p.hourlyRate || '';
        document.getElementById('pp-rating').value = p.rating || '';
        document.getElementById('pp-reviewsCount').value = p.reviewsCount || '';
        document.getElementById('pp-skills').value = (p.skills || []).join(', ');
        document.getElementById('pp-avatar').value = p.avatar || '';
        document.getElementById('pp-bio').value = p.bio || '';
      }
    } catch(e) {
      toast('Failed to load provider profile', 'error');
    }
  },

  async updateProviderProfile() {
    const data = {
      displayName: document.getElementById('pp-displayName').value.trim(),
      title: document.getElementById('pp-title').value.trim(),
      category: document.getElementById('pp-category').value.trim(),
      location: document.getElementById('pp-location').value.trim(),
      hourlyRate: parseFloat(document.getElementById('pp-hourlyRate').value) || 0,
      rating: parseFloat(document.getElementById('pp-rating').value) || 0,
      reviewsCount: parseInt(document.getElementById('pp-reviewsCount').value, 10) || 0,
      skills: document.getElementById('pp-skills').value.split(',').map(s => s.trim()).filter(Boolean),
      avatar: document.getElementById('pp-avatar').value.trim(),
      bio: document.getElementById('pp-bio').value.trim()
    };

    try {
      await apiFetch('/admin/provider-profile', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      toast('Provider Profile updated successfully!', 'success');
    } catch(e) {
      toast('Failed to update provider profile', 'error');
    }
  },

  // ── KPI Stats ────────────────────────────────────────────────
  async loadStats() {
    try {
      const data = await apiFetch('/admin/stats');
      const s = data.stats;
      State.stats = s;
      this.animateCount('kpi-total-clients', s.totalClients);
      this.animateCount('kpi-paid-clients', s.paidClients);
      document.getElementById('kpi-free-clients').textContent = s.freeClients + ' free';
      this.animateCount('kpi-active-clients', s.activeClients);
      this.animateCount('kpi-total-bots', s.totalBots);
      document.getElementById('kpi-assigned-bots').textContent = s.assignedBots + ' assigned';
      this.animateCount('kpi-chat-contexts', s.totalChatContexts);
      document.getElementById('kpi-total-messages').textContent = s.totalMessages + ' msgs';
      document.getElementById('kpi-uptime').textContent = s.uptimePercent + '%';
      document.getElementById('tab-badge-clients').textContent = s.totalClients;
      document.getElementById('tab-badge-bots').textContent = s.totalBots;
      document.getElementById('tab-badge-chat').textContent = s.totalChatContexts;
    } catch (e) { /* handled by apiFetch */ }
  },

  animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    const update = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  // ═══════════════════════════════════════════════════════════════
  // CLIENTS TAB
  // ═══════════════════════════════════════════════════════════════

  debouncedLoadClients: debounce(function() { AdminApp.loadClients(); }, 400),

  async loadClients(page = null) {
    if (page !== null) State.clients.page = page;
    const search = document.getElementById('clients-search')?.value || '';
    const paid = document.getElementById('clients-paid-filter')?.value || 'ALL';
    const city = document.getElementById('clients-city-filter')?.value || 'ALL';
    const planTier = document.getElementById('clients-plan-filter')?.value || 'ALL';

    const params = new URLSearchParams({
      page: State.clients.page,
      limit: State.clients.limit,
      ...(search ? { search } : {}),
      ...(paid !== 'ALL' ? { paid: paid === 'paid' ? 'true' : 'false' } : {}),
      ...(city !== 'ALL' ? { city } : {}),
      ...(planTier !== 'ALL' ? { planTier } : {})
    });

    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = `<tr><td colspan="10" class="loading-overlay"><div class="spinner"></div> Loading…</td></tr>`;

    try {
      const data = await apiFetch(`/admin/clients?${params}`);
      State.clients.data = data.clients;
      State.clients.total = data.total;
      State.clients.totalPages = data.totalPages;

      document.getElementById('clients-count-label').textContent =
        `Showing ${data.clients.length} of ${data.total} clients`;

      this.renderClientsTable(data.clients);
      this.renderPagination('clients', data.total, data.page, data.totalPages);

      // Populate auto-assign dropdown
      this.populateClientDropdowns(data.clients);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><div class="icon">❌</div><div class="title">Failed to load clients</div></td></tr>`;
    }
  },

  renderClientsTable(clients) {
    const tbody = document.getElementById('clients-tbody');
    if (!clients.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">👤</div><div class="title">No clients found</div><div class="subtitle">Try adjusting your filters</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = clients.map(c => `
      <tr onclick="AdminApp.openClientDetail('${c.id}')">
        <td>
          <div class="user-cell">
            ${fmt.avatar(c.avatar, c.name)}
            <div>
              <div class="user-name">${c.name} <span class="badge badge-unique-id">${c.uniqueId || '#EH-CL-' + c.id}</span></div>
              <div class="user-email">${c.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size:13px;font-weight:600;">${c.city}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${c.state || ''}</div>
        </td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;align-items:center;gap:6px;">
            <select class="filter-select" style="padding:4px 8px;font-size:11px;font-weight:700;" onchange="AdminApp.updateClientPlan('${c.id}', this.value)">
              <option value="FREE" ${c.planTier==='FREE'?'selected':''}>FREE</option>
              <option value="BASIC" ${c.planTier==='BASIC'?'selected':''}>BASIC</option>
              <option value="PRO" ${c.planTier==='PRO'?'selected':''}>PRO</option>
              <option value="PREMIUM" ${c.planTier==='PREMIUM'?'selected':''}>PREMIUM</option>
            </select>
            ${fmt.paidBadge(c.isPaid)}
          </div>
        </td>
        <td>
          <div class="social-stat">${fmt.num(c.followers)}</div>
          <div class="social-label">Followers</div>
        </td>
        <td>
          <div class="social-stat">${fmt.num(c.following)}</div>
          <div class="social-label">Following</div>
        </td>
        <td>${fmt.botsBadge(c.assignedBotIds ? c.assignedBotIds.length : 0)}</td>
        <td style="font-size:13px;font-weight:600;color:var(--accent-cyan);">${c.totalChats || 0}</td>
        <td>${fmt.onlineBadge(c.isOnline)}</td>
        <td style="font-size:12px;color:var(--text-secondary);">${c.registeredAt || 'Recent'}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-secondary" title="View Details" onclick="AdminApp.openClientDetail('${c.id}')">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" title="Assign Bots" onclick="AdminApp.openBotAssignModalForClient('${c.id}','${c.name}')">
              <i class="fa fa-robot"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async updateClientPlan(clientId, planTier) {
    try {
      const data = await apiFetchAuthed(`/admin/clients/${clientId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ planTier })
      });
      if (data.success) {
        toast(`Client plan updated to ${planTier}!`, 'success');
        this.loadClients();
      } else {
        toast(data.message || 'Failed to update plan', 'error');
      }
    } catch(e) {
      toast('Failed to update client plan', 'error');
    }
  },

  renderPagination(key, total, page, totalPages) {
    const pag = document.getElementById(`${key}-pagination`);
    const info = document.getElementById(`${key}-page-info`);
    const btns = document.getElementById(`${key}-page-btns`);
    if (!pag) return;

    const limit = State[key].limit;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    info.textContent = `Showing ${start}–${end} of ${total}`;

    const pages = [];
    pages.push(`<button class="page-btn" onclick="AdminApp.load${key.charAt(0).toUpperCase()+key.slice(1)}(${page-1})" ${page<=1?'disabled':''}>‹ Prev</button>`);

    const range = this.pageRange(page, totalPages);
    range.forEach(p => {
      if (p === '...') pages.push(`<span style="padding:6px 4px;color:var(--text-muted)">…</span>`);
      else pages.push(`<button class="page-btn ${p===page?'active':''}" onclick="AdminApp.load${key.charAt(0).toUpperCase()+key.slice(1)}(${p})">${p}</button>`);
    });

    pages.push(`<button class="page-btn" onclick="AdminApp.load${key.charAt(0).toUpperCase()+key.slice(1)}(${page+1})" ${page>=totalPages?'disabled':''}>Next ›</button>`);
    btns.innerHTML = pages.join('');
    pag.style.display = total > limit ? 'flex' : 'none';
  },

  pageRange(current, total) {
    if (total <= 7) return Array.from({length:total},(_,i)=>i+1);
    const r = [];
    if (current <= 4) { for(let i=1;i<=5;i++) r.push(i); r.push('...'); r.push(total); }
    else if (current >= total-3) { r.push(1); r.push('...'); for(let i=total-4;i<=total;i++) r.push(i); }
    else { r.push(1); r.push('...'); for(let i=current-1;i<=current+1;i++) r.push(i); r.push('...'); r.push(total); }
    return r;
  },

  // ── Client Detail Modal ──────────────────────────────────────
  async openClientDetail(clientId) {
    State.selectedClientId = clientId;
    this.openModal('modal-client-detail');
    document.getElementById('modal-client-body').innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

    try {
      const data = await apiFetch(`/admin/clients/${clientId}`);
      const c = data.client;
      const bots = data.assignedBots || [];
      const chats = data.chatContexts || [];

      document.getElementById('modal-client-title').textContent = c.name + ' — Client Detail';

      const html = `
        <div class="client-detail-header">
          ${fmt.avatar(c.avatar, c.name, 64)}
          <div class="client-detail-info">
            <div class="client-detail-name">${c.name} <span class="badge badge-unique-id">${c.uniqueId || '#EH-CL-' + c.id}</span></div>
            <div class="client-detail-sub">${c.email} • ${c.phone}</div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              ${fmt.planBadge(c.planTier)} ${fmt.paidBadge(c.isPaid)} ${fmt.onlineBadge(c.isOnline)}
            </div>
          </div>
        </div>

        <div class="social-stats-row">
          <div class="social-stat-card">
            <div class="value">${fmt.num(c.followers)}</div>
            <div class="label">Followers</div>
          </div>
          <div class="social-stat-card">
            <div class="value">${fmt.num(c.following)}</div>
            <div class="label">Following</div>
          </div>
          <div class="social-stat-card">
            <div class="value">${c.totalChats}</div>
            <div class="label">Total Chats</div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">📍 Location</div>
            <div class="detail-item-value">${c.city}, ${c.state}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">📅 Registered</div>
            <div class="detail-item-value">${c.registeredAt}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">⏰ Last Active</div>
            <div class="detail-item-value">${c.lastActive}</div>
          </div>
          <div class="detail-item" style="grid-column:1/-1;">
            <div class="detail-item-label">📝 Admin Notes</div>
            <div class="detail-item-value">${c.notes || '<span style="color:var(--text-muted);font-weight:400;">No notes</span>'}</div>
          </div>
        </div>
      `;

      document.getElementById('modal-client-body').innerHTML = html;
    } catch(e) {
      document.getElementById('modal-client-body').innerHTML = `<div class="empty-state"><div class="icon">❌</div><div class="title">Failed to load client</div></div>`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  },

  openCreateClientModal() {
    const errDiv = document.getElementById('create-client-error');
    if (errDiv) errDiv.style.display = 'none';
    if (document.getElementById('cc-name')) document.getElementById('cc-name').value = '';
    if (document.getElementById('cc-email')) document.getElementById('cc-email').value = '';
    if (document.getElementById('cc-phone')) document.getElementById('cc-phone').value = '';
    this.openModal('modal-create-client');
  },

  async createClient() {
    const name = document.getElementById('cc-name')?.value?.trim();
    const email = document.getElementById('cc-email')?.value?.trim();
    const phone = document.getElementById('cc-phone')?.value?.trim();
    const city = document.getElementById('cc-city')?.value;
    const planTier = document.getElementById('cc-plan')?.value || 'FREE';
    const errDiv = document.getElementById('create-client-error');

    if (!name || !email || !phone || !city) {
      if (errDiv) {
        errDiv.textContent = 'Please fill out all required fields (Name, Email, Phone, City).';
        errDiv.style.display = 'block';
      }
      return;
    }
    if (errDiv) errDiv.style.display = 'none';

    const btn = document.getElementById('btn-create-client-submit');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Creating…'; }

    try {
      const data = await apiFetchAuthed('/auth/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, city, planTier })
      });

      if (data.success && data.credentials) {
        this.closeModal('modal-create-client');
        document.getElementById('cred-name').textContent = data.credentials.name;
        document.getElementById('cred-id').textContent = data.credentials.uniqueId;
        document.getElementById('cred-password').textContent = data.credentials.password;
        this.openModal('modal-credentials');
        toast('Client account created successfully!', 'success');
        this.loadClients();
      } else {
        if (errDiv) {
          errDiv.textContent = data.message || 'Failed to create client';
          errDiv.style.display = 'block';
        }
      }
    } catch(e) {
      if (errDiv) {
        errDiv.textContent = e.message || 'Error creating client account';
        errDiv.style.display = 'block';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-user-plus"></i> Create & Generate Credentials'; }
    }
  },

  copyCredential(id) {
    const val = document.getElementById(id)?.textContent;
    if (val) {
      navigator.clipboard.writeText(val);
      toast('Copied to clipboard!', 'success', 2000);
    }
  },

  copyAllCredentials() {
    const id = document.getElementById('cred-id')?.textContent;
    const pass = document.getElementById('cred-password')?.textContent;
    const text = `Little Fun Credentials:\nLogin ID: ${id}\nPassword: ${pass}`;
    navigator.clipboard.writeText(text);
    toast('All credentials copied!', 'success', 2000);
  },

  populateClientDropdowns(clients) {
    // Auto-assign modal
    const sel = document.getElementById('auto-assign-client');
    if (!sel) return;
    const curr = sel.value;
    sel.innerHTML = '<option value="">— Pick a client —</option>';
    clients.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.name} (${c.city})`;
      if (o.value === curr) o.selected = true;
      sel.appendChild(o);
    });

    // Chat client filter
    const chatSel = document.getElementById('chat-client-filter');
    if (!chatSel) return;
    chatSel.innerHTML = '<option value="ALL">All Clients</option>';
    clients.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      chatSel.appendChild(o);
    });
  },

  exportClients() {
    const clients = State.clients.data;
    if (!clients.length) { toast('No clients to export', 'warning'); return; }
    const headers = ['ID', 'Unique ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Plan', 'Paid', 'Followers', 'Following', 'Bots', 'Chats', 'Registered'];
    const rows = clients.map(c => [
      c.id, c.uniqueId || ('#EH-CL-' + c.id), c.name, c.email, c.phone, c.city, c.state,
      c.planTier, c.isPaid ? 'Yes' : 'No',
      c.followers, c.following, 0, c.totalChats, c.registeredAt
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnh-clients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported!', 'success', 2000);
  }
};

  // ── Test AI Chat Simulator ──────────────────────────────────
// ── Close modal on backdrop click ─────────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') { e.preventDefault(); AdminApp.refreshAll(); }
});

// ── Bootstrap ────────────────────────────────────────────────────
// DOMContentLoaded handled by auth gate below

// ── Admin Token (persisted in sessionStorage) ───────────────────────────
let adminToken = sessionStorage.getItem('admin_token') || '';

// ── Admin Login Gate ─────────────────────────────────────────────────────
async function adminLogin() {
  const username = document.getElementById('admin-username-input').value.trim();
  const password = document.getElementById('admin-password-input').value;
  const btn = document.getElementById('login-btn');
  const errorDiv = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');

  if (!username || !password) {
    errorText.textContent = 'Please enter both username and password.';
    errorDiv.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errorDiv.style.display = 'none';

  try {
    const res = await fetch(API + '/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!data.success) {
      errorText.textContent = data.message || 'Invalid credentials.';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Login to Admin Panel';
      return;
    }

    adminToken = data.token;
    sessionStorage.setItem('admin_token', adminToken);
    document.getElementById('login-gate').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('admin-logged-in-label').textContent = 'Logged in: ' + data.username;
    AdminApp.init();
  } catch (e) {
    errorText.textContent = 'Connection failed. Is the server running?';
    errorDiv.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Login to Admin Panel';
  }
}

function adminLogout() {
  adminToken = '';
  sessionStorage.removeItem('admin_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-gate').style.display = 'flex';
  document.getElementById('admin-password-input').value = '';
  document.getElementById('login-error').style.display = 'none';
  toast('Logged out successfully', 'info', 2000);
}

// ═══════════════════════════════════════════════════════════════
// CREATE CLIENT — Admin generates credentials for a new client
// ═══════════════════════════════════════════════════════════════

AdminApp.openCreateClientModal = function() {
  // Clear fields
  ['cc-name', 'cc-email', 'cc-phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const errDiv = document.getElementById('create-client-error');
  if (errDiv) { errDiv.style.display = 'none'; errDiv.textContent = ''; }
  const btn = document.getElementById('btn-create-client-submit');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-user-plus"></i> Create & Generate Credentials'; }
  this.openModal('modal-create-client');
};

AdminApp.createClient = async function() {
  const name  = (document.getElementById('cc-name')?.value || '').trim();
  const email = (document.getElementById('cc-email')?.value || '').trim();
  const phone = (document.getElementById('cc-phone')?.value || '').trim();
  const city  = document.getElementById('cc-city')?.value || 'Delhi';
  const planTier = document.getElementById('cc-plan')?.value || 'FREE';

  const errDiv = document.getElementById('create-client-error');
  if (!name || !email || !phone) {
    if (errDiv) { errDiv.textContent = '❌ Name, Email, and Phone are required.'; errDiv.style.display = 'block'; }
    return;
  }
  if (!email.includes('@')) {
    if (errDiv) { errDiv.textContent = '❌ Please enter a valid email address.'; errDiv.style.display = 'block'; }
    return;
  }

  const btn = document.getElementById('btn-create-client-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Creating…'; }
  if (errDiv) errDiv.style.display = 'none';

  try {
    const data = await apiFetchAuthed('/auth/admin/create-client', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, city, planTier })
    });

    // Close create modal
    this.closeModal('modal-create-client');

    // Show credentials modal
    const creds = data.credentials;
    const nameEl = document.getElementById('cred-name');
    const idEl   = document.getElementById('cred-id');
    const passEl = document.getElementById('cred-password');
    if (nameEl) nameEl.textContent = creds.name;
    if (idEl)   idEl.textContent   = creds.uniqueId;
    if (passEl) passEl.textContent = creds.password;

    this.openModal('modal-credentials');
    toast(`✅ Client "${creds.name}" created! ID: ${creds.uniqueId}`, 'success', 5000);

    // Reload clients table
    await this.loadClients();
    await this.loadStats();

  } catch(e) {
    if (errDiv) { errDiv.textContent = '❌ ' + (e.message || 'Failed to create client'); errDiv.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-user-plus"></i> Create & Generate Credentials'; }
  }
};

AdminApp.copyCredential = function(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim()).then(() => {
    toast('✅ Copied to clipboard!', 'success', 2000);
  }).catch(() => {
    // Fallback
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    toast('✅ Copied!', 'success', 2000);
  });
};

AdminApp.copyAllCredentials = function() {
  const id   = document.getElementById('cred-id')?.textContent?.trim() || '';
  const pass = document.getElementById('cred-password')?.textContent?.trim() || '';
  const name = document.getElementById('cred-name')?.textContent?.trim() || '';
  const text = `Earn Hub Login Credentials\nName: ${name}\nLogin ID: ${id}\nPassword: ${pass}\n\nLogin at: http://localhost:3001`;
  navigator.clipboard.writeText(text).then(() => {
    toast('✅ Both credentials copied to clipboard!', 'success', 3000);
  }).catch(() => toast('Copy failed. Please copy manually.', 'error'));
};

// Patch apiFetch to add auth header (override existing)
const _origApiFetch = apiFetch;
const apiFetchAuthed = async function(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
  try {
    const res = await fetch(API + path, { ...opts, headers });
    const data = await res.json();
    if (res.status === 401) {
      adminLogout();
      toast('Session expired. Please login again.', 'warning');
      throw new Error('Unauthorized');
    }
    if (!data.success && !res.ok) throw new Error(data.message || 'API Error');
    return data;
  } catch (e) {
    if (e.message !== 'Unauthorized') toast(e.message || 'Network error', 'error');
    throw e;
  }
};
// Override global apiFetch
window.apiFetch = apiFetchAuthed;

// Patch switchTab to handle new tabs
const _origSwitchTab = AdminApp.switchTab.bind(AdminApp);
AdminApp.switchTab = function(tab) {
  _origSwitchTab(tab);
  if (tab === 'fake-profiles') this.loadFakeProfiles();
  if (tab === 'meeting-requests') this.loadMeetingRequests();
};

// Patch init to start polling
const _origInit = AdminApp.init.bind(AdminApp);
AdminApp.init = async function() {
  await _origInit();
  this.startMeetingRequestPoll();
};

AdminApp.startMeetingRequestPoll = function() {
  setInterval(async () => {
    try {
      const data = await apiFetchAuthed('/admin/meeting-requests?status=PENDING');
      const count = data.pendingCount || 0;
      const badge = document.getElementById('tab-badge-meeting-requests');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    } catch {}
  }, 15000);
};

// Bootstrap: Check stored token on load
document.addEventListener('DOMContentLoaded', async () => {
  if (adminToken) {
    try {
      const res = await fetch(API + '/auth/admin/verify', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('login-gate').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('admin-logged-in-label').textContent = 'Admin: ' + (data.admin && data.admin.username || 'admin');
        AdminApp.init();
        return;
      }
    } catch {}
  }
  sessionStorage.removeItem('admin_token');
  adminToken = '';
  setTimeout(() => {
    document.getElementById('login-gate').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }, 100);
});

// ═══════════════════════════════════════════════════════════════
// ASSIGN BOTS MODAL LOGIC
// ═══════════════════════════════════════════════════════════════

AdminApp.openBotAssignModalForClient = async function(clientId, clientName) {
  State.assignModalClientId = clientId;
  document.getElementById('modal-assign-bots-title').textContent = `🤖 Assign Profiles to ${clientName || clientId}`;
  document.getElementById('assign-bots-search').value = '';
  this.openModal('modal-assign-bots');
  
  document.getElementById('assign-bots-available-list').innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
  document.getElementById('assign-bots-assigned-list').innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
  
  try {
    // Fetch all bots/profiles
    const botsRes = await apiFetch('/chat/bots?limit=1000');
    State.allBotsForAssign = botsRes.bots || [];
    
    // Fetch client's currently assigned bots
    const clientRes = await apiFetchAuthed(`/admin/clients/${clientId}`);
    const assignedBots = clientRes.assignedBots || [];
    State.selectedBotIds = new Set(assignedBots.map(b => b.id));
    
    this.renderAssignBotsLists();
  } catch(e) {
    toast('Failed to load profiles for assignment', 'error');
    this.closeModal('modal-assign-bots');
  }
};

AdminApp.openBotAssignModal = function() {
  if (!State.selectedClientId) return;
  const cName = document.querySelector('.client-detail-name')?.childNodes[0]?.nodeValue?.trim() || 'Client';
  this.openBotAssignModalForClient(State.selectedClientId, cName);
};

AdminApp.renderAssignBotsLists = function() {
  const searchTerm = (document.getElementById('assign-bots-search').value || '').toLowerCase();
  
  let availHtml = '';
  let assignedHtml = '';
  let availCount = 0;
  let assignedCount = 0;
  
  State.allBotsForAssign.forEach(bot => {
    const isAssigned = State.selectedBotIds.has(bot.id);
    
    // Apply search filter
    if (searchTerm && !bot.name.toLowerCase().includes(searchTerm) && !bot.city.toLowerCase().includes(searchTerm)) {
      return;
    }
    
    const cardHtml = `
      <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid ${isAssigned ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}; cursor:pointer; transition:0.2s;" onclick="AdminApp.toggleBotSelection('${bot.id}')">
        ${fmt.avatar(bot.avatar, bot.name, 36)}
        <div style="flex:1;">
          <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${bot.name} <span style="font-size:11px; color:var(--text-secondary); font-weight:400;">(${bot.age}, ${bot.city})</span></div>
          <div style="font-size:11px; color:var(--text-muted);">${bot.profession || bot.personalityType || 'Profile'}</div>
        </div>
        <div>
          ${isAssigned ? '<i class="fa fa-check-circle" style="color:var(--accent-cyan); font-size:16px;"></i>' : '<i class="fa fa-plus-circle" style="color:var(--text-muted); font-size:16px;"></i>'}
        </div>
      </div>
    `;
    
    if (isAssigned) {
      assignedHtml += cardHtml;
      assignedCount++;
    } else {
      availHtml += cardHtml;
      availCount++;
    }
  });
  
  document.getElementById('assign-bots-available-list').innerHTML = availCount ? availHtml : `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">No profiles available.</div>`;
  document.getElementById('assign-bots-assigned-list').innerHTML = assignedCount ? assignedHtml : `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">No profiles assigned.</div>`;
  
  document.getElementById('avail-bots-count').textContent = availCount;
  document.getElementById('assigned-bots-count').textContent = assignedCount;
};

AdminApp.filterAssignBotsList = function() {
  this.renderAssignBotsLists();
};

AdminApp.toggleBotSelection = function(botId) {
  if (State.selectedBotIds.has(botId)) {
    State.selectedBotIds.delete(botId);
  } else {
    State.selectedBotIds.add(botId);
  }
  this.renderAssignBotsLists();
};

AdminApp.saveBotAssignments = async function() {
  const btn = document.getElementById('btn-save-assignments');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:14px;height:14px;"></div> Saving...`;
  
  try {
    const botIds = Array.from(State.selectedBotIds);
    await apiFetchAuthed(`/admin/clients/${State.assignModalClientId}/assign-bots`, {
      method: 'POST',
      body: JSON.stringify({ botIds })
    });
    
    toast('Profiles assigned successfully', 'success');
    this.closeModal('modal-assign-bots');
    
    // Refresh client list to show updated counts
    this.loadClients();
  } catch(e) {
    toast('Failed to save assignments', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa fa-save"></i> Save Assignments`;
  }
};


  // ================================================================
  Object.assign(AdminApp, {

  // FAKE PROFILES TAB (FULLY EDITABLE + NO PIC OPTION + AREA ACCESS + SERVICE CHARGES)
  // ================================================================

  cachedFakeProfiles: [],
  selectedProfileIds: new Set(),
  currentProfilePillFilter: 'ALL',

  setProfileFilterPill(filterType) {
    this.currentProfilePillFilter = filterType;
    ['all','visible','hidden','active','paused','featured','nopic'].forEach(f => {
      const el = document.getElementById('fp-pill-' + f);
      if (el) {
        if (f.toUpperCase() === filterType.toUpperCase()) el.classList.add('active');
        else el.classList.remove('active');
      }
    });
    this.renderFakeProfilesGrid();
  },

  filterFakeProfilesGrid() {
    this.renderFakeProfilesGrid();
  },

  isCityCenterCollapsed: false,

  toggleCityCenter() {
    this.isCityCenterCollapsed = !this.isCityCenterCollapsed;
    const wrapper = document.getElementById('city-control-center-wrapper');
    const textEl = document.getElementById('toggle-city-center-text');
    const iconEl = document.querySelector('#btn-toggle-city-center i');

    if (wrapper) {
      if (this.isCityCenterCollapsed) {
        wrapper.classList.add('collapsed');
        if (textEl) textEl.textContent = 'Expand City Center';
        if (iconEl) iconEl.className = 'fa fa-chevron-down';
      } else {
        wrapper.classList.remove('collapsed');
        if (textEl) textEl.textContent = 'Collapse';
        if (iconEl) iconEl.className = 'fa fa-chevron-up';
      }
    }
  },

  async loadFakeProfiles() {
    const el = document.getElementById('fp-city-filter');
    const city = el ? el.value : 'ALL';
    const grid = document.getElementById('fake-profiles-grid');
    const label = document.getElementById('fp-count-label');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading profiles...</div>';

    try {
      const data = await apiFetchAuthed('/admin/fake-profiles?city=' + city);
      this.cachedFakeProfiles = data.profiles || [];
      const stats = data.stats || {};

      // Update KPI Strip metrics
      const kpiTotal = document.getElementById('kpi-total-profiles');
      if (kpiTotal) kpiTotal.textContent = stats.total || this.cachedFakeProfiles.length;
      const kpiActive = document.getElementById('kpi-active-profiles');
      if (kpiActive) kpiActive.textContent = stats.active || 0;
      const kpiHidden = document.getElementById('kpi-hidden-profiles');
      if (kpiHidden) kpiHidden.textContent = stats.hiddenInDiscovery !== undefined ? stats.hiddenInDiscovery : 0;
      const kpiRequests = document.getElementById('kpi-meeting-requests');
      if (kpiRequests) kpiRequests.textContent = stats.totalRequests || 0;
      const kpiPending = document.getElementById('kpi-pending-requests');
      if (kpiPending) kpiPending.textContent = stats.pendingRequests || 0;

      // Update Metric Pill Badges
      const pTotal = document.getElementById('fp-pill-stat-total');
      if (pTotal) pTotal.textContent = `👥 ${this.cachedFakeProfiles.length} Total`;
      const pActive = document.getElementById('fp-pill-stat-active');
      if (pActive) pActive.textContent = `🟢 ${stats.active || 0} Active`;
      const pVisible = document.getElementById('fp-pill-stat-visible');
      if (pVisible) pVisible.textContent = `👁️ ${stats.visibleInDiscovery || 0} Visible in Feed`;
      const pPending = document.getElementById('fp-pill-stat-pending');
      if (pPending) pPending.textContent = `⏳ ${stats.pendingRequests || 0} Pending Requests`;

      if (label) {
        label.textContent = `${this.cachedFakeProfiles.length} profiles | ${stats.active || 0} active | ${stats.visibleInDiscovery || 0} visible in feed | ${stats.pendingRequests || 0} pending requests`;
      }
      const badge = document.getElementById('tab-badge-fake-profiles');
      if (badge) badge.textContent = this.cachedFakeProfiles.length;

      this.renderAreaConfigs();
      this.renderFakeProfilesGrid();
    } catch(e) {
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ef4444;padding:48px;">Failed to load profiles.</div>';
    }
  },

  renderFakeProfilesGrid() {
    const grid = document.getElementById('fake-profiles-grid');
    if (!grid) return;

    const searchText = (document.getElementById('fp-search-input')?.value || '').toLowerCase().trim();
    const pillFilter = this.currentProfilePillFilter;

    let filtered = (this.cachedFakeProfiles || []).filter(p => {
      // Search text match
      if (searchText) {
        const matchesName = p.name && p.name.toLowerCase().includes(searchText);
        const matchesCity = p.city && p.city.toLowerCase().includes(searchText);
        const matchesArea = p.area && p.area.toLowerCase().includes(searchText);
        const matchesOcc = p.occupation && p.occupation.toLowerCase().includes(searchText);
        if (!matchesName && !matchesCity && !matchesArea && !matchesOcc) return false;
      }

      // Pill filter match
      if (pillFilter === 'VISIBLE') return p.showInDiscovery !== false;
      if (pillFilter === 'HIDDEN') return p.showInDiscovery === false;
      if (pillFilter === 'ACTIVE') return p.isActive === true;
      if (pillFilter === 'PAUSED') return p.isActive === false;
      if (pillFilter === 'FEATURED') return p.isFeatured === true;
      if (pillFilter === 'NOPIC') return !p.avatar || p.avatar.trim() === '';

      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#4b5572;padding:48px;">No profiles found matching current filters.</div>';
      return;
    }

    const self = this;
    grid.innerHTML = filtered.map(p => {
      const isSelected = self.selectedProfileIds.has(p.id);
      const hasPic = p.avatar && p.avatar.trim() !== '';
      const initials = p.name ? p.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'FP';
      const isVisible = p.showInDiscovery !== false;
      const isActive = p.isActive === true;
      const isFeatured = p.isFeatured === true;

      const avatarHtml = hasPic
        ? `<img src="${p.avatar}" style="width:100%;height:160px;object-fit:cover;display:block;" onerror="this.style.background='rgba(124,92,252,0.2)';this.src='';" />`
        : `<div style="width:100%;height:160px;background:linear-gradient(135deg,#1f293d,#111827);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8b96b4;">
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c5cfc,#22d3ee);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;color:#fff;margin-bottom:6px;">${initials}</div>
            <span style="font-size:11px;color:#6b7280;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:10px;">🚫 No Pic (Image Removed)</span>
          </div>`;

      const areaVisibilityText = (p.visibleInAreas && p.visibleInAreas.length > 0)
        ? p.visibleInAreas.join(', ')
        : 'All Areas in ' + p.city;

      const serviceChargesHtml = (p.serviceCharges && p.serviceCharges.length > 0)
        ? p.serviceCharges.map(sc => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:4px 8px;margin-bottom:4px;font-size:11px;">
              <span style="color:#f0f4ff;">${sc.service} (${sc.duration})</span>
              <span style="color:#10b981;font-weight:600;">₹${sc.price.toLocaleString('en-IN')}</span>
            </div>
          `).join('')
        : '<div style="font-size:11px;color:#6b7280;">No service charges set</div>';

      return `<div class="profile-card-upgrade ${isFeatured ? 'is-featured' : ''} ${!isVisible ? 'is-hidden' : ''}">
        <div style="position:relative;">
          ${avatarHtml}

          <!-- Selection Checkbox -->
          <div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:4px 8px;border-radius:8px;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="AdminApp.toggleProfileSelection('${p.id}', this.checked)" style="width:16px;height:16px;cursor:pointer;" />
          </div>

          <!-- Status & Visibility Badges -->
          <div style="position:absolute;top:10px;right:10px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            ${isFeatured ? `<span class="badge-featured">⭐ FEATURED</span>` : ''}
            <div style="display:flex;gap:4px;">
              <span style="background:${isActive ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)'};color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:20px;">
                ${isActive ? 'ACTIVE' : 'PAUSED'}
              </span>
              <span class="${isVisible ? 'badge-discovery-on' : 'badge-discovery-off'}">
                ${isVisible ? '👁️ VISIBLE' : '🙈 HIDDEN'}
              </span>
            </div>
          </div>
        </div>

        <div style="padding:14px;flex:1;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <div style="font-size:15px;font-weight:700;color:#f0f4ff;">${p.name}, ${p.age}</div>
            <button onclick="AdminApp.toggleFeaturedProfile('${p.id}')" title="Toggle Featured Profile" class="btn btn-xs" style="background:none;border:none;font-size:16px;cursor:pointer;padding:0;">
              ${isFeatured ? '⭐' : '☆'}
            </button>
          </div>
          
          <div style="font-size:12px;color:#a78bfa;margin-bottom:4px;">📍 Primary: ${p.area}, ${p.city}</div>
          <div style="font-size:11px;color:#8b96b4;background:rgba(124,92,252,0.1);padding:4px 8px;border-radius:6px;margin-bottom:8px;">🎯 Target: ${areaVisibilityText}</div>
          <div style="font-size:12px;color:#8b96b4;margin-bottom:6px;">💼 ${p.occupation || 'N/A'}</div>
          <div style="font-size:11px;color:#4b5572;margin-bottom:10px;line-height:1.4;">${p.bio ? p.bio.slice(0,50) + '...' : 'No bio'}</div>
          
          <div style="margin-bottom:12px;">
            <div style="font-size:10px;font-weight:600;color:#8b96b4;margin-bottom:4px;text-transform:uppercase;">💰 Service Charges:</div>
            ${serviceChargesHtml}
          </div>

          <!-- Quick Action Buttons -->
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;">
            <!-- 1-Click Discovery Visibility Switch -->
            <button onclick="AdminApp.toggleDiscoveryVisibility('${p.id}')" class="btn btn-sm" style="width:100%;font-size:11px;background:${isVisible ? 'rgba(239,68,68,0.12)' : 'rgba(34,211,238,0.15)'};color:${isVisible ? '#ef4444' : '#22d3ee'};border:1px solid ${isVisible ? 'rgba(239,68,68,0.3)' : 'rgba(34,211,238,0.3)'};">
              ${isVisible ? '🙈 Hide from Discovery' : '👁️ Show in Discovery'}
            </button>
            
            <div style="display:flex;gap:6px;">
              <button onclick="AdminApp.openEditFakeProfileModal('${p.id}')" class="btn btn-sm" style="flex:1;background:rgba(124,92,252,0.2);color:#a78bfa;border:1px solid rgba(124,92,252,0.4);font-size:11px;">✏️ Edit</button>
              <button onclick="AdminApp.toggleFakeProfile('${p.id}')" class="btn btn-sm" style="background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);font-size:11px;">
                ${isActive ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button onclick="AdminApp.deleteFakeProfile('${p.id}','${p.name.replace(/'/g,"\\'")}')" class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);font-size:11px;">🗑️</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    this.updateSelectedCountUI();
  },

  toggleProfileSelection(id, checked) {
    if (checked) this.selectedProfileIds.add(id);
    else this.selectedProfileIds.delete(id);
    this.updateSelectedCountUI();
  },

  toggleSelectAllProfiles(checked) {
    const grid = document.getElementById('fake-profiles-grid');
    if (!grid) return;
    const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const match = cb.getAttribute('onchange')?.match(/'([^']+)'/);
      if (match && match[1]) {
        if (checked) this.selectedProfileIds.add(match[1]);
        else this.selectedProfileIds.delete(match[1]);
      }
    });
    this.updateSelectedCountUI();
  },

  updateSelectedCountUI() {
    const countEl = document.getElementById('fp-selected-count');
    if (countEl) countEl.textContent = this.selectedProfileIds.size;
  },

  async toggleDiscoveryVisibility(id) {
    try {
      const data = await apiFetchAuthed(`/admin/fake-profiles/${id}/discovery`, { method: 'PATCH' });
      if (data.success) {
        const isVis = data.showInDiscovery !== false;
        toast(isVis ? 'Profile is now VISIBLE in Client Discovery!' : 'Profile is now HIDDEN from Client Discovery!', isVis ? 'success' : 'warning');
        const p = this.cachedFakeProfiles.find(x => x.id === id);
        if (p) p.showInDiscovery = isVis;
        this.renderFakeProfilesGrid();
      }
    } catch(e) {
      toast('Failed to toggle discovery status', 'error');
    }
  },

  async toggleFeaturedProfile(id) {
    try {
      const data = await apiFetchAuthed(`/admin/fake-profiles/${id}/featured`, { method: 'PATCH' });
      if (data.success) {
        const isFeat = data.isFeatured;
        toast(isFeat ? 'Profile marked as FEATURED!' : 'Profile removed from Featured', 'info');
        const p = this.cachedFakeProfiles.find(x => x.id === id);
        if (p) p.isFeatured = isFeat;
        this.renderFakeProfilesGrid();
      }
    } catch(e) {
      toast('Failed to toggle featured status', 'error');
    }
  },

  async executeBulkAction(action) {
    if (this.selectedProfileIds.size === 0) {
      toast('Please select at least one profile first!', 'warning');
      return;
    }
    const ids = Array.from(this.selectedProfileIds);
    if (action === 'DELETE') {
      if (!confirm(`Are you sure you want to delete ${ids.length} selected profiles?`)) return;
    }

    try {
      const data = await apiFetchAuthed('/admin/fake-profiles/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ ids, action })
      });

      if (data.success) {
        toast(`Bulk ${action} applied to ${data.updatedCount} profiles!`, 'success');
        this.selectedProfileIds.clear();
        const selectAllCb = document.getElementById('fp-select-all');
        if (selectAllCb) selectAllCb.checked = false;
        this.loadFakeProfiles();
      }
    } catch(e) {
      toast('Failed to execute bulk action', 'error');
    }
  },

  currentCityFilterMode: 'ALL',

  filterCityView(mode) {
    this.currentCityFilterMode = mode;
    ['all','active','empty'].forEach(m => {
      const btn = document.getElementById('city-btn-' + m);
      if (btn) {
        btn.className = (m === mode.toLowerCase()) ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
      }
    });
    this.renderAreaConfigs();
  },

  async renderAreaConfigs() {
    const strip = document.getElementById('area-config-strip');
    const badge = document.getElementById('city-summary-badge');
    if (!strip) return;
    try {
      const data = await apiFetchAuthed('/admin/area-configs');
      const configs = data.configs || [];

      const withProfilesCount = configs.filter(c => c.assignedProfileIds.length > 0).length;
      const emptyCount = configs.length - withProfilesCount;

      if (badge) {
        badge.textContent = `${withProfilesCount} Active Cities | ${emptyCount} Pending`;
      }

      let filtered = configs;
      if (this.currentCityFilterMode === 'ACTIVE') {
        filtered = configs.filter(c => c.assignedProfileIds.length > 0);
      } else if (this.currentCityFilterMode === 'EMPTY') {
        filtered = configs.filter(c => c.assignedProfileIds.length === 0);
      }

      if (!filtered.length) {
        strip.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#8b96b4;padding:24px;">No cities found for this filter.</div>';
        return;
      }

      strip.innerHTML = filtered.map(c => {
        const totalProfiles = c.assignedProfileIds.length;
        const shownCount = c.maxProfilesPerCity !== undefined ? c.maxProfilesPerCity : 15;
        const isCityEnabled = c.isActive !== false;
        const hasProfiles = totalProfiles > 0;

        const statusBadge = (!hasProfiles)
          ? '<span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,0.06);color:#6b7280;">⚪ Empty City</span>'
          : (isCityEnabled
              ? '<span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:12px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">🟢 VISIBLE TO CLIENTS</span>'
              : '<span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:12px;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);">🔴 OFF (HIDDEN FROM AREA)</span>'
            );

        return `<div style="background:rgba(255,255,255,0.04);border:1px solid ${isCityEnabled && hasProfiles ? 'rgba(124,92,252,0.3)' : 'rgba(255,255,255,0.08)'};border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
          <!-- Top Row: City Name + Status Badge -->
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:15px;font-weight:700;color:#f0f4ff;display:flex;align-items:center;gap:6px;">
              <span>🏙️ ${c.city}</span>
            </div>
            ${statusBadge}
          </div>

          <!-- Active Display Count Selector (e.g. 2 out of 15) -->
          <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:11px;color:#a78bfa;font-weight:600;">👁️ SHOWN TO CLIENTS:</span>
              <span style="font-size:12px;font-weight:700;color:#10b981;">${isCityEnabled ? Math.min(shownCount, totalProfiles) : 0} / ${totalProfiles} Profiles</span>
            </div>
            
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:#8b96b4;">Display Limit:</span>
              <input type="number" value="${shownCount}" min="0" max="50"
                style="width:55px;background:rgba(255,255,255,0.08);border:1px solid rgba(124,92,252,0.4);border-radius:6px;padding:4px 8px;color:#f0f4ff;font-size:13px;font-weight:700;text-align:center;"
                onchange="AdminApp.updateCityLimit('${c.city}', this.value)" />
              <span style="font-size:10px;color:#6b7280;">(e.g. 2 = show only 2)</span>
            </div>
          </div>

          <!-- Bottom Actions: Enable/Disable Switch + View/Seed -->
          <div style="display:flex;gap:6px;margin-top:2px;">
            ${hasProfiles ? `
              <button onclick="AdminApp.toggleCityVisibility('${c.city}')" class="btn btn-sm" style="flex:1;font-size:11px;background:${isCityEnabled ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'};color:${isCityEnabled ? '#ef4444' : '#10b981'};border:1px solid ${isCityEnabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'};">
                ${isCityEnabled ? '🔴 Turn OFF in Area' : '🟢 Turn ON in Area'}
              </button>
              <button onclick="AdminApp.filterProfilesByCity('${c.city}')" class="btn btn-sm" style="font-size:11px;background:rgba(124,92,252,0.15);color:#a78bfa;border:1px solid rgba(124,92,252,0.3);">
                👁️ View Profiles
              </button>
            ` : `
              <button onclick="AdminApp.seedCityProfiles('${c.city}')" class="btn btn-sm btn-primary" style="width:100%;font-size:11px;">
                ⚡ Seed 15 Profiles for ${c.city}
              </button>
            `}
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      console.error(e);
    }
  },

  async toggleCityVisibility(city) {
    try {
      const data = await apiFetchAuthed('/admin/area-configs/' + encodeURIComponent(city) + '/toggle', { method: 'PATCH' });
      toast(city + ' is now ' + (data.isActive ? 'VISIBLE to clients' : 'HIDDEN from clients'), data.isActive ? 'success' : 'warning');
      this.renderAreaConfigs();
      this.loadFakeProfiles();
    } catch(e) {
      toast('Failed to toggle city status', 'error');
    }
  },

  async filterProfilesByCity(city) {
    const el = document.getElementById('fp-city-filter');
    if (el) {
      el.value = city;
      this.loadFakeProfiles();
      toast('Showing profiles for ' + city, 'info', 2000);
    }
  },

  async seedCityProfiles(city) {
    try {
      const data = await apiFetchAuthed('/admin/seed-city', {
        method: 'POST',
        body: JSON.stringify({ city: city, count: 15 })
      });
      toast('Generated 15 profiles for ' + city + '!', 'success');
      this.loadFakeProfiles();
    } catch(e) {
      toast('Failed to seed profiles for ' + city, 'error');
    }
  },

  async updateCityLimit(city, max) {
    try {
      await apiFetchAuthed('/admin/area-configs/' + encodeURIComponent(city), {
        method: 'PUT',
        body: JSON.stringify({ maxProfilesPerCity: parseInt(max) })
      });
      toast(city + ': client display limit set to ' + max + ' profiles', 'success', 2500);
      this.renderAreaConfigs();
      this.loadFakeProfiles();
    } catch {}
  },

  async toggleFakeProfile(id) {
    try {
      const data = await apiFetchAuthed('/admin/fake-profiles/' + id + '/toggle', { method: 'PATCH' });
      toast('Profile ' + (data.isActive ? 'activated' : 'deactivated'), 'success', 2000);
      this.loadFakeProfiles();
    } catch {}
  },

  async deleteFakeProfile(id, name) {
    if (!confirm('Delete profile "' + name + '"? This cannot be undone.')) return;
    try {
      await apiFetchAuthed('/admin/fake-profiles/' + id, { method: 'DELETE' });
      toast('Profile deleted', 'success', 2000);
      this.loadFakeProfiles();
    } catch {}
  },

  openAddFakeProfileModal() {
    var existing = document.getElementById('modal-edit-fake-profile');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'modal-edit-fake-profile';
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px;width:650px;max-width:92vw;max-height:92vh;overflow-y:auto;box-sizing:border-box;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
        '<div style="font-size:18px;font-weight:700;color:#f0f4ff;">➕ Create New Fake Profile</div>' +
        '<button onclick="document.getElementById(\'modal-edit-fake-profile\').remove()" style="background:none;border:none;color:#8b96b4;font-size:20px;cursor:pointer;">✕</button>' +
      '</div>' +
      
      '<div style="display:flex;flex-direction:column;gap:14px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">NAME</label><input id="efp-name" type="text" placeholder="Full name" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
          '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">AGE</label><input id="efp-age" type="number" value="24" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">CITY</label><input id="efp-city" type="text" placeholder="e.g. Delhi" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
          '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">PRIMARY AREA</label><input id="efp-area" type="text" placeholder="e.g. Connaught Place" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
        '</div>' +

        '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">OCCUPATION</label><input id="efp-occupation" type="text" placeholder="e.g. Software Engineer / Model" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
        
        '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">BIO</label><textarea id="efp-bio" rows="2" placeholder="Bio description..." style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;"></textarea></div>' +

        '<div>' +
          '<label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">PHOTO / AVATAR URL (Leave empty for NO PIC)</label>' +
          '<div style="display:flex;gap:8px;">' +
            '<input id="efp-avatar" type="text" placeholder="https://..." style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" />' +
            '<button type="button" onclick="document.getElementById(\'efp-avatar\').value=\'\'" class="btn btn-secondary btn-sm" style="color:#ef4444;">🚫 Remove Pic</button>' +
          '</div>' +
        '</div>' +

        '<div style="background:rgba(124,92,252,0.08);border:1px solid rgba(124,92,252,0.2);border-radius:10px;padding:12px;">' +
          '<div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:8px;">🗺️ AREA VISIBILITY CONTROL & LIMITS</div>' +
          '<div style="margin-bottom:8px;">' +
            '<label style="font-size:11px;color:#8b96b4;display:block;margin-bottom:4px;">VISIBLE IN SPECIFIC AREAS (Comma separated. Leave empty for ALL areas in city)</label>' +
            '<input id="efp-visibleInAreas" type="text" placeholder="e.g. Connaught Place, Hauz Khas, Saket" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#f0f4ff;font-size:12px;box-sizing:border-box;" />' +
          '</div>' +
          '<div style="display:flex;gap:16px;align-items:center;">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#f0f4ff;cursor:pointer;">' +
              '<input id="efp-showInDiscovery" type="checkbox" checked /> Show in Client Discovery' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#f0f4ff;cursor:pointer;">' +
              '<input id="efp-isActive" type="checkbox" checked /> Active Profile' +
            '</label>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div style="display:flex;gap:10px;margin-top:24px;">' +
        '<button onclick="AdminApp.submitCreateProfile()" class="btn btn-primary" style="flex:1;">Create Profile</button>' +
        '<button onclick="document.getElementById(\'modal-edit-fake-profile\').remove()" class="btn btn-secondary">Cancel</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(modal);
  },

  async submitCreateProfile() {
    function g(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    const visibleAreasStr = g('efp-visibleInAreas');
    const visibleInAreas = visibleAreasStr ? visibleAreasStr.split(',').map(s=>s.trim()).filter(Boolean) : [];

    const data = {
      name: g('efp-name'),
      age: parseInt(g('efp-age') || '24'),
      city: g('efp-city'),
      area: g('efp-area'),
      occupation: g('efp-occupation'),
      bio: g('efp-bio'),
      avatar: g('efp-avatar'),
      visibleInAreas: visibleInAreas,
      showInDiscovery: document.getElementById('efp-showInDiscovery') ? document.getElementById('efp-showInDiscovery').checked : true,
      isActive: document.getElementById('efp-isActive') ? document.getElementById('efp-isActive').checked : true,
      serviceCharges: [
        { service: 'Coffee Date', price: 2500, duration: '1 hour', description: 'Casual meetup', isAvailable: true },
        { service: 'Dinner Date', price: 5000, duration: '2 hours', description: 'Fine dining', isAvailable: true },
        { service: 'Virtual Call', price: 1000, duration: '30 min', description: 'Video/voice call', isAvailable: true }
      ]
    };

    if (!data.name || !data.city) { toast('Name and City are required', 'error'); return; }
    try {
      await apiFetchAuthed('/admin/fake-profiles', { method: 'POST', body: JSON.stringify(data) });
      toast('Profile "' + data.name + '" created successfully!', 'success');
      const m = document.getElementById('modal-edit-fake-profile');
      if (m) m.remove();
      this.loadFakeProfiles();
    } catch {}
  },

  async openEditFakeProfileModal(id) {
    try {
      const data = await apiFetchAuthed('/admin/fake-profiles');
      const profiles = data.profiles || [];
      const profile = profiles.find(p => p.id === id);
      if (!profile) { toast('Profile not found', 'error'); return; }

      var existing = document.getElementById('modal-edit-fake-profile');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'modal-edit-fake-profile';
      modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
      
      const scList = profile.serviceCharges || [
        { service: 'Coffee Date', price: 2500, duration: '1 hour', description: 'Casual meetup', isAvailable: true },
        { service: 'Dinner Date', price: 5000, duration: '2 hours', description: 'Fine dining', isAvailable: true },
        { service: 'Virtual Call', price: 1000, duration: '30 min', description: 'Video call', isAvailable: true }
      ];

      modal.innerHTML = '<div style="background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px;width:680px;max-width:94vw;max-height:92vh;overflow-y:auto;box-sizing:border-box;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
          '<div style="font-size:18px;font-weight:700;color:#f0f4ff;">✏️ Edit Fake Profile: ' + profile.name + '</div>' +
          '<button onclick="document.getElementById(\'modal-edit-fake-profile\').remove()" style="background:none;border:none;color:#8b96b4;font-size:20px;cursor:pointer;">✕</button>' +
        '</div>' +
        
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          '<!-- Basic Details -->' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">NAME</label><input id="efp-name" type="text" value="' + (profile.name || '') + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">AGE</label><input id="efp-age" type="number" value="' + (profile.age || 24) + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">CITY</label><input id="efp-city" type="text" value="' + (profile.city || '') + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">PRIMARY AREA</label><input id="efp-area" type="text" value="' + (profile.area || '') + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
          '</div>' +

          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">OCCUPATION</label><input id="efp-occupation" type="text" value="' + (profile.occupation || '') + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
            '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">HEIGHT</label><input id="efp-height" type="text" value="' + (profile.height || '5\'4"') + '" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" /></div>' +
          '</div>' +

          '<div><label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">BIO</label><textarea id="efp-bio" rows="2" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;">' + (profile.bio || '') + '</textarea></div>' +

          '<!-- Avatar Control -->' +
          '<div>' +
            '<label style="font-size:11px;font-weight:600;color:#8b96b4;display:block;margin-bottom:4px;">PHOTO / AVATAR URL (Leave blank for NO PIC)</label>' +
            '<div style="display:flex;gap:8px;">' +
              '<input id="efp-avatar" type="text" value="' + (profile.avatar || '') + '" placeholder="https://..." style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#f0f4ff;font-size:13px;box-sizing:border-box;" />' +
              '<button type="button" onclick="document.getElementById(\'efp-avatar\').value=\'\'" class="btn btn-secondary btn-sm" style="color:#ef4444;">🚫 Remove Pic (No Pic)</button>' +
            '</div>' +
          '</div>' +

          '<!-- Area & Display Access Control -->' +
          '<div style="background:rgba(124,92,252,0.08);border:1px solid rgba(124,92,252,0.2);border-radius:10px;padding:14px;">' +
            '<div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:8px;">🗺️ AREA VISIBILITY CONTROL & LIMITS</div>' +
            '<div style="margin-bottom:10px;">' +
              '<label style="font-size:11px;color:#8b96b4;display:block;margin-bottom:4px;">VISIBLE IN SPECIFIC AREAS (Comma separated. e.g. "Connaught Place, Hauz Khas". Leave empty for ALL areas in city)</label>' +
              '<input id="efp-visibleInAreas" type="text" value="' + ((profile.visibleInAreas || []).join(', ')) + '" placeholder="e.g. Connaught Place, Hauz Khas" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#f0f4ff;font-size:12px;box-sizing:border-box;" />' +
            '</div>' +
            '<div style="display:flex;gap:16px;align-items:center;">' +
              '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#f0f4ff;cursor:pointer;">' +
                '<input id="efp-showInDiscovery" type="checkbox" ' + (profile.showInDiscovery !== false ? 'checked' : '') + ' /> Show in Client Discovery' +
              '</label>' +
              '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#f0f4ff;cursor:pointer;">' +
                '<input id="efp-isActive" type="checkbox" ' + (profile.isActive ? 'checked' : '') + ' /> Active Status' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<!-- Service Charges Management -->' +
          '<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
              '<div style="font-size:12px;font-weight:700;color:#10b981;">💰 SERVICE CHARGES MANAGER</div>' +
              '<button type="button" onclick="AdminApp.addServiceChargeRow()" class="btn btn-secondary btn-sm" style="font-size:11px;"><i class="fa fa-plus"></i> Add Service</button>' +
            '</div>' +
            '<div id="efp-service-charges-container" style="display:flex;flex-direction:column;gap:8px;">' +
              scList.map(function(sc, idx) {
                return '<div class="sc-row" style="display:flex;gap:8px;align-items:center;">' +
                  '<input type="text" class="sc-name" value="' + sc.service + '" placeholder="Service Name" style="flex:2;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
                  '<input type="number" class="sc-price" value="' + sc.price + '" placeholder="Price ₹" style="width:90px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
                  '<input type="text" class="sc-duration" value="' + sc.duration + '" placeholder="Duration" style="width:80px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
                  '<button type="button" onclick="this.parentElement.remove()" style="background:rgba(239,68,68,0.15);color:#ef4444;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">✕</button>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +

        '</div>' +

        '<div style="display:flex;gap:10px;margin-top:24px;">' +
          '<button onclick="AdminApp.submitSaveProfile(\'' + profile.id + '\')" class="btn btn-primary" style="flex:1;">💾 Save All Changes</button>' +
          '<button onclick="document.getElementById(\'modal-edit-fake-profile\').remove()" class="btn btn-secondary">Cancel</button>' +
        '</div>' +
      '</div>';
      document.body.appendChild(modal);
    } catch(e) {
      toast('Failed to load profile for editing', 'error');
    }
  },

  addServiceChargeRow() {
    const container = document.getElementById('efp-service-charges-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'sc-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;';
    row.innerHTML = '' +
      '<input type="text" class="sc-name" placeholder="e.g. VIP Hangout" style="flex:2;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
      '<input type="number" class="sc-price" placeholder="Price ₹" value="3000" style="width:90px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
      '<input type="text" class="sc-duration" placeholder="Duration" value="1 hour" style="width:80px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;color:#f0f4ff;font-size:12px;" />' +
      '<button type="button" onclick="this.parentElement.remove()" style="background:rgba(239,68,68,0.15);color:#ef4444;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">✕</button>';
    container.appendChild(row);
  },

  async submitSaveProfile(id) {
    function g(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    
    const visibleAreasStr = g('efp-visibleInAreas');
    const visibleInAreas = visibleAreasStr ? visibleAreasStr.split(',').map(s=>s.trim()).filter(Boolean) : [];

    // Collect service charges
    const scRows = document.querySelectorAll('.sc-row');
    const serviceCharges = [];
    scRows.forEach(row => {
      const name = row.querySelector('.sc-name')?.value?.trim();
      const price = parseFloat(row.querySelector('.sc-price')?.value || '0');
      const duration = row.querySelector('.sc-duration')?.value?.trim() || '1 hour';
      if (name) {
        serviceCharges.push({
          service: name,
          price: price,
          duration: duration,
          description: name + ' service',
          isAvailable: true
        });
      }
    });

    const data = {
      name: g('efp-name'),
      age: parseInt(g('efp-age') || '24'),
      city: g('efp-city'),
      area: g('efp-area'),
      occupation: g('efp-occupation'),
      height: g('efp-height'),
      bio: g('efp-bio'),
      avatar: g('efp-avatar'), // can be empty string ("")
      visibleInAreas: visibleInAreas,
      showInDiscovery: document.getElementById('efp-showInDiscovery') ? document.getElementById('efp-showInDiscovery').checked : true,
      isActive: document.getElementById('efp-isActive') ? document.getElementById('efp-isActive').checked : true,
      serviceCharges: serviceCharges
    };

    if (!data.name || !data.city) { toast('Name and City are required', 'error'); return; }

    try {
      await apiFetchAuthed('/admin/fake-profiles/' + id, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      toast('Profile "' + data.name + '" updated successfully!', 'success');
      const m = document.getElementById('modal-edit-fake-profile');
      if (m) m.remove();
      this.loadFakeProfiles();
    } catch(e) {
      toast('Failed to update profile', 'error');
    }
  },

  async loadMeetingRequests() {
    const list = document.getElementById('meeting-requests-list');
    if (!list) return;

    const statusEl = document.getElementById('mr-status-filter');
    const cityEl = document.getElementById('mr-city-filter');
    const status = statusEl ? statusEl.value : 'ALL';
    const city = cityEl ? cityEl.value : 'ALL';

    list.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading requests...</div>';

    try {
      const data = await apiFetchAuthed('/admin/meeting-requests?status=' + status + '&city=' + city);
      const requests = data.requests || [];
      
      const badge = document.getElementById('tab-badge-meeting-requests');
      if (badge) {
        badge.textContent = data.pendingCount || 0;
        badge.style.display = (data.pendingCount > 0) ? 'inline-flex' : 'none';
      }

      if (status === 'ALL') {
        let p=0, a=0, r=0, h=0;
        requests.forEach(req => {
          if(req.status === 'PENDING') p++;
          if(req.status === 'ACCEPTED') a++;
          if(req.status === 'REJECTED') r++;
          if(req.status === 'HOLD' || req.status === 'ON_HOLD') h++;
        });
        if (document.getElementById('mr-stat-pending')) document.getElementById('mr-stat-pending').textContent = p;
        if (document.getElementById('mr-stat-accepted')) document.getElementById('mr-stat-accepted').textContent = a;
        if (document.getElementById('mr-stat-rejected')) document.getElementById('mr-stat-rejected').textContent = r;
        if (document.getElementById('mr-stat-hold')) document.getElementById('mr-stat-hold').textContent = h;
      }

      if (!requests.length) {
        list.innerHTML = '<div style="padding:48px;text-align:center;color:#4b5572;">No meeting requests found.</div>';
        return;
      }

      list.innerHTML = requests.map(r => `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="color:#f0f4ff;font-weight:600;margin-bottom:8px;font-size:15px;">
              Request #${r.id.substring(0,8)}... 
              <span style="font-size:11px;padding:3px 8px;border-radius:12px;margin-left:8px;
                ${r.status==='PENDING'?'background:rgba(239,68,68,0.1);color:#ef4444;':
                  r.status==='ACCEPTED'?'background:rgba(16,185,129,0.1);color:#10b981;':
                  r.status==='REJECTED'?'background:rgba(239,68,68,0.1);color:#f87171;':
                  'background:rgba(245,158,11,0.1);color:#f59e0b;'}">
                ${r.status}
              </span>
            </div>
            <div style="color:#8b96b4;font-size:13px;margin-bottom:4px;"><i class="fa fa-user"></i> Client ID: ${r.clientId}</div>
            <div style="color:#8b96b4;font-size:13px;margin-bottom:4px;"><i class="fa fa-heart"></i> Profile: ${r.targetProfileName || r.targetProfileId}</div>
            <div style="color:#8b96b4;font-size:13px;margin-bottom:4px;"><i class="fa fa-concierge-bell"></i> Service: ${r.serviceName} - ₹${r.amount}</div>
            <div style="color:#8b96b4;font-size:13px;"><i class="fa fa-clock"></i> Requested At: ${new Date(r.timestamp).toLocaleString()}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:140px;">
            ${r.status === 'PENDING' ? `
              <button onclick="AdminApp.handleMeetingAction('${r.id}', 'accept')" class="btn btn-sm" style="background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;padding:6px;cursor:pointer;border-radius:6px;">Accept</button>
              <button onclick="AdminApp.handleMeetingAction('${r.id}', 'reject')" class="btn btn-sm" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:6px;cursor:pointer;border-radius:6px;">Reject</button>
              <button onclick="AdminApp.handleMeetingAction('${r.id}', 'hold')" class="btn btn-sm" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;padding:6px;cursor:pointer;border-radius:6px;">Hold</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = '<div style="padding:48px;text-align:center;color:#ef4444;">Failed to load requests.</div>';
    }
  },

  async handleMeetingAction(id, action) {
    try {
      await apiFetchAuthed('/admin/meeting-requests/' + id + '/' + action, { method: 'POST' });
      toast('Request ' + action + 'ed successfully', 'success');
      this.loadMeetingRequests();
    } catch (e) {
      toast('Failed to ' + action + ' request', 'error');
    }
  }
});
