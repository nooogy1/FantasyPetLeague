// frontend/js/auth/auth.js - Authentication functions

import { apiCall } from '../utils/api.js';
import { getToken, setToken, setUser, clearAuth } from '../utils/storage.js';
import { showAlert } from '../utils/ui.js';

export function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/index.html?login=required';
    return false;
  }
  return true;
}

export async function handleSignup(event) {
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

export async function handleLogin(event) {
  event.preventDefault();
  
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

export function handleLogout() {
  clearAuth();
  showAlert('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/index.html', 1500);
}