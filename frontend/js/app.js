// frontend/js/app.js - Main frontend application logic with pagination and enhancements

// ===== Configuration =====

const API_BASE = window.location.origin;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const PETS_PER_PAGE = 12;

// Pagination state
let petsCurrentPage = 1;
let allPetsData = [];

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

function calculateDaysSince(date) {
  if (!date) return 0;
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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
    showAlert(`Error: ${error.message}`, 'danger');
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

    // Get member count for each league
    const leaguesWithCounts = await Promise.all(
      leagues.map(async (league) => {
        try {
          const members = await apiCall(`/api/leagues/${league.id}/members`);
          return { ...league, memberCount: members ? members.length : 0 };
        } catch (e) {
          console.warn('[LEAGUES] Could not load member count for', league.id);
          return { ...league, memberCount: 0 };
        }
      })
    );

    container.innerHTML = leaguesWithCounts.map(league => `
      <div class="league-entry">
        <div class="league-info">
          <div class="league-name">${league.name}</div>
          <div class="league-meta">👥 ${league.memberCount} player${league.memberCount !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-primary btn-small" onclick="app.viewLeague('${league.id}')">View</button>
      </div>
    `).join('');
    
    console.log('[LEAGUES] Rendered', leagues.length, 'leagues with member counts');
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

    const leagues = Array.isArray(response) ? response : response.data || response.leagues || [];

    if (leagues.length === 0) {
      container.innerHTML = '<p>No additional leagues available. Create one to get started!</p>';
      console.log('[AVAILABLE] No leagues to display');
      return;
    }

    // Get member count for each league
    const leaguesWithCounts = await Promise.all(
      leagues.map(async (league) => {
        try {
          const members = await apiCall(`/api/leagues/${league.id}/members`);
          return { ...league, memberCount: members ? members.length : 0 };
        } catch (e) {
          console.warn('[AVAILABLE] Could not load member count for', league.id);
          return { ...league, memberCount: 0 };
        }
      })
    );

    container.innerHTML = leaguesWithCounts.map(league => `
      <div class="league-entry">
        <div class="league-info">
          <div class="league-name">${league.name}</div>
          <div class="league-meta">👥 ${league.memberCount} player${league.memberCount !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-success btn-small" onclick="app.joinLeague('${league.id}')">Join</button>
      </div>
    `).join('');
    
    console.log('[AVAILABLE] Rendered', leagues.length, 'available leagues with member counts');
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

function renderPetCard(pet) {
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
          <dt>In Shelter:</dt><dd>${daysInShelter} days</dd>
        </div>
      </div>
    </div>
  `;
}

function renderPetsPagination() {
  const totalPages = Math.ceil(allPetsData.length / PETS_PER_PAGE);
  
  if (totalPages <= 1) return '';
  
  let html = '<div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">';
  
  // Previous button
  if (petsCurrentPage > 1) {
    html += `<button class="btn btn-secondary btn-small" onclick="app.goToPetsPage(${petsCurrentPage - 1})">← Previous</button>`;
  }
  
  // Page numbers
  const startPage = Math.max(1, petsCurrentPage - 2);
  const endPage = Math.min(totalPages, petsCurrentPage + 2);
  
  if (startPage > 1) {
    html += `<button class="btn ${petsCurrentPage === 1 ? 'btn-primary' : 'btn-outline'} btn-small" onclick="app.goToPetsPage(1)">1</button>`;
    if (startPage > 2) html += '<span style="padding: 8px;">...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="btn ${petsCurrentPage === i ? 'btn-primary' : 'btn-outline'} btn-small" onclick="app.goToPetsPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span style="padding: 8px;">...</span>';
    html += `<button class="btn ${petsCurrentPage === totalPages ? 'btn-primary' : 'btn-outline'} btn-small" onclick="app.goToPetsPage(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  if (petsCurrentPage < totalPages) {
    html += `<button class="btn btn-secondary btn-small" onclick="app.goToPetsPage(${petsCurrentPage + 1})">Next →</button>`;
  }
  
  html += `<span style="padding: 8px; font-size: 14px;">Page ${petsCurrentPage} of ${totalPages}</span>`;
  html += '</div>';
  
  return html;
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

    allPetsData = pets;
    petsCurrentPage = 1;
    
    const start = (petsCurrentPage - 1) * PETS_PER_PAGE;
    const end = start + PETS_PER_PAGE;
    const petsToDisplay = pets.slice(start, end);
    
    const petsHtml = petsToDisplay.map(pet => renderPetCard(pet)).join('');
    const pagination = renderPetsPagination();
    
    container.innerHTML = `
      <div class="grid grid-3">${petsHtml}</div>
      ${pagination}
    `;
    
    console.log('[PETS] Rendered page', petsCurrentPage, 'with', petsToDisplay.length, 'pets (total:', pets.length, ')');
  } catch (error) {
    console.error('[PETS] Error:', error);
    const container = document.getElementById('all-pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
    showAlert('Error loading pets: ' + error.message, 'danger');
  }
}

