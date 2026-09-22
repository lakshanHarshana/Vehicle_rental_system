// Admin Dashboard Script
document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    showToast('Admin access required.', 'error');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  // Initial load
  loadAdminStats();
  loadAdminRentals();
  loadAdminVehicles();
  loadAdminCategories();
  loadAdminCustomers();
  loadAdminMessages();
});

// Global Tab Switcher Function for Admin Portal
function switchAdminTab(tabName) {
  const tabs = ['rentals', 'vehicles', 'categories', 'customers', 'messages'];
  
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-tab-${t}`);
    if (btn) btn.classList.remove('active');

    const section = document.getElementById(`tab-${t}`);
    if (section) section.style.display = 'none';
  });

  const targetBtn = document.getElementById(`btn-tab-${tabName}`);
  if (targetBtn) targetBtn.classList.add('active');

  const targetSection = document.getElementById(`tab-${tabName}`);
  if (targetSection) targetSection.style.display = 'block';
}

// ----------------------------------------------------
// Dashboard Overview Statistics
// ----------------------------------------------------
async function loadAdminStats() {
  try {
    const res = await apiCall('/dashboard/stats');
    if (res.success && res.stats) {
      const s = res.stats;
      document.getElementById('stat-revenue').textContent = `$${parseFloat(s.totalRevenue || 0).toFixed(2)}`;
      document.getElementById('stat-total-rentals').textContent = s.totalRentals || 0;
      document.getElementById('stat-active-rentals').textContent = s.activeRentals || 0;
      document.getElementById('stat-available-vehicles').textContent = `${s.availableVehicles || 0} / ${s.totalVehicles || 0}`;

      const unreadBadge = document.getElementById('badge-unread-messages');
      if (unreadBadge) {
        if (s.unreadMessages > 0) {
          unreadBadge.textContent = s.unreadMessages;
          unreadBadge.style.display = 'inline-block';
        } else {
          unreadBadge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

// ----------------------------------------------------
// Rentals Management (Admin)
// ----------------------------------------------------
async function loadAdminRentals() {
  const table = document.getElementById('admin-rentals-table');
  if (!table) return;

  try {
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading rental bookings...</td></tr>';
    const res = await apiCall('/rentals');

    if (res.rentals.length === 0) {
      table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No booking transactions recorded.</td></tr>';
      return;
    }

    table.innerHTML = res.rentals.map(r => `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>
          <strong>${r.first_name} ${r.last_name}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${r.email} | ${r.phone}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${r.image_url}" alt="${r.make}" style="width: 40px; height: 28px; object-fit: cover; border-radius: 4px;" />
            <span>${r.make} ${r.model} (${r.license_plate})</span>
          </div>
        </td>
        <td>${formatDate(r.start_date)} - ${formatDate(r.end_date)} (${r.total_days}d)</td>
        <td style="color: var(--primary-gold); font-weight: 700;">$${parseFloat(r.total_cost).toFixed(2)}</td>
        <td><span class="status-badge status-${r.status}">${r.status}</span></td>
        <td>
          <select onchange="updateRentalStatus(${r.id}, this.value)" class="form-control form-control-sm" style="padding: 4px 8px; font-size: 0.82rem;">
            <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="active" ${r.status === 'active' ? 'selected' : ''}>Active (Rented)</option>
            <option value="completed" ${r.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

async function updateRentalStatus(rentalId, newStatus) {
  try {
    const res = await apiCall(`/rentals/${rentalId}/status`, 'PUT', { status: newStatus });
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminRentals();
    loadAdminVehicles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// Vehicles CRUD (Admin)
// ----------------------------------------------------
async function loadAdminVehicles() {
  const table = document.getElementById('admin-vehicles-table');
  if (!table) return;

  try {
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading fleet inventory...</td></tr>';
    const res = await apiCall('/vehicles');

    table.innerHTML = res.vehicles.map(v => `
      <tr>
        <td>#${v.id}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${v.image_url}" alt="${v.make}" style="width: 48px; height: 32px; object-fit: cover; border-radius: 4px;" />
            <div>
              <strong>${v.year} ${v.make} ${v.model}</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${v.fuel_type} | ${v.transmission} | ${v.color}</div>
            </div>
          </div>
        </td>
        <td>${v.category_name}</td>
        <td><code>${v.license_plate}</code></td>
        <td style="color: var(--primary-gold); font-weight: 700;">$${parseFloat(v.daily_rate).toFixed(2)}/d</td>
        <td><span class="status-badge status-${v.status}">${v.status}</span></td>
        <td>
          <button onclick="openVehicleModal(${v.id})" class="btn btn-secondary btn-sm" style="margin-right: 4px;">Edit</button>
          <button onclick="deleteVehicle(${v.id})" class="btn btn-danger btn-sm">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

async function openVehicleModal(vehicleId = null) {
  const modalOverlay = document.getElementById('admin-modal-overlay');
  const modalBody = document.getElementById('admin-modal-body');

  let vehicle = { category_id: '', make: '', model: '', year: 2024, license_plate: '', color: '', seating_capacity: 5, fuel_type: 'Gasoline', transmission: 'Automatic', status: 'available', image_url: '' };
  const catRes = await apiCall('/categories');
  const categories = catRes.categories || [];

  if (vehicleId) {
    const vRes = await apiCall(`/vehicles/${vehicleId}`);
    if (vRes.success) vehicle = vRes.vehicle;
  }

  const currentVehicleId = vehicleId ? vehicleId : 'null';

  modalBody.innerHTML = `
    <h3>${vehicleId ? 'Edit Vehicle' : 'Add New Fleet Vehicle'}</h3>
    <form id="vehicle-crud-form" onsubmit="saveVehicle(event, ${currentVehicleId})">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="v-category" class="form-control" required>
            ${categories.map(c => `<option value="${c.id}" ${c.id === vehicle.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Make</label>
          <input type="text" id="v-make" class="form-control" value="${vehicle.make}" required placeholder="e.g., BMW" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Model</label>
          <input type="text" id="v-model" class="form-control" value="${vehicle.model}" required placeholder="e.g., 5 Series" />
        </div>
        <div class="form-group">
          <label class="form-label">Year</label>
          <input type="number" id="v-year" class="form-control" value="${vehicle.year}" required min="1990" max="2030" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">License Plate</label>
          <input type="text" id="v-plate" class="form-control" value="${vehicle.license_plate}" required placeholder="NYC-5301" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <input type="text" id="v-color" class="form-control" value="${vehicle.color}" required placeholder="Black Sapphire" />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Seats</label>
          <input type="number" id="v-seats" class="form-control" value="${vehicle.seating_capacity}" required min="1" max="50" />
        </div>
        <div class="form-group">
          <label class="form-label">Fuel Type</label>
          <select id="v-fuel" class="form-control">
            <option value="Gasoline" ${vehicle.fuel_type === 'Gasoline' ? 'selected' : ''}>Gasoline</option>
            <option value="Diesel" ${vehicle.fuel_type === 'Diesel' ? 'selected' : ''}>Diesel</option>
            <option value="Hybrid" ${vehicle.fuel_type === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
            <option value="Electric" ${vehicle.fuel_type === 'Electric' ? 'selected' : ''}>Electric</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Transmission</label>
          <select id="v-trans" class="form-control">
            <option value="Automatic" ${vehicle.transmission === 'Automatic' ? 'selected' : ''}>Automatic</option>
            <option value="Manual" ${vehicle.transmission === 'Manual' ? 'selected' : ''}>Manual</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="v-status" class="form-control">
            <option value="available" ${vehicle.status === 'available' ? 'selected' : ''}>Available</option>
            <option value="rented" ${vehicle.status === 'rented' ? 'selected' : ''}>Rented</option>
            <option value="maintenance" ${vehicle.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input type="text" id="v-img" class="form-control" value="${vehicle.image_url || ''}" placeholder="https://..." />
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">${vehicleId ? 'Update Vehicle' : 'Create Vehicle'}</button>
    </form>
  `;

  modalOverlay.classList.add('active');
}

async function saveVehicle(event, vehicleId) {
  event.preventDefault();
  const isEdit = vehicleId && vehicleId !== 'null' && vehicleId !== null;

  const payload = {
    category_id: parseInt(document.getElementById('v-category').value),
    make: document.getElementById('v-make').value.trim(),
    model: document.getElementById('v-model').value.trim(),
    year: parseInt(document.getElementById('v-year').value),
    license_plate: document.getElementById('v-plate').value.trim(),
    color: document.getElementById('v-color').value.trim(),
    seating_capacity: parseInt(document.getElementById('v-seats').value),
    fuel_type: document.getElementById('v-fuel').value,
    transmission: document.getElementById('v-trans').value,
    status: document.getElementById('v-status').value,
    image_url: document.getElementById('v-img').value.trim()
  };

  try {
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/vehicles/${vehicleId}` : '/vehicles';
    const res = await apiCall(endpoint, method, payload);

    closeModal('admin-modal-overlay');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminVehicles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteVehicle(vehicleId) {
  if (!confirm('Are you sure you want to delete this vehicle from fleet?')) return;

  try {
    const res = await apiCall(`/vehicles/${vehicleId}`, 'DELETE');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminVehicles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// Categories CRUD (Admin)
// ----------------------------------------------------
async function loadAdminCategories() {
  const table = document.getElementById('admin-categories-table');
  if (!table) return;

  try {
    table.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading categories...</td></tr>';
    const res = await apiCall('/categories');

    table.innerHTML = res.categories.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td style="color: var(--primary-gold); font-weight: 700;">$${parseFloat(c.daily_rate).toFixed(2)}/day</td>
        <td>${c.vehicle_count || 0} vehicles</td>
        <td>
          <button onclick="openCategoryModal(${c.id})" class="btn btn-secondary btn-sm" style="margin-right: 4px;">Edit</button>
          <button onclick="deleteCategory(${c.id})" class="btn btn-danger btn-sm">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

async function openCategoryModal(categoryId = null) {
  const modalOverlay = document.getElementById('admin-modal-overlay');
  const modalBody = document.getElementById('admin-modal-body');

  let category = { name: '', description: '', daily_rate: 75.00, image_url: '' };
  if (categoryId) {
    const catRes = await apiCall(`/categories/${categoryId}`);
    if (catRes.success) category = catRes.category;
  }

  const currentCategoryId = categoryId ? categoryId : 'null';

  modalBody.innerHTML = `
    <h3>${categoryId ? 'Edit Category' : 'Add Vehicle Category'}</h3>
    <form id="category-crud-form" onsubmit="saveCategory(event, ${currentCategoryId})">
      <div class="form-group">
        <label class="form-label">Category Name</label>
        <input type="text" id="c-name" class="form-control" value="${category.name}" required placeholder="e.g., Executive SUV" />
      </div>

      <div class="form-group">
        <label class="form-label">Daily Base Rate ($)</label>
        <input type="number" step="0.01" id="c-rate" class="form-control" value="${category.daily_rate}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="c-desc" class="form-control" placeholder="Category features and details...">${category.description || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Image URL</label>
        <input type="text" id="c-img" class="form-control" value="${category.image_url || ''}" placeholder="https://..." />
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">${categoryId ? 'Update Category' : 'Create Category'}</button>
    </form>
  `;

  modalOverlay.classList.add('active');
}

async function saveCategory(event, categoryId) {
  event.preventDefault();
  const isEdit = categoryId && categoryId !== 'null' && categoryId !== null;

  const payload = {
    name: document.getElementById('c-name').value.trim(),
    daily_rate: parseFloat(document.getElementById('c-rate').value),
    description: document.getElementById('c-desc').value.trim(),
    image_url: document.getElementById('c-img').value.trim()
  };

  try {
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/categories/${categoryId}` : '/categories';
    const res = await apiCall(endpoint, method, payload);

    closeModal('admin-modal-overlay');
    showToast(res.message, 'success');
    loadAdminCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(categoryId) {
  if (!confirm('Are you sure you want to delete this vehicle category?')) return;

  try {
    const res = await apiCall(`/categories/${categoryId}`, 'DELETE');
    showToast(res.message, 'success');
    loadAdminCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// Customers Directory (Admin)
// ----------------------------------------------------
async function loadAdminCustomers() {
  const table = document.getElementById('admin-customers-table');
  if (!table) return;

  try {
    table.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading customers...</td></tr>';
    const res = await apiCall('/customers');

    table.innerHTML = res.customers.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.first_name} ${c.last_name}</strong></td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td><code>${c.driver_license}</code></td>
        <td>
          <button onclick="deleteCustomer(${c.id})" class="btn btn-danger btn-sm">Delete Account</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

async function deleteCustomer(customerId) {
  if (!confirm('Are you sure you want to delete this customer account? All associated bookings will be removed.')) return;

  try {
    const res = await apiCall(`/customers/${customerId}`, 'DELETE');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminCustomers();
    loadAdminRentals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// Customer Messages & Reply Management (Admin)
// ----------------------------------------------------
async function loadAdminMessages() {
  const table = document.getElementById('admin-messages-table');
  if (!table) return;

  try {
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading customer messages...</td></tr>';
    const res = await apiCall('/messages');

    if (res.messages.length === 0) {
      table.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No customer messages received yet.</td></tr>';
      return;
    }

    table.innerHTML = res.messages.map(m => `
      <tr style="${m.status === 'unread' ? 'background: rgba(229, 184, 66, 0.05); font-weight: 500;' : ''}">
        <td>#${m.id}</td>
        <td>
          <strong>${m.name}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${m.email}</div>
        </td>
        <td><strong>${m.subject}</strong></td>
        <td style="font-size: 0.88rem; color: var(--text-main); line-height: 1.5;">
          ${m.message}
          ${m.admin_reply ? `
            <div style="background: rgba(229, 184, 66, 0.1); border-left: 3px solid var(--primary-gold); padding: 8px 12px; margin-top: 6px; border-radius: 4px; font-size: 0.82rem;">
              <strong style="color: var(--primary-gold);">Replied:</strong> "${m.admin_reply}"
            </div>
          ` : ''}
        </td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${formatDate(m.created_at)}</td>
        <td>
          <span class="status-badge ${m.status === 'replied' ? 'status-available' : m.status === 'unread' ? 'status-pending' : 'status-completed'}">${m.status}</span>
        </td>
        <td>
          <button onclick="openReplyModal(${m.id}, '${escapeQuote(m.name)}', '${escapeQuote(m.subject)}', '${escapeQuote(m.message)}', '${escapeQuote(m.admin_reply || '')}')" class="btn btn-primary btn-sm" style="margin-right: 4px;">Reply</button>
          ${m.status === 'unread' ? `<button onclick="markMessageRead(${m.id})" class="btn btn-secondary btn-sm" style="margin-right: 4px;">Read</button>` : ''}
          <button onclick="deleteMessage(${m.id})" class="btn btn-danger btn-sm">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #ef4444;">Error: ${err.message}</td></tr>`;
  }
}

function openReplyModal(messageId, senderName, subject, messageBody, existingReply = '') {
  const modalOverlay = document.getElementById('admin-modal-overlay');
  const modalBody = document.getElementById('admin-modal-body');

  modalBody.innerHTML = `
    <h3>Reply to Customer Message</h3>
    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
      <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 4px;">From: <strong style="color: #fff;">${senderName}</strong></div>
      <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 8px;">Subject: <strong style="color: #fff;">${subject}</strong></div>
      <p style="font-size: 0.9rem; color: var(--text-main); margin: 0; font-style: italic;">"${messageBody}"</p>
    </div>

    <form onsubmit="submitMessageReply(event, ${messageId})">
      <div class="form-group">
        <label class="form-label">Admin Response Text</label>
        <textarea id="reply-text" class="form-control" style="min-height: 120px;" placeholder="Type your response to the customer here..." required>${existingReply}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%;">Send Reply to Customer</button>
    </form>
  `;

  modalOverlay.classList.add('active');
}

async function submitMessageReply(event, messageId) {
  event.preventDefault();
  const reply = document.getElementById('reply-text').value.trim();

  try {
    const res = await apiCall(`/messages/${messageId}/reply`, 'POST', { reply });
    closeModal('admin-modal-overlay');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markMessageRead(messageId) {
  try {
    const res = await apiCall(`/messages/${messageId}/read`, 'PUT');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteMessage(messageId) {
  if (!confirm('Are you sure you want to delete this customer message?')) return;

  try {
    const res = await apiCall(`/messages/${messageId}`, 'DELETE');
    showToast(res.message, 'success');
    loadAdminStats();
    loadAdminMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeQuote(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
