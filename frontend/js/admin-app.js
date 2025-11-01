// frontend/js/admin-app.js - Admin dashboard application logic

// ===== Configuration =====

const API_BASE = window.location.origin;
const TOKEN_KEY = 'auth_token';
const ADMIN_PAGE = true;

// ===== Utility Functions =====

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user_data');
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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
    }
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
}

function handleUnauthorized() {
  clearAuth();
  window.location.href = '/index.html?login=required';
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

function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

// ===== Statistics Dashboard =====

async function loadStatistics() {
  try {
    const stats = await apiCall('/admin/stats');
    
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="label">Total Users</div>
        <div class="value">${stats.total_users}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Leagues</div>
        <div class="value">${stats.total_leagues}</div>
      </div>
      <div class="stat-card">
        <div class="label">Available Pets</div>
        <div class="value">${stats.available_pets}</div>
      </div>
      <div class="stat-card">
        <div class="label">Adopted Pets</div>
        <div class="value">${stats.adopted_pets}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Drafts</div>
        <div class="value">${stats.total_drafts}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Points Awarded</div>
        <div class="value">${stats.total_points_awarded}</div>
      </div>
      <div class="stat-card">
        <div class="label">Breeds Configured</div>
        <div class="value">${stats.breed_points_configured}</div>
      </div>
    `;
  } catch (error) {
    showAlert('Error loading statistics: ' + error.message, 'danger');
  }
}

// ===== Breed Points Management =====

async function loadBreedPoints() {
  try {
    const breeds = await apiCall('/admin/breeds');
    const container = document.getElementById('breeds-table');

    if (breeds.length === 0) {
      container.innerHTML = '<p>No breeds configured yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Breed</th>
            <th>Points</th>
            <th>Pet Count</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${breeds.map(breed => `
            <tr>
              <td>${breed.breed}</td>
              <td>${breed.points}</td>
              <td>${breed.pet_count}</td>
              <td>${formatDate(breed.updated_at)}</td>
              <td>
                <button class="btn btn-primary btn-small" onclick="admin.editBreed('${breed.id}', '${breed.breed}', ${breed.points})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="admin.deleteBreed('${breed.id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showAlert('Error loading breed points: ' + error.message, 'danger');
  }
}

async function handleCreateBreed(event) {
  event.preventDefault();
  const form = event.target;
  const breed = form.breedName.value;
  const points = parseInt(form.breedPoints.value);

  try {
    await apiCall('/admin/breeds', {
      method: 'POST',
      body: JSON.stringify({ breed, points }),
    });
    showAlert('Breed created successfully!', 'success');
    form.reset();
    closeModal('create-breed-modal');
    loadBreedPoints();
  } catch (error) {
    showAlert('Error creating breed: ' + error.message, 'danger');
  }
}

function editBreed(id, breed, points) {
  const form = document.getElementById('edit-breed-form');
  form.breedId.value = id;
  document.getElementById('editBreedName').value = breed;
  document.getElementById('editBreedPoints').value = points;
  showModal('edit-breed-modal');
}

async function handleUpdateBreed(event) {
  event.preventDefault();
  const form = event.target;
  const breedId = form.breedId.value;
  const points = parseInt(form.breedPoints.value);

  try {
    await apiCall(`/admin/breeds/${breedId}`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    });
    showAlert('Breed updated successfully!', 'success');
    closeModal('edit-breed-modal');
    loadBreedPoints();
  } catch (error) {
    showAlert('Error updating breed: ' + error.message, 'danger');
  }
}

async function deleteBreed(id) {
  if (!confirm('Delete this breed? This cannot be undone.')) return;

  try {
    await apiCall(`/admin/breeds/${id}`, {
      method: 'DELETE',
    });
    showAlert('Breed deleted successfully!', 'success');
    loadBreedPoints();
  } catch (error) {
    showAlert('Error deleting breed: ' + error.message, 'danger');
  }
}

// ===== Missing Breeds =====

async function loadMissingBreeds() {
  try {
    const breeds = await apiCall('/admin/breeds/missing');
    const container = document.getElementById('missing-breeds-table');

    if (breeds.length === 0) {
      container.innerHTML = '<p>All breeds are configured!</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Breed</th>
            <th>Pet Count</th>
          </tr>
        </thead>
        <tbody>
          ${breeds.map(breed => `
            <tr>
              <td>${breed.breed}</td>
              <td>${breed.pet_count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <button class="btn btn-success" onclick="admin.autoPopulateBreeds()">Auto-Populate Missing Breeds</button>
    `;
  } catch (error) {
    showAlert('Error loading missing breeds: ' + error.message, 'danger');
  }
}

async function autoPopulateBreeds() {
  if (!confirm('This will add all missing breeds with default 1 point. Continue?')) return;

  try {
    const result = await apiCall('/admin/breeds/auto-populate', {
      method: 'POST',
    });
    showAlert(`Successfully added ${result.added} breeds!`, 'success');
    loadBreedPoints();
    loadMissingBreeds();
  } catch (error) {
    showAlert('Error auto-populating breeds: ' + error.message, 'danger');
  }
}

// ===== Scraper Logs =====

async function loadScraperLogs() {
  try {
    const logs = await apiCall('/admin/scraper-logs');
    const container = document.getElementById('scraper-logs-table');

    if (logs.length === 0) {
      container.innerHTML = '<p>No scraper logs yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Run Date (UTC)</th>
            <th>Source</th>
            <th>Pets Found</th>
            <th>New Pets</th>
            <th>Removed</th>
            <th>Points Awarded</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${formatDate(log.run_date)}</td>
              <td>${log.source}</td>
              <td>${log.pets_found}</td>
              <td>${log.new_pets}</td>
              <td>${log.removed_pets}</td>
              <td>${log.points_awarded}</td>
              <td>
                ${log.error_message 
                  ? `<span class="badge badge-danger">Error</span>` 
                  : `<span class="badge badge-success">Success</span>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showAlert('Error loading scraper logs: ' + error.message, 'danger');
  }
}

// ===== Navigation =====

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tab = document.getElementById(`${tabName}-tab`);
  if (tab) {
    tab.classList.add('active');
  }

  // Mark button as active
  event.target.classList.add('active');

  // Load data for tab
  switch (tabName) {
    case 'breeds':
      loadBreedPoints();
      break;
    case 'missing':
      loadMissingBreeds();
      break;
    case 'logs':
      loadScraperLogs();
      break;
  }
}

function handleLogout() {
  clearAuth();
  showAlert('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/index.html', 1500);
}

// ===== Page Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/index.html?login=required';
    return;
  }

  // Load initial data
  loadStatistics();
  loadBreedPoints();

  // Setup tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Setup modals - close when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
});

// ===== Export for use in HTML =====
window.admin = {
  handleCreateBreed,
  handleUpdateBreed,
  deleteBreed,
  editBreed,
  autoPopulateBreeds,
  switchTab,
  handleLogout,
  showAlert,
  showModal,
  closeModal,
  loadStatistics,
  loadBreedPoints,
  loadMissingBreeds,
  loadScraperLogs,
};
