/* ================================================================
   COMPANION HUB — Application JavaScript
   Navigation, Mock Data, Dynamic Rendering
   ================================================================ */

'use strict';

/* ─── Mock Data ──────────────────────────────────────────────── */
let MOCK_PEOPLE = [
  {
    id: 'p1',
    name: 'Priya Sharma', age: 27, city: 'Mumbai', distance: '0.8 km',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80&auto=format&fit=crop',
    status: 'available', verified: true, trustScore: 98, rating: 4.9,
    activities: 34, reviews: 28, responseRate: '97%',
    languages: ['Hindi', 'English'], lastActive: 'Now',
    bio: 'Love coffee walks, art galleries & spontaneous city adventures!',
    interests: ['Coffee', 'Art', 'Travel'], repeatConnections: 12
  },
  {
    id: 'p2',
    name: 'Arjun Mehta', age: 31, city: 'Delhi', distance: '1.4 km',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80&auto=format&fit=crop',
    status: 'busy', verified: true, trustScore: 95, rating: 4.8,
    activities: 22, reviews: 19, responseRate: '94%',
    languages: ['Hindi', 'English', 'Punjabi'], lastActive: '5m ago',
    bio: 'Fitness enthusiast, weekend trekker, coffee over code.',
    interests: ['Fitness', 'Trekking', 'Networking'], repeatConnections: 8
  },
  {
    id: 'p3',
    name: 'Meera Nair', age: 25, city: 'Bangalore', distance: '2.1 km',
    photo: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&q=80&auto=format&fit=crop',
    status: 'available', verified: true, trustScore: 99, rating: 5.0,
    activities: 47, reviews: 41, responseRate: '99%',
    languages: ['Malayalam', 'English', 'Kannada'], lastActive: 'Now',
    bio: 'Foodie, concert lover, looking for fun city companions.',
    interests: ['Food', 'Concerts', 'Movies'], repeatConnections: 22
  },
  {
    id: 'p4',
    name: 'Rohan Verma', age: 29, city: 'Pune', distance: '3.2 km',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&auto=format&fit=crop',
    status: 'meeting', verified: true, trustScore: 92, rating: 4.7,
    activities: 18, reviews: 15, responseRate: '89%',
    languages: ['Hindi', 'Marathi', 'English'], lastActive: '12m ago',
    bio: 'Startup founder, avid reader, love exploring new restaurants.',
    interests: ['Dining', 'Books', 'Networking'], repeatConnections: 6
  },
  {
    id: 'p5',
    name: 'Ananya Patel', age: 24, city: 'Ahmedabad', distance: '0.5 km',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80&auto=format&fit=crop',
    status: 'available', verified: true, trustScore: 97, rating: 4.9,
    activities: 29, reviews: 25, responseRate: '98%',
    languages: ['Gujarati', 'Hindi', 'English'], lastActive: 'Now',
    bio: 'Yoga + brunch + bookshops. Let\'s explore together!',
    interests: ['Yoga', 'Brunch', 'Shopping'], repeatConnections: 14
  },
  {
    id: 'p6',
    name: 'Kiran Kumar', age: 33, city: 'Hyderabad', distance: '4.1 km',
    photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&q=80&auto=format&fit=crop',
    status: 'offline', verified: false, trustScore: 78, rating: 4.4,
    activities: 9, reviews: 7, responseRate: '82%',
    languages: ['Telugu', 'Hindi', 'English'], lastActive: '2h ago',
    bio: 'Tech professional who loves film festivals and craft beer.',
    interests: ['Films', 'Gaming', 'Beer'], repeatConnections: 3
  }
];

const ACTIVITY_TYPES = {
  coffee: { icon: '☕', label: 'Coffee Meetup', color: '#92400E', bg: '#FEF3C7' },
  movie: { icon: '🎬', label: 'Movie Night', color: '#1E40AF', bg: '#DBEAFE' },
  shopping: { icon: '🛍️', label: 'Shopping Partner', color: '#9333EA', bg: '#F3E8FF' },
  wedding: { icon: '💍', label: 'Wedding Companion', color: '#BE185D', bg: '#FCE7F3' },
  travel: { icon: '✈️', label: 'Travel Partner', color: '#065F46', bg: '#D1FAE5' },
  dinner: { icon: '🍽️', label: 'Dinner', color: '#B45309', bg: '#FEF3C7' },
  concert: { icon: '🎵', label: 'Concert', color: '#7C3AED', bg: '#EDE9FE' },
  festival: { icon: '🎪', label: 'Festival', color: '#DC2626', bg: '#FEE2E2' },
  gym: { icon: '💪', label: 'Gym Partner', color: '#047857', bg: '#ECFDF5' },
  networking: { icon: '🤝', label: 'Networking', color: '#1D4ED8', bg: '#EFF6FF' },
  birthday: { icon: '🎂', label: 'Birthday Event', color: '#C2410C', bg: '#FFF7ED' },
  trip: { icon: '🗺️', label: 'Weekend Trip', color: '#0E7490', bg: '#ECFEFF' }
};

const MOCK_ACTIVITIES = [
  {
    id: 'a1', type: 'coffee', host: MOCK_PEOPLE[0],
    title: 'Coffee & Conversation at Blue Tokai', description: 'Looking for someone to join me for a relaxed morning coffee. Let\'s chat about life, work, anything!',
    date: 'Today', time: '10:00 AM', duration: '1-2 hrs', budget: '₹300',
    location: 'Bandra West, Mumbai', distance: '0.8 km', applicants: 4,
    cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Any', ageRange: '22-35', languages: ['English', 'Hindi'],
    postedTime: '15m ago', interests: ['Coffee', 'Books']
  },
  {
    id: 'a2', type: 'concert', host: MOCK_PEOPLE[2],
    title: 'Arijit Singh Concert — Need a Companion', description: 'Have an extra ticket for tonight\'s show. Looking for a genuine concert buddy to enjoy the evening.',
    date: 'Tonight', time: '7:30 PM', duration: '3 hrs', budget: '₹1,200',
    location: 'NSCI Dome, Mumbai', distance: '2.1 km', applicants: 11,
    cover: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Any', ageRange: '21-35', languages: ['Hindi', 'English'],
    postedTime: '1h ago', interests: ['Music', 'Concerts']
  },
  {
    id: 'a3', type: 'travel', host: MOCK_PEOPLE[1],
    title: 'Goa Weekend Trip — 2 Spots Open', description: 'Planning a 3-day Goa trip next weekend. Need 2 like-minded travel companions. All expenses split equally.',
    date: 'Sat–Mon', time: 'Fri 9:00 PM', duration: '3 days', budget: '₹6,500',
    location: 'Departure from Delhi', distance: '1.4 km', applicants: 18,
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Any', ageRange: '24-35', languages: ['Hindi', 'English'],
    postedTime: '3h ago', interests: ['Travel', 'Beach', 'Adventure']
  },
  {
    id: 'a4', type: 'dinner', host: MOCK_PEOPLE[3],
    title: 'Fine Dining at Masque — Looking for Company', description: 'Reserved a table for two at Masque. Prefer someone who appreciates good food and conversation.',
    date: 'Tomorrow', time: '8:00 PM', duration: '2-3 hrs', budget: '₹3,000',
    location: 'Mahalaxmi, Mumbai', distance: '3.2 km', applicants: 7,
    cover: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Female', ageRange: '25-35', languages: ['English'],
    postedTime: '45m ago', interests: ['Food', 'Wine', 'Culture']
  },
  {
    id: 'a5', type: 'gym', host: MOCK_PEOPLE[4],
    title: 'Morning Gym Partner — Cult Fit', description: 'Looking for a consistent gym partner for morning sessions, Mon–Fri. Prefer someone motivated and punctual.',
    date: 'Daily', time: '6:30 AM', duration: '1.5 hrs', budget: 'Free',
    location: 'Indiranagar, Bangalore', distance: '0.5 km', applicants: 3,
    cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Female', ageRange: '20-30', languages: ['English', 'Kannada'],
    postedTime: '2h ago', interests: ['Fitness', 'Health']
  },
  {
    id: 'a6', type: 'networking', host: MOCK_PEOPLE[0],
    title: 'Startup Networking Evening at WeWork', description: 'Attending a startup mixer tonight. Would love to walk in with someone. Great way to expand your network!',
    date: 'Today', time: '6:00 PM', duration: '2 hrs', budget: 'Free',
    location: 'BKC, Mumbai', distance: '1.1 km', applicants: 5,
    cover: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80&auto=format&fit=crop',
    genderPref: 'Any', ageRange: '24-40', languages: ['English'],
    postedTime: '30m ago', interests: ['Networking', 'Startups', 'Tech']
  }
];

