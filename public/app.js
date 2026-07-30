/* GlobalTalk SPA - Router, State Management, API Polling, Client TTS, and Real P2P WebRTC Voice Stream */

// State Management
const STATE = {
  token: localStorage.getItem('gt_token') || null,
  user: JSON.parse(localStorage.getItem('gt_user')) || null,
  activeTab: 'dashboard',
  activeChatPartnerId: null,
  isAIChat: false,
  chatPollInterval: null,
  callTimerInterval: null,
  localStream: null,
  peerConnection: null,
  selectedMessageForCorrection: null,
  directoryUsers: [],
  sessionTranslationCount: 0,
  map: null,
  mapMarkers: []
};

let socket = null;

// Language to BCP 47 SpeechSynthesis Locales
const SPEECH_LOCALE_MAP = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Japanese': 'ja-JP',
  'Chinese': 'zh-CN',
  'Korean': 'ko-KR',
  'Portuguese': 'pt-PT',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Hindi': 'hi-IN'
};

// ---------------- DOM COMPONENT SELECTORS ----------------
const mainNav = document.getElementById('main-nav');
const logoutBtn = document.getElementById('logout-btn');
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const directoryScreen = document.getElementById('directory-screen');
const chatScreen = document.getElementById('chat-screen');
const momentsScreen = document.getElementById('moments-screen');
const voiceroomsScreen = document.getElementById('voicerooms-screen');
const liveScreen = document.getElementById('live-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const profileScreen = document.getElementById('profile-screen');

// Sandbox Sandbox Toggle
const quickProToggle = document.getElementById('quick-pro-toggle');

// Auth elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

// Profiles / Gamification
const navXpValue = document.getElementById('nav-xp-value');
const navLvlValue = document.getElementById('nav-lvl-value');
const premiumBrandTag = document.getElementById('premium-brand-tag');
const profileNameText = document.getElementById('profile-name-text');
const profileEmailText = document.getElementById('profile-email-text');
const profilePremiumTag = document.getElementById('profile-premium-tag');
const profileLevelBadge = document.getElementById('profile-level-badge');
const profileProgressFill = document.getElementById('profile-progress-fill');
const profileXpRatio = document.getElementById('profile-xp-ratio');
const editProfileForm = document.getElementById('edit-profile-form');

// Directory Elements
const directoryMatches = document.getElementById('directory-matches');
const allDirectoryUsers = document.getElementById('all-directory-users');
const directorySearchInput = document.getElementById('directory-search-input');
const resetSearchBtn = document.getElementById('reset-search-btn');

// Filters
const filterAge = document.getElementById('filter-age');
const filterRegion = document.getElementById('filter-region');
const filterInterests = document.getElementById('filter-interests');
const btnApplyFilters = document.getElementById('btn-apply-filters');

// Real-Time Slide-over Chat Widget Elements
const slideoverWidget = document.getElementById('slideover-chat-widget');
const closeSlideoverBtn = document.getElementById('close-slideover-btn');
const slideoverPartnerAvatar = document.getElementById('slideover-partner-avatar');
const slideoverPartnerName = document.getElementById('slideover-partner-name');
const slideoverPartnerLocation = document.getElementById('slideover-partner-location');
const slideoverMessagesBox = document.getElementById('slideover-messages-box');
const slideoverChatInputForm = document.getElementById('slideover-chat-input-form');
const slideoverChatMsgInput = document.getElementById('slideover-chat-msg-input');
const slideoverCallBtn = document.getElementById('slideover-call-btn');
const slideoverBtnRecordVoice = document.getElementById('slideover-btn-record-voice');

// Moments Elements
const newMomentForm = document.getElementById('new-moment-form');
const momentsTimeline = document.getElementById('moments-timeline');
const momentImageSelect = document.getElementById('moment-image-select');

// Voicerooms Elements
const voiceroomJoinForm = document.getElementById('voiceroom-join-form');
const voiceroomNameInput = document.getElementById('voiceroom-name-input');
const voiceroomActiveContainer = document.getElementById('voiceroom-active-container');
const voiceroomEmptyPrompt = document.getElementById('voiceroom-empty-prompt');
const activeRoomTitle = document.getElementById('active-room-title');
const btnLeaveVoiceroom = document.getElementById('btn-leave-voiceroom');
const voiceroomSpeakerSeats = document.getElementById('voiceroom-speaker-seats');
const voiceroomAudienceSeats = document.getElementById('voiceroom-audience-seats');
const btnRaiseHandRoom = document.getElementById('btn-raise-hand-room');

// Livestreams Elements
const liveChatScrollerBox = document.getElementById('live-chat-scroller-box');
const liveChatInputForm = document.getElementById('live-chat-input-form');
const liveChatInputText = document.getElementById('live-chat-input-text');

// Leaderboard Rows
const leaderboardRowsContainer = document.getElementById('leaderboard-rows-container');

// Modals
const correctionModal = document.getElementById('correction-modal');
const closeCorrectionModal = document.getElementById('close-correction-modal');
const correctionOriginalPreview = document.getElementById('correction-original-preview');
const correctionInputText = document.getElementById('correction-input-text');
const submitCorrectionConfirm = document.getElementById('submit-correction-confirm');

const momentCorrectionModal = document.getElementById('moment-correction-modal');
const closeMomentCorrectionModal = document.getElementById('close-moment-correction-modal');
const momentCorrectionOriginalPreview = document.getElementById('moment-correction-original-preview');
const momentCorrectionInputText = document.getElementById('moment-correction-input-text');
const submitMomentCorrectionConfirm = document.getElementById('submit-moment-correction-confirm');
let selectedMomentForCorrectionId = null;

const webrtcCallModal = document.getElementById('webrtc-call-modal');
const btnHangupCall = document.getElementById('btn-hangup-call');
const callLiveTimer = document.getElementById('call-live-timer');
const callPartnerName = document.getElementById('call-partner-name');
const callStatusLabel = document.getElementById('call-status-label');
const stepSdp = document.getElementById('step-sdp');
const stepIce = document.getElementById('step-ice');
const stepConnected = document.getElementById('step-connected');

const premiumUpgradeModal = document.getElementById('premium-upgrade-modal');
const closePremiumModal = document.getElementById('close-premium-modal');
const mockPremiumToggleBtn = document.getElementById('mock-premium-toggle-btn');

const toastContainer = document.getElementById('toast-container');

// Map elements
const mapElement = document.getElementById('map');


// ---------------- SECURITY SANITIZER (XSS Mitigation) ----------------
function sanitizeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}


// ---------------- TOAST ALERTS ----------------
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


// ---------------- ADVERTISEMENT DISPLAY CONTROL ----------------
window.dismissAd = function(bannerId) {
  const ad = document.getElementById(bannerId);
  if (ad) ad.classList.add('hidden');
};

function refreshAdVisibilities() {
  const isPremium = STATE.user && STATE.user.is_premium;
  const adBanners = ['dashboard-ad-banner', 'directory-ad-banner', 'chat-ad-banner'];

  adBanners.forEach(id => {
    const banner = document.getElementById(id);
    if (banner) {
      if (isPremium) {
        banner.classList.add('hidden');
      } else {
        banner.classList.remove('hidden');
      }
    }
  });
}


