// frontend/js/app.js - Main frontend application logic with debug logging

// ===== Configuration =====

const API_BASE = window.location.origin;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// ===== Utility Functions =====

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if ((response.status === 401 || response.status === 403) && endpoint.includes('/auth')) {
      console.warn('Auth error - clearing session');
      clearAuth();
      window.location.href = '/index.html?error=auth';
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Response:', data);
    return data;
  } catch (error) {
    console.error('[API Error]:', error.message);
    throw error;
  }
}

function showAlert(message, type = 'info') {
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
}

// ===== Authentication =====

async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  const passphrase = form.passphrase?.value || document.getElementById('signup-passphrase').value;
  const firstName = form.firstName?.value;
  const city = form.city?.value;

  if (!passphrase || !firstName) {
    showAlert('Please enter a passphrase and first name', 'warning');
    return;
  }

  try {
    console.log('Signing up with:', { firstName, city });
    
    const response = await apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ passphrase, firstName, city }),
    });

    if (!response || !response.token) {
      showAlert('Signup failed. Please try again.', 'danger');
      return;
    }

    setToken(response.token);
    setUser(response.user);
    
    showAlert(`Welcome ${firstName}! Account created successfully!`, 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message.includes('already exists')) {
      showAlert('That passphrase is already taken. Try a different one.', 'danger');
    } else {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  
  const passphrase = document.getElementById('login-passphrase').value;

  if (!passphrase) {
    showAlert('Please enter your passphrase', 'warning');
    return;
  }

  try {
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase }),
    });

    if (!response || !response.token) {
      showAlert('Login failed. Invalid passphrase.', 'danger');
      return;
    }

    setToken(response.token);
    setUser(response.user);
    
    showAlert(`Welcome back!`, 'success');
    
    if (response.user.is_admin) {
      setTimeout(() => {
        window.location.href = '/admin-dashboard';
      }, 1000);
    } else {
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert(`Login failed: ${error.message}`, 'danger');
  }
}

function handleLogout() {
  clearAuth();
  showAlert('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/index.html', 1500);
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/index.html?login=required';
    return false;
  }
  return true;
}

// ===== Leagues =====

