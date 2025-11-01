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
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Check for auth errors
    if (response.status === 401 || response.status === 403) {
      clearAuth();
      window.location.href = '/index.html?error=auth';
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
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
  
  // Get first name - need to derive from passphrase or ask separately
  // For now, let's add a first name field
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
    const leagues = await apiCall('/api/leagues');
    
    if (!leagues) return;
    
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

  if (!name.trim()) {
    showAlert('Please enter a league name', 'warning');
    return;
  }

  try {
    const result = await apiCall('/api/leagues', {
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

// ===== Page Initialization =====

document.addEventListener('DOMContentLoaded', () => {
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
  
  switch (page) {
    case 'dashboard':
      if (checkAuth()) {
        const user = getUser();
        if (user) {
          document.getElementById('user-name').textContent = user.first_name || 'Player';
        }
        loadLeagues();
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
  showAlert,
  checkAuth,
};