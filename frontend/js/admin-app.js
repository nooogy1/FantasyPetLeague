// frontend/js/admin-app.js - Admin app with breeds, users, and leagues management

// ===== Configuration =====
const API_BASE = window.location.origin;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// ===== Debug System =====
const debugLogs = [];
const MAX_DEBUG_LOGS = 60;

function logDebug(type, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = { type, message, data, timestamp };
  debugLogs.push(logEntry);
  
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }

  console.log(`[${type.toUpperCase()}] ${message}`, data || '');
  updateDebugUI();
}

function updateDebugUI() {
  const debugLog = document.getElementById('debug-log');
  if (!debugLog) return;
  
  debugLog.innerHTML = debugLogs.map(entry => {
    let emoji = '📝';
    if (entry.type === 'error') emoji = '❌';
    else if (entry.type === 'success') emoji = '✅';
    else if (entry.type === 'warning') emoji = '⚠️';

    let dataStr = '';
    if (entry.data) {
      const dataJson = typeof entry.data === 'string' 
        ? entry.data 
        : JSON.stringify(entry.data);
      dataStr = `<br><small>→ ${dataJson.slice(0, 120)}${dataJson.length > 120 ? '...' : ''}</small>`;
    }

    return `<div style="margin-bottom: 3px; padding: 2px 4px; border-radius: 2px; background: ${
      entry.type === 'error' ? '#fed7d7' : entry.type === 'success' ? '#c6f6d5' : entry.type === 'warning' ? '#feebc8' : '#d6eaf8'
    }; color: ${
      entry.type === 'error' ? '#742a2a' : entry.type === 'success' ? '#22543d' : entry.type === 'warning' ? '#7c2d12' : '#1e3a8a'
    };">
      ${emoji} [${entry.timestamp}] ${entry.message}${dataStr}
    </div>`;
  }).join('');

  debugLog.scrollTop = debugLog.scrollHeight;
}

// ===== State =====
let allUsers = [];
let allLeagues = [];
let deleteTarget = null;