const MOCK_MEETINGS = [
  {
    id: 'm1', person: MOCK_PEOPLE[0], activity: 'Coffee Meetup',
    date: 'Today, 10:00 AM', location: 'Blue Tokai, Bandra', status: 'confirmed',
    budget: '₹300', duration: '1-2 hrs'
  },
  {
    id: 'm2', person: MOCK_PEOPLE[2], activity: 'Concert Night',
    date: 'Today, 7:30 PM', location: 'NSCI Dome', status: 'confirmed',
    budget: '₹1,200', duration: '3 hrs'
  },
  {
    id: 'm3', person: MOCK_PEOPLE[1], activity: 'Networking Event',
    date: 'Tomorrow, 6:00 PM', location: 'WeWork BKC', status: 'pending',
    budget: 'Free', duration: '2 hrs'
  },
  {
    id: 'm4', person: MOCK_PEOPLE[3], activity: 'Dinner at Masque',
    date: 'Sat, 8:00 PM', location: 'Mahalaxmi, Mumbai', status: 'pending',
    budget: '₹3,000', duration: '2-3 hrs'
  }
];

const MOCK_CONVERSATIONS = [
  {
    id: 'c1', person: MOCK_PEOPLE[0], online: true, unread: 2,
    lastMsg: 'Sure! See you at Blue Tokai at 10 👋', time: '2m ago',
    activity: 'Coffee Meetup',
    messages: [
      { from: 'them', text: 'Hi! I saw your coffee request. I\'d love to join!', time: '10:32 AM' },
      { from: 'me', text: 'Hey Priya! That sounds great. Are you near Bandra?', time: '10:35 AM' },
      { from: 'them', text: 'Yes, I\'m just 10 mins away. Blue Tokai works perfectly 🙂', time: '10:38 AM' },
      { from: 'me', text: 'Perfect! Let\'s say 10 AM tomorrow?', time: '10:40 AM' },
      { from: 'them', text: 'Sure! See you at Blue Tokai at 10 👋', time: '10:41 AM' }
    ]
  },
  {
    id: 'c2', person: MOCK_PEOPLE[2], online: true, unread: 0,
    lastMsg: 'Looking forward to the concert!', time: '45m ago',
    activity: 'Concert Night',
    messages: [
      { from: 'them', text: 'Hey! Interested in your concert companion post!', time: '9:10 AM' },
      { from: 'me', text: 'Great! It\'s tonight at NSCI. Arijit Singh!', time: '9:15 AM' },
      { from: 'them', text: 'Looking forward to the concert!', time: '9:20 AM' }
    ]
  },
  {
    id: 'c3', person: MOCK_PEOPLE[1], online: false, unread: 0,
    lastMsg: 'I\'ll confirm by evening.', time: '3h ago',
    activity: 'Goa Trip',
    messages: [
      { from: 'them', text: 'Interested in the Goa trip! 3 days sounds perfect.', time: '7:30 AM' },
      { from: 'me', text: 'Great! Split costs: ~₹6500 per person.', time: '7:35 AM' },
      { from: 'them', text: 'I\'ll confirm by evening.', time: '7:40 AM' }
    ]
  }
];

const MOCK_TRANSACTIONS = [
  { id: 't1', type: 'credit', name: 'Coffee Meetup — Priya', date: 'Today, 12:30 PM', amount: '₹300' },
  { id: 't2', type: 'credit', name: 'Concert Companion — Meera', date: 'Yesterday, 8:00 PM', amount: '₹1,200' },
  { id: 't3', type: 'debit', name: 'Platform Fee (10%)', date: 'Yesterday, 8:01 PM', amount: '₹120' },
  { id: 't4', type: 'credit', name: 'Dinner Companion — Neha', date: '2 days ago', amount: '₹2,500' },
  { id: 't5', type: 'debit', name: 'Withdrawal to UPI', date: '3 days ago', amount: '₹3,500' },
];

const MOCK_REVIEWS = [
  {
    id: 'r1', person: MOCK_PEOPLE[0], rating: 5,
    text: 'Amazing company! Priya was warm, interesting and made the coffee so enjoyable. Definitely meeting again.',
    activity: 'Coffee Meetup', date: '2 days ago'
  },
  {
    id: 'r2', person: MOCK_PEOPLE[2], rating: 5,
    text: 'Meera was the perfect concert companion — enthusiastic, fun and great energy. Highly recommend!',
    activity: 'Concert Night', date: '1 week ago'
  },
  {
    id: 'r3', person: MOCK_PEOPLE[3], rating: 4,
    text: 'Good company at dinner. Rohan is knowledgeable and interesting. Would meet again.',
    activity: 'Fine Dining', date: '2 weeks ago'
  }
];

let appNotifications = [];

/* ─── Navigation State ───────────────────────────────────────── */
let currentPage = 'dashboard';
let activeConv = MOCK_CONVERSATIONS[0];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  discover: 'Discover Companions',
  activities: 'Activity Requests',
  nearby: 'Nearby People',
  messages: 'Messages',
  meetings: 'Meetings',
  notifications: 'Notifications',
  earnings: 'Earnings & Wallet',
  reviews: 'Reviews',
  wallet: 'Wallet',
  verification: 'Verification',
  profile: 'My Profile',
  settings: 'Settings',
  admin: 'Executive Admin Controller'
};

/* ─── Router ─────────────────────────────────────────────────── */
function navigateTo(page) {
  currentPage = page;
  closeMobileSidebar();

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update page title
  const titleEl = document.getElementById('topnavTitle');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  // Show/hide pages
  document.querySelectorAll('.page-container').forEach(el => {
    el.classList.remove('active');
  });

  const targetPage = document.getElementById('page-' + page);
  if (targetPage) {
    targetPage.classList.add('active');
    renderPage(page);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.style.display = 'block';
  }
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.style.display = 'none';
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':   renderDashboard();     break;
    case 'discover':    renderDiscover();       break;
    case 'activities':  renderActivities();     break;
    case 'nearby':      renderNearby();         break;
    case 'messages':    renderMessages();       break;
    case 'meetings':    renderMeetings();       break;
    case 'notifications': renderNotifications(); break;
    case 'earnings':    renderEarnings();       break;
    case 'reviews':     renderReviews();        break;
    case 'verification': renderVerification();  break;
    case 'profile':     renderProfile();        break;
    case 'admin':       if (window.loadAdminData) window.loadAdminData('overview'); break;
  }
}