// ---------------- SPA NAVIGATION & ROUTING ----------------
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navigateTo(targetTab);
    });
  });

  logoutBtn.addEventListener('click', handleLogout);
}

function navigateTo(tab) {
  if (!STATE.token && tab !== 'auth') {
    tab = 'auth';
  }

  if (tab !== 'voicerooms' && STATE.voiceroomPollInterval) {
    clearInterval(STATE.voiceroomPollInterval);
    STATE.voiceroomPollInterval = null;
    leaveVoiceroomSilent();
  }
  if (tab !== 'live' && STATE.liveChatInterval) {
    clearInterval(STATE.liveChatInterval);
    STATE.liveChatInterval = null;
  }

  STATE.activeTab = tab;

  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  authScreen.classList.add('hidden');
  dashboardScreen.classList.add('hidden');
  directoryScreen.classList.add('hidden');
  momentsScreen.classList.add('hidden');
  voiceroomsScreen.classList.add('hidden');
  liveScreen.classList.add('hidden');
  leaderboardScreen.classList.add('hidden');
  profileScreen.classList.add('hidden');

  if (tab === 'auth') {
    authScreen.classList.remove('hidden');
    mainNav.classList.add('hidden');
    slideoverWidget.classList.remove('active');
  } else {
    mainNav.classList.remove('hidden');
    refreshAdVisibilities();

    if (tab === 'dashboard') {
      dashboardScreen.classList.remove('hidden');
      loadDashboard();
    } else if (tab === 'directory') {
      directoryScreen.classList.remove('hidden');
      loadDirectoryWorkspace();
    } else if (tab === 'moments') {
      momentsScreen.classList.remove('hidden');
      loadMomentsFeed();
    } else if (tab === 'voicerooms') {
      voiceroomsScreen.classList.remove('hidden');
      renderVoiceroomView();
    } else if (tab === 'live') {
      liveScreen.classList.remove('hidden');
      startLiveBroadcastSimulation();
    } else if (tab === 'leaderboard') {
      leaderboardScreen.classList.remove('hidden');
      loadLeaderboard();
    } else if (tab === 'profile') {
      profileScreen.classList.remove('hidden');
      loadProfileDetails();
    }
  }
}


// ---------------- DEVELOPER PREMIUM MOCK CONTROLLERS ----------------
async function syncDeveloperProButton() {
  if (STATE.user && STATE.user.is_premium) {
    quickProToggle.textContent = "Toggle VIP Premium (ON)";
    quickProToggle.classList.add('pro-active');
  } else {
    quickProToggle.textContent = "Toggle VIP Premium (OFF)";
    quickProToggle.classList.remove('pro-active');
  }
}

quickProToggle.addEventListener('click', async () => {
  if (!STATE.token) {
    showToast('Register or Sign In to apply sandbox states.', 'danger');
    return;
  }
  try {
    const res = await fetch('/api/profile/toggle-premium', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      showToast(data.message);
      await fetchAndRefreshUserProfile();
      syncDeveloperProButton();
      refreshAdVisibilities();

      if (STATE.activeTab === 'profile') {
        loadProfileDetails();
      }
      if (STATE.activeTab === 'dashboard') {
        loadDashboard();
      }
    }
  } catch (err) {
    showToast('Failed to swap premium state in sandbox.', 'danger');
  }
});


// ---------------- GAMIFICATION PROGRESS & STATE REFRESH ----------------
function updateNavXPBadge(user) {
  if (!user) return;
  navXpValue.textContent = `${user.xp} XP`;

  const level = Math.floor(user.xp / 100) + 1;
  navLvlValue.textContent = `Lv.${level}`;

  if (user.is_premium) {
    premiumBrandTag.classList.remove('hidden');
  } else {
    premiumBrandTag.classList.add('hidden');
  }
  syncDeveloperProButton();
}

async function fetchAndRefreshUserProfile() {
  if (!STATE.token) return;
  try {
    const res = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const user = await res.json();
      STATE.user = user;
      localStorage.setItem('gt_user', JSON.stringify(user));
      updateNavXPBadge(user);
    }
  } catch (err) {
    console.error('Error refreshing profile:', err);
  }
}


// ---------------- USER LOGIN / REGISTRATION HANDLERS ----------------
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.add('active-form');
  registerForm.classList.remove('active-form');
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.add('active-form');
  loginForm.classList.remove('active-form');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Login failed', 'danger');
      return;
    }

    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));

    showToast(`Welcome back, ${data.user.name}!`);
    updateNavXPBadge(data.user);
    initializeSocket();
    navigateTo('dashboard');
  } catch (err) {
    showToast('Login server error', 'danger');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const name = document.getElementById('reg-name').value;
  const native_language = document.getElementById('reg-native').value;
  const target_language = document.getElementById('reg-target').value;
  const profile_location = document.getElementById('reg-location').value;
  const proficiency_level = document.getElementById('reg-proficiency').value;
  const hobbies = document.getElementById('reg-hobbies').value;
  const bio = document.getElementById('reg-bio').value;
  const age = document.getElementById('reg-age').value;
  const region = document.getElementById('reg-region').value;
  const interest_tags = document.getElementById('reg-tags').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username, email, password, name, native_language, target_language,
        profile_location, proficiency_level, hobbies, bio, age, region, interest_tags
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Registration failed', 'danger');
      return;
    }

    showToast('Registration successful! Please Sign In.');
    tabLogin.click();
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
  } catch (err) {
    showToast('Registration server error', 'danger');
  }
});

function handleLogout() {
  STATE.token = null;
  STATE.user = null;
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  if (STATE.voiceroomPollInterval) clearInterval(STATE.voiceroomPollInterval);
  if (STATE.liveChatInterval) clearInterval(STATE.liveChatInterval);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  navigateTo('auth');
  showToast('Logged out successfully.');
}


// ---------------- MY PROFILE MANAGEMENT ----------------
function loadProfileDetails() {
  const user = STATE.user;
  if (!user) return;

  profileNameText.textContent = sanitizeHTML(user.name);
  profileEmailText.textContent = sanitizeHTML(user.email);
  document.getElementById('profile-avatar-char').textContent = sanitizeHTML(user.name.substring(0, 2).toUpperCase());

  if (user.is_premium) {
    profilePremiumTag.classList.remove('hidden');
  } else {
    profilePremiumTag.classList.add('hidden');
  }

  const level = Math.floor(user.xp / 100) + 1;
  const currentLevelXpFloor = (level - 1) * 100;
  const nextLevelXpCeil = level * 100;

  const xpAcquiredInThisLevel = user.xp - currentLevelXpFloor;
  const levelXpRequiredTotal = 100;
  const percentage = Math.min(100, Math.max(0, (xpAcquiredInThisLevel / levelXpRequiredTotal) * 100));

  profileLevelBadge.textContent = `Level ${level}`;
  profileProgressFill.style.width = `${percentage}%`;
  profileXpRatio.textContent = `${user.xp} / ${nextLevelXpCeil} XP (${percentage.toFixed(0)}%)`;

  document.getElementById('edit-name').value = user.name;
  document.getElementById('edit-native').value = user.native_language;
  document.getElementById('edit-target').value = user.target_language;
  document.getElementById('edit-location').value = user.profile_location || '';
  document.getElementById('edit-proficiency').value = user.proficiency_level || 'Beginner';
  document.getElementById('edit-hobbies').value = user.hobbies || '';
  document.getElementById('edit-bio').value = user.bio || '';

  document.getElementById('edit-age').value = user.age || 25;
  document.getElementById('edit-region').value = user.region || 'North America';
  document.getElementById('edit-tags').value = user.interest_tags || '';
}

editProfileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const targetLangValue = document.getElementById('edit-target').value;

  if (!STATE.user.is_premium && targetLangValue !== STATE.user.target_language) {
    showToast('🔒 Multi-language target configurations are restricted to VIP Premium accounts!', 'danger');
    openPremiumUpgradeModal();
    return;
  }

  const payload = {
    name: document.getElementById('edit-name').value,
    native_language: document.getElementById('edit-native').value,
    target_language: targetLangValue,
    profile_location: document.getElementById('edit-location').value,
    proficiency_level: document.getElementById('edit-proficiency').value,
    hobbies: document.getElementById('edit-hobbies').value,
    bio: document.getElementById('edit-bio').value,
    age: document.getElementById('edit-age').value,
    region: document.getElementById('edit-region').value,
    interest_tags: document.getElementById('edit-tags').value
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Profile changes saved successfully!');
      await fetchAndRefreshUserProfile();
      loadProfileDetails();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update profile', 'danger');
    }
  } catch (err) {
    showToast('Profile save error', 'danger');
  }
});


// ---------------- DIRECTORY MATCHES & FILTERING ----------------
async function loadDashboard() {
  if (!STATE.token) return;

  const ageVal = filterAge.value;
  const regionVal = filterRegion.value;
  const interestVal = filterInterests.value.trim();

  let url = `/api/directory?filterAge=${encodeURIComponent(ageVal)}&filterRegion=${encodeURIComponent(regionVal)}&filterInterests=${encodeURIComponent(interestVal)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const users = await res.json();
      STATE.directoryUsers = users;
      renderMatchedPartners(users);
      renderMapPins(users);
    }
  } catch (err) {
    console.error('Error fetching matches:', err);
  }
}

btnApplyFilters.addEventListener('click', () => {
  loadDashboard();
  showToast('Filters applied to dashboard match recommendations!');
});

function renderMatchedPartners(users) {
  directoryMatches.innerHTML = '';
  const topMatches = users.slice(0, 4);

  if (topMatches.length === 0) {
    directoryMatches.innerHTML = '<p class="subtitle-muted" style="padding: 10px;">No other community users matching selected filter parameters.</p>';
    return;
  }

  topMatches.forEach(user => {
    const card = document.createElement('div');
    card.className = 'partner-card';
    card.innerHTML = `
      <div class="partner-main">
        <div class="partner-avatar">${sanitizeHTML(user.name.substring(0,2).toUpperCase())}</div>
        <div class="partner-meta">
          <h3>${sanitizeHTML(user.name)} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted)">(${sanitizeHTML(user.age)} yo, ${sanitizeHTML(user.region)})</span></h3>
          <p class="subtitle">${sanitizeHTML(user.profile_location || 'Remote')}</p>
          <div class="lang-labels">
            <span class="lang-badge">🗣️ Native: ${sanitizeHTML(user.native_language)}</span>
            <span class="lang-badge target">🎯 Target: ${sanitizeHTML(user.target_language)}</span>
          </div>
          ${user.interest_tags ? `<p style="font-size:0.75rem; color:var(--accent); margin-top:4px;">🏷️ Tags: ${sanitizeHTML(user.interest_tags)}</p>` : ''}
        </div>
      </div>
      <div class="partner-side">
        <span class="match-score-badge">${user.match_score}% Match</span>
        <button class="btn-chat" onclick="openChatWindow(${user.id})">Message</button>
      </div>
    `;
    directoryMatches.appendChild(card);
  });
}

function renderMapPins(users) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet is not loaded yet');
    return;
  }

  // If map is not initialized, initialize it
  if (!STATE.map) {
    // Center at [20, 0] zoom 2 for a global worldwide view
    STATE.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 12
    });

    // Dark-themed premium style map layer matching GlobalTalk's UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(STATE.map);
  } else {
    // Clear old markers from the map
    STATE.mapMarkers.forEach(marker => STATE.map.removeLayer(marker));
    STATE.mapMarkers = [];
    // Recalculate size to handle hidden element displays nicely
    setTimeout(() => {
      STATE.map.invalidateSize();
    }, 100);
  }

  // Dictionary of known city coordinate approximations
  const CITY_COORDS = {
    'madrid': [40.4168, -3.7038],
    'tokyo': [35.6762, 139.6503],
    'paris': [48.8566, 2.3522],
    'berlin': [52.5200, 13.4050],
    'new york': [40.7128, -74.0060],
    'london': [51.5074, -0.1278],
    'rome': [41.9028, 12.4964],
    'beijing': [39.9042, 116.4074],
    'seoul': [37.5665, 126.9780],
    'rio': [-22.9068, -43.1729],
    'brazil': [-22.9068, -43.1729],
    'sydney': [-33.8688, 151.2093],
    'australia': [-33.8688, 151.2093],
    'cape town': [-33.9249, 18.4241],
    'new delhi': [28.6139, 77.2090],
    'delhi': [28.6139, 77.2090],
    'india': [28.6139, 77.2090],
    'canada': [56.1304, -106.3468],
    'toronto': [43.6532, -79.3832]
  };

  const REGION_COORDS = {
    'North America': [37.0902, -95.7129],
    'Europe': [48.5260, 15.2551],
    'Asia': [34.0479, 100.6197],
    'South America': [-14.2350, -51.9253],
    'Africa': [-8.7832, 34.5085],
    'Oceania': [-25.2744, 133.7751]
  };

  // Add interactive Leaflet markers
  users.forEach((user, index) => {
    let coords = null;
    const locLower = (user.profile_location || '').toLowerCase();

    // 1. Try city lookup
    for (const [key, val] of Object.entries(CITY_COORDS)) {
      if (locLower.includes(key)) {
        coords = [...val];
        break;
      }
    }

    // 2. Try region lookup
    if (!coords && user.region && REGION_COORDS[user.region]) {
      coords = [...REGION_COORDS[user.region]];
    }

    // 3. Absolute default
    if (!coords) {
      coords = [20.0 + (index * 2) % 15, 0.0 + (index * 3) % 25];
    }

    // Add a small sinus jitter so markers don't stack directly
    const jitterLat = (Math.sin(index) * 1.5);
    const jitterLng = (Math.cos(index) * 1.5);
    const finalCoords = [coords[0] + jitterLat, coords[1] + jitterLng];

    // Create Leaflet marker
    const marker = L.marker(finalCoords).addTo(STATE.map);

    // Dynamic Leaflet Popup content
    const avatarInitials = sanitizeHTML(user.name.substring(0, 2).toUpperCase());
    const nameSanitized = sanitizeHTML(user.name);
    const matchScoreStr = user.match_score ? `<span style="color:#2ecc71; font-weight:bold;">${user.match_score}% Match</span>` : '';
    const locSanitized = sanitizeHTML(user.profile_location || 'Remote');
    const ageSanitized = sanitizeHTML(String(user.age || ''));
    const regionSanitized = sanitizeHTML(user.region || '');
    const bioSanitized = sanitizeHTML(user.bio || 'Hello learning partner!');
    const nativeSanitized = sanitizeHTML(user.native_language);
    const targetSanitized = sanitizeHTML(user.target_language);

    const popupHTML = `
      <div class="leaflet-popup-card">
        <div class="popup-header" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <div class="popup-avatar" style="width:32px; height:32px; border-radius:50%; background:var(--accent-color, #3498db); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.75rem;">${avatarInitials}</div>
          <div>
            <h4 style="margin:0; font-size:0.9rem; color:#fff;">${nameSanitized} ${matchScoreStr}</h4>
            <p style="margin:0; font-size:0.7rem; color:#aaa;">📍 ${locSanitized} | ${regionSanitized} | Age: ${ageSanitized}</p>
          </div>
        </div>
        <p style="margin:0 0 8px 0; font-size:0.75rem; color:#ddd; font-style:italic;">"${bioSanitized}"</p>
        <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:8px;">
          <span style="background:#1abc9c; color:#fff; font-size:0.65rem; padding:2px 6px; border-radius:4px;">🗣️ ${nativeSanitized}</span>
          <span style="background:#e74c3c; color:#fff; font-size:0.65rem; padding:2px 6px; border-radius:4px;">🎯 ${targetSanitized}</span>
        </div>
        <div style="text-align:right;">
          <button class="btn-primary" style="width:auto; padding:4px 10px; font-size:0.7rem; cursor:pointer;" onclick="openChatWindow(${user.id})">Message</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHTML);
    STATE.mapMarkers.push(marker);
  });

  // Always invalidate map size to ensure tiles and center adapt properly
  setTimeout(() => {
    STATE.map.invalidateSize();
  }, 100);
}