function goToPetsPage(pageNum) {
  const totalPages = Math.ceil(allPetsData.length / PETS_PER_PAGE);
  
  if (pageNum < 1 || pageNum > totalPages) return;
  
  petsCurrentPage = pageNum;
  
  const container = document.getElementById('all-pets-list');
  if (!container) return;
  
  const start = (petsCurrentPage - 1) * PETS_PER_PAGE;
  const end = start + PETS_PER_PAGE;
  const petsToDisplay = allPetsData.slice(start, end);
  
  const petsHtml = petsToDisplay.map(pet => renderPetCard(pet)).join('');
  const pagination = renderPetsPagination();
  
  container.innerHTML = `
    <div class="grid grid-3">${petsHtml}</div>
    ${pagination}
  `;
  
  document.querySelector('.card:has(#all-pets-list)')?.scrollIntoView({ behavior: 'smooth' });
  console.log('[PETS] Navigated to page', petsCurrentPage);
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
      container.innerHTML = '<p>No available pets to draft. All pets in this league have been drafted!</p>';
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
            <div class="pet-card-stats">
              <span class="pet-stat"><strong>Type:</strong> ${pet.animal_type}</span>
              <span class="pet-stat"><strong>Gender:</strong> ${pet.gender || 'N/A'}</span>
              <span class="pet-stat"><strong>Age:</strong> ${pet.age || 'N/A'}</span>
              <span class="pet-stat"><strong>In Shelter:</strong> ${daysInShelter}d</span>
            </div>
            <button class="btn btn-primary btn-block" style="margin-top: 12px;" onclick="app.draftPet('${pet.pet_id}', '${leagueId}')">Draft Pet</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('[LEAGUE_PETS] Error:', error);
    const container = document.getElementById('pets-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
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
    
    if (!rosters) {
      console.log('[ROSTERS] No rosters data');
      return;
    }
    
    const container = document.getElementById('rosters-list');
    if (!container) return;

    if (rosters.length === 0) {
      container.innerHTML = '<p>No rosters yet.</p>';
      return;
    }

    // Build roster display with player names and their pets
    const rosterHtml = rosters.map(roster => {
      const playerName = roster.first_name || 'Anonymous';
      const pets = roster.pets || [];

      if (pets.length === 0) {
        return `
          <div class="roster-player">
            <div class="roster-player-name">${playerName}</div>
            <p style="font-size: 13px; color: #7f8c8d; margin: 0;">No pets drafted yet</p>
          </div>
        `;
      }

      const petsHtml = pets.map(pet => {
        const daysOnRoster = calculateDaysSince(pet.drafted_date);
        const daysInShelter = calculateDaysSince(pet.first_seen || pet.brought_to_shelter);
        
        return `
          <div class="roster-pet">
            <div class="roster-pet-name">${pet.name}</div>
            <div class="roster-pet-stats">
              <span class="roster-pet-stat"><strong>Type:</strong> ${pet.animal_type || 'N/A'}</span>
              <span class="roster-pet-stat"><strong>Breed:</strong> ${pet.breed || 'N/A'}</span>
              <span class="roster-pet-stat"><strong>Gender:</strong> ${pet.gender || 'N/A'}</span>
              <span class="roster-pet-stat"><strong>On Roster:</strong> ${daysOnRoster}d</span>
              <span class="roster-pet-stat"><strong>In Shelter:</strong> ${daysInShelter}d</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="roster-player">
          <div class="roster-player-name">${playerName}</div>
          ${petsHtml}
        </div>
      `;
    }).join('');

    container.innerHTML = rosterHtml;
    console.log('[ROSTERS] Rendered', rosters.length, 'rosters with pets');
  } catch (error) {
    console.error('[ROSTERS] Error:', error);
    const container = document.getElementById('rosters-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
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
    const container = document.getElementById('leaderboard-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
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
    const container = document.getElementById('roster-list');
    if (container) {
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
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
  goToPetsPage,
  
  loadLeagueRosters,
  
  loadLeaderboard,
  loadRoster,
  undraftPet,
  
  showAlert,
};

console.log('✓ app.js loaded and ready');