// ===== Utility Functions =====

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
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
    logDebug('info', `API: ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    logDebug('success', `API response received`);
    return data;
  } catch (error) {
    logDebug('error', `API failed: ${error.message}`);
    throw error;
  }
}

function showAlert(message, type = 'info') {
  logDebug(type, message);
  
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

// ===== Tab Management =====

document.addEventListener('DOMContentLoaded', () => {
  logDebug('info', '⚙️ Admin dashboard initializing...');
  
  // Check admin access
  const user = getUser();
  if (!user?.is_admin) {
    logDebug('error', 'User is not admin, redirecting to dashboard');
    window.location.href = '/dashboard.html';
    return;
  }

  logDebug('success', `Admin verified: ${user.first_name}`);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      logDebug('info', `Switching to tab: ${tabName}`);
      switchTab(tabName);
    });
  });

  // Initial load
  logDebug('info', 'Loading dashboard data...');
  loadStats();
  loadBreeds();
  loadMissingBreeds();
  loadScraperLogs();
  loadUsers();
  loadLeagues();
});

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabElement = document.getElementById(`${tabName}-tab`);
  if (tabElement) {
    tabElement.classList.add('active');
  }

  // Mark button as active
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ===== Statistics =====

async function loadStats() {
  try {
    logDebug('info', 'Fetching stats...');
    const stats = await apiCall('/api/admin/stats');
    
    const container = document.getElementById('stats-container');
    container.innerHTML = `
      <div class="stat-card">
        <h3>${stats.total_pets || 0}</h3>
        <p>Total Pets</p>
      </div>
      <div class="stat-card">
        <h3>${stats.total_leagues || 0}</h3>
        <p>Total Leagues</p>
      </div>
      <div class="stat-card">
        <h3>${stats.total_users || 0}</h3>
        <p>Total Users</p>
      </div>
    `;
    logDebug('success', `Stats loaded: ${stats.total_users} users, ${stats.total_leagues} leagues, ${stats.total_pets} pets`);
  } catch (error) {
    logDebug('warning', `Error loading stats: ${error.message}`);
  }
}

// ===== Breeds =====

async function loadBreeds() {
  try {
    logDebug('info', 'Fetching breeds...');
    const breeds = await apiCall('/api/admin/breed-points');
    
    const container = document.getElementById('breeds-table');
    if (breeds.length === 0) {
      container.innerHTML = '<p>No breeds configured.</p>';
      return;
    }

    container.innerHTML = breeds.map(breed => `
      <div class="breed-row">
        <div class="breed-info">
          <div class="breed-name">${breed.breed}</div>
          <div class="breed-count">${breed.points} points</div>
        </div>
        <div class="breed-actions">
          <button class="btn btn-primary btn-small" onclick="admin.editBreed(${breed.id}, '${breed.breed}', ${breed.points})">Edit</button>
          <button class="btn btn-danger btn-small" onclick="admin.deleteBreed(${breed.id}, '${breed.breed}')">Delete</button>
        </div>
      </div>
    `).join('');
    logDebug('success', `Loaded ${breeds.length} breeds`);
  } catch (error) {
    logDebug('error', `Error loading breeds: ${error.message}`);
  }
}

// Breed CRUD operations (from original admin-app.js)
const admin = {
  handleLogout() {
    logDebug('info', 'Logging out...');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showAlert('Logged out successfully', 'success');
    setTimeout(() => window.location.href = '/index.html', 1500);
  },

  showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    logDebug('info', `Modal opened: ${modalId}`);
  },

  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    logDebug('info', `Modal closed: ${modalId}`);
  },

  async handleCreateBreed(event) {
    event.preventDefault();
    const breedName = document.getElementById('breedName').value;
    const breedPoints = document.getElementById('breedPoints').value;

    try {
      logDebug('info', `Creating breed: ${breedName} (${breedPoints} points)`);
      await apiCall('/api/admin/breed-points', {
        method: 'POST',
        body: JSON.stringify({ breed: breedName, points: breedPoints })
      });

      showAlert('Breed created successfully!', 'success');
      admin.closeModal('create-breed-modal');
      document.getElementById('breedName').value = '';
      document.getElementById('breedPoints').value = '';
      loadBreeds();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  },

  editBreed(id, breed, points) {
    logDebug('info', `Editing breed: ${breed}`);
    document.getElementById('breedId').value = id;
    document.getElementById('editBreedName').value = breed;
    document.getElementById('editBreedPoints').value = points;
    admin.showModal('edit-breed-modal');
  },

  async handleUpdateBreed(event) {
    event.preventDefault();
    const breedId = document.getElementById('breedId').value;
    const breedPoints = document.getElementById('editBreedPoints').value;

    try {
      logDebug('info', `Updating breed ${breedId}: ${breedPoints} points`);
      await apiCall(`/api/admin/breed-points/${breedId}`, {
        method: 'PUT',
        body: JSON.stringify({ points: breedPoints })
      });

      showAlert('Breed updated successfully!', 'success');
      admin.closeModal('edit-breed-modal');
      loadBreeds();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  },

  async deleteBreed(id, breed) {
    logDebug('warning', `Delete breed requested: ${breed} (${id})`);
    if (!confirm(`Delete breed "${breed}"?`)) {
      logDebug('info', 'Delete breed cancelled');
      return;
    }

    try {
      logDebug('info', `Deleting breed: ${breed}`);
      await apiCall(`/api/admin/breed-points/${id}`, { method: 'DELETE' });
      showAlert('Breed deleted successfully!', 'success');
      loadBreeds();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  },

  // ===== Users =====

  filterUsers(query) {
    logDebug('info', `Filtering users: "${query}"`);
    const filtered = allUsers.filter(u => 
      u.first_name.toLowerCase().includes(query.toLowerCase()) ||
      (u.city && u.city.toLowerCase().includes(query.toLowerCase()))
    );
    renderUsers(filtered);
  },

  deleteUser(userId, userName) {
    logDebug('info', `Delete user requested: ${userName} (${userId})`);
    deleteTarget = { type: 'user', id: userId, name: userName };
    document.getElementById('modal-message').innerHTML = `
      <strong>Delete User: ${userName}</strong><br><br>
      This will delete:<br>
      • User account<br>
      • All drafted pets<br>
      • All league memberships<br><br>
      This action cannot be undone.
    `;
    document.getElementById('delete-modal').style.display = 'block';
    logDebug('info', 'Delete modal opened for user');
  },

  // ===== Leagues =====

  filterLeagues(query) {
    logDebug('info', `Filtering leagues: "${query}"`);
    const filtered = allLeagues.filter(l => 
      l.name.toLowerCase().includes(query.toLowerCase())
    );
    renderLeagues(filtered);
  },

  deleteLeague(leagueId, leagueName) {
    logDebug('info', `Delete league requested: ${leagueName} (${leagueId})`);
    deleteTarget = { type: 'league', id: leagueId, name: leagueName };
    document.getElementById('modal-message').innerHTML = `
      <strong>Delete League: ${leagueName}</strong><br><br>
      This will delete:<br>
      • League<br>
      • All rosters<br>
      • All drafted pets in this league<br><br>
      This action cannot be undone.
    `;
    document.getElementById('delete-modal').style.display = 'block';
    logDebug('info', 'Delete modal opened for league');
  },

  // ===== Modal =====

  closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deleteTarget = null;
    logDebug('info', 'Delete modal closed');
  },

  async confirmDelete() {
    if (!deleteTarget) {
      logDebug('warning', 'No delete target set');
      return;
    }

    try {
      if (deleteTarget.type === 'user') {
        logDebug('info', `Confirming user delete: ${deleteTarget.name}`);
        await apiCall(`/api/admin/users/${deleteTarget.id}`, {
          method: 'DELETE'
        });
        logDebug('success', `User deleted: ${deleteTarget.name}`);
        showAlert(`User "${deleteTarget.name}" deleted successfully`, 'success');
        admin.closeDeleteModal();
        loadUsers();
      } else if (deleteTarget.type === 'league') {
        logDebug('info', `Confirming league delete: ${deleteTarget.name}`);
        await apiCall(`/api/admin/leagues/${deleteTarget.id}`, {
          method: 'DELETE'
        });
        logDebug('success', `League deleted: ${deleteTarget.name}`);
        showAlert(`League "${deleteTarget.name}" deleted successfully`, 'success');
        admin.closeDeleteModal();
        loadLeagues();
      }
    } catch (error) {
      logDebug('error', `Delete failed: ${error.message}`);
      showAlert(`Error deleting: ${error.message}`, 'danger');
    }
  },

  // ===== Debug Console =====

  clearDebugLog() {
    debugLogs.length = 0;
    updateDebugUI();
    logDebug('info', 'Debug log cleared');
  },

  downloadDebugLog() {
    const text = debugLogs.map(entry => 
      `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}` + 
      (entry.data ? ` → ${JSON.stringify(entry.data)}` : '')
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-debug-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    logDebug('success', 'Debug log downloaded');
  }
};

// ===== Missing Breeds =====

async function loadMissingBreeds() {
  try {
    logDebug('info', 'Fetching missing breeds...');
    const data = await apiCall('/api/admin/missing-breeds');
    const container = document.getElementById('missing-breeds-table');

    if (!data.missing_breeds || data.missing_breeds.length === 0) {
      container.innerHTML = '<p>No missing breeds!</p>';
      logDebug('success', 'No missing breeds found');
      return;
    }

    container.innerHTML = `
      <p style="margin-bottom: 16px; color: #7f8c8d;">
        ${data.missing_breeds.length} breed(s) found in pets but not in breed_points table
      </p>
      ${data.missing_breeds.map(breed => `
        <div class="breed-row">
          <div class="breed-info">
            <div class="breed-name">${breed.breed}</div>
            <div class="breed-count">${breed.count} pets</div>
          </div>
          <div class="breed-actions">
            <button class="btn btn-primary btn-small" onclick="admin.quickAddBreed('${breed.breed}')">Add with 5 pts</button>
          </div>
        </div>
      `).join('')}
    `;
    logDebug('success', `Found ${data.missing_breeds.length} missing breeds`);
  } catch (error) {
    logDebug('warning', `Error loading missing breeds: ${error.message}`);
  }
}

admin.quickAddBreed = async function(breedName) {
  try {
    logDebug('info', `Quick-adding breed: ${breedName}`);
    await apiCall('/api/admin/breed-points', {
      method: 'POST',
      body: JSON.stringify({ breed: breedName, points: 5 })
    });
    showAlert(`Breed "${breedName}" added with 5 points!`, 'success');
    loadBreeds();
    loadMissingBreeds();
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'danger');
  }
};

// ===== Scraper Logs =====

async function loadScraperLogs() {
  try {
    logDebug('info', 'Fetching scraper logs...');
    const data = await apiCall('/api/admin/scraper-logs');
    const container = document.getElementById('scraper-logs-table');

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = '<p>No scraper logs available yet.</p>';
      logDebug('info', 'No scraper logs available');
      return;
    }

    const logsHtml = data.logs.map(log => `
      <tr>
        <td>${new Date(log.run_date).toLocaleString()}</td>
        <td>${log.status}</td>
        <td>${log.pets_added || 0}</td>
        <td>${log.pets_updated || 0}</td>
        <td style="font-size: 12px; color: #7f8c8d;">${log.message || '-'}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Run Date</th>
            <th>Status</th>
            <th>Added</th>
            <th>Updated</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>${logsHtml}</tbody>
      </table>
    `;
    logDebug('success', `Loaded ${data.logs.length} scraper logs`);
  } catch (error) {
    logDebug('warning', `Error loading logs: ${error.message}`);
  }
}

// ===== Users Management =====

async function loadUsers() {
  try {
    logDebug('info', 'Fetching users...');
    const users = await apiCall('/api/admin/users');
    allUsers = users;
    renderUsers(users);
    logDebug('success', `Loaded ${users.length} users`);
  } catch (error) {
    logDebug('error', `Error loading users: ${error.message}`);
    document.getElementById('users-list').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

function renderUsers(users) {
  const container = document.getElementById('users-list');
  
  if (users.length === 0) {
    container.innerHTML = '<p>No users found.</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-name">${user.first_name}</div>
        <div class="admin-item-meta">
          ${user.city ? `📍 ${user.city}` : ''} 
          ${user.is_admin ? '👑 Admin' : ''}
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-danger-small" onclick="admin.deleteUser(${user.id}, '${user.first_name}')">Delete</button>
      </div>
    </div>
  `).join('');
  logDebug('info', `Rendered ${users.length} users`);
}

// ===== Leagues Management =====

async function loadLeagues() {
  try {
    logDebug('info', 'Fetching leagues...');
    const leagues = await apiCall('/api/admin/leagues');
    allLeagues = leagues;
    renderLeagues(leagues);
    logDebug('success', `Loaded ${leagues.length} leagues`);
  } catch (error) {
    logDebug('error', `Error loading leagues: ${error.message}`);
    document.getElementById('leagues-list').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

function renderLeagues(leagues) {
  const container = document.getElementById('leagues-list');
  
  if (leagues.length === 0) {
    container.innerHTML = '<p>No leagues found.</p>';
    return;
  }

  container.innerHTML = leagues.map(league => `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-name">${league.name}</div>
        <div class="admin-item-meta">👥 ${league.member_count || 0} players</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-danger-small" onclick="admin.deleteLeague(${league.id}, '${league.name}')">Delete</button>
      </div>
    </div>
  `).join('');
  logDebug('info', `Rendered ${leagues.length} leagues`);
}