// ---------------- GLOBAL COMMUNITY DIRECTORY ----------------
async function loadDirectoryWorkspace() {
  if (!STATE.token) return;
  try {
    const res = await fetch('/api/directory', {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const users = await res.json();
      STATE.directoryUsers = users;
      renderFullDirectory(users);
    }
  } catch (err) {
    console.error('Error fetching directory:', err);
  }
}

function renderFullDirectory(users) {
  allDirectoryUsers.innerHTML = '';
  if (users.length === 0) {
    allDirectoryUsers.innerHTML = '<p class="subtitle-muted">No other community members registered.</p>';
    return;
  }

  users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'partner-card';
    card.innerHTML = `
      <div class="partner-main">
        <div class="partner-avatar">${sanitizeHTML(user.name.substring(0,2).toUpperCase())}</div>
        <div class="partner-meta">
          <h3>${sanitizeHTML(user.name)} <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted)">(${sanitizeHTML(user.age)} yo, ${sanitizeHTML(user.region)})</span></h3>
          <p class="subtitle">${sanitizeHTML(user.profile_location || 'Remote')}</p>
          <div class="lang-labels" style="margin-bottom: 5px;">
            <span class="lang-badge">🗣️ Native: ${sanitizeHTML(user.native_language)}</span>
            <span class="lang-badge target">🎯 Target: ${sanitizeHTML(user.target_language)}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted)">🏷️ Tags: ${sanitizeHTML(user.interest_tags || 'none')} | Hobbies: ${sanitizeHTML(user.hobbies || 'none')}</p>
        </div>
      </div>
      <div class="partner-side">
        <span class="match-score-badge">${user.match_score}% Match</span>
        <button class="btn-chat" onclick="openChatWindow(${user.id})">Message</button>
      </div>
    `;
    allDirectoryUsers.appendChild(card);
  });
}

directorySearchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = STATE.directoryUsers.filter(u => {
    return (
      u.name.toLowerCase().includes(q) ||
      u.native_language.toLowerCase().includes(q) ||
      u.target_language.toLowerCase().includes(q) ||
      (u.hobbies && u.hobbies.toLowerCase().includes(q)) ||
      (u.interest_tags && u.interest_tags.toLowerCase().includes(q)) ||
      (u.profile_location && u.profile_location.toLowerCase().includes(q))
    );
  });
  renderFullDirectory(filtered);
});

resetSearchBtn.addEventListener('click', () => {
  directorySearchInput.value = '';
  renderFullDirectory(STATE.directoryUsers);
});


// ---------------- SOCKET.IO REAL-TIME SLIDE-OVER CHAT WIDGET ----------------
function openChatWindow(partnerId) {
  STATE.activeChatPartnerId = partnerId;

  const partner = STATE.directoryUsers.find(u => u.id === partnerId);
  if (partner) {
    STATE.isAIChat = (partner.username === 'AI Coach');

    // Fill slide-over metadata
    slideoverPartnerAvatar.textContent = sanitizeHTML(partner.name.substring(0,2).toUpperCase());
    slideoverPartnerName.textContent = sanitizeHTML(partner.name);
    slideoverPartnerLocation.textContent = sanitizeHTML(partner.profile_location || 'Remote');
  } else {
    STATE.isAIChat = false;
  }

  // Load message logs from DB first
  loadSlideoverChatMessages();

  // Active slide-over transitions
  slideoverWidget.classList.add('active');
}

closeSlideoverBtn.addEventListener('click', () => {
  slideoverWidget.classList.remove('active');
  STATE.activeChatPartnerId = null;
});