/* ─── DASHBOARD ──────────────────────────────────────────────── */
async function renderDashboard() {
  try {
    const res = await fetch('/api/earn/dashboard');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const el = document.getElementById('dashboard-stats');
        if (el) {
          el.innerHTML = `
            <div class="stat-card animate-fade-up" style="animation-delay:0ms">
              <div class="stat-card-icon indigo"><i class="fa-solid fa-layer-group"></i></div>
              <div class="stat-label">Total Earnings</div>
              <div class="stat-value">₹${(data.earnings?.totalEarnings || 0).toLocaleString('en-IN')}</div>
              <div class="stat-delta up"><i class="fa-solid fa-arrow-up"></i> Live Telemetry</div>
            </div>
            <div class="stat-card animate-fade-up" style="animation-delay:50ms">
              <div class="stat-card-icon emerald"><i class="fa-solid fa-comment-dots"></i></div>
              <div class="stat-label">Escrow Pending</div>
              <div class="stat-value">₹${(data.earnings?.pendingPayout || 0).toLocaleString('en-IN')}</div>
              <div class="stat-delta neutral"><i class="fa-solid fa-shield-halved"></i> Escrow Secured</div>
            </div>
            <div class="stat-card animate-fade-up" style="animation-delay:100ms">
              <div class="stat-card-icon violet"><i class="fa-solid fa-eye"></i></div>
              <div class="stat-label">Profile Views</div>
              <div class="stat-value">${data.profileViews?.totalViews || 284}</div>
              <div class="stat-delta up"><i class="fa-solid fa-arrow-up"></i> +${data.profileViews?.weeklyViews || 42} this week</div>
            </div>
          `;
        }

        if (data.leaderboard) {
          const leaderboardEl = document.getElementById('dashboard-leaderboard');
          if (leaderboardEl) {
            const getRank = (idx) => {
              if (idx === 0) return '🥇';
              if (idx === 1) return '🥈';
              if (idx === 2) return '🥉';
              return `#${idx + 1}`;
            };
            leaderboardEl.innerHTML = data.leaderboard.slice(0, 10).map((p, idx) => `
              <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--surface-border); transition:var(--transition-fast); cursor:pointer;">
                <div style="font-size:${idx < 3 ? '18px' : '12px'}; font-weight:800; width:26px; text-align:center; color:${idx < 3 ? 'var(--text-primary)' : 'var(--text-muted)'}">${getRank(idx)}</div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:13px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:4px;">
                    ${p.name}
                    <i class="fa-solid fa-circle-check" style="font-size:10px; color:var(--brand-primary)"></i>
                  </div>
                  <div style="font-size:11px; color:var(--text-muted);"><i class="fa fa-map-marker-alt" style="font-size:9px;"></i> ${p.area || 'India'}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:13px; font-weight:800; color:var(--accent-emerald);">
                    ₹${(p.earnings || 0).toLocaleString('en-IN')}
                  </div>
                  <div style="font-size:10px; color:var(--text-muted);">★ ${p.rating}</div>
                </div>
              </div>
            `).join('');
          }
        }
      }
    }
  } catch (e) {
    console.warn("Live dashboard fetch failed, relying on mock store:", e);
  }

  const nearbyEl = document.getElementById('dashboard-nearby');
  if (nearbyEl) {
    nearbyEl.innerHTML = MOCK_PEOPLE.slice(0, 6).map(buildPeopleCard).join('');
  }

  const activitiesEl = document.getElementById('dashboard-activities');
  if (activitiesEl) {
    activitiesEl.innerHTML = MOCK_ACTIVITIES.slice(0,4).map(buildActivityCard).join('');
  }

  const meetingsEl = document.getElementById('dashboard-meetings');
  if (meetingsEl) {
    meetingsEl.innerHTML = MOCK_MEETINGS.slice(0,3).map(buildMeetingCard).join('');
  }

  const reviewsEl = document.getElementById('dashboard-reviews');
  if (reviewsEl && !reviewsEl.dataset.rendered) {
    reviewsEl.dataset.rendered = '1';
    reviewsEl.innerHTML = MOCK_REVIEWS.slice(0,2).map(buildReviewCard).join('');
  }
}

/* ─── FILTER & SORT MODAL LOGIC ────────────────────────────────── */
let currentFilterState = {
  sort: 'recommended',
  avail: 'all',
  verified: 'all',
  dist: 999
};

function openFilterSortModal() {
  const modal = document.getElementById('filterSortModal');
  if (modal) modal.style.display = 'flex';
}

function closeFilterSortModal() {
  const modal = document.getElementById('filterSortModal');
  if (modal) modal.style.display = 'none';
}