async function loadUserLeagues() {
  try {
    console.log('[LEAGUES] Loading user leagues...');
    const leagues = await apiCall('/api/leagues');
    
    if (!leagues) {
      console.log('[LEAGUES] No response from API');
      return;
    }
    
    console.log('[LEAGUES] Got response:', leagues);
    
    const container = document.getElementById('your-leagues-list');
    if (!container) {
      console.warn('[LEAGUES] Container not found');
      return;
    }

    if (leagues.length === 0) {
      container.innerHTML = '<p>You are not in any leagues yet. Join one or create a new league!</p>';
      return;
    }

    container.innerHTML = leagues.map(league => `
      <div class="league-entry">
        <div class="league-name">${league.name}</div>
        <button class="btn btn-primary btn-small" onclick="app.viewLeague('${league.id}')">View</button>
      </div>
    `).join('');
    
    console.log('[LEAGUES] Rendered', leagues.length, 'leagues');
  } catch (error) {
    console.error('[LEAGUES] Error:', error);
    const container = document.getElementById('your-leagues-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    showAlert('Error loading leagues: ' + error.message, 'danger');
  }
}

async function loadAvailableLeagues() {
  try {
    console.log('[AVAILABLE] Loading available leagues...');
    
    // FIXED: Corrected endpoint path
    const response = await apiCall('/api/leagues/available/list');
    
    console.log('[AVAILABLE] Got response:', response);
    
    if (!response) {
      console.log('[AVAILABLE] No response from API');
      return;
    }
    
    const container = document.getElementById('available-leagues-list');
    if (!container) {
      console.warn('[AVAILABLE] Container not found');
      return;
    }

    // Handle both array response and object response with data property
    const leagues = Array.isArray(response) ? response : response.data || response.leagues || [];

    if (leagues.length === 0) {
      container.innerHTML = '<p>No additional leagues available. Create one to get started!</p>';
      console.log('[AVAILABLE] No leagues to display');
      return;
    }

    container.innerHTML = leagues.map(league => `
      <div class="league-entry">
        <div class="league-name">${league.name}</div>
        <button class="btn btn-success btn-small" onclick="app.joinLeague('${league.id}')">Join</button>
      </div>
    `).join('');
    
    console.log('[AVAILABLE] Rendered', leagues.length, 'available leagues');
  } catch (error) {
    console.error('[AVAILABLE] Error:', error);
    const container = document.getElementById('available-leagues-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    showAlert('Error loading available leagues: ' + error.message, 'danger');
  }
}

async function joinLeague(leagueId) {
  try {
    console.log('[JOIN] Attempting to join league:', leagueId);
    
    const result = await apiCall(`/api/leagues/${leagueId}/join`, {
      method: 'POST',
    });

    if (!result) return;

    console.log('[JOIN] Success');
    showAlert('Successfully joined league!', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('[JOIN] Error:', error);
    showAlert('Error joining league: ' + error.message, 'danger');
  }
}

async function createLeague(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.leagueName.value;

  if (!name.trim()) {
    showAlert('Please enter a league name', 'warning');
    return;
  }

  try {
    console.log('[CREATE] Creating league:', name);
    
    const result = await apiCall('/api/leagues', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!result) return;

    console.log('[CREATE] Success');
    showAlert('League created successfully!', 'success');
    form.reset();
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('[CREATE] Error:', error);
    showAlert('Error creating league: ' + error.message, 'danger');
  }
}

function viewLeague(leagueId) {
  console.log('[VIEW] Viewing league:', leagueId);
  window.location.href = `/league.html?id=${leagueId}`;
}

// ===== Pets =====

function calculateDaysSince(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function loadAllPets() {
  try {
    console.log('[PETS] Loading all pets...');
    
    const pets = await apiCall('/api/pets');
    
    console.log('[PETS] Got response with', pets?.length, 'pets');
    
    if (!pets) return;
    
    const container = document.getElementById('all-pets-list');
    if (!container) {
      console.warn('[PETS] Container not found');
      return;
    }

    if (pets.length === 0) {
      container.innerHTML = '<p>No pets available yet. Check back soon!</p>';
      return;
    }

    container.innerHTML = pets.slice(0, 12).map(pet => {
      const daysInShelter = calculateDaysSince(pet.first_seen);
      return `
        <div class="pet-card">
          <div class="pet-card-header">
            <h3>${pet.name}</h3>
            <div class="pet-card-breed">${pet.breed}</div>
          </div>
          <div class="pet-card-body">
            <div class="pet-info">
              <dt>Type:</dt><dd>${pet.animal_type}</dd><br>
              <dt>Gender:</dt><dd>${pet.gender || 'N/A'}</dd><br>
              <dt>Age:</dt><dd>${pet.age || 'N/A'}</dd><br>
              <dt>Days:</dt><dd>${daysInShelter}</dd>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('[PETS] Rendered', Math.min(pets.length, 12), 'pets');
  } catch (error) {
    console.error('[PETS] Error:', error);
    const container = document.getElementById('all-pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    showAlert('Error loading pets: ' + error.message, 'danger');
  }
}

async function loadLeagueAvailablePets(leagueId) {
  try {
    const allPets = await apiCall('/api/pets');
    const leaguePets = await apiCall(`/api/drafting/league/${leagueId}/pets`);
    
    if (!allPets) return;
    
    const container = document.getElementById('pets-list');
    if (!container) return;

    const draftedPetIds = new Set(leaguePets?.map(p => p.pet_id) || []);
    const availablePets = allPets.filter(p => !draftedPetIds.has(p.pet_id));

    if (availablePets.length === 0) {
      container.innerHTML = '<p>No available pets in this league.</p>';
      return;
    }

    container.innerHTML = availablePets.map(pet => {
      const daysInShelter = calculateDaysSince(pet.first_seen);
      return `
        <div class="pet-card">
          <div class="pet-card-header">
            <h3>${pet.name}</h3>
            <div class="pet-card-breed">${pet.breed}</div>
          </div>
          <div class="pet-card-body">
            <div class="pet-info">
              <dt>Type:</dt><dd>${pet.animal_type}</dd><br>
              <dt>Gender:</dt><dd>${pet.gender || 'N/A'}</dd><br>
              <dt>Age:</dt><dd>${pet.age || 'N/A'}</dd><br>
              <dt>Days:</dt><dd>${daysInShelter}</dd>
            </div>
            <button class="btn btn-primary btn-block" onclick="app.draftPet('${pet.pet_id}', '${leagueId}')">Draft</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('[LEAGUE_PETS] Error:', error);
    showAlert('Error loading pets: ' + error.message, 'danger');
  }
}

async function draftPet(petId, leagueId) {
  if (!leagueId) {
    showAlert('Please select a league first', 'warning');
    return;
  }

  try {
    console.log('[DRAFT] Drafting pet', petId, 'to league', leagueId);
    
    const result = await apiCall('/api/drafting', {
      method: 'POST',
      body: JSON.stringify({ leagueId, petId }),
    });

    if (!result) return;

    console.log('[DRAFT] Success');
    showAlert('Pet drafted successfully!', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error('[DRAFT] Error:', error);
    showAlert('Error drafting pet: ' + error.message, 'danger');
  }
}

async function loadLeagueRosters(leagueId) {
  try {
    console.log('[ROSTERS] Loading rosters for league:', leagueId);
    
    const rosters = await apiCall(`/api/drafting/league/${leagueId}/rosters`);
    
    if (!rosters) return;
    
    const container = document.getElementById('rosters-list');
    if (!container) return;

    if (rosters.length === 0 || !rosters[0].pets) {
      container.innerHTML = '<p>No rosters yet.</p>';
      return;
    }

    let html = '<table class="table"><thead><tr><th>Name</th><th>Pets</th><th>Points</th></tr></thead><tbody>';
    
    rosters.forEach(roster => {
      const petCount = (roster.pets && roster.pets.length) || 0;
      html += `
        <tr>
          <td>${roster.first_name || 'Anonymous'}</td>
          <td>${petCount}</td>
          <td>-</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    
    console.log('[ROSTERS] Rendered', rosters.length, 'rosters');
  } catch (error) {
    console.error('[ROSTERS] Error:', error);
    showAlert('Error loading rosters: ' + error.message, 'danger');
  }
}

// ===== Leaderboard =====

async function loadLeaderboard(leagueId) {
  try {
    console.log('[LEADERBOARD] Loading for league:', leagueId);
    
    const leaderboard = await apiCall(`/api/leaderboard/${leagueId}`);
    
    if (!leaderboard) return;
    
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (leaderboard.length === 0) {
      container.innerHTML = '<p>No players in this league yet.</p>';
      return;
    }

    container.innerHTML = leaderboard.map((entry, idx) => {
      let medal = '';
      if (idx === 0) medal = '🥇';
      else if (idx === 1) medal = '🥈';
      else if (idx === 2) medal = '🥉';

      return `
        <div class="leaderboard-entry">
          <div class="leaderboard-rank">#${entry.rank} ${medal}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${entry.first_name || 'Anonymous'}</div>
            <div class="leaderboard-city">${entry.city || 'Location unknown'}</div>
          </div>
          <div class="leaderboard-points">${entry.total_points} pts</div>
        </div>
      `;
    }).join('');
    
    console.log('[LEADERBOARD] Rendered', leaderboard.length, 'entries');
  } catch (error) {
    console.error('[LEADERBOARD] Error:', error);
    showAlert('Error loading leaderboard: ' + error.message, 'danger');
  }
}

// ===== Roster =====

async function loadRoster(leagueId) {
  try {
    console.log('[ROSTER] Loading for league:', leagueId);
    
    const roster = await apiCall(`/api/drafting/${leagueId}`);
    
    if (!roster) return;
    
    const container = document.getElementById('roster-list');
    if (!container) return;

    if (roster.length === 0) {
      container.innerHTML = '<p>No pets drafted yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Pet Name</th>
            <th>Breed</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${roster.map(pet => `
            <tr>
              <td>${pet.name}</td>
              <td>${pet.breed}</td>
              <td>${pet.animal_type}</td>
              <td><span class="badge ${pet.status === 'available' ? 'badge-success' : 'badge-danger'}">${pet.status}</span></td>
              <td>
                <button class="btn btn-danger btn-small" onclick="app.undraftPet('${pet.pet_id}', '${leagueId}')">Remove</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    console.log('[ROSTER] Rendered', roster.length, 'pets');
  } catch (error) {
    console.error('[ROSTER] Error:', error);
    showAlert('Error loading roster: ' + error.message, 'danger');
  }
}

async function undraftPet(petId, leagueId) {
  if (!confirm('Remove this pet from your roster?')) return;

  try {
    console.log('[UNDRAFT] Removing pet:', petId);
    
    const result = await apiCall(`/api/drafting/${petId}/${leagueId}`, {
      method: 'DELETE',
    });

    if (!result) return;

    console.log('[UNDRAFT] Success');
    showAlert('Pet removed from roster', 'success');
    loadRoster(leagueId);
  } catch (error) {
    console.error('[UNDRAFT] Error:', error);
    showAlert('Error removing pet: ' + error.message, 'danger');
  }
}

// ===== Export for use in HTML =====
window.app = {
  handleSignup,
  handleLogin,
  handleLogout,
  checkAuth,
  
  loadUserLeagues,
  loadAvailableLeagues,
  createLeague,
  joinLeague,
  viewLeague,
  
  loadAllPets,
  loadLeagueAvailablePets,
  draftPet,
  
  loadLeagueRosters,
  
  loadLeaderboard,
  loadRoster,
  undraftPet,
  
  showAlert,
};

console.log('✓ app.js loaded and ready');