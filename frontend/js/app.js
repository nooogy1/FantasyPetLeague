// frontend/js/app.js - FIXED Main frontend application logic

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
    console.log(`API Call: ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Check for auth errors
    if (response.status === 401 || response.status === 403) {
      console.warn('Auth error, clearing localStorage');
      clearAuth();
      window.location.href = '/index.html?error=auth';
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function showAlert(message, type = 'info') {
  console.log(`Alert [${type}]: ${message}`);
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto-dismiss after 5 seconds
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
    
    // Redirect to dashboard after short delay
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message.includes('already exists')) {
      showAlert('That name is already taken. Try a different one.', 'danger');
    } else {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  
  // Get passphrase from hidden input
  const passphrase = document.getElementById('login-passphrase').value;
  
  // Get first name
  const firstNameInput = document.getElementById('login-first-name');
  const firstName = firstNameInput?.value;

  if (!passphrase || !firstName) {
    showAlert('Please enter your name and select your passphrase', 'warning');
    return;
  }

  try {
    console.log('Logging in with:', { firstName });
    
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase, firstName }),
    });

    if (!response || !response.token) {
      showAlert('Login failed. Please check your name and passphrase.', 'danger');
      return;
    }

    setToken(response.token);
    setUser(response.user);
    
    showAlert(`Welcome back, ${firstName}!`, 'success');
    
    // Check if user is admin
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

async function loadLeagues() {
  try {
    console.log('Loading leagues...');
    const leagues = await apiCall('/api/leagues');
    
    if (!leagues) {
      console.warn('No leagues response');
      return;
    }
    
    const container = document.getElementById('leagues-list');
    if (!container) {
      console.warn('No leagues-list container');
      return;
    }
    
    if (leagues.length === 0) {
      container.innerHTML = '<p>No leagues yet. Create one to get started!</p>';
      return;
    }

    container.innerHTML = leagues.map(league => `
      <div class="card">
        <div class="card-header">
          <h3>${league.name}</h3>
          <button class="btn btn-primary btn-small" onclick="app.viewLeague('${league.id}')">View</button>
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

  if (!name.trim()) {
    showAlert('Please enter a league name', 'warning');
    return;
  }

  try {
    console.log('Creating league:', name);
    
    const result = await apiCall('/api/leagues', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (!result) return;

    showAlert('League created successfully!', 'success');
    form.reset();
    loadLeagues();
  } catch (error) {
    console.error('Error creating league:', error);
    showAlert('Error creating league: ' + error.message, 'danger');
  }
}

function viewLeague(leagueId) {
  console.log('Viewing league:', leagueId);
  window.location.href = `/league.html?id=${leagueId}`;
}

// ===== Pets =====

async function loadAvailablePets(filters = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const url = params.toString() ? `/api/pets?${params}` : '/api/pets';
    const pets = await apiCall(url);
    
    if (!pets) return;
    
    const container = document.getElementById('pets-list');
    if (!container) return;

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
          <button class="btn btn-primary btn-block" onclick="app.draftPet('${pet.pet_id}')">Draft</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading pets:', error);
    showAlert('Error loading pets: ' + error.message, 'danger');
  }
}

async function draftPet(petId) {
  const leagueId = new URLSearchParams(window.location.search).get('id');
  if (!leagueId) {
    showAlert('Please select a league first', 'warning');
    return;
  }

  try {
    console.log('Drafting pet:', petId, 'to league:', leagueId);
    
    const result = await apiCall('/api/drafting', {
      method: 'POST',
      body: JSON.stringify({ leagueId, petId }),
    });

    if (!result) return;

    showAlert('Pet drafted successfully!', 'success');
    loadAvailablePets();
  } catch (error) {
    console.error('Error drafting pet:', error);
    showAlert('Error drafting pet: ' + error.message, 'danger');
  }
}

// ===== Roster =====

async function loadRoster(leagueId) {
  try {
    console.log('Loading roster for league:', leagueId);
    
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
  } catch (error) {
    console.error('Error loading roster:', error);
    showAlert('Error loading roster: ' + error.message, 'danger');
  }
}