function setSortOption(sortVal, btnEl) {
  currentFilterState.sort = sortVal;
  document.querySelectorAll('#filterSortOptions .filter-chip-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function setAvailOption(availVal, btnEl) {
  currentFilterState.avail = availVal;
  document.querySelectorAll('#filterAvailabilityOptions .filter-chip-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function setVerifiedOption(verVal, btnEl) {
  currentFilterState.verified = verVal;
  document.querySelectorAll('#filterVerificationOptions .filter-chip-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function setDistanceOption(distVal, btnEl) {
  currentFilterState.dist = distVal;
  document.querySelectorAll('#filterDistanceOptions .filter-chip-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function resetAllFiltersAndSort() {
  currentFilterState = { sort: 'recommended', avail: 'all', verified: 'all', dist: 999 };

  // Reset modal chip buttons active state
  document.querySelectorAll('#filterSortOptions .filter-chip-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === 'recommended'));
  document.querySelectorAll('#filterAvailabilityOptions .filter-chip-btn').forEach(b => b.classList.toggle('active', b.dataset.avail === 'all'));
  document.querySelectorAll('#filterVerificationOptions .filter-chip-btn').forEach(b => b.classList.toggle('active', b.dataset.verified === 'all'));
  document.querySelectorAll('#filterDistanceOptions .filter-chip-btn').forEach(b => b.classList.toggle('active', b.dataset.dist === '999'));

  // Reset tab active states
  document.querySelectorAll('#page-discover .filter-tab, #page-nearby .filter-tab').forEach(t => t.classList.remove('active'));
  const defaultDiscoverTab = document.querySelector('#page-discover .filter-tab');
  if (defaultDiscoverTab) defaultDiscoverTab.classList.add('active');
  const defaultNearbyTab = document.querySelector('#page-nearby .filter-tab');
  if (defaultNearbyTab) defaultNearbyTab.classList.add('active');

  // Hide Clear All buttons
  const clearDisc = document.getElementById('clearDiscoverFilterBtn');
  if (clearDisc) clearDisc.style.display = 'none';
  const clearNear = document.getElementById('clearNearbyFilterBtn');
  if (clearNear) clearNear.style.display = 'none';

  // Render original lists
  renderDiscover();
  renderNearby();

  closeFilterSortModal();
  showToast('🧹 All filters & sort options reset to default!');
}

function applyFilterSortFromModal() {
  let list = [...MOCK_PEOPLE];

  // Filter Availability
  if (currentFilterState.avail === 'available') {
    list = list.filter(p => p.status === 'available');
  } else if (currentFilterState.avail === 'today') {
    list = list.filter(p => p.status === 'available' || p.status === 'busy');
  }

  // Filter Verification
  if (currentFilterState.verified === 'verified') {
    list = list.filter(p => p.verified);
  }

  // Filter Distance
  if (currentFilterState.dist < 999) {
    list = list.filter(p => parseFloat(p.distance) <= currentFilterState.dist);
  }

  // Sort
  if (currentFilterState.sort === 'nearest') {
    list.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  } else if (currentFilterState.sort === 'trust') {
    list.sort((a, b) => b.trustScore - a.trustScore);
  } else if (currentFilterState.sort === 'online') {
    list.sort((a, b) => (b.status === 'available' ? 1 : 0) - (a.status === 'available' ? 1 : 0));
  }

  // Render to discover and nearby grid
  const discGrid = document.getElementById('discover-grid');
  if (discGrid) {
    discGrid.innerHTML = list.length
      ? list.map(buildPeopleCard).join('')
      : `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px; text-align:center;">No companions match your selected filters.</p>`;
  }

  const nearGrid = document.getElementById('nearby-grid');
  if (nearGrid) {
    nearGrid.innerHTML = list.length
      ? list.map(buildPeopleCard).join('')
      : `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px; text-align:center;">No companions match your selected filters.</p>`;
  }

  // Show Clear All buttons
  const isFiltered = currentFilterState.sort !== 'recommended' || currentFilterState.avail !== 'all' || currentFilterState.verified !== 'all' || currentFilterState.dist !== 999;
  const clearDisc = document.getElementById('clearDiscoverFilterBtn');
  if (clearDisc) clearDisc.style.display = isFiltered ? 'inline-flex' : 'none';
  const clearNear = document.getElementById('clearNearbyFilterBtn');
  if (clearNear) clearNear.style.display = isFiltered ? 'inline-flex' : 'none';

  closeFilterSortModal();
  showToast(`✨ Filtered (${list.length} companions found)`);
}

/* ─── DISCOVER ───────────────────────────────────────────────── */
async function renderDiscover() {
  const el = document.getElementById('discover-grid');
  if (!el) return;

  try {
    const res = await fetch('/api/client/companions', {
      headers: { 'Authorization': 'Bearer ' + (window.getClientToken ? window.getClientToken() : '') }
    });
    const data = await res.json();
    if (data.success && data.companions) {
      el.innerHTML = data.companions.length
        ? data.companions.map(buildCompanionCard).join('')
        : `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No companions available right now.</p>`;
    }
  } catch (e) {
    console.error("Error fetching companions:", e);
    el.innerHTML = `<p style="font-size:13px; color:var(--accent-rose); grid-column:1/-1; padding:20px;">Failed to load companions.</p>`;
  }
}

function buildCompanionCard(comp) {
  const photoUrl = comp.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=random`;
  return `
    <div class="people-card" style="display:flex; flex-direction:column; position:relative; background:var(--surface-card); border-radius:var(--radius-xl); overflow:hidden; box-shadow:var(--shadow-md); border:1px solid var(--surface-border);">
      <div class="people-card-photo-wrap" style="position:relative; width:100%; height:200px; overflow:hidden;">
        <img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover;">
        
        <!-- Badges on image -->
        <div style="position:absolute; top:12px; left:12px; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:4px 10px; border-radius:20px; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px;">
          <div style="width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;"></div>
          Available Now
        </div>
        
        <div style="position:absolute; top:12px; right:12px; display:flex; gap:6px;">
          <div style="background:var(--brand-primary); color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,0.4);" title="Verified">
            <i class="fa-solid fa-check"></i>
          </div>
          <div style="background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); color:#fff; padding:0 8px; height:24px; border-radius:12px; display:flex; align-items:center; gap:4px; font-size:11px; font-weight:700;">
            <i class="fa-solid fa-shield-halved" style="color:var(--accent-emerald);"></i> 98
          </div>
        </div>
      </div>
      
      <div style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px;">
          <div>
            <h3 style="margin:0; font-size:18px; font-weight:800; color:var(--text-primary);">${comp.name}, ${comp.age}</h3>
            <div style="color:var(--text-muted); font-size:13px; margin-top:4px;">
              <i class="fa-solid fa-location-dot" style="color:var(--brand-primary); margin-right:4px;"></i> near by ${comp.distance} km
            </div>
          </div>
        </div>
        
        <div style="margin:12px 0 16px 0; background:var(--surface-muted); padding:10px 12px; border-radius:8px; display:flex; align-items:center; gap:8px;">
          <div style="background:rgba(16, 185, 129, 0.1); color:var(--accent-emerald); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px;">
            ₹
          </div>
          <div>
            <div style="font-weight:800; font-size:15px; color:var(--text-primary);">₹${comp.reward}</div>
            <div style="font-size:11px; color:var(--text-muted);">for meeting</div>
          </div>
        </div>

        <button class="btn btn-primary w-full" style="padding:12px; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="showToast('Request sent to ${comp.name}!')">
          <i class="fa-solid fa-paper-plane"></i> Send Request for Accept
        </button>
      </div>
    </div>
  `;
}

async function filterDiscover(type, tabEl) {
  // Update active tab
  document.querySelectorAll('#page-discover .filter-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const el = document.getElementById('discover-grid');
  if (!el) return;

  try {
    const res = await fetch('/api/client/companions', {
      headers: { 'Authorization': 'Bearer ' + (window.getClientToken ? window.getClientToken() : '') }
    });
    const data = await res.json();
    if (data.success && data.companions) {
      let filtered = data.companions;
      if (type === 'nearby') {
        filtered = filtered.filter(p => parseFloat(p.distance) < 5);
      }
      
      el.innerHTML = filtered.length
        ? filtered.map(buildCompanionCard).join('')
        : `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No companions found for this filter.</p>`;
    }
  } catch (e) {
    console.error("Error fetching companions:", e);
    el.innerHTML = `<p style="font-size:13px; color:var(--accent-rose); grid-column:1/-1; padding:20px;">Failed to load companions.</p>`;
  }
}

/* ─── ACTIVITIES ─────────────────────────────────────────────── */
function renderActivities() {
  const el = document.getElementById('activities-grid');
  if (!el) return;
  el.innerHTML = MOCK_ACTIVITIES.map(buildActivityCard).join('');
}

function filterActivities(type) {
  const el = document.getElementById('activities-grid');
  if (!el) return;
  document.querySelectorAll('#page-activities .filter-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = type === 'all' ? MOCK_ACTIVITIES : MOCK_ACTIVITIES.filter(a => a.type === type);
  el.innerHTML = filtered.length ? filtered.map(buildActivityCard).join('') :
    '<p class="text-muted" style="padding:20px 0;">No activities found for this filter.</p>';
}

/* ─── NEARBY ─────────────────────────────────────────────────── */
function renderNearby() {
  const el = document.getElementById('nearby-grid');
  if (!el) return;
  el.innerHTML = [...MOCK_PEOPLE].sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance)).map(buildPeopleCard).join('');
}

function filterNearby(type, tabEl) {
  document.querySelectorAll('#page-nearby .filter-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const el = document.getElementById('nearby-grid');
  if (!el) return;

  let filtered;
  switch(type) {
    case 'online':    filtered = MOCK_PEOPLE.filter(p => p.status === 'available'); break;
    case 'under1km':  filtered = MOCK_PEOPLE.filter(p => parseFloat(p.distance) < 1); break;
    case 'available': filtered = MOCK_PEOPLE.filter(p => p.status === 'available'); break;
    case 'popular':   filtered = [...MOCK_PEOPLE].sort((a,b) => b.reviews - a.reviews); break;
    case 'verified':  filtered = MOCK_PEOPLE.filter(p => p.verified); break;
    default:          filtered = [...MOCK_PEOPLE].sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));
  }
  el.innerHTML = filtered.length
    ? filtered.map(buildPeopleCard).join('')
    : `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No companions found for this filter.</p>`;
}

/* ─── MESSAGES ───────────────────────────────────────────────── */
function renderMessages() {
  renderConvList();
  renderChatWindow(activeConv);
}

function renderConvList() {
  const el = document.getElementById('conv-list');
  if (!el) return;
  el.innerHTML = MOCK_CONVERSATIONS.map(c => `
    <div class="conv-item ${c.id === activeConv.id ? 'active' : ''}" onclick="selectConv('${c.id}')">
      <div class="conv-avatar-wrap">
        <img src="${c.person.photo}" alt="${c.person.name}" class="conv-avatar">
        ${c.online ? '<div class="conv-online-dot"></div>' : ''}
      </div>
      <div class="conv-info">
        <div class="conv-name">
          ${c.person.name}
          ${c.person.verified ? '<i class="fa-solid fa-circle-check conv-verified"></i>' : ''}
        </div>
        <div class="conv-last-msg">${c.lastMsg}</div>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${c.time}</span>
        ${c.unread ? `<div class="conv-unread">${c.unread}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function selectConv(id) {
  activeConv = MOCK_CONVERSATIONS.find(c => c.id === id);
  if (activeConv) {
    activeConv.unread = 0;
    renderConvList();
    renderChatWindow(activeConv);
    // Mobile: switch to chat panel
    const layout = document.querySelector('.messages-layout');
    if (layout) layout.classList.add('chat-open');
    setTimeout(() => {
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }
}

function goBackToConvList() {
  const layout = document.querySelector('.messages-layout');
  if (layout) layout.classList.remove('chat-open');
}

function openDirectChatWithPerson(personId) {
  let conv = MOCK_CONVERSATIONS.find(c => c.person && c.person.id === personId);
  if (!conv) {
    const person = MOCK_PEOPLE.find(p => p.id === personId);
    if (person) {
      conv = {
        id: 'c_' + person.id,
        person: person,
        online: person.status === 'available',
        unread: 0,
        lastMsg: `Hi ${person.name}, let's connect!`,
        time: 'Just now',
        activity: 'Social Companion',
        messages: [
          { from: 'me', text: `Hi ${person.name}! I would love to connect for a real-world experience.`, time: 'Just now' }
        ]
      };
      MOCK_CONVERSATIONS.unshift(conv);
    }
  }

  if (conv) {
    activeConv = conv;
    activeConv.unread = 0;
    navigateTo('messages');
    renderMessages();
    // Mobile: switch to chat panel
    const layout = document.querySelector('.messages-layout');
    if (layout) layout.classList.add('chat-open');
    setTimeout(() => {
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }
}

function renderChatWindow(conv) {
  const win = document.getElementById('chat-window');
  if (!win) return;

  win.innerHTML = `
    <div class="chat-window-header">
      <button class="chat-back-btn" onclick="goBackToConvList()" style="display:none;" title="Back">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="chat-window-user">
        <img src="${conv.person.photo}" alt="" class="chat-window-avatar">
        <div>
          <div class="chat-window-name">${conv.person.name}, ${conv.person.age}</div>
          <div class="chat-window-status">
            ${conv.online ? '<span class="online-indicator"></span> Online now' : 'Last seen recently'}
            &bull; ${conv.activity}
          </div>
        </div>
      </div>
      <div class="chat-window-actions">
        <button class="btn-icon brand" title="Video Call"><i class="fa-solid fa-video"></i></button>
        <button class="btn-icon brand" title="Voice Call"><i class="fa-solid fa-phone"></i></button>
        <button class="btn-icon brand" title="Schedule Meeting" onclick="openScheduleMeetingModal()"><i class="fa-solid fa-calendar-plus"></i></button>
        <button class="btn-icon" title="More"><i class="fa-solid fa-ellipsis"></i></button>
      </div>
    </div>
    <div class="chat-messages-area" id="chat-messages">
      ${conv.messages.map((m, i) => `
        <div class="chat-bubble-wrap ${m.from === 'me' ? 'mine' : ''}">
          ${m.from !== 'me' ? `<img src="${conv.person.photo}" alt="" class="chat-bubble-avatar">` : ''}
          <div class="chat-bubble ${m.from === 'me' ? 'mine' : 'theirs'} ${m.isMeeting ? 'meeting-card-bubble' : ''}">
            ${m.text}
            <div class="chat-bubble-time">${m.time} ${m.from === 'me' ? '\u2713\u2713' : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="chat-input-area">
      <button class="btn-icon brand" title="Schedule Meeting" onclick="openScheduleMeetingModal()"><i class="fa-solid fa-calendar-plus"></i></button>
      <button class="btn-icon" title="Attach"><i class="fa-solid fa-paperclip"></i></button>
      <button class="btn-icon" title="Emoji"><i class="fa-regular fa-face-smile"></i></button>
      <input class="chat-input" id="chat-input-field" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendMessage()">
      <button class="btn-icon brand" title="Voice"><i class="fa-solid fa-microphone"></i></button>
      <button class="chat-send-btn" onclick="sendMessage()"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `;

  // Show back button on mobile screens
  if (window.innerWidth <= 768) {
    const backBtn = win.querySelector('.chat-back-btn');
    if (backBtn) backBtn.style.display = 'flex';
  }
}

function openScheduleMeetingModal() {
  const modal = document.getElementById('scheduleMeetingModal');
  if (!modal) return;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  document.getElementById('meetDateInput').value = dateStr;
  document.getElementById('meetTimeInput').value = '17:00';
  document.getElementById('meetTitleInput').value = activeConv ? activeConv.activity : 'Coffee Meetup';
  document.getElementById('meetLocInput').value = 'Blue Tokai Cafe, City Center';
  
  modal.style.display = 'flex';
}

function closeScheduleMeetingModal() {
  const modal = document.getElementById('scheduleMeetingModal');
  if (modal) modal.style.display = 'none';
}

async function confirmScheduleMeeting() {
  const title = document.getElementById('meetTitleInput').value.trim() || 'Meetup';
  const dateVal = document.getElementById('meetDateInput').value;
  const timeVal = document.getElementById('meetTimeInput').value;
  const loc = document.getElementById('meetLocInput').value.trim() || 'Selected Cafe';

  if (!activeConv) return;

  const meetingCardText = `📅 <b>Meeting Invitation Proposed!</b><br><b>Activity:</b> ${title}<br><b>Date & Time:</b> ${dateVal} at ${timeVal}<br><b>Location:</b> ${loc}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  activeConv.messages.push({ from: 'me', text: meetingCardText, time: timeStr, isMeeting: true });
  activeConv.lastMsg = `📅 Meeting Proposed: ${title}`;

  try {
    await fetch('/api/earn/chats/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeConv.id || 'chat-101', text: meetingCardText })
    });
  } catch (e) {
    console.warn("Meeting invitation sync warning:", e);
  }

  renderChatWindow(activeConv);
  renderConvList();
  closeScheduleMeetingModal();

  showToast(`📅 Meeting invitation sent for ${title}!`);
}

async function sendMessage() {
  const input = document.getElementById('chat-input-field');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  activeConv.messages.push({ from: 'me', text, time: timeStr });
  activeConv.lastMsg = text;

  try {
    await fetch('/api/earn/chats/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeConv.id || 'chat-101', text })
    });
  } catch (e) {
    console.warn("Message API sync warning:", e);
  }

  renderChatWindow(activeConv);
  renderConvList();
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

/* ─── MEETINGS ───────────────────────────────────────────────── */
async function renderMeetings() {
  const el = document.getElementById('meetings-list');
  if (!el) return;

  try {
    const res = await fetch('/api/earn/meetings');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.meetings && data.meetings.length > 0) {
        el.innerHTML = data.meetings.map(m => `
          <div class="meeting-card">
            <img src="${m.customerAvatar || m.clientAvatar}" alt="${m.customerName || m.clientName}" class="meeting-avatar">
            <div class="meeting-info">
              <div class="meeting-title">${m.title}</div>
              <div class="meeting-meta">
                <span><i class="fa-regular fa-calendar" style="color:var(--brand-primary)"></i> ${m.dateTime}</span>
                <span><i class="fa-solid fa-location-dot" style="color:var(--brand-primary)"></i> ${m.location}</span>
                <span><i class="fa-solid fa-indian-rupee-sign" style="color:var(--accent-emerald); font-size:10px"></i> ₹${(m.amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style="margin-top:6px;">
                <span class="meeting-status-pill ${m.status.toLowerCase()}">✓ ${m.status}</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="showToast('💬 Opening chat...')">
              <i class="fa-regular fa-comment-dots"></i> Chat
            </button>
          </div>
        `).join('');
        return;
      }
    }
  } catch (e) {
    console.warn("Live meetings fetch failed, fallback to mock:", e);
  }

  el.innerHTML = MOCK_MEETINGS.map(buildMeetingCard).join('');
}

/* ─── NOTIFICATIONS ──────────────────────────────────────────── */
function renderNotifications() {
  const el = document.getElementById('notifs-list');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = '1';
  el.innerHTML = MOCK_NOTIFICATIONS.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-icon" style="background:var(--surface-muted); font-size:20px; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${n.icon}</div>
      <div class="notif-content">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${n.unread ? '<div class="online-indicator" style="flex-shrink:0;"></div>' : ''}
    </div>
  `).join('');
}

/* ─── EARNINGS ───────────────────────────────────────────────── */
async function renderEarnings() {
  const el = document.getElementById('earnings-transactions');
  if (!el) return;

  try {
    const res = await fetch('/api/earn/ledger');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.ledger && data.ledger.length > 0) {
        el.innerHTML = data.ledger.map(t => `
          <div class="transaction-item">
            <div class="transaction-icon ${t.direction === 'CREDIT' ? 'credit' : 'debit'}">
              <i class="fa-solid ${t.direction === 'CREDIT' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
            </div>
            <div class="transaction-info">
              <div class="transaction-name">${t.description}</div>
              <div class="transaction-date">${t.createdAt}</div>
            </div>
            <div class="transaction-amount ${t.direction === 'CREDIT' ? 'credit' : 'debit'}">${t.direction === 'CREDIT' ? '+' : '−'}₹${t.amount.toLocaleString('en-IN')}</div>
          </div>
        `).join('');
        return;
      }
    }
  } catch (e) {
    console.warn("Ledger fetch error, fallback to mock:", e);
  }

  el.innerHTML = MOCK_TRANSACTIONS.map(t => `
    <div class="transaction-item">
      <div class="transaction-icon ${t.type}">
        <i class="fa-solid ${t.type === 'credit' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
      </div>
      <div class="transaction-info">
        <div class="transaction-name">${t.name}</div>
        <div class="transaction-date">${t.date}</div>
      </div>
      <div class="transaction-amount ${t.type}">${t.type === 'credit' ? '+' : '−'}${t.amount}</div>
    </div>
  `).join('');
}


/* ─── REVIEWS ────────────────────────────────────────────────── */
function renderReviews() {
  const el = document.getElementById('reviews-list');
  if (!el) return;
  el.innerHTML = MOCK_REVIEWS.map(buildReviewCard).join('');
}

/* ─── VERIFICATION ───────────────────────────────────────────── */
function renderVerification() {
  // Already static HTML
}

/* ─── Card Builders ──────────────────────────────────────────── */
function buildPeopleCard(p) {
  const statusMap = {
    available: { cls: 'status-available', label: '● Available Now' },
    busy: { cls: 'status-busy', label: '● Busy' },
    meeting: { cls: 'status-meeting', label: '● In Meeting' },
    offline: { cls: 'status-offline', label: '○ Offline' }
  };
  const s = statusMap[p.status] || statusMap.offline;
  const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 >= 0.5 ? '½' : '');

  const photoEl = p.photo 
    ? `<img src="${p.photo}" alt="${p.name}" class="people-card-photo" loading="lazy">`
    : `<div class="people-card-photo" style="background:linear-gradient(135deg, #a855f7, #ec4899); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:42px; min-height:180px; width:100%;" title="No Photo Account">${p.name.charAt(0)}</div>`;

  return `
    <div class="people-card" onclick="showPersonDetail('${p.id}')">
      <div class="people-card-photo-wrap">
        ${photoEl}
        <div class="people-card-status-badge ${s.cls}">${s.label}</div>
        ${p.verified ? '<div class="people-card-verified" title="Verified Identity"><i class="fa-solid fa-check"></i></div>' : ''}
        <div class="people-card-trust"><i class="fa-solid fa-shield-halved"></i> ${p.trustScore}</div>
      </div>
      <div class="people-card-body">
        <div class="people-card-name-row">
          <div class="people-card-name">${p.name}, ${p.age}</div>
        </div>
        <div class="people-card-meta">
          <i class="fa-solid fa-location-dot" style="color:var(--brand-primary)"></i>
          ${p.city} · ${p.distance}
          <span class="text-muted">· ${p.lastActive}</span>
        </div>
        <p class="people-card-bio" style="font-size:12px; color:var(--text-muted); margin-bottom:10px; line-height:1.5; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.bio}</p>
        <div class="people-card-tags">
          ${p.interests.map(i => `<span class="tag-pill brand">${i}</span>`).join('')}
          ${p.languages.slice(0,2).map(l => `<span class="tag-pill">${l}</span>`).join('')}
        </div>
        <div class="people-card-actions">
          <button class="btn btn-primary btn-sm msg-btn" onclick="event.stopPropagation(); openDirectChatWithPerson('${p.id}')">
            <i class="fa-regular fa-comment-dots"></i> <span>Message</span>
          </button>
          <button class="btn btn-secondary btn-sm invite-btn" onclick="event.stopPropagation(); showToast('📩 Invite sent to ${p.name}!')">
            <i class="fa-solid fa-paper-plane"></i> <span class="btn-text">Invite</span>
          </button>
          <button class="btn-icon like-btn" title="Save" onclick="event.stopPropagation(); showToast('❤️ Saved!')">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function buildActivityCard(a) {
  const t = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.coffee;
  return `
    <div class="activity-card">
      <div class="activity-card-cover">
        <img src="${a.cover}" alt="${a.title}" class="activity-card-cover-img" loading="lazy">
        <div class="activity-type-badge">${t.icon} ${t.label}</div>
        <img src="${a.host.photo}" alt="${a.host.name}" class="activity-card-user">
      </div>
      <div class="activity-card-body">
        <div class="activity-card-title">${a.title}</div>
        <div class="activity-card-desc">${a.description}</div>
        <div class="activity-meta-row">
          <div class="activity-meta-item"><i class="fa-regular fa-calendar"></i> ${a.date}</div>
          <div class="activity-meta-item"><i class="fa-regular fa-clock"></i> ${a.time}</div>
          <div class="activity-meta-item"><i class="fa-solid fa-location-dot"></i> ${a.distance}</div>
          ${a.genderPref !== 'Any' ? `<div class="activity-meta-item"><i class="fa-solid fa-user"></i> ${a.genderPref} only</div>` : ''}
        </div>
        <div class="activity-card-footer">
          <div class="activity-applicants">
            <div class="applicant-avatars">
              ${MOCK_PEOPLE.slice(0,3).map(p => `<img src="${p.photo}" alt="" loading="lazy">`).join('')}
            </div>
            <span>${a.applicants} interested</span>
          </div>
          <div class="activity-budget">${a.budget !== 'Free' ? '<i class="fa-solid fa-indian-rupee-sign" style="font-size:11px;"></i>' : '🆓'} ${a.budget}</div>
        </div>
        <div style="display:flex; gap:6px; margin-top:12px;">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="openSubmitBidModal('${a.id}')">
            <i class="fa-solid fa-paper-plane"></i> Submit Proposal / Bid
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openDirectChatWithPerson('${a.host.id}')">
            <i class="fa-regular fa-comment-dots"></i>
          </button>
          <button class="btn-icon" title="Save" onclick="showToast('🔖 Saved!')">
            <i class="fa-regular fa-bookmark"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function buildMeetingCard(m) {
  const statusMap = {
    confirmed: { cls: 'confirmed', label: '✓ Confirmed' },
    pending: { cls: 'pending', label: '⏳ Pending' },
    completed: { cls: 'completed', label: '✓ Completed' },
    cancelled: { cls: 'cancelled', label: '✕ Cancelled' }
  };
  const s = statusMap[m.status] || statusMap.pending;
  return `
    <div class="meeting-card">
      <img src="${m.person.photo}" alt="${m.person.name}" class="meeting-avatar">
      <div class="meeting-info">
        <div class="meeting-title">${m.activity} with ${m.person.name.split(' ')[0]}</div>
        <div class="meeting-meta">
          <span><i class="fa-regular fa-calendar" style="color:var(--brand-primary)"></i> ${m.date}</span>
          <span><i class="fa-solid fa-location-dot" style="color:var(--brand-primary)"></i> ${m.location}</span>
          <span><i class="fa-solid fa-indian-rupee-sign" style="color:var(--accent-emerald); font-size:10px"></i> ${m.budget}</span>
        </div>
        <div style="margin-top:6px;">
          <span class="meeting-status-pill ${s.cls}">${s.label}</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openDirectChatWithPerson('${m.person.id}')">
        <i class="fa-regular fa-comment-dots"></i> Chat
      </button>
    </div>
  `;
}

function buildReviewCard(r) {
  const stars = Array(5).fill(0).map((_, i) =>
    `<i class="fa-${i < r.rating ? 'solid' : 'regular'} fa-star"></i>`
  ).join('');
  return `
    <div class="review-card">
      <div class="review-header">
        <img src="${r.person.photo}" alt="${r.person.name}" class="review-avatar">
        <div>
          <div class="review-name">${r.person.name}</div>
          <div class="review-activity">${r.activity}</div>
        </div>
        <div class="review-stars">${stars}</div>
      </div>
      <div class="review-text">"${r.text}"</div>
      <div class="review-date">${r.date}</div>
    </div>
  `;
}

/* ─── Modals / Toasts ────────────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ─── PROFILE PAGE RENDERER ───────────────────────────────────── */
async function renderProfile() {
  try {
    const res = await fetch('/api/earn/profile');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        if (window.getCurrentClient && window.getCurrentClient()) return; // Keep client's profile UI intact
        const p = data.profile;
        const avatarEl = document.getElementById('mainProfileAvatar');
        const nameEl = document.getElementById('mainProfileName');
        const taglineEl = document.getElementById('mainProfileTagline');
        const bioEl = document.getElementById('mainProfileBio');
        const skillsEl = document.getElementById('mainProfileSkills');
        const locEl = document.getElementById('mainProfileLocation');

        if (avatarEl) avatarEl.src = p.avatar;
        if (nameEl) nameEl.textContent = p.displayName;
        if (taglineEl) taglineEl.textContent = `${p.location} · ${p.category} · ${p.title || 'Executive Provider'}`;
        if (bioEl) bioEl.textContent = p.bio;
        if (locEl) locEl.innerHTML = `<span class="tag-pill">${p.location}</span>`;
        if (skillsEl && p.skills) {
          skillsEl.innerHTML = p.skills.map(s => `<span class="tag-pill brand">${s}</span>`).join('');
        }
      }
    }
  } catch (e) {
    console.warn("Error rendering live profile:", e);
  }

  const reviewsEl = document.getElementById('profile-reviews-list');
  if (reviewsEl && !reviewsEl.dataset.rendered) {
    reviewsEl.dataset.rendered = '1';
    reviewsEl.innerHTML = MOCK_REVIEWS.map(buildReviewCard).join('');
  }
}

/* ─── EDIT PROFILE MODAL HANDLERS ───────────────────────────── */
async function openEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (!modal) return;

  try {
    const res = await fetch('/api/earn/profile');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        document.getElementById('editProfileNameInput').value = p.displayName || '';
        document.getElementById('editProfileHourlyRateInput').value = p.hourlyRate || 2500;
        document.getElementById('editProfileCategoryInput').value = p.category || '';
        document.getElementById('editProfileTitleInput').value = p.title || '';
        document.getElementById('editProfileLocationInput').value = p.location || '';
        document.getElementById('editProfileBioInput').value = p.bio || '';
        document.getElementById('editProfileSkillsInput').value = (p.skills || []).join(', ');
        document.getElementById('editProfileUpiInput').value = p.upiId || '';
        document.getElementById('editProfileBankInput').value = p.bankAccount || '';
      }
    }
  } catch (e) {
    console.warn("Could not fetch current profile for modal:", e);
  }

  modal.style.display = 'flex';
}

function closeEditProfileModal() {
  const modal = document.getElementById('editProfileModal');
  if (modal) modal.style.display = 'none';
}

async function saveEditProfile() {
  const name = document.getElementById('editProfileNameInput').value.trim();
  const hourlyRate = Number(document.getElementById('editProfileHourlyRateInput').value);
  const category = document.getElementById('editProfileCategoryInput').value.trim();
  const title = document.getElementById('editProfileTitleInput').value.trim();
  const location = document.getElementById('editProfileLocationInput').value.trim();
  const bio = document.getElementById('editProfileBioInput').value.trim();
  const skillsStr = document.getElementById('editProfileSkillsInput').value.trim();
  const upiId = document.getElementById('editProfileUpiInput').value.trim();
  const bankAccount = document.getElementById('editProfileBankInput').value.trim();

  const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  try {
    const res = await fetch('/api/earn/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name,
        hourlyRate,
        category,
        title,
        location,
        bio,
        skills,
        upiId,
        bankAccount
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Profile updated successfully!');
      closeEditProfileModal();
      renderProfile();
    } else {
      showToast(`❌ Error: ${data.message}`);
    }
  } catch (e) {
    console.error("Save profile error:", e);
    showToast("❌ Network error saving profile.");
  }
}

/* ─── PERSON DETAIL MODAL HANDLERS ──────────────────────────── */
function showPersonDetail(id) {
  const p = MOCK_PEOPLE.find(x => x.id === id);
  if (!p) return;

  const modal = document.getElementById('personDetailModal');
  const content = document.getElementById('personDetailContent');
  if (!modal || !content) return;

  const detailAvatarHtml = p.photo 
    ? `<img src="${p.photo}" alt="${p.name}" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:3px solid var(--brand-primary); margin-bottom:10px;">`
    : `<div style="width:90px; height:90px; border-radius:50%; background:linear-gradient(135deg, #a855f7, #ec4899); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:32px; border:3px solid var(--brand-primary); margin-bottom:10px;">${p.name.charAt(0)}</div>`;

  content.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <div style="font-size:18px; font-weight:800; color:var(--text-primary);">Companion Profile</div>
      <button onclick="closePersonDetailModal()" style="background:none; border:none; font-size:22px; cursor:pointer; color:var(--text-muted); line-height:1; padding:0 2px;">&times;</button>
    </div>
    <div style="text-align:center; margin-bottom:16px;">
      ${detailAvatarHtml}
      <div style="font-size:18px; font-weight:800; color:var(--text-primary);">${p.name}, ${p.age} ${p.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--brand-primary); font-size:14px;"></i>' : ''}</div>
      <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">📍 ${p.city} · ${p.distance} away</div>
      <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:8px;">
        <span class="tag-pill brand"><i class="fa-solid fa-shield-halved"></i> Trust Score ${p.trustScore}</span>
      </div>
    </div>
    <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; text-align:center; margin-bottom:16px;">"${p.bio}"</p>
    <div style="margin-bottom:16px;">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Interests</div>
      <div class="people-card-tags">
        ${p.interests.map(i => `<span class="tag-pill brand">${i}</span>`).join('')}
        ${p.languages.map(l => `<span class="tag-pill">${l}</span>`).join('')}
      </div>
    </div>
    <div style="display:flex; gap:10px; margin-top:16px;">
      <button class="btn btn-primary" style="flex:1;" onclick="closePersonDetailModal(); openDirectChatWithPerson('${p.id}')">
        <i class="fa-regular fa-comment-dots"></i> Send Message
      </button>
      <button class="btn btn-secondary" style="flex:1;" onclick="closePersonDetailModal(); showToast('📩 Meeting invite sent to ${p.name}!');">
        <i class="fa-solid fa-paper-plane"></i> Send Invite
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closePersonDetailModal() {
  const modal = document.getElementById('personDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ─── AI Assistant ───────────────────────────────────────────── */
async function toggleAiAssistant() {
  const modal = document.getElementById('aiMatchModal');
  const results = document.getElementById('aiMatchResults');
  if (!modal || !results) return;

  modal.style.display = 'flex';
  results.innerHTML = `<p style="font-size:13px; color:var(--text-muted); padding:20px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Running AI companion match algorithms...</p>`;

  try {
    const res = await fetch('/api/earn/ai-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Social & Executive Companion', minBudget: 1000 })
    });
    const data = await res.json();
    if (data.success && data.matches && data.matches.length > 0) {
      results.innerHTML = data.matches.map(m => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--surface-muted); border-radius:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${m.avatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-primary);">${m.name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${m.category} · ₹${m.rate}/hr</div>
              <div style="font-size:11px; color:var(--brand-primary); font-weight:700; margin-top:2px;">✨ ${m.matchScore}% AI Match · ${m.reason}</div>
            </div>
          </div>
          <button class="btn btn-primary btn-xs" onclick="closeAiMatchModal(); showPersonDetail('${m.id}')">View</button>
        </div>
      `).join('');
    } else {
      results.innerHTML = `<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:20px;">No AI matches found right now.</p>`;
    }
  } catch (e) {
    console.error("AI Match error:", e);
    results.innerHTML = `<p style="font-size:13px; color:red; text-align:center; padding:20px;">Error running AI match.</p>`;
  }
}

function closeAiMatchModal() {
  const modal = document.getElementById('aiMatchModal');
  if (modal) modal.style.display = 'none';
}

/* ─── POST ACTIVITY REQUEST MODAL ────────────────────────────── */
function openPostActivityModal() {
  const modal = document.getElementById('postActivityModal');
  if (modal) modal.style.display = 'flex';
}

function closePostActivityModal() {
  const modal = document.getElementById('postActivityModal');
  if (modal) modal.style.display = 'none';
}

async function savePostActivity() {
  const title = document.getElementById('postReqTitle').value.trim();
  const category = document.getElementById('postReqCategory').value;
  const budget = Number(document.getElementById('postReqBudget').value || 1500);
  const location = document.getElementById('postReqLocation').value.trim();
  const urgency = document.getElementById('postReqUrgency').value;
  const description = document.getElementById('postReqDesc').value.trim();

  if (!title) {
    showToast("⚠️ Title is required");
    return;
  }

  try {
    const res = await fetch('/api/earn/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, budget, location, urgency, description })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✨ Activity request "${data.requirement.title}" published!`);
      closePostActivityModal();
      renderActivities();
    } else {
      showToast(`❌ Error: ${data.message}`);
    }
  } catch (e) {
    console.error("Save activity error:", e);
    showToast("❌ Network error posting request.");
  }
}

/* ─── SUBMIT BID / PROPOSAL MODAL ────────────────────────────── */
function openSubmitBidModal(reqId) {
  const modal = document.getElementById('submitBidModal');
  const reqInput = document.getElementById('submitBidReqId');
  if (modal && reqInput) {
    reqInput.value = reqId || 'req_1';
    modal.style.display = 'flex';
  }
}

function closeSubmitBidModal() {
  const modal = document.getElementById('submitBidModal');
  if (modal) modal.style.display = 'none';
}

async function saveSubmitBid() {
  const requirementId = document.getElementById('submitBidReqId').value;
  const bidAmount = Number(document.getElementById('submitBidAmount').value || 2500);
  const estimatedDuration = document.getElementById('submitBidDuration').value.trim() || '2 Hours';
  const pitch = document.getElementById('submitBidPitch').value.trim();

  try {
    const res = await fetch('/api/earn/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId, bidAmount, estimatedDuration, pitch })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎯 Proposal submitted for ₹${data.bid.bidAmount}!`);
      closeSubmitBidModal();
      renderActivities();
    } else {
      showToast(`❌ Error: ${data.message}`);
    }
  } catch (e) {
    console.error("Save bid error:", e);
    showToast("❌ Network error submitting bid.");
  }
}

async function acceptBidFromUI(bidId) {
  try {
    const res = await fetch(`/api/earn/bids/${bidId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🤝 Proposal accepted! Escrow held: ₹${data.meeting.amount}`);
      renderMeetings();
      renderEarnings();
    } else {
      showToast(`❌ Error: ${data.message}`);
    }
  } catch (e) {
    console.error("Accept bid error:", e);
    showToast("❌ Network error accepting proposal.");
  }
}

/* ─── WITHDRAW MODAL ─────────────────────────────────────────── */
function openWithdrawModal() {
  const modal = document.getElementById('withdrawModal');
  if (modal) modal.style.display = 'flex';
}

function closeWithdrawModal() {
  const modal = document.getElementById('withdrawModal');
  if (modal) modal.style.display = 'none';
}

async function executeWithdrawal() {
  const amount = Number(document.getElementById('withdrawAmountInput').value);
  if (!amount || amount <= 0) {
    showToast("⚠️ Enter a valid withdrawal amount");
    return;
  }

  try {
    const res = await fetch('/api/earn/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`💸 Payout of ₹${data.amount.toLocaleString('en-IN')} requested successfully!`);
      closeWithdrawModal();
      renderEarnings();
    } else {
      showToast(`❌ ${data.message}`);
    }
  } catch (e) {
    console.error("Withdrawal error:", e);
    showToast("❌ Network error requesting payout.");
  }
}



/* ─── REVIEWS MODAL ──────────────────────────────────────────── */
function openAddReviewModal() {
  const modal = document.getElementById('addReviewModal');
  if (modal) modal.style.display = 'flex';
}

function closeAddReviewModal() {
  const modal = document.getElementById('addReviewModal');
  if (modal) modal.style.display = 'none';
}

async function submitReviewFromUI() {
  const rating = Number(document.getElementById('newReviewRating').value);
  const comment = document.getElementById('newReviewComment').value.trim();

  if (!comment) {
    showToast("⚠️ Review comment is required");
    return;
  }

  try {
    const res = await fetch('/api/earn/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment })
    });
    const data = await res.json();
    if (data.success) {
      showToast("⭐ Review published!");
      closeAddReviewModal();
      renderReviews();
    } else {
      showToast(`❌ ${data.message}`);
    }
  } catch (e) {
    console.error("Submit review error:", e);
    showToast("❌ Network error posting review.");
  }
}

/* ─── GLOBAL SEARCH & GRID FILTERS ───────────────────────────── */
function onGlobalSearch(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderDiscover();
    renderNearby();
    renderActivities();
    return;
  }

  // Filter Discover Grid
  const discEl = document.getElementById('discover-grid');
  if (discEl) {
    const filtered = MOCK_PEOPLE.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.interests.some(i => i.toLowerCase().includes(q)) ||
      p.bio.toLowerCase().includes(q)
    );
    discEl.innerHTML = filtered.length ? filtered.map(buildPeopleCard).join('') :
      `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No companions found matching "${query}"</p>`;
  }

  // Filter Nearby Grid
  const nearEl = document.getElementById('nearby-grid');
  if (nearEl) {
    const filtered = MOCK_PEOPLE.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.interests.some(i => i.toLowerCase().includes(q))
    );
    nearEl.innerHTML = filtered.length ? filtered.map(buildPeopleCard).join('') :
      `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No companions found matching "${query}"</p>`;
  }

  // Filter Activities Grid (use a.type and a.host.name — correct field names)
  const actEl = document.getElementById('activities-grid');
  if (actEl) {
    const filtered = MOCK_ACTIVITIES.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.host.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
    actEl.innerHTML = filtered.length ? filtered.map(buildActivityCard).join('') :
      `<p style="font-size:13px; color:var(--text-muted); grid-column:1/-1; padding:20px;">No activities found matching "${query}"</p>`;
  }
}



