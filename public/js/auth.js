// Authentication form handling
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const res = await apiCall('/auth/login', 'POST', { email, password });
        showToast(res.message, 'success');
        saveAuth(res.token, res.user);

        setTimeout(() => {
          if (res.user.role === 'admin') {
            window.location.href = '/admin-dashboard.html';
          } else {
            window.location.href = '/customer-dashboard.html';
          }
        }, 500);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Handle Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const first_name = document.getElementById('first_name').value.trim();
      const last_name = document.getElementById('last_name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const driver_license = document.getElementById('driver_license').value.trim();
      const address = document.getElementById('address').value.trim();

      try {
        const res = await apiCall('/auth/register', 'POST', {
          email,
          password,
          first_name,
          last_name,
          phone,
          driver_license,
          address
        });
        showToast(res.message, 'success');
        saveAuth(res.token, res.user);

        setTimeout(() => {
          window.location.href = '/customer-dashboard.html';
        }, 500);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});
