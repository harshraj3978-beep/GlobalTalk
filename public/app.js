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

  // New Ecosystem parameters
  sessionTranslationCount: 0,
  activeVoiceroomName: null,
  voiceroomPollInterval: null,
  liveChatInterval: null
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

// Chat Elements
const chatMessagesBox = document.getElementById('chat-messages-box');
const chatInputForm = document.getElementById('chat-input-form');
const chatMsgInput = document.getElementById('chat-msg-input');
const activePartnerPanel = document.getElementById('active-partner-panel');
const startVoiceCallBtn = document.getElementById('start-voice-call-btn');
const chatBackToDashboard = document.getElementById('chat-back-to-dashboard');
const translationCounterFill = document.getElementById('translation-counter-fill');
const translationCounterText = document.getElementById('translation-counter-text');

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
const mapGridOverlay = document.getElementById('map-grid-overlay');
const mapPartnerCard = document.getElementById('map-partner-card');


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

  // Clean-up loop intervals on navigation
  if (tab !== 'chat' && STATE.chatPollInterval) {
    clearInterval(STATE.chatPollInterval);
    STATE.chatPollInterval = null;
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

  // Header active design transitions
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Screen visibilities toggles
  authScreen.classList.add('hidden');
  dashboardScreen.classList.add('hidden');
  directoryScreen.classList.add('hidden');
  chatScreen.classList.add('hidden');
  momentsScreen.classList.add('hidden');
  voiceroomsScreen.classList.add('hidden');
  liveScreen.classList.add('hidden');
  leaderboardScreen.classList.add('hidden');
  profileScreen.classList.add('hidden');

  if (tab === 'auth') {
    authScreen.classList.remove('hidden');
    mainNav.classList.add('hidden');
  } else {
    mainNav.classList.remove('hidden');
    refreshAdVisibilities();

    if (tab === 'dashboard') {
      dashboardScreen.classList.remove('hidden');
      loadDashboard();
    } else if (tab === 'directory') {
      directoryScreen.classList.remove('hidden');
      loadDirectoryWorkspace();
    } else if (tab === 'chat') {
      chatScreen.classList.remove('hidden');
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

  // XP Formula: Level = Math.floor(xp / 100) + 1
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
  if (STATE.chatPollInterval) clearInterval(STATE.chatPollInterval);
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

  // Prepopulate form fields
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

  // Free Tier Lock: Block multi-language configurations (Free tier must match current, Premium can freely choose different)
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
  mapGridOverlay.innerHTML = '';
  mapPartnerCard.innerHTML = '';
  mapPartnerCard.classList.add('hidden');

  users.forEach((user, index) => {
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.textContent = sanitizeHTML(user.name.substring(0,1).toUpperCase());

    const row = ((index * 3) % 8) + 2;
    const col = ((index * 4) % 8) + 2;
    pin.style.top = `${row * 10}%`;
    pin.style.left = `${col * 10}%`;

    pin.addEventListener('click', () => {
      displayMapPartnerDetails(user);
    });

    mapGridOverlay.appendChild(pin);
  });
}

function displayMapPartnerDetails(user) {
  mapPartnerCard.className = 'map-partner-card';
  mapPartnerCard.classList.remove('hidden');
  mapPartnerCard.innerHTML = `
    <div class="partner-main">
      <div class="partner-avatar">${sanitizeHTML(user.name.substring(0,2).toUpperCase())}</div>
      <div class="partner-meta">
        <h3>${sanitizeHTML(user.name)} <span class="accent-text" style="font-size:0.85rem">(${user.match_score}% Match)</span></h3>
        <p class="subtitle" style="margin-bottom: 4px;">📍 ${sanitizeHTML(user.profile_location || 'Remote')} | Age: ${sanitizeHTML(user.age)} | Region: ${sanitizeHTML(user.region)}</p>
        <p style="font-size:0.8rem; margin-bottom: 6px;"><em>"${sanitizeHTML(user.bio || 'Hello learning partner!')}"</em></p>
        <div class="lang-labels">
          <span class="lang-badge">🗣️ Native: ${sanitizeHTML(user.native_language)}</span>
          <span class="lang-badge target">🎯 Target: ${sanitizeHTML(user.target_language)}</span>
        </div>
      </div>
    </div>
    <div style="text-align: right; margin-top: 10px;">
      <button class="btn-primary" style="width:auto; padding:6px 14px; font-size:0.85rem" onclick="openChatWindow(${user.id})">Direct Chat</button>
    </div>
  `;
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

// Search filtering
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


// ---------------- IN-STREAM CHAT PANEL ----------------
function openChatWindow(partnerId) {
  STATE.activeChatPartnerId = partnerId;
  navigateTo('chat');

  const partner = STATE.directoryUsers.find(u => u.id === partnerId);
  if (partner) {
    STATE.isAIChat = (partner.username === 'AI Coach');
    activePartnerPanel.innerHTML = `
      <div class="partner-avatar" style="margin: 0 auto; width: 60px; height: 60px; font-size:1.4rem">${sanitizeHTML(partner.name.substring(0,2).toUpperCase())}</div>
      <h2 style="text-align:center">${sanitizeHTML(partner.name)}</h2>
      <p class="subtitle" style="text-align:center">📍 ${sanitizeHTML(partner.profile_location || 'Remote')}</p>
      <p style="font-size:0.8rem; text-align:center; color: var(--text-muted)">🗣️ Native: ${sanitizeHTML(partner.native_language)}</p>
      <p style="font-size:0.8rem; text-align:center; color: var(--accent)">🎯 Targets: ${sanitizeHTML(partner.target_language)}</p>
    `;
  } else {
    STATE.isAIChat = false;
  }

  // Clear session translation counter display
  refreshTranslationCounterDisplay();

  loadChatMessages();

  if (STATE.chatPollInterval) clearInterval(STATE.chatPollInterval);
  STATE.chatPollInterval = setInterval(loadChatMessages, 2000);
}

chatBackToDashboard.addEventListener('click', () => {
  navigateTo('dashboard');
});

async function loadChatMessages() {
  if (!STATE.token || !STATE.activeChatPartnerId) return;

  try {
    const res = await fetch(`/api/chat/${STATE.activeChatPartnerId}`, {
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
    if (res.ok) {
      const messages = await res.json();
      renderChatMessagesList(messages);
    }
  } catch (err) {
    console.error('Error fetching message stream:', err);
  }
}

function renderChatMessagesList(messages) {
  const shouldScroll = chatMessagesBox.scrollHeight - chatMessagesBox.scrollTop <= chatMessagesBox.clientHeight + 100;
  chatMessagesBox.innerHTML = '';

  if (messages.length === 0) {
    chatMessagesBox.innerHTML = '<p class="subtitle-muted" style="text-align:center; margin-top:20px;">No messages exchanged yet. Send a first sentence!</p>';
    return;
  }

  messages.forEach(msg => {
    const isOutgoing = msg.sender_id === STATE.user.id;
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let correctionHtml = '';
    if (msg.original_text && msg.corrected_text) {
      correctionHtml = `
        <div class="correction-block">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-danger); font-weight:700; margin-bottom: 2px;">Correction applied:</div>
          <div class="comparison-view">
            <div><span class="diff-mistake">${sanitizeHTML(msg.original_text)}</span></div>
            <div><span class="diff-correction">${sanitizeHTML(msg.corrected_text)}</span></div>
          </div>
        </div>
      `;
    }

    wrapper.innerHTML = `
      <span class="msg-sender-lbl">${isOutgoing ? 'You' : 'Partner'}</span>
      <div class="message-bubble" id="msg-bubble-${msg.id}" data-text="${sanitizeHTML(msg.content)}">
        <div class="bubble-content-text">${sanitizeHTML(msg.content)}</div>

        <!-- Action Overlay Tools -->
        <div class="bubble-tools-overlay">
          <button class="bubble-btn" onclick="triggerTTS('${msg.id}')">🔊 TTS</button>
          <button class="bubble-btn" onclick="triggerTranslate('${msg.id}')">🌐 Translate</button>
          ${!isOutgoing && !msg.corrected_text ? `<button class="bubble-btn" onclick="openCorrectionForm(${msg.id}, '${sanitizeHTML(msg.content)}')">📝 Correct</button>` : ''}
        </div>

        <div class="simulated-translation-display" id="translation-display-${msg.id}"></div>

        ${correctionHtml}
        <span class="msg-timestamp">${timeStr}</span>
      </div>
    `;

    chatMessagesBox.appendChild(wrapper);
  });

  if (shouldScroll) {
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
  }
}

// ---------------- TRANSLATION LIMITS COUNTER ----------------
function refreshTranslationCounterDisplay() {
  const percentage = Math.min(100, (STATE.sessionTranslationCount / 5) * 100);
  translationCounterFill.style.width = `${percentage}%`;
  translationCounterText.textContent = `${STATE.sessionTranslationCount} / 5 translations used`;
}

window.triggerTranslate = async function(messageId) {
  const bubble = document.getElementById(`msg-bubble-${messageId}`);
  if (!bubble) return;

  const text = bubble.getAttribute('data-text');
  if (!text) return;

  // Free Tier limit translation counter validation (Max 5 translations/session)
  if (!STATE.user.is_premium && STATE.sessionTranslationCount >= 5) {
    showToast('🔒 Translate Limit Breached! Free Tier accounts are limited to 5 translations per session.', 'danger');
    openPremiumUpgradeModal();
    return;
  }

  // Get active translation target language config
  const partner = STATE.directoryUsers.find(u => u.id === STATE.activeChatPartnerId);
  const targetLanguage = partner ? partner.native_language : 'English';

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

      // Update session counter display
      if (!STATE.user.is_premium) {
        STATE.sessionTranslationCount++;
        refreshTranslationCounterDisplay();
      }

      // Render simulated Translation results container
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
    }
  } catch (err) {
    showToast('Simulated translate loop connection warning.', 'danger');
  }
};


// ---------------- INLINE CHAT MESSAGE CORRECTION ----------------
window.openCorrectionForm = function(messageId, text) {
  STATE.selectedMessageForCorrection = messageId;
  correctionOriginalPreview.textContent = `"${text}"`;
  correctionInputText.value = text;
  correctionModal.classList.remove('hidden');
};

closeCorrectionModal.addEventListener('click', () => {
  correctionModal.classList.add('hidden');
});

submitCorrectionConfirm.addEventListener('click', async () => {
  const correctedValue = correctionInputText.value.trim();
  if (!correctedValue) return;

  const bubble = document.getElementById(`msg-bubble-${STATE.selectedMessageForCorrection}`);
  const originalValue = bubble ? bubble.getAttribute('data-text') : '';

  try {
    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({
        message_id: STATE.selectedMessageForCorrection,
        original_text: originalValue,
        corrected_text: correctedValue
      })
    });

    if (res.ok) {
      showToast('Sentence correction applied! (+10 XP gained)');
      correctionModal.classList.add('hidden');
      await loadChatMessages();
      await fetchAndRefreshUserProfile();
    } else {
      const data = await res.json();
      if (data.error === 'LIMIT_BREACHED') {
        correctionModal.classList.add('hidden');
        openPremiumUpgradeModal();
      } else {
        showToast(data.error || 'Failed to submit correction', 'danger');
      }
    }
  } catch (err) {
    showToast('Correction network error', 'danger');
  }
});


// ---------------- CHAT SUBMISSION ----------------
chatInputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatMsgInput.value.trim();
  if (!text) return;

  const endpoint = STATE.isAIChat ? '/api/chat/ai' : '/api/chat';
  const payload = STATE.isAIChat ? { content: text } : { receiver_id: STATE.activeChatPartnerId, content: text };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      chatMsgInput.value = '';
      await loadChatMessages();
      await fetchAndRefreshUserProfile();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to dispatch message', 'danger');
    }
  } catch (err) {
    showToast('Network error sending message', 'danger');
  }
});


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

      <!-- Action buttons -->
      <div class="moment-actions">
        <button class="action-btn ${m.is_liked_by_me ? 'liked' : ''}" onclick="likeMoment(${m.id})">
          ❤️ <span>${m.likes_count} Likes</span>
        </button>
        <button class="action-btn" onclick="openMomentCorrectionForm(${m.id}, '${sanitizeHTML(m.content)}')">
          📝 Community Correct
        </button>
      </div>

      <!-- Comments view & submission form -->
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

