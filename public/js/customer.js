// Customer Dashboard script
document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  if (!user || user.role !== 'customer') {
    showToast('Customer login required.', 'error');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  loadCustomerProfile();
  loadCustomerBookings();

  // Attach profile update handler
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const first_name = document.getElementById('prof-first-name').value.trim();
      const last_name = document.getElementById('prof-last-name').value.trim();
      const phone = document.getElementById('prof-phone').value.trim();
      const address = document.getElementById('prof-address').value.trim();

      try {
        const res = await apiCall('/customers/profile', 'PUT', {
          first_name,
          last_name,
          phone,
          address
        });
        showToast(res.message, 'success');
        
        // Update cached user state
        user.first_name = first_name;
        user.last_name = last_name;
        localStorage.setItem('vr_user', JSON.stringify(user));
        updateNav();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});

async function loadCustomerProfile() {
  try {
    const res = await apiCall('/customers/profile');
    if (res.success && res.profile) {
      const p = res.profile;
      document.getElementById('prof-first-name').value = p.first_name || '';
      document.getElementById('prof-last-name').value = p.last_name || '';
      document.getElementById('prof-phone').value = p.phone || '';
      document.getElementById('prof-license').value = p.driver_license || '';
      document.getElementById('prof-address').value = p.address || '';
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

async function loadCustomerBookings() {
  const bookingsContainer = document.getElementById('my-bookings-list');
  if (!bookingsContainer) return;

  try {
    bookingsContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading your bookings...</td></tr>';
    const res = await apiCall('/rentals/my-bookings');

    if (res.rentals.length === 0) {
      bookingsContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">You have no rental bookings yet.</td></tr>';
      return;
    }

    bookingsContainer.innerHTML = res.rentals.map(r => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${r.image_url}" alt="${r.make}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" />
            <div>
              <strong>${r.make} ${r.model}</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${r.license_plate}</div>
            </div>
          </div>
        </td>
        <td>${formatDate(r.start_date)} to ${formatDate(r.end_date)}</td>
        <td><strong>${r.total_days} day${r.total_days > 1 ? 's' : ''}</strong></td>
        <td style="color: var(--primary-gold); font-weight: 700;">$${parseFloat(r.total_cost).toFixed(2)}</td>
        <td><span class="status-badge status-${r.status}">${r.status}</span></td>
        <td>
          ${r.status === 'pending' 
            ? `<button onclick="cancelBooking(${r.id})" class="btn btn-danger btn-sm">Cancel</button>` 
            : ''}
          ${r.status === 'completed'
            ? `<button onclick="openReviewModal(${r.vehicle_id}, '${r.make} ${r.model}')" class="btn btn-secondary btn-sm">Write Review</button>`
            : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    bookingsContainer.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Failed to load bookings: ${err.message}</td></tr>`;
  }
}

async function cancelBooking(rentalId) {
  if (!confirm('Are you sure you want to cancel this booking reservation?')) return;

  try {
    const res = await apiCall(`/rentals/${rentalId}/cancel`, 'PUT');
    showToast(res.message, 'success');
    loadCustomerBookings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openReviewModal(vehicleId, vehicleName) {
  const modalOverlay = document.getElementById('review-modal-overlay');
  document.getElementById('rev-vehicle-id').value = vehicleId;
  modalOverlay.classList.add('active');
}

async function submitReview(event, vehicleId) {
  event.preventDefault();
  const vId = vehicleId || document.getElementById('rev-vehicle-id').value;
  const rating = parseInt(document.getElementById('rev-rating').value);
  const comment = document.getElementById('rev-comment').value.trim();

  try {
    const res = await apiCall('/reviews', 'POST', { vehicle_id: vId, rating, comment });
    closeModal('review-modal-overlay');
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