async function loadSlideoverChatMessages() {
  if (!STATE.token || !STATE.activeChatPartnerId) return;

  try {
    const res = await fetch(`/api/chat/${STATE.activeChatPartnerId}`, {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const messages = await res.json();
      renderSlideoverChatMessagesList(messages);
    }
  } catch (err) {
    console.error('Error fetching historical messages:', err);
  }
}

function renderSlideoverChatMessagesList(messages) {
  slideoverMessagesBox.innerHTML = '';

  if (messages.length === 0) {
    slideoverMessagesBox.innerHTML = '<p class="subtitle-muted" style="text-align:center; margin-top:20px;">No messages exchanged yet. Send a first sentence!</p>';
    return;
  }

  messages.forEach(msg => {
    appendSingleRealTimeMessageToSlideover(msg);
  });
}

function appendSingleRealTimeMessageToSlideover(msg) {
  const isOutgoing = msg.sender_id === STATE.user.id;
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;

  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Direct Audio player validator regex
  const isAudioMsg = /^data:audio\/[a-zA-Z0-9\-+]+;base64,[a-zA-Z0-9\/+=]+$/.test(msg.content.trim());

  let bubbleBody = '';
  if (isAudioMsg) {
    bubbleBody = `<audio controls src="${msg.content}" style="max-width: 100%; display:block; margin-top:5px; outline:none;"></audio>`;
  } else {
    bubbleBody = `<div class="bubble-content-text">${sanitizeHTML(msg.content)}</div>`;
  }

  wrapper.innerHTML = `
    <span class="msg-sender-lbl">${isOutgoing ? 'You' : 'Partner'}</span>
    <div class="message-bubble" id="msg-bubble-${msg.id}" data-text="${isAudioMsg ? 'Voice Message' : sanitizeHTML(msg.content)}">
      ${bubbleBody}

      <!-- Action Overlay Tools -->
      <div class="bubble-tools-overlay">
        <button class="bubble-btn" onclick="triggerTTS('${msg.id}')">🔊 TTS</button>
        <button class="bubble-btn" onclick="triggerTranslate('${msg.id}')">🌐 Translate</button>
      </div>

      <div class="simulated-translation-display" id="translation-display-${msg.id}"></div>
      <span class="msg-timestamp">${timeStr}</span>
    </div>
  `;

  slideoverMessagesBox.appendChild(wrapper);
  slideoverMessagesBox.scrollTop = slideoverMessagesBox.scrollHeight;
}

// Submit live messages over WebSocket signaling
slideoverChatInputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = slideoverChatMsgInput.value.trim();
  if (!text || !socket) return;

  // Dispatch private socket transmission
  socket.emit('private-message', {
    to: STATE.activeChatPartnerId,
    content: text
  });

  slideoverChatMsgInput.value = '';
});


// ---------------- TRANSLATION LIMITS COUNTER ----------------
function refreshTranslationCounterDisplay() {
  const percentage = Math.min(100, (STATE.sessionTranslationCount / 5) * 100);

  const fill = document.getElementById('translation-counter-fill');
  const text = document.getElementById('translation-counter-text');

  if (fill) fill.style.width = `${percentage}%`;
  if (text) text.textContent = `${STATE.sessionTranslationCount} / 5 translations used`;
}

window.triggerTranslate = async function(messageId) {
  console.log('triggerTranslate called with ID:', messageId);
  const bubble = document.getElementById(`msg-bubble-${messageId}`);
  if (!bubble) {
    console.error('Bubble not found for ID:', messageId);
    return;
  }

  const text = bubble.getAttribute('data-text');
  if (!text) {
    console.error('data-text attribute not found for message bubble');
    return;
  }

  if (!STATE.user.is_premium && STATE.sessionTranslationCount >= 5) {
    showToast('🔒 Translate Limit Breached! Free Tier accounts are limited to 5 translations per session.', 'danger');
    openPremiumUpgradeModal();
    return;
  }

  // Fallback to active target language if partner lookup delayed
  const partner = STATE.directoryUsers.find(u => u.id === STATE.activeChatPartnerId);
  const targetLanguage = partner ? partner.native_language : (STATE.user ? STATE.user.target_language : 'Spanish');

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ text, target_language: targetLanguage })
    });

    if (res.ok) {
      const data = await res.json();
      console.log('Translation succeeded:', data);

      if (!STATE.user.is_premium) {
        STATE.sessionTranslationCount++;
        refreshTranslationCounterDisplay();
      }

      const disp = document.getElementById(`translation-display-${messageId}`);
      if (disp) {
        disp.innerHTML = `
          <div style="font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.1); margin-top:6px; padding-top:6px; color: var(--accent);">
            <strong>Translation:</strong> ${sanitizeHTML(data.translated)}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
            <strong>Transliteration:</strong> ${sanitizeHTML(data.transliteration)}
          </div>
        `;
      }
    } else {
      console.error('Translation failed on server.');
    }
  } catch (err) {
    console.error('Translation process error:', err);
    showToast('Simulated translate loop connection warning.', 'danger');
  }
};


// ---------------- DIRECT MESSAGE VOICE RECORDER API ----------------
let voiceMediaRecorder = null;
let voiceAudioChunks = [];
let isVoiceRecording = false;

if (slideoverBtnRecordVoice) {
  slideoverBtnRecordVoice.addEventListener('click', async () => {
    if (!isVoiceRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceAudioChunks = [];
        voiceMediaRecorder = new MediaRecorder(stream);

        voiceMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            voiceAudioChunks.push(e.data);
          }
        };

        voiceMediaRecorder.onstop = () => {
          const audioBlob = new Blob(voiceAudioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64AudioURI = reader.result;
            // Emit recorded voice cleanly to server over the active socket link
            if (socket && STATE.activeChatPartnerId) {
              socket.emit('private-message', {
                to: STATE.activeChatPartnerId,
                content: base64AudioURI
              });
            }
          };

          stream.getTracks().forEach(track => track.stop());
        };

        voiceMediaRecorder.start();
        isVoiceRecording = true;
        slideoverBtnRecordVoice.classList.add('recording');
        slideoverBtnRecordVoice.innerHTML = '🛑';
        slideoverBtnRecordVoice.title = 'Recording Voice... Click again to Stop';
        showToast('Voice recording started...');
      } catch (err) {
        console.warn('Microphone block detected:', err.message);
        showToast('Could not acquire microphone access.', 'danger');
      }
    } else {
      if (voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') {
        voiceMediaRecorder.stop();
      }
      isVoiceRecording = false;
      slideoverBtnRecordVoice.classList.remove('recording');
      slideoverBtnRecordVoice.innerHTML = '🎙️';
      slideoverBtnRecordVoice.title = 'Record Voice Message';
      showToast('Voice recording completed.');
    }
  });
}


// ---------------- BROWSER-NATIVE TEXT-TO-SPEECH (TTS) ----------------
window.triggerTTS = function(messageId) {
  const bubble = document.getElementById(`msg-bubble-${messageId}`);
  if (!bubble) return;

  const text = bubble.getAttribute('data-text');
  if (!text) return;

  const partner = STATE.directoryUsers.find(u => u.id === STATE.activeChatPartnerId);
  const languageLocale = partner ? (SPEECH_LOCALE_MAP[partner.native_language] || 'en-US') : 'en-US';

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageLocale;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(languageLocale));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
    showToast(`TTS Speaking phrase in ${partner ? partner.native_language : 'partner locale'}...`);
  } else {
    showToast('Native TTS SpeechSynthesis is not supported on this browser version.', 'danger');
  }
};


