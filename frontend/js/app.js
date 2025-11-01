// frontend/js/app.js - Main frontend application logic

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
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAuth();
        window.location.href = '/index.html';
        return null;
      }
      
      try {
        const error = await response.json();
        throw new Error(error.error || `API Error: ${response.status}`);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
    }

    return response.json();
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  setTimeout(() => alertDiv.remove(), 5000);
}

// ===== Authentication =====

async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  const passphrase = form.passphrase.value;
  const firstName = form.firstName.value;
  const city = form.city.value;

  try {
    const response = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ passphrase, firstName, city }),
    });

    if (!response) return;

    setToken(response.token);
    setUser(response.user);
    showAlert('Account created successfully!', 'success');
    setTimeout(() => window.location.href = '/dashboard.html', 1500);
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const passphrase = form.passphrase.value;

  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase }),
    });

    if (!response) return;

    setToken(response.token);
    setUser(response.user);
    showAlert('Logged in successfully!', 'success');
    setTimeout(() => window.location.href = '/dashboard.html', 1500);
  } catch (error) {
    showAlert(error.message, 'danger');
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
    // Redirect to login with message
    window.location.href = '/index.html?login=required';
    return false;
  }
  return true;
}

// ===== Leagues =====

async function loadLeagues() {
  try {
    const leagues = await apiCall('/leagues');
    
    if (!leagues) return; // User was redirected
    
    const container = document.getElementById('leagues-list');
    
    if (leagues.length === 0) {
      container.innerHTML = '<p>No leagues yet. Create one to get started!</p>';
      return;
    }

    container.innerHTML = leagues.map(league => `
      <div class="card">
        <div class="card-header">
          <h3>${league.name}</h3>
          <button class="btn btn-primary btn-small" onclick="viewLeague('${league.id}')">View</button>
        </div>
        <div class="card-body">
          <p>Created: ${new Date(league.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading leagues:', error);
    showAlert('Error loading leagues: ' + error.message, 'danger');
  }
}

async function createLeague(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.leagueName.value;

  try {
    const result = await apiCall('/leagues', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!result) return;

    showAlert('League created successfully!', 'success');
    form.reset();
    loadLeagues();
  } catch (error) {
    showAlert('Error creating league: ' + error.message, 'danger');
  }
}

async function viewLeague(leagueId) {
  window.location.href = `/league.html?id=${leagueId}`;
}

// ===== Pets =====

async function loadAvailablePets(filters = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const url = params.toString() ? `/pets?${params}` : '/pets';
    const pets = await apiCall(url);
    
    if (!pets) return;
    
    const container = document.getElementById('pets-list');

    if (pets.length === 0) {
      container.innerHTML = '<p>No pets available.</p>';
      return;
    }

    container.innerHTML = pets.map(pet => `
      <div class="pet-card">
        <div class="pet-card-header">
          <h3>${pet.name}</h3>
          <div class="pet-card-breed">${pet.breed}</div>
        </div>
        <div class="pet-card-body">
          <dl class="pet-info">
            <dt>Type:</dt><dd>${pet.animal_type}</dd>
            <dt>Gender:</dt><dd>${pet.gender || 'N/A'}</dd>
            <dt>Age:</dt><dd>${pet.age || 'N/A'}</dd>
            <dt>Source:</dt><dd><span class="badge">${pet.source}</span></dd>
          </dl>
          <button class="btn btn-primary btn-block" onclick="draftPet('${pet.pet_id}')">Draft</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading pets:', error);
    showAlert('Error loading pets: ' + error.message, 'danger');
  }
}

async function draftPet(petId) {
  const leagueId = new URLSearchParams(window.location.search).get('league');
  if (!leagueId) {
    showAlert('Please select a league first', 'warning');
    return;
  }

  try {
    const result = await apiCall('/draft', {
      method: 'POST',
      body: JSON.stringify({ leagueId, petId }),
    });

    if (!result) return;

    showAlert('Pet drafted successfully!', 'success');
    loadAvailablePets();
  } catch (error) {
    showAlert('Error drafting pet: ' + error.message, 'danger');
  }
}

// ===== Roster =====

async function loadMyRoster(leagueId) {
  try {
    const roster = await apiCall(`/myroster/${leagueId}`);
    
    if (!roster) return;
    
    const container = document.getElementById('roster-list');

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
                <button class="btn btn-danger btn-small" onclick="undraftPet('${pet.pet_id}', '${leagueId}')">Remove</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading roster:', error);
    showAlert('Error loading roster: ' + error.message, 'danger');
  }
}

async function undraftPet(petId, leagueId) {
  if (!confirm('Remove this pet from your roster?')) return;

  try {
    const result = await apiCall(`/draft/${petId}/${leagueId}`, {
      method: 'DELETE',
    });

    if (!result) return;

    showAlert('Pet removed from roster', 'success');
    loadMyRoster(leagueId);
  } catch (error) {
    showAlert('Error removing pet: ' + error.message, 'danger');
  }
}

// ===== Leaderboard =====

async function loadLeaderboard(leagueId) {
  try {
    const leaderboard = await apiCall(`/leaderboard/${leagueId}`);
    
    if (!leaderboard) return;
    
    const container = document.getElementById('leaderboard-list');

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
          <div class="leaderboard-rank ${idx === 0 ? 'first' : idx === 1 ? 'second' : idx === 2 ? 'third' : ''}">#${entry.rank} ${medal}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${entry.first_name || 'Anonymous'}</div>
            <div class="leaderboard-city">${entry.city || 'Location unknown'}</div>
          </div>
          <div class="leaderboard-points">${entry.total_points} pts</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    showAlert('Error loading leaderboard: ' + error.message, 'danger');
  }
}

// ===== Page Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  // Check for login/logout messages
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('login') === 'required') {
    showAlert('Please log in to continue', 'warning');
  }

  // Initialize page-specific functionality
  const page = document.body.getAttribute('data-page');
  
  switch (page) {
    case 'dashboard':
      if (checkAuth()) {
        loadLeagues();
      }
      break;
    case 'league':
      if (checkAuth()) {
        const leagueId = new URLSearchParams(window.location.search).get('id');
        if (leagueId) {
          loadMyRoster(leagueId);
          loadLeaderboard(leagueId);
        }
      }
      break;
  }
});

// ===== Export for use in HTML =====
window.app = {
  handleSignup,
  handleLogin,
  handleLogout,
  loadLeagues,
  createLeague,
  loadAvailablePets,
  draftPet,
  loadMyRoster,
  undraftPet,
  loadLeaderboard,
  showAlert,
  checkAuth,
};