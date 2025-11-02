// frontend/js/auth/auth.js - Authentication functions

// Functions exposed to window by this module

window.checkAuth = function() {
  const token = window.getToken();
  if (!token) {
    window.location.href = '/index.html?login=required';
    return false;
  }
  return true;
};

window.handleSignup = async function(event) {
  event.preventDefault();
  const form = event.target;
  const passphrase = form.passphrase?.value || document.getElementById('signup-passphrase').value;
  const firstName = form.firstName?.value || document.getElementById('signup-first-name').value;
  const city = form.city?.value || document.getElementById('signup-city').value;

  if (!passphrase || !firstName) {
    window.showAlert('Please enter a passphrase and first name', 'warning');
    return;
  }

  try {
    console.log('[SIGNUP] Attempting signup:', { firstName, city });
    
    const response = await window.apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ passphrase, firstName, city }),
    });

    if (!response || !response.token) {
      window.showAlert('Signup failed. Please try again.', 'danger');
      return;
    }

    window.setToken(response.token);
    window.setUser(response.user);
    
    window.showAlert(`Welcome ${firstName}! Account created successfully!`, 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1500);
  } catch (error) {
    console.error('[SIGNUP Error]:', error);
    window.showAlert(`Error: ${error.message}`, 'danger');
  }
};

window.handleLogin = async function(event) {
  event.preventDefault();
  
  const passphrase = document.getElementById('login-passphrase').value;

  if (!passphrase) {
    window.showAlert('Please enter your passphrase', 'warning');
    return;
  }

  try {
    console.log('[LOGIN] Attempting login');
    
    const response = await window.apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase }),
    });

    if (!response || !response.token) {
      window.showAlert('Login failed. Invalid passphrase.', 'danger');
      return;
    }

    window.setToken(response.token);
    window.setUser(response.user);
    
    window.showAlert(`Welcome back!`, 'success');
    
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
    console.error('[LOGIN Error]:', error);
    window.showAlert(`Login failed: ${error.message}`, 'danger');
  }
};

window.handleLogout = function() {
  window.clearAuth();
  window.showAlert('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/index.html', 1500);
};

console.log('✓ auth.js loaded');