// ---------------- MOMENTS COMMUNITY INTERACTION FEED ----------------
async function loadMomentsFeed() {
  if (!STATE.token) return;

  try {
    const res = await fetch('/api/moments', {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const moments = await res.json();
      renderMomentsList(moments);
    }
  } catch (err) {
    console.error('Error fetching moments:', err);
  }
}

function renderMomentsList(moments) {
  momentsTimeline.innerHTML = '';
  if (moments.length === 0) {
    momentsTimeline.innerHTML = '<p class="subtitle-muted" style="text-align:center; padding: 40px 0;">No learning moments published yet. Write the first achievement!</p>';
    return;
  }

  moments.forEach(m => {
    const card = document.createElement('div');
    card.className = 'moment-card';

    const timestamp = new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    let commentsListHtml = '';
    if (m.comments && m.comments.length > 0) {
      commentsListHtml = `<div class="comments-list">`;
      m.comments.forEach(c => {
        commentsListHtml += `
          <div class="comment-item">
            <span class="commenter-name">${sanitizeHTML(c.username)}:</span>
            <span>${sanitizeHTML(c.content)}</span>
          </div>
        `;
      });
      commentsListHtml += `</div>`;
    }

    let correctionsHtml = '';
    if (m.corrections && m.corrections.length > 0) {
      correctionsHtml = `<div class="moment-corrections-block">`;
      m.corrections.forEach(cor => {
        correctionsHtml += `
          <div class="moment-correction-item">
            <div style="font-size:0.7rem; color:var(--accent); font-weight:600; margin-bottom: 2px;">⚠️ Correction by ${sanitizeHTML(cor.corrector_name)}:</div>
            <div class="comparison-view">
              <div><span class="diff-mistake">${sanitizeHTML(cor.original_text)}</span></div>
              <div><span class="diff-correction">${sanitizeHTML(cor.corrected_text)}</span></div>
            </div>
          </div>
        `;
      });
      correctionsHtml += `</div>`;
    }

    let mediaEmbed = '';
    if (m.image_url) {
      mediaEmbed += `<img class="moment-media" src="${sanitizeHTML(m.image_url)}" alt="Moment Media">`;
    }
    if (m.audio_url) {
      mediaEmbed += `<audio class="moment-audio-player" controls src="${sanitizeHTML(m.audio_url)}"></audio>`;
    }

    card.innerHTML = `
      <div class="moment-meta">
        <div class="moment-user-info">
          <div class="partner-avatar" style="width:36px; height:36px; font-size:0.85rem">${sanitizeHTML(m.name.substring(0,2).toUpperCase())}</div>
          <div>
            <span class="moment-author">${sanitizeHTML(m.name)}</span>
            <span style="font-size:0.75rem; color:var(--text-muted)">(@${sanitizeHTML(m.username)})</span>
          </div>
        </div>
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted)">${timestamp}</span>
          ${m.is_premium ? `<span class="premium-badge" style="font-size:0.65rem; margin-left: 6px;">PRO VIP</span>` : ''}
        </div>
      </div>

      <div class="moment-body">
        <p>${sanitizeHTML(m.content)}</p>
        ${mediaEmbed}
      </div>

      ${correctionsHtml}

      <div class="moment-actions">
        <button class="action-btn ${m.is_liked_by_me ? 'liked' : ''}" onclick="likeMoment(${m.id})">
          ❤️ <span>${m.likes_count} Likes</span>
        </button>
        <button class="action-btn" onclick="openMomentCorrectionForm(${m.id}, '${sanitizeHTML(m.content)}')">
          📝 Community Correct
        </button>
      </div>

      ${commentsListHtml}

      <form class="comment-form" onsubmit="submitComment(event, ${m.id})">
        <input type="text" placeholder="Add educational feedback or comment..." required>
        <button class="btn-chat" type="submit">Reply</button>
      </form>
    `;

    momentsTimeline.appendChild(card);
  });
}

newMomentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('moment-content').value.trim();
  const image_url = momentImageSelect.value;
  const audio_url = document.getElementById('moment-audio').value.trim();

  try {
    const res = await fetch('/api/moments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ content, image_url, audio_url })
    });

    if (res.ok) {
      showToast('Learning achievement posted! (+10 XP gained)');
      newMomentForm.reset();

      await fetchAndRefreshUserProfile();
      await loadMomentsFeed();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to share moment', 'danger');
    }
  } catch (err) {
    showToast('Failed to post moment due to server error', 'danger');
  }
});

window.likeMoment = async function(momentId) {
  try {
    const res = await fetch(`/api/moments/${momentId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      await loadMomentsFeed();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to like moment', 'danger');
    }
  } catch (err) {
    console.error('Like error:', err);
  }
};

window.submitComment = async function(e, momentId) {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input');
  const commentText = input.value.trim();
  if (!commentText) return;

  try {
    const res = await fetch(`/api/moments/${momentId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({ content: commentText })
    });

    if (res.ok) {
      input.value = '';
      await loadMomentsFeed();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to reply', 'danger');
    }
  } catch (err) {
    console.error('Comment error:', err);
  }
};

window.openMomentCorrectionForm = function(momentId, text) {
  selectedMomentForCorrectionId = momentId;
  momentCorrectionOriginalPreview.textContent = `"${text}"`;
  momentCorrectionInputText.value = text;
  momentCorrectionModal.classList.remove('hidden');
};

closeMomentCorrectionModal.addEventListener('click', () => {
  momentCorrectionModal.classList.add('hidden');
});

