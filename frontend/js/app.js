// frontend/js/app.js - Module loader that connects all refactored files
// This file loads your modular components and exposes them to the global window scope

// ===== CONFIGURATION =====
window.API_BASE = window.location.origin;
window.TOKEN_KEY = 'auth_token';
window.USER_KEY = 'user_data';
window.PETS_PER_PAGE = 12;
window.LEAGUE_PETS_PER_PAGE = 12;
window.MAX_ROSTER_SIZE = 10;

// ===== STORAGE UTILITIES (from utils/storage.js) =====
window.getToken = function() {
  return localStorage.getItem(window.TOKEN_KEY);
};

window.setToken = function(token) {
  localStorage.setItem(window.TOKEN_KEY, token);
};

window.getUser = function() {
  const user = localStorage.getItem(window.USER_KEY);
  return user ? JSON.parse(user) : null;
};

window.setUser = function(user) {
  localStorage.setItem(window.USER_KEY, JSON.stringify(user));
};

window.clearAuth = function() {
  localStorage.removeItem(window.TOKEN_KEY);
  localStorage.removeItem(window.USER_KEY);
};

// ===== API UTILITIES (from utils/api.js) =====
window.apiCall = async function(endpoint, options = {}) {
  const token = window.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${window.API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Response OK');
    return data;
  } catch (error) {
    console.error('[API Error]:', error.message);
    throw error;
  }
};

// ===== UI UTILITIES (from utils/ui.js) =====
window.showAlert = function(message, type = 'info') {
  console.log(`[Alert ${type}]: ${message}`);
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, 5000);
};

window.calculateDaysSince = function(date) {
  if (!date) return 0;
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

// ===== LOAD EXTERNAL MODULES =====
// Load each refactored module and wait for them to initialize
function loadModules() {
  const scripts = [
    '/frontend/js/auth/auth.js',
    '/frontend/js/leagues/leagues.js',
    '/frontend/js/leagues/leaderboard.js',
    '/frontend/js/pets/pets.js',
    '/frontend/js/pets/drafting.js',
    '/frontend/js/pets/roster.js',
  ];

  let scriptsLoaded = 0;

  scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      scriptsLoaded++;
      console.log(`✓ Loaded ${src} (${scriptsLoaded}/${scripts.length})`);
      
      // All scripts loaded, expose the app object
      if (scriptsLoaded === scripts.length) {
        console.log('✓ All modules loaded successfully');
        initializeAppObject();
      }
    };
    script.onerror = () => {
      console.error(`✗ Failed to load ${src}`);
    };
    document.head.appendChild(script);
  });
}

// ===== INITIALIZE APP OBJECT =====
function initializeAppObject() {
  window.app = {
    // Auth functions (from auth/auth.js)
    checkAuth: window.checkAuth || function() {},
    handleSignup: window.handleSignup || function() {},
    handleLogin: window.handleLogin || function() {},
    handleLogout: window.handleLogout || function() {},

    // League functions (from leagues/leagues.js)
    loadUserLeagues: window.loadUserLeagues || function() {},
    loadAvailableLeagues: window.loadAvailableLeagues || function() {},
    createLeague: window.createLeague || function() {},
    joinLeague: window.joinLeague || function() {},
    viewLeague: window.viewLeague || function() {},

    // Leaderboard functions (from leagues/leaderboard.js)
    loadLeaderboard: window.loadLeaderboard || function() {},

    // Pet functions (from pets/pets.js)
    loadAllPets: window.loadAllPets || function() {},
    loadLeagueAvailablePets: window.loadLeagueAvailablePets || function() {},
    goToPetsPage: window.goToPetsPage || function() {},
    goToLeaguePagePreserve: window.goToLeaguePagePreserve || function() {},

    // Drafting functions (from pets/drafting.js)
    draftPet: window.draftPet || function() {},
    undraftPet: window.undraftPet || function() {},

    // Roster functions (from pets/roster.js)
    loadRoster: window.loadRoster || function() {},
    loadLeagueRosters: window.loadLeagueRosters || function() {},

    // Utilities
    showAlert: window.showAlert,
    calculateDaysSince: window.calculateDaysSince,
  };

  console.log('✓ app object initialized with all functions');
  console.log('Available functions:', Object.keys(window.app));
}

// ===== START =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] DOM loaded, initializing modules...');
  loadModules();
});

console.log('✓ app.js loader initialized');