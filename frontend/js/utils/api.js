// frontend/js/utils/api.js - API request handler

import { API_BASE } from '../config.js';
import { getToken, clearAuth } from './storage.js';

export async function apiCall(endpoint, options = {}) {
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