submitMomentCorrectionConfirm.addEventListener('click', async () => {
  const correctedValue = momentCorrectionInputText.value.trim();
  if (!correctedValue) return;

  try {
    const res = await fetch(`/api/moments/${selectedMomentForCorrectionId}/corrections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({
        original_text: momentCorrectionOriginalPreview.textContent.replace(/"/g, ''),
        corrected_text: correctedValue
      })
    });

    if (res.ok) {
      showToast('Community moment correction applied! (+10 XP gained)');
      momentCorrectionModal.classList.add('hidden');
      await loadMomentsFeed();
      await fetchAndRefreshUserProfile();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to apply moment correction', 'danger');
    }
  } catch (err) {
    showToast('Failed to process community moment correction.', 'danger');
  }
});


// ---------------- ECOSYSTEM MODULE: MULTI-USER VOICEROOMS ----------------
function renderVoiceroomView() {
  if (STATE.activeVoiceroomName) {
    voiceroomActiveContainer.classList.remove('hidden');
    voiceroomEmptyPrompt.classList.add('hidden');
  } else {
    voiceroomActiveContainer.classList.add('hidden');
    voiceroomEmptyPrompt.classList.remove('hidden');
  }
}

voiceroomJoinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const roomName = voiceroomNameInput.value.trim();
  if (!roomName) return;

  STATE.activeVoiceroomName = roomName;
  activeRoomTitle.textContent = roomName;

  if (socket) {
    socket.emit('voiceroom-join', { roomName, username: STATE.user.username });
  }

  renderVoiceroomView();
  showToast(`Successfully connected to Voiceroom: ${roomName}`);
});

btnLeaveVoiceroom.addEventListener('click', () => {
  leaveVoiceroomSilent();
  renderVoiceroomView();
  showToast('You left the active voiceroom.');
});

function leaveVoiceroomSilent() {
  if (socket && STATE.activeVoiceroomName) {
    socket.emit('voiceroom-leave');
  }
  STATE.activeVoiceroomName = null;
}

btnRaiseHandRoom.addEventListener('click', () => {
  if (socket && STATE.activeVoiceroomName) {
    socket.emit('voiceroom-raise-hand');
    showToast('Hand raised! Waiting for room host approval...');
  }
});

function bindVoiceroomSocketSignals() {
  if (!socket) return;

  socket.on('voiceroom-state', (roomState) => {
    console.log('Voiceroom state update:', roomState);
    renderVoiceroomSpeakersAndAudience(roomState);
  });

  socket.on('voiceroom-approved', () => {
    showToast('🎉 Your hand-raise was approved! You are now speaking on the panel stage.', 'success');
  });
}

function renderVoiceroomSpeakersAndAudience(roomState) {
  voiceroomSpeakerSeats.innerHTML = '';
  voiceroomAudienceSeats.innerHTML = '';

  const hostId = roomState.hostId;
  roomState.members.forEach(member => {
    const isHost = (member.userId === hostId);
    const item = document.createElement('div');
    item.className = 'voiceroom-member-badge';

    if (member.status === 'panel') {
      item.innerHTML = `
        <div class="panel-avatar">🎙️</div>
        <div class="panel-username">@${sanitizeHTML(member.username)} ${isHost ? '(Host)' : ''}</div>
      `;
      voiceroomSpeakerSeats.appendChild(item);
    } else {
      const isHandRaised = (member.status === 'hand-raised');

      const approveBtn = (isHost && isHandRaised && STATE.user.id === hostId) ?
        `<button class="btn-chat" style="padding: 2px 6px; font-size: 0.7rem; margin-top:4px;" onclick="approveVoiceroomSpeaker('${member.socketId}')">Admit</button>` : '';

      item.innerHTML = `
        <div class="audience-avatar">${isHandRaised ? '✋' : '👥'}</div>
        <div class="panel-username">@${sanitizeHTML(member.username)}</div>
        ${approveBtn}
      `;
      voiceroomAudienceSeats.appendChild(item);
    }
  });
}

window.approveVoiceroomSpeaker = function(targetSocketId) {
  if (socket && STATE.activeVoiceroomName) {
    socket.emit('voiceroom-approve-speaker', { targetSocketId });
  }
};


// ---------------- ECOSYSTEM MODULE: LIVESTREAMS BROADCAST SIMULATION ----------------
const SIMULATED_LIVE_COMMENTS = [
  { username: "carlos_g", text: "Bonjour Marie! Great pronunciation tips today." },
  { username: "yuki22", text: "Wait, can you explain the liaison in French vowels again?" },
  { username: "sujin_p", text: "Wow, so many people here! Hello from Seoul!" },
  { username: "chloe_l", text: "This is super helpful for my exam preparation." },
  { username: "learner99", text: "I love the zero API translation tools on GlobalTalk!" },
  { username: "polyglot_boss", text: "XP levels are really keeping me motivated!" }
];

function startLiveBroadcastSimulation() {
  liveChatScrollerBox.innerHTML = '';

  for(let i = 0; i < 4; i++) {
    appendSimulatedLiveComment(
      SIMULATED_LIVE_COMMENTS[i].username,
      SIMULATED_LIVE_COMMENTS[i].text
    );
  }

  if (STATE.liveChatInterval) clearInterval(STATE.liveChatInterval);
  STATE.liveChatInterval = setInterval(() => {
    const randomSeed = SIMULATED_LIVE_COMMENTS[Math.floor(Math.random() * SIMULATED_LIVE_COMMENTS.length)];
    appendSimulatedLiveComment(randomSeed.username, randomSeed.text);
  }, 2500);
}

function appendSimulatedLiveComment(username, content) {
  const item = document.createElement('div');
  item.className = 'live-chat-comment';
  item.innerHTML = `
    <span class="live-commenter">@${sanitizeHTML(username)}:</span>
    <span class="live-comment-text">${sanitizeHTML(content)}</span>
  `;
  liveChatScrollerBox.appendChild(item);
  liveChatScrollerBox.scrollTop = liveChatScrollerBox.scrollHeight;
}

liveChatInputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = liveChatInputText.value.trim();
  if (!text) return;

  appendSimulatedLiveComment(STATE.user.username, text);
  liveChatInputText.value = '';

  setTimeout(() => {
    appendSimulatedLiveComment("broadcaster_marie", `Merci @${STATE.user.username}! That's a magnificent observation!`);
  }, 2000);
});


// ---------------- REAL P2P WEBRTC VOICE CALL FLOWS ----------------
function initializeSocket() {
  if (socket) return;

  socket = io();

  socket.emit('register-socket', STATE.user.id);

  socket.on('call-made', async (data) => {
    console.log('Incoming call made offer received from user id:', data.from);

    const callerUser = STATE.directoryUsers.find(u => u.id === data.from) || { name: 'Language Partner' };
    callPartnerName.textContent = callerUser.name;

    callStatusLabel.textContent = 'Incoming Call Stream... Connecting...';
    stepSdp.className = 'timeline-step success';
    stepIce.className = 'timeline-step active';
    stepConnected.className = 'timeline-step';
    callLiveTimer.classList.add('hidden');

    webrtcCallModal.classList.remove('hidden');

    await setupPeerConnection(data.from);

    await STATE.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

    const answer = await STATE.peerConnection.createAnswer();
    await STATE.peerConnection.setLocalDescription(answer);

    socket.emit('make-answer', {
      to: data.from,
      answer: answer
    });

    stepIce.className = 'timeline-step success';
    stepConnected.className = 'timeline-step active';
  });

  socket.on('answer-made', async (data) => {
    console.log('Incoming RTC answer received.');
    if (STATE.peerConnection) {
      await STATE.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    stepIce.className = 'timeline-step success';
    stepConnected.className = 'timeline-step active';
  });

  socket.on('ice-candidate-relay', async (data) => {
    if (STATE.peerConnection) {
      try {
        await STATE.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn('ICE candidate fallback application:', err);
      }
    }
  });

  socket.on('call-ended', () => {
    console.log('Active call terminated by remote peer speaker.');
    hangUpActiveCall(false);
  });

  socket.on('call-error', (data) => {
    showToast(data.message, 'danger');
    callStatusLabel.textContent = data.message;
  });

  // Real-time socket message receiver relay hook
  socket.on('message-relay', (msg) => {
    console.log('Real-time private message relay received:', msg);

    // If the live message belongs to the currently active slideover chat threat, append instantly!
    if (
      STATE.activeChatPartnerId &&
      ((msg.sender_id === STATE.user.id && msg.receiver_id === STATE.activeChatPartnerId) ||
       (msg.sender_id === STATE.activeChatPartnerId && msg.receiver_id === STATE.user.id))
    ) {
      appendSingleRealTimeMessageToSlideover(msg);
      fetchAndRefreshUserProfile(); // Refresh XP navbar badges instantly as messages are received/sent!
    }
  });

  bindVoiceroomSocketSignals();
}

async function setupPeerConnection(targetUserId) {
  if (STATE.peerConnection) {
    STATE.peerConnection.close();
  }

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  STATE.peerConnection = new RTCPeerConnection(configuration);

  try {
    STATE.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.localStream.getTracks().forEach(track => {
      STATE.peerConnection.addTrack(track, STATE.localStream);
    });
  } catch (err) {
    console.warn('Microphone block detected or testing sandbox environment. Deploying mock synthesizer stream fallback...');
    try {
      const mockCtx = new (window.AudioContext || window.webkitAudioContext)();
      const mockOsc = mockCtx.createOscillator();
      const mockDst = mockCtx.createMediaStreamDestination();
      mockOsc.connect(mockDst);
      mockOsc.start();
      STATE.localStream = mockDst.stream;
      STATE.localStream.getTracks().forEach(track => {
        STATE.peerConnection.addTrack(track, STATE.localStream);
      });
    } catch (mockErr) {
      console.error('AudioContext simulation error:', mockErr);
    }
  }

  STATE.peerConnection.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('ice-candidate', {
        to: targetUserId,
        candidate: event.candidate
      });
    }
  };

  STATE.peerConnection.ontrack = (event) => {
    console.log('WebRTC remote speaker audio track incoming!');
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
      remoteAudio.srcObject = event.streams[0];
    }

    stepConnected.className = 'timeline-step success';
    callStatusLabel.textContent = 'Voice Call Connected';
    startLiveTimer();
  };
}

