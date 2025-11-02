// frontend/js/admin-app.js - Admin app with breeds, users, and leagues management

// ===== Configuration =====
const API_BASE = window.location.origin;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

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
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[API Error]:', error.message);
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
  
  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, 5000);
}

// ===== Tab Management =====

document.addEventListener('DOMContentLoaded', () => {
  // Check admin access
  const user = getUser();
  if (!user?.is_admin) {
    window.location.href = '/dashboard.html';
    return;
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Initial load
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
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ===== Breeds =====

async function loadBreeds() {
  try {
    const breeds = await apiCall('/api/breed-points');
    
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
  } catch (error) {
    console.error('Error loading breeds:', error);
  }
}

// Breed CRUD operations (from original admin-app.js)
const admin = {
  handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showAlert('Logged out successfully', 'success');
    setTimeout(() => window.location.href = '/index.html', 1500);
  },

  showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
  },

  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  },

  async handleCreateBreed(event) {
    event.preventDefault();
    const breedName = document.getElementById('breedName').value;
    const breedPoints = document.getElementById('breedPoints').value;

    try {
      await apiCall('/api/breed-points', {
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
      await apiCall(`/api/breed-points/${breedId}`, {
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
    if (!confirm(`Delete breed "${breed}"?`)) return;

    try {
      await apiCall(`/api/breed-points/${id}`, { method: 'DELETE' });
      showAlert('Breed deleted successfully!', 'success');
      loadBreeds();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'danger');
    }
  },

  // ===== Users =====

  filterUsers(query) {
    const filtered = allUsers.filter(u => 
      u.first_name.toLowerCase().includes(query.toLowerCase()) ||
      (u.city && u.city.toLowerCase().includes(query.toLowerCase()))
    );
    renderUsers(filtered);
  },

  deleteUser(userId, userName) {
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
  },

  // ===== Leagues =====

  filterLeagues(query) {
    const filtered = allLeagues.filter(l => 
      l.name.toLowerCase().includes(query.toLowerCase())
    );
    renderLeagues(filtered);
  },

  deleteLeague(leagueId, leagueName) {
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
  },

  // ===== Modal =====

  closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deleteTarget = null;
  },

  async confirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'user') {
        await apiCall(`/api/admin/users/${deleteTarget.id}`, {
          method: 'DELETE'
        });
        showAlert(`User "${deleteTarget.name}" deleted successfully`, 'success');
        admin.closeDeleteModal();
        loadUsers();
      } else if (deleteTarget.type === 'league') {
        await apiCall(`/api/admin/leagues/${deleteTarget.id}`, {
          method: 'DELETE'
        });
        showAlert(`League "${deleteTarget.name}" deleted successfully`, 'success');
        admin.closeDeleteModal();
        loadLeagues();
      }
    } catch (error) {
      showAlert(`Error deleting: ${error.message}`, 'danger');
    }
  }
};

// ===== Missing Breeds =====

async function loadMissingBreeds() {
  try {
    const data = await apiCall('/api/admin/missing-breeds');
    const container = document.getElementById('missing-breeds-table');

    if (!data.missing_breeds || data.missing_breeds.length === 0) {
      container.innerHTML = '<p>No missing breeds!</p>';
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
  } catch (error) {
    console.error('Error loading missing breeds:', error);
  }
}

admin.quickAddBreed = async function(breedName) {
  try {
    await apiCall('/api/breed-points', {
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
    const data = await apiCall('/api/admin/scraper-logs');
    const container = document.getElementById('scraper-logs-table');

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = '<p>No scraper logs available yet.</p>';
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
  } catch (error) {
    console.error('Error loading logs:', error);
    document.getElementById('scraper-logs-table').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

// ===== Users Management =====

async function loadUsers() {
  try {
    const users = await apiCall('/api/admin/users');
    allUsers = users;
    renderUsers(users);
  } catch (error) {
    console.error('[ADMIN] Error loading users:', error);
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
}

// ===== Leagues Management =====

async function loadLeagues() {
  try {
    const leagues = await apiCall('/api/admin/leagues');
    allLeagues = leagues;
    renderLeagues(leagues);
  } catch (error) {
    console.error('[ADMIN] Error loading leagues:', error);
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
}