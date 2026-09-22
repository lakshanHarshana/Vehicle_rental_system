// Vehicles catalog & booking logic
let selectedVehicleForBooking = null;

document.addEventListener('DOMContentLoaded', async () => {
  const vehicleGrid = document.getElementById('vehicle-grid');
  const categoryFilter = document.getElementById('category-filter');
  const searchInput = document.getElementById('search-input');
  const fuelFilter = document.getElementById('fuel-filter');
  const transmissionFilter = document.getElementById('transmission-filter');

  // Load Categories for filter dropdown if present
  if (categoryFilter) {
    try {
      const res = await apiCall('/categories');
      if (res.success) {
        res.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = `${cat.name} ($${cat.daily_rate}/day)`;
          categoryFilter.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Error loading category filters:', err);
    }
  }

  // Load initial vehicle list
  if (vehicleGrid) {
    loadVehicles();

    // Attach event listeners for search and filters
    const filterInputs = [categoryFilter, searchInput, fuelFilter, transmissionFilter];
    filterInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => loadVehicles());
        if (input.tagName === 'INPUT') {
          input.addEventListener('keyup', debounce(() => loadVehicles(), 400));
        }
      }
    });
  }
});

async function loadVehicles() {
  const vehicleGrid = document.getElementById('vehicle-grid');
  if (!vehicleGrid) return;

  const category_id = document.getElementById('category-filter')?.value || '';
  const search = document.getElementById('search-input')?.value || '';
  const fuel_type = document.getElementById('fuel-filter')?.value || '';
  const transmission = document.getElementById('transmission-filter')?.value || '';

  const params = new URLSearchParams();
  if (category_id) params.append('category_id', category_id);
  if (search) params.append('search', search);
  if (fuel_type) params.append('fuel_type', fuel_type);
  if (transmission) params.append('transmission', transmission);

  try {
    vehicleGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">Loading fleet...</div>';
    const res = await apiCall(`/vehicles?${params.toString()}`);

    if (res.vehicles.length === 0) {
      vehicleGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">No vehicles match your search criteria.</div>';
      return;
    }

    vehicleGrid.innerHTML = res.vehicles.map(v => {
      const avgRate = v.avg_rating ? parseFloat(v.avg_rating).toFixed(1) : '5.0';
      const revCount = v.review_count || 0;
      const stars = '⭐'.repeat(Math.round(parseFloat(avgRate) || 5));

      return `
        <div class="card">
          <div class="card-img-wrapper" onclick="viewVehicleDetails(${v.id})" style="cursor: pointer;">
            <img src="${v.image_url || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'}" alt="${v.make} ${v.model}" class="card-img" />
            <div style="position: absolute; top: 12px; right: 12px;">
              <span class="status-badge status-${v.status}">${v.status}</span>
            </div>
            <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; color: var(--primary-gold); font-weight: 700;">
              ${stars} ${avgRate} (${revCount})
            </div>
          </div>
          <div class="card-body">
            <div class="card-category">${v.category_name}</div>
            <h3 class="card-title" onclick="viewVehicleDetails(${v.id})" style="cursor: pointer;">${v.year} ${v.make} ${v.model}</h3>
            
            <div class="card-specs">
              <span class="spec-badge">⛽ ${v.fuel_type}</span>
              <span class="spec-badge">⚙️ ${v.transmission}</span>
              <span class="spec-badge">👥 ${v.seating_capacity} Seats</span>
              <span class="spec-badge">🎨 ${v.color}</span>
            </div>

            <div class="card-footer">
              <div class="price-tag">
                <span class="price-amount">$${parseFloat(v.daily_rate).toFixed(2)}</span>
                <span class="price-period">per day</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button onclick="viewVehicleDetails(${v.id})" class="btn btn-secondary btn-sm">Reviews</button>
                ${v.status === 'available' 
                  ? `<button onclick="openBookingModal(${v.id})" class="btn btn-primary btn-sm">Book</button>`
                  : `<button disabled class="btn btn-secondary btn-sm" style="opacity: 0.5; cursor: not-allowed;">N/A</button>`
                }
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    vehicleGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #ef4444;">Error loading vehicles: ${err.message}</div>`;
  }
}

async function viewVehicleDetails(vehicleId) {
  try {
    const res = await apiCall(`/vehicles/${vehicleId}`);
    if (!res.success) return;

    const v = res.vehicle;
    const reviews = res.reviews || [];
    const avgRate = v.avg_rating ? parseFloat(v.avg_rating).toFixed(1) : '5.0';

    const modalOverlay = document.getElementById('booking-modal-overlay');
    const modalBody = document.getElementById('booking-modal-body');

    modalBody.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <img src="${v.image_url}" alt="${v.make}" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;" />
        <div class="card-category">${v.category_name}</div>
        <h2 style="font-size: 1.8rem; margin-bottom: 0.5rem;">${v.year} ${v.make} ${v.model}</h2>
        <div style="color: var(--primary-gold); font-size: 1.3rem; font-weight: 800; margin-bottom: 1rem;">
          $${parseFloat(v.daily_rate).toFixed(2)} / day &nbsp;|&nbsp; ⭐ ${avgRate} (${reviews.length} Customer Reviews)
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem;">${v.category_description || 'Executive luxury vehicle maintained to high standards.'}</p>
        
        <div class="card-specs" style="margin-bottom: 1.5rem;">
          <span class="spec-badge">⛽ Fuel: ${v.fuel_type}</span>
          <span class="spec-badge">⚙️ Transmission: ${v.transmission}</span>
          <span class="spec-badge">👥 Capacity: ${v.seating_capacity} Seats</span>
          <span class="spec-badge">🎨 Color: ${v.color}</span>
          <span class="spec-badge">🏷️ License: ${v.license_plate}</span>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem;">
        <h3 style="font-size: 1.2rem; margin-bottom: 1rem; color: #fff;">Customer Reviews (${reviews.length})</h3>
        
        ${reviews.length === 0 
          ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No reviews submitted for this vehicle yet.</p>'
          : `<div style="display: flex; flex-direction: column; gap: 1rem; max-height: 250px; overflow-y: auto;">
              ${reviews.map(r => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong style="color: #fff; font-size: 0.92rem;">${r.customer_name}</strong>
                    <span style="color: var(--primary-gold); font-size: 0.85rem;">${'⭐'.repeat(r.rating)} (${r.rating}/5)</span>
                  </div>
                  <p style="color: var(--text-muted); font-size: 0.88rem;">${r.comment || 'No comment text.'}</p>
                  <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">${new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              `).join('')}
            </div>`
        }
      </div>

      <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
        ${v.status === 'available' 
          ? `<button onclick="openBookingModal(${v.id})" class="btn btn-primary" style="flex: 1;">Book This Vehicle</button>`
          : `<button disabled class="btn btn-secondary" style="flex: 1; opacity: 0.5;">Currently ${v.status}</button>`
        }
        <button onclick="closeModal('booking-modal-overlay')" class="btn btn-secondary">Close</button>
      </div>
    `;

    modalOverlay.classList.add('active');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openBookingModal(vehicleId) {
  const user = getUser();
  if (!user) {
    showToast('Please sign in or register to book a vehicle', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
    return;
  }

  if (user.role === 'admin') {
    showToast('Admin accounts cannot create customer bookings. Please use a customer account.', 'error');
    return;
  }

  try {
    const res = await apiCall(`/vehicles/${vehicleId}`);
    if (!res.success) return;

    selectedVehicleForBooking = res.vehicle;

    const modalOverlay = document.getElementById('booking-modal-overlay');
    const modalBody = document.getElementById('booking-modal-body');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    modalBody.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <img src="${res.vehicle.image_url}" alt="${res.vehicle.make}" style="width: 140px; height: 90px; object-fit: cover; border-radius: var(--radius-md);" />
        <div>
          <div class="card-category">${res.vehicle.category_name}</div>
          <h3 style="font-size: 1.3rem;">${res.vehicle.year} ${res.vehicle.make} ${res.vehicle.model}</h3>
          <div style="color: var(--primary-gold); font-weight: 700; margin-top: 4px;">
            $${parseFloat(res.vehicle.daily_rate).toFixed(2)} / day
          </div>
        </div>
      </div>

      <form id="booking-form" onsubmit="submitBooking(event, ${res.vehicle.id}, ${res.vehicle.daily_rate})">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Pick-up Date</label>
            <input type="date" id="book-start-date" class="form-control" min="${today}" value="${today}" required onchange="calculateBookingTotal(${res.vehicle.daily_rate})" />
          </div>
          <div class="form-group">
            <label class="form-label">Return Date</label>
            <input type="date" id="book-end-date" class="form-control" min="${tomorrow}" value="${tomorrow}" required onchange="calculateBookingTotal(${res.vehicle.daily_rate})" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select id="book-payment-method" class="form-control">
            <option value="card_on_delivery">Credit / Debit Card on Delivery</option>
            <option value="cash">Cash on Pick-up</option>
            <option value="bank_transfer">Direct Bank Transfer</option>
          </select>
        </div>

        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: var(--text-muted); font-size: 0.9rem;">
            <span>Rental Duration:</span>
            <span id="summary-days">1 day</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.2rem; color: #fff;">
            <span>Total Estimated Cost:</span>
            <span id="summary-cost" style="color: var(--primary-gold);">$${parseFloat(res.vehicle.daily_rate).toFixed(2)}</span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;">Confirm & Book Vehicle</button>
      </form>
    `;

    modalOverlay.classList.add('active');
    calculateBookingTotal(res.vehicle.daily_rate);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function calculateBookingTotal(dailyRate) {
  const startInput = document.getElementById('book-start-date');
  const endInput = document.getElementById('book-end-date');
  const daysSpan = document.getElementById('summary-days');
  const costSpan = document.getElementById('summary-cost');

  if (!startInput || !endInput) return;

  const start = new Date(startInput.value);
  const end = new Date(endInput.value);

  if (end <= start) {
    daysSpan.textContent = 'Invalid dates';
    costSpan.textContent = '$0.00';
    return;
  }

  const diff = Math.abs(end - start);
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  const total = (days * dailyRate).toFixed(2);

  daysSpan.textContent = `${days} day${days > 1 ? 's' : ''}`;
  costSpan.textContent = `$${total}`;
}

async function submitBooking(event, vehicleId, dailyRate) {
  event.preventDefault();
  const start_date = document.getElementById('book-start-date').value;
  const end_date = document.getElementById('book-end-date').value;
  const payment_method = document.getElementById('book-payment-method').value;

  try {
    const res = await apiCall('/rentals', 'POST', {
      vehicle_id: vehicleId,
      start_date,
      end_date,
      payment_method
    });

    closeModal('booking-modal-overlay');
    showToast(res.message, 'success');

    setTimeout(() => {
      window.location.href = 'customer-dashboard.html';
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