// Full-screen and slideover call initialization integrations
function initiateWebRTCCallFlow() {
  if (!STATE.activeChatPartnerId) return;
  startWebRTCCall();
}

slideoverCallBtn.addEventListener('click', initiateWebRTCCallFlow);

async function startWebRTCCall() {
  try {
    const res = await fetch('/api/calls/initiate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.error === 'LIMIT_BREACHED') {
        openPremiumUpgradeModal();
      } else {
        showToast(data.error || 'Failed to start voice call', 'danger');
      }
      return;
    }

    const partner = STATE.directoryUsers.find(u => u.id === STATE.activeChatPartnerId);
    callPartnerName.textContent = partner ? partner.name : 'Language Partner';

    callStatusLabel.textContent = 'Ringing...';
    stepSdp.className = 'timeline-step active';
    stepIce.className = 'timeline-step';
    stepConnected.className = 'timeline-step';
    callLiveTimer.classList.add('hidden');

    webrtcCallModal.classList.remove('hidden');

    await setupPeerConnection(STATE.activeChatPartnerId);

    const offer = await STATE.peerConnection.createOffer();
    await STATE.peerConnection.setLocalDescription(offer);

    if (socket) {
      socket.emit('call-user', {
        to: STATE.activeChatPartnerId,
        offer: offer
      });
    }

    stepSdp.className = 'timeline-step success';
    stepIce.className = 'timeline-step active';
  } catch (err) {
    console.error('Caller WebRTC initialization failure:', err);
    showToast('Voice session connection failed.', 'danger');
  }
}

btnHangupCall.addEventListener('click', () => {
  hangUpActiveCall(true);
});

function hangUpActiveCall(emitEndEvent = true) {
  console.log('Terminating WebRTC Call...');

  if (emitEndEvent && socket && STATE.activeChatPartnerId) {
    socket.emit('end-call', { to: STATE.activeChatPartnerId });
  }

  if (STATE.localStream) {
    STATE.localStream.getTracks().forEach(track => track.stop());
    STATE.localStream = null;
  }

  if (STATE.peerConnection) {
    STATE.peerConnection.close();
    STATE.peerConnection = null;
  }

  const remoteAudio = document.getElementById('remote-audio');
  if (remoteAudio) {
    remoteAudio.srcObject = null;
  }

  if (STATE.callTimerInterval) {
    clearInterval(STATE.callTimerInterval);
    STATE.callTimerInterval = null;
  }

  webrtcCallModal.classList.add('hidden');
  showToast('Voice session successfully disconnected.');
}

function startLiveTimer() {
  callLiveTimer.classList.remove('hidden');
  let seconds = 0;
  callLiveTimer.textContent = '00:00';

  if (STATE.callTimerInterval) clearInterval(STATE.callTimerInterval);
  STATE.callTimerInterval = setInterval(() => {
    seconds++;
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    callLiveTimer.textContent = `${min}:${sec}`;
  }, 1000);
}


// ---------------- COMMERCIAL LIMIT DETAILS & PREMIUM MODAL ----------------
async function openPremiumUpgradeModal() {
  premiumUpgradeModal.classList.remove('hidden');
}

closePremiumModal.addEventListener('click', () => {
  premiumUpgradeModal.classList.add('hidden');
});

mockPremiumToggleBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/profile/toggle-premium', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      showToast(data.message, 'success');
      premiumUpgradeModal.classList.add('hidden');
      await fetchAndRefreshUserProfile();
      syncDeveloperProButton();
      refreshAdVisibilities();

      if (STATE.activeTab === 'profile') {
        loadProfileDetails();
      }
    }
  } catch (err) {
    showToast('Failed to toggle premium credentials', 'danger');
  }
});


// ---------------- GLOBAL LEADERBOARD INTEGRATION ----------------
async function loadLeaderboard() {
  if (!STATE.token) return;
  try {
    const res = await fetch('/api/leaderboard', {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const rows = await res.json();
      renderLeaderboard(rows);
    }
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
  }
}

function renderLeaderboard(rows) {
  leaderboardRowsContainer.innerHTML = '';
  if (rows.length === 0) {
    leaderboardRowsContainer.innerHTML = '<tr><td colspan="5" style="text-align:center;" class="subtitle-muted">No leaderboard rankings available.</td></tr>';
    return;
  }

  rows.forEach((row, idx) => {
    const rank = idx + 1;
    let rankBadge = '';

    if (rank === 1) {
      rankBadge = '<span class="rank-badge-item gold">🏆 1st</span>';
    } else if (rank === 2) {
      rankBadge = '<span class="rank-badge-item silver">🥈 2nd</span>';
    } else if (rank === 3) {
      rankBadge = '<span class="rank-badge-item bronze">🥉 3rd</span>';
    } else {
      rankBadge = `<span class="rank-badge-item normal">${rank}th</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td><strong>@${sanitizeHTML(row.username)}</strong></td>
      <td><span class="lang-badge">${sanitizeHTML(row.native_language)}</span></td>
      <td><span class="lang-badge target">${sanitizeHTML(row.target_language)}</span></td>
      <td style="text-align: right; font-weight: 600;" class="accent-text">${row.xp} XP</td>
    `;
    leaderboardRowsContainer.appendChild(tr);
  });
}


// ---------------- INITIALIZATION ROUTINES ----------------
window.addEventListener('DOMContentLoaded', async () => {
  initNavigation();

  if (STATE.token && STATE.user) {
    updateNavXPBadge(STATE.user);
    navigateTo('dashboard');
    initializeSocket();
    await fetchAndRefreshUserProfile();
  } else {
    navigateTo('auth');
  }
});
