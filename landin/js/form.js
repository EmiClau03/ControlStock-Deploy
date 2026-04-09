/* ============================================
   Automotores Marcos — Form Module
   Smart contact form with URL param auto-detection
   ============================================ */

// ── Initialize Form ──
function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Check URL for vehicle parameter
  autoFillVehicle();

  // Listen for hash changes
  window.addEventListener('hashchange', autoFillVehicle);

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Clear vehicle field button
  const clearBtn = document.getElementById('clear-vehicle');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearVehicleField);
  }
}

// ── Auto-fill Vehicle from URL ──
function autoFillVehicle() {
  const hash = window.location.hash;
  if (!hash.includes('vehiculo=')) return;

  const params = hash.split('?')[1];
  if (!params) return;

  const urlParams = new URLSearchParams(params);
  const vehicleSlug = urlParams.get('vehiculo');

  if (vehicleSlug) {
    const vehicleName = vehicleSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const vehicleInput = document.getElementById('vehiculo-consultado');
    if (vehicleInput) {
      vehicleInput.value = vehicleName;
      vehicleInput.classList.add('vehicle-auto');
    }

    // Show clear button
    const clearBtn = document.getElementById('clear-vehicle');
    if (clearBtn) {
      clearBtn.classList.remove('hidden');
    }
  }
}

// ── Clear Vehicle Field ──
function clearVehicleField() {
  const vehicleInput = document.getElementById('vehiculo-consultado');
  const clearBtn = document.getElementById('clear-vehicle');

  if (vehicleInput) {
    vehicleInput.value = '';
    vehicleInput.classList.remove('vehicle-auto');
  }

  if (clearBtn) {
    clearBtn.classList.add('hidden');
  }

  // Clear URL hash
  const hash = window.location.hash;
  if (hash.includes('vehiculo=')) {
    window.location.hash = 'contacto';
  }
}

// ── Form Validation ──
function validateForm(formData) {
  const errors = [];

  if (!formData.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
  }

  if (!formData.apellido.trim()) {
    errors.push({ field: 'apellido', message: 'El apellido es obligatorio' });
  }

  if (!formData.telefono.trim()) {
    errors.push({ field: 'telefono', message: 'El teléfono es obligatorio' });
  } else if (!/^[\d\s\-\+\(\)]{7,20}$/.test(formData.telefono)) {
    errors.push({ field: 'telefono', message: 'Ingrese un teléfono válido' });
  }

  return errors;
}

// ── Show Field Error ──
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.add('border-red-400', 'bg-red-50');
  field.classList.remove('border-slate-200');

  // Create error message
  let errorEl = field.parentElement.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'field-error text-red-500 text-xs mt-1';
    field.parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

// ── Clear Field Errors ──
function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.border-red-400').forEach(el => {
    el.classList.remove('border-red-400', 'bg-red-50');
    el.classList.add('border-slate-200');
  });
}

// ── Handle Form Submit ──
function handleFormSubmit(e) {
  e.preventDefault();

  clearFieldErrors();

  const formData = {
    nombre: document.getElementById('nombre').value,
    apellido: document.getElementById('apellido').value,
    telefono: document.getElementById('telefono').value,
    mensaje: document.getElementById('mensaje').value,
    vehiculo: document.getElementById('vehiculo-consultado').value
  };

  // Validate
  const errors = validateForm(formData);

  if (errors.length > 0) {
    errors.forEach(err => showFieldError(err.field, err.message));
    return;
  }

  // Show loading state
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Enviando...';
  submitBtn.disabled = true;

  // Submit to API
  fetch('/api/public/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(res => {
    if (!res.ok) throw new Error('Error en el servidor');
    return res.json();
  })
  .then(data => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;

    // Show success toast
    showToast('¡Consulta enviada con éxito! Nos pondremos en contacto pronto.', 'success');

    // Reset form
    e.target.reset();
    clearVehicleField();
  })
  .catch(err => {
    console.error('Error al enviar consulta:', err);
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    showToast('Error al enviar la consulta. Intente nuevamente por WhatsApp.', 'error');
  });
}

// ── Toast Notification ──
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md ${
    type === 'success'
      ? 'bg-green-500 text-white'
      : 'bg-red-500 text-white'
  }`;

  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-lg"></i>
    <span class="text-sm font-medium">${message}</span>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