async function undraftPet(petId, leagueId) {
  if (!confirm('Remove this pet from your roster?')) return;

  try {
    console.log('Undrafting pet:', petId, 'from league:', leagueId);
    
    const result = await apiCall(`/api/drafting/${petId}/${leagueId}`, {
      method: 'DELETE',
    });

    if (!result) return;

    showAlert('Pet removed from roster', 'success');
    loadRoster(leagueId);
  } catch (error) {
    console.error('Error removing pet:', error);
    showAlert('Error removing pet: ' + error.message, 'danger');
  }
}

// ===== Leaderboard =====

async function loadLeaderboard(leagueId) {
  try {
    console.log('Loading leaderboard for league:', leagueId);
    
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

// ===== Scraper =====

async function triggerScrape() {
  const btn = document.getElementById('scrape-btn');
  const status = document.getElementById('scrape-status');
  
  if (!btn) {
    console.warn('Scrape button not found');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '🔄 Scraping...';
  if (status) status.textContent = 'Scraping pets from Houston shelters...';

  try {
    console.log('Triggering scrape...');
    
    // Try different possible endpoints
    let result;
    try {
      result = await apiCall('/api/admin/scrape', { method: 'POST' });
    } catch (e1) {
      console.log('First endpoint failed, trying second...');
      try {
        result = await apiCall('/admin/scrape', { method: 'POST' });
      } catch (e2) {
        console.log('Second endpoint failed, trying third...');
        result = await apiCall('/scrape', { method: 'POST' });
      }
    }

    if (!result) {
      showAlert('Scrape not available (admin only or not configured)', 'warning');
      if (status) status.textContent = 'Scrape feature not available';
      return;
    }

    if (status) {
      status.innerHTML = `
        ✅ <strong>Scrape Complete!</strong><br>
        Found: ${result.pets_found} pets | New: ${result.new_pets} | Duration: ${result.duration}
      `;
      status.style.color = '#27ae60';
    }

    showAlert(`Successfully scraped ${result.new_pets} new pets!`, 'success');
    
    // Reload leagues after scrape
    setTimeout(() => loadLeagues(), 2000);
  } catch (error) {
    console.log('Scrape error (this is normal if not admin):', error.message);
    if (status) {
      status.textContent = `Scrape unavailable: ${error.message}`;
      status.style.color = '#e74c3c';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Refresh Pet Database';
  }
}

// ===== Page Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  
  // Check for error messages
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('login') === 'required') {
    showAlert('Please log in to continue', 'warning');
  }
  
  if (params.get('error') === 'auth') {
    showAlert('Your session expired. Please log in again.', 'warning');
  }

  // Initialize page-specific functionality
  const page = document.body.getAttribute('data-page');
  console.log('Page type:', page);
  
  switch (page) {
    case 'dashboard':
      if (checkAuth()) {
        const user = getUser();
        if (user) {
          const userNameEl = document.getElementById('user-name');
          if (userNameEl) {
            userNameEl.textContent = user.first_name || 'Player';
          }
        }
        loadLeagues();
      }
      break;
      
    case 'league':
      if (checkAuth()) {
        const leagueId = new URLSearchParams(window.location.search).get('id');
        if (leagueId) {
          console.log('Loading league view for:', leagueId);
          loadRoster(leagueId);
          loadLeaderboard(leagueId);
          loadAvailablePets();
        }
      }
      break;
  }
});

// ===== Export for use in HTML =====
// Make sure ALL functions are exported to window.app
window.app = {
  // Auth functions
  handleSignup,
  handleLogin,
  handleLogout,
  checkAuth,
  
  // League functions
  loadLeagues,
  createLeague,
  viewLeague,
  
  // Pet functions
  loadAvailablePets,
  draftPet,
  
  // Roster functions
  loadRoster,
  undraftPet,
  
  // Leaderboard functions
  loadLeaderboard,
  
  // Scraper functions
  triggerScrape,
  
  // Utility functions
  showAlert,
};

console.log('✓ app.js loaded and ready');
console.log('Available functions:', Object.keys(window.app));