async function loadAppPeopleData() {
  try {
    const res = await fetch('/api/client/companions', {
      headers: { 'Authorization': 'Bearer ' + (window.getClientToken ? window.getClientToken() : '') }
    });
    const data = await res.json();
    if (data.success && data.companions && data.companions.length > 0) {
      MOCK_PEOPLE = data.companions.map(cli => {
        return {
          id: cli.id,
          name: cli.name,
          age: cli.age || 24,
          city: cli.city || 'Gurgaon',
          distance: `${cli.distanceKm} km`,
          photo: cli.avatar || '',
          status: cli.isAvailableNow ? 'available' : 'busy',
          verified: true,
          trustScore: cli.trustScore || 95,
          rating: 4.8 + (Math.random() * 0.2),
          activities: 20,
          reviews: 18,
          responseRate: '98%',
          languages: ['English', 'Hindi'],
          lastActive: 'Now',
          bio: 'Friendly companion ready for casual conversations.',
          interests: ['Coffee', 'Travel'],
          repeatConnections: 5
        };
      });

      // Refresh active page views
      if (currentPage === 'dashboard') renderDashboard();
      if (currentPage === 'discover') renderDiscover();
      if (currentPage === 'nearby') renderNearby();
    }
  } catch (e) {
    console.warn("Could not load dynamic people into MOCK_PEOPLE:", e);
  }
}