// Community Moment Grammar Corrections Overlay Form
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

  // Establish active voiceroom signaling
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

// Socket Event Receivers for Room State updates
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

      // Render direct approval button for room hosts to admit hands to the speaking panel
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

  // Seed initial fake chats
  for(let i = 0; i < 4; i++) {
    appendSimulatedLiveComment(
      SIMULATED_LIVE_COMMENTS[i].username,
      SIMULATED_LIVE_COMMENTS[i].text
    );
  }

  // Fast-updating fake comments interval
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

  // Append user's simulated live broadcast message immediately
  appendSimulatedLiveComment(STATE.user.username, text);
  liveChatInputText.value = '';

  // Trigger simulated host reply 2 seconds later
  setTimeout(() => {
    appendSimulatedLiveComment("broadcaster_marie", `Merci @${STATE.user.username}! That's a magnificent observation!`);
  }, 2000);
});


// ---------------- REAL P2P WEBRTC VOICE CALL FLOWS ----------------
function initializeSocket() {
  if (socket) return;

  socket = io();

  socket.emit('register-socket', STATE.user.id);

  // Incoming offer event relay
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

  // Bind new voicerooms hooks
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

startVoiceCallBtn.addEventListener('click', async () => {
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
});

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

// Premium Status Mock Changer
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
