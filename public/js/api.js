// API Base & Helper Utilities
let API_BASE = '/api';

if (window.location.protocol === 'file:' || !window.location.host) {
  API_BASE = 'http://localhost:3000/api';
} else if (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
  // Target Render live backend when hosted on Firebase
  API_BASE = 'https://vehicle-rental-backend.onrender.com/api';
} else {
  // Local server execution (http://localhost:3000)
  API_BASE = '/api';
}

function getToken() {
  return localStorage.getItem('vr_token');
}

function getUser() {
  const user = localStorage.getItem('vr_user');
  return user ? JSON.parse(user) : null;
}

function saveAuth(token, user) {
  localStorage.setItem('vr_token', token);
  localStorage.setItem('vr_user', JSON.stringify(user));
  updateNav();
}

function logout() {
  localStorage.removeItem('vr_token');
  localStorage.removeItem('vr_user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 600);
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred during API call');
    }
    return data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error.message);
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Server connection failed. Please ensure the backend server is running ("npm start").');
    }
    throw error;
  }
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function closeModal(modalId) {
  const modalOverlay = document.getElementById(modalId);
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

function updateNav() {
  const navActions = document.getElementById('nav-actions');
  const navMenu = document.querySelector('.nav-menu');
  const user = getUser();
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // Remove any legacy nav-dash-item element from nav menu
  const dashItem = document.getElementById('nav-dash-item');
  if (dashItem) {
    dashItem.remove();
  }

  if (!navActions) return;

  if (user) {
    const isCustomer = user.role === 'customer';
    const isAdmin = user.role === 'admin';

    navActions.innerHTML = `
      <div class="user-pill">
        <span>${isAdmin ? '👑 Admin' : '👤'}</span>
        <span>${user.first_name || user.email}</span>
      </div>
      ${isCustomer ? '<a href="customer-dashboard.html" class="btn btn-secondary btn-sm">My Dashboard</a>' : ''}
      ${isAdmin ? '<a href="admin-dashboard.html" class="btn btn-secondary btn-sm">Admin Panel</a>' : ''}
      <button onclick="logout()" class="btn btn-danger btn-sm">Logout</button>
    `;
  } else {
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', updateNav);