/* ─── NOTIFICATIONS DROPDOWN LOGIC ───────────────────────────── */
let clientNotifications = [];

async function fetchNotifications() {
  try {
    const token = window.getClientToken ? window.getClientToken() : '';
    if (!token) return;
    const res = await fetch('/api/client/notifications', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success && data.notifications) {
      clientNotifications = data.notifications;
      updateNotificationBadge();
      renderNotificationList();
    }
  } catch (e) {
    console.error('Error fetching notifications:', e);
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notif-badge-count');
  if (!badge) return;
  const unread = clientNotifications.filter(n => !n.isRead).length;
  if (unread > 0) {
    badge.textContent = unread;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderNotificationList() {
  const list = document.getElementById('notif-dropdown-list');
  if (!list) return;
  if (!clientNotifications.length) {
    list.innerHTML = '<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet.</div>';
    return;
  }
  list.innerHTML = clientNotifications.map(n => `
    <div style="padding:12px 16px;border-bottom:1px solid var(--surface-border);background:${n.isRead ? 'transparent' : 'rgba(99,102,241,0.05)'};display:flex;gap:12px;align-items:flex-start;">
      <div style="width:32px;height:32px;border-radius:10px;background:rgba(99,102,241,0.15);color:var(--brand-primary);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">
        <i class="fa-solid fa-${n.type === 'success' ? 'circle-check' : n.type === 'invite' ? 'heart' : 'bell'}"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${n.title}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.4;">${n.message}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
    </div>
  `).join('');
}

function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  const isOpening = dropdown.style.display === 'none';
  dropdown.style.display = isOpening ? 'block' : 'none';
  if (isOpening) {
    fetchNotifications();
  }
}

async function markAllNotificationsRead() {
  try {
    const token = window.getClientToken ? window.getClientToken() : '';
    if (!token) return;
    await fetch('/api/client/notifications/mark-read', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    clientNotifications.forEach(n => n.isRead = true);
    updateNotificationBadge();
    renderNotificationList();
  } catch (e) {
    console.error('Error marking notifications as read:', e);
  }
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('notif-dropdown');
  const btn = document.getElementById('notif-bell-btn');
  if (dropdown && dropdown.style.display === 'block') {
    if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
      dropdown.style.display = 'none';
    }
  }
});

/* ─── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadAppPeopleData();
  fetchNotifications();
  navigateTo('dashboard');
});


