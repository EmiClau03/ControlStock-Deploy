/* ============================================
   Automotores Marcos — Vehicle Catalog Module
   Conectado al sistema de stock en tiempo real
   ============================================ */

// ── Config ──
const API_URL = '/api/public/catalog';
const REFRESH_INTERVAL = 30000; // Actualizar cada 30 segundos

// ── State ──
let VEHICLES = [];
let currentFilter = 'todos';
let searchQuery = '';
let brandFilter = '';      // marca seleccionada (string vacío = todas)
let yearFilter  = 'todos'; // rango de año seleccionado
let visibleCount = 9;
let isLoading = true;

// ── Fetch vehicles from API ──
async function fetchVehicles() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Error al cargar el catálogo');
    const data = await res.json();

    // Mapear datos del servidor al formato de la landing
    VEHICLES = data.map(v => {
      // Formatear kilometraje
      const km = v.mileage ? Number(v.mileage).toLocaleString('es-AR') + ' km' : 'Consultar';
      
      // Formatear precio
      const precio = v.price ? '$' + Number(v.price).toLocaleString('es-AR') : 'Consultar';
      
      // Formatear precio de oferta
      const precioOferta = v.offer_price ? '$' + Number(v.offer_price).toLocaleString('es-AR') : null;

      // Imagen principal (primera foto o placeholder)
      const imagenPrincipal = v.photos && v.photos.length > 0
        ? v.photos[0].url
        : null;
      
      // Todas las fotos
      const fotos = v.photos ? v.photos.map(p => p.url) : [];

      return {
        id: v.id,
        marca: v.brand || 'Sin marca',
        modelo: v.model || 'Sin modelo',
        año: v.year || '',
        kilometraje: km,
        precio: precio,
        precioOferta: precioOferta,
        isOffer: v.is_offer === 1,
        color: v.color || '',
        combustible: v.fuel || '',
        patente: v.license_plate || '',
        estado: v.status || '',
        tipo: 'todos', // Sin clasificación de tipo por ahora
        imagen: imagenPrincipal,
        fotos: fotos,
        tienefotos: fotos.length > 0,
        photoCount: v.photoCount || 0,
        descripcion: generarDescripcion(v)
      };
    });

    isLoading = false;
    populateBrandFilter();
    renderVehicles();
  } catch (error) {
    console.error('Error cargando catálogo:', error);
    isLoading = false;
    renderError();
  }
}

// ── Populate brand dropdown dynamically ──
function populateBrandFilter() {
  const select = document.getElementById('brand-filter');
  if (!select) return;

  // Extraer marcas únicas y ordenarlas, evitando duplicados por espacios o minúsculas
  const brandMap = new Map();
  VEHICLES.forEach(v => {
    if (v.marca) {
      const normalized = v.marca.trim();
      if (!brandMap.has(normalized.toLowerCase())) {
        brandMap.set(normalized.toLowerCase(), normalized);
      }
    }
  });

  const brands = Array.from(brandMap.values()).sort();

  // Remove all options except the first ("Todas las marcas")
  while (select.options.length > 1) select.remove(1);

  brands.forEach(brand => {
    const opt = document.createElement('option');
    opt.value = brand;
    opt.textContent = brand;
    select.appendChild(opt);
  });
}

// ── Match vehicle year against selected range ──
function matchesYearRange(año, range) {
  if (range === 'todos') return true;
  const y = parseInt(año, 10);
  if (isNaN(y)) return false;
  
  switch (range) {
    case 'hasta2000':  return y <= 2000;
    case '2000-2005':  return y >= 2000 && y <= 2005;
    case '2006-2010':  return y >= 2006 && y <= 2010;
    case '2011-2015':  return y >= 2011 && y <= 2015;
    case '2016-2020':  return y >= 2016 && y <= 2020;
    case 'desde2020':  return y > 2020;
    default: return true;
  }
}

// ── Check if any filter is active ──
function hasActiveFilters() {
  return searchQuery !== '' || brandFilter !== '' || yearFilter !== 'todos';
}

// ── Generar descripción automática ──
function generarDescripcion(v) {
  const partes = [];
  if (v.brand && v.model) partes.push(`${v.brand} ${v.model}`);
  if (v.year) partes.push(`Año ${v.year}`);
  if (v.color) partes.push(`Color ${v.color}`);
  if (v.fuel) partes.push(`Combustible: ${v.fuel}`);
  if (v.mileage) partes.push(`${Number(v.mileage).toLocaleString('es-AR')} kilómetros recorridos`);
  
  if (partes.length > 0) {
    return partes.join('. ') + '. Consultanos para más información y financiación.';
  }
  return 'Consultanos para más información sobre este vehículo. Financiación disponible.';
}

// ── Placeholder SVG para vehículos sin foto ──
function getPlaceholderSVG(marca, modelo) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect fill="#0B1426" width="800" height="500"/><rect fill="#12203D" x="200" y="150" width="400" height="200" rx="20"/><text x="400" y="230" fill="#3B82F6" text-anchor="middle" font-family="Inter,sans-serif" font-size="20" font-weight="600">${marca}</text><text x="400" y="260" fill="#60A5FA" text-anchor="middle" font-family="Inter,sans-serif" font-size="16">${modelo}</text><text x="400" y="310" fill="#3B82F680" text-anchor="middle" font-family="Inter,sans-serif" font-size="13">Fotos próximamente</text></svg>`)}`;
}

// ── Render Vehicle Cards ──
function renderVehicles() {
  const container = document.getElementById('vehicles-grid');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const noResults = document.getElementById('no-results');

  if (!container) return;

  // Show loading
  if (isLoading) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-brand-300/60 text-sm font-medium">Cargando catálogo...</p>
      </div>
    `;
    return;
  }

  // Filter vehicles
  let filtered = VEHICLES.filter(v => {
    const matchesFilter = currentFilter === 'todos' || v.tipo === currentFilter;
    const matchesSearch = searchQuery === '' ||
      v.marca.toLowerCase().includes(searchQuery) ||
      v.modelo.toLowerCase().includes(searchQuery) ||
      `${v.marca} ${v.modelo}`.toLowerCase().includes(searchQuery);
    const matchesBrand = brandFilter === '' || 
      (v.marca && v.marca.trim().toLowerCase() === brandFilter.toLowerCase());
    const matchesYear  = matchesYearRange(v.año, yearFilter);
    return matchesFilter && matchesSearch && matchesBrand && matchesYear;
  });

  // Show/hide reset button
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    if (hasActiveFilters()) {
      resetBtn.classList.remove('hidden');
      resetBtn.classList.add('flex');
    } else {
      resetBtn.classList.add('hidden');
      resetBtn.classList.remove('flex');
    }
  }

  // Show/hide no results
  if (noResults) {
    noResults.classList.toggle('hidden', filtered.length > 0);
  }

  // Limit visible
  const toShow = filtered.slice(0, visibleCount);

  // Show/hide load more
  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle('hidden', filtered.length <= visibleCount);
  }

  // Update counter
  const counter = document.getElementById('vehicle-count');
  if (counter) {
    counter.textContent = `${filtered.length} vehículo${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`;
  }

  // Render cards
  container.innerHTML = toShow.map((vehicle, index) => {
    const imgSrc = vehicle.imagen || getPlaceholderSVG(vehicle.marca, vehicle.modelo);
    const hasPhotos = vehicle.tienefotos;
    const hasMultiple = vehicle.fotos.length > 1;
    
    let cardClass = '';
    if (vehicle.estado === 'Vendido') {
      cardClass = 'vehicle-card vehicle-sold bg-white rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200 grayscale-[0.6] opacity-80';
    } else if (vehicle.estado === 'Muy Visto') {
      cardClass = 'vehicle-card vehicle-featured vehicle-hot bg-white rounded-2xl overflow-hidden shadow-xl ring-2 ring-orange-500/30 animate-pulse-gentle';
    } else if (hasPhotos) {
      cardClass = 'vehicle-card vehicle-featured bg-white rounded-2xl overflow-hidden shadow-lg ring-1 ring-brand-500/20';
    } else {
      cardClass = 'vehicle-card bg-white rounded-2xl overflow-hidden shadow-md opacity-90';
    }

    // Flechas de navegación para tarjetas con múltiples fotos
    const arrowsHTML = hasMultiple ? `
      <button class="card-arrow left" onclick="event.stopPropagation(); cardPrevPhoto(${vehicle.id})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button class="card-arrow right" onclick="event.stopPropagation(); cardNextPhoto(${vehicle.id})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <div class="card-dots">
        ${vehicle.fotos.map((_, i) => `<button class="card-dot ${i === 0 ? 'active' : ''}" data-card-id="${vehicle.id}" data-dot-idx="${i}"></button>`).join('')}
      </div>
    ` : '';

    return `
    <div class="${cardClass} animate-on-scroll delay-${(index % 4) + 1}"
         data-vehicle-id="${vehicle.id}">
      <div class="vehicle-image card-carousel relative overflow-hidden aspect-vehicle" data-carousel-id="${vehicle.id}" data-current-idx="0">
        <img id="card-img-${vehicle.id}" src="${imgSrc}"
             alt="${vehicle.marca} ${vehicle.modelo} ${vehicle.año}"
             class="w-full h-full object-cover"
             loading="lazy"
             onerror="this.src='${getPlaceholderSVG(vehicle.marca, vehicle.modelo)}'">
        <div class="absolute top-3 right-3">
          <span class="bg-brand-900/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            ${vehicle.año || '—'}
          </span>
        </div>
        ${vehicle.combustible ? `
        <div class="absolute top-3 left-3">
          <span class="bg-brand-500/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
            ${vehicle.combustible}
          </span>
        </div>` : ''}
        ${vehicle.estado === 'Vendido' ? `
        <div class="absolute inset-0 bg-black/40 z-20 flex items-center justify-center">
          <span class="bg-red-600/90 text-white text-xl font-black px-6 py-2 rounded-xl shadow-lg transform -rotate-12 border border-white/50 uppercase tracking-widest backdrop-blur-md">
            VENDIDO
          </span>
        </div>` : ''}
        ${vehicle.estado === 'Muy Visto' ? `
        <div class="absolute bottom-3 left-3 z-10 animate-bounce-slow">
          <span class="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider border border-orange-400">
            <i class="fa-solid fa-fire"></i> MUY VISTO
          </span>
        </div>` : ''}
        ${vehicle.isOffer ? `
        <div class="absolute bottom-3 right-3 z-10">
          <span class="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider border border-red-500 animate-pulse-gentle">
            <i class="fa-solid fa-tag"></i> OFERTA
          </span>
        </div>` : ''}
        ${arrowsHTML}
      </div>
      <div class="p-5 cursor-pointer" onclick="openVehicleModal(${vehicle.id})">
        <h3 class="font-heading font-bold text-lg text-brand-900 mb-1">
          ${vehicle.marca} ${vehicle.modelo}
        </h3>
        <div class="flex items-center gap-3 text-sm text-slate-500 mb-4">
          <span class="flex items-center gap-1">
            <i class="fa-solid fa-road text-xs"></i> ${vehicle.kilometraje}
          </span>
          ${vehicle.color ? `
          <span class="flex items-center gap-1">
            <i class="fa-solid fa-palette text-xs"></i> ${vehicle.color}
          </span>` : ''}
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex flex-col">
            ${vehicle.isOffer ? `
              <span class="text-xs text-slate-400 line-through decoration-red-500/50 decoration-2 font-medium">
                ${vehicle.precio}
              </span>
              <span class="text-xl font-heading font-bold text-red-600">
                ${vehicle.precioOferta}
              </span>
            ` : `
              <span class="text-xl font-heading font-bold text-brand-500">
                ${vehicle.precio}
              </span>
            `}
          </div>
          <div class="flex items-center gap-2">
            ${vehicle.estado === 'Vendido' ? `
              <span class="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-sm font-semibold">
                Vendido
              </span>
            ` : `
              <a href="https://wa.me/5493562529773?text=${encodeURIComponent(`Hola, vi tu anuncio sobre el ${vehicle.marca} ${vehicle.modelo} ${vehicle.año}`)}" 
                 target="_blank" 
                 onclick="event.stopPropagation()"
                 class="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-green-500/20">
                <i class="fa-brands fa-whatsapp text-lg"></i>
              </a>
              <span class="vehicle-cta px-4 py-2 bg-slate-100 text-brand-900 rounded-xl text-sm font-semibold hover:bg-brand-500 hover:text-white transition-all duration-300">
                Ver más
              </span>
            `}
          </div>
        </div>
      </div>
    </div>
  `}).join('');

  // Trigger scroll animations for new cards
  setTimeout(() => {
    document.querySelectorAll('.vehicle-card.animate-on-scroll').forEach(card => {
      observeElement(card);
    });
  }, 50);
}

// ── Render Error ──
function renderError() {
  const container = document.getElementById('vehicles-grid');
  if (!container) return;
  container.innerHTML = `
    <div class="col-span-full text-center py-16">
      <i class="fa-solid fa-triangle-exclamation text-5xl text-brand-700 mb-4"></i>
      <p class="text-lg text-brand-300/70 font-medium">No se pudo cargar el catálogo</p>
      <p class="text-sm text-brand-300/40 mt-1">Intentá de nuevo más tarde</p>
      <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-400 transition-all">
        Reintentar
      </button>
    </div>
  `;
}

// ── Card Carousel Navigation ──
function cardChangePhoto(vehicleId, direction) {
  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  if (!vehicle || vehicle.fotos.length <= 1) return;

  const carousel = document.querySelector(`[data-carousel-id="${vehicleId}"]`);
  if (!carousel) return;

  let currentIdx = parseInt(carousel.dataset.currentIdx || '0');
  currentIdx += direction;

  if (currentIdx < 0) currentIdx = vehicle.fotos.length - 1;
  if (currentIdx >= vehicle.fotos.length) currentIdx = 0;

  carousel.dataset.currentIdx = currentIdx;

  // Update image with smooth transition
  const img = document.getElementById(`card-img-${vehicleId}`);
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = vehicle.fotos[currentIdx];
      img.style.opacity = '1';
    }, 120);
    img.style.transition = 'opacity 0.15s ease';
  }

  // Update dots
  carousel.querySelectorAll('.card-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIdx);
  });
}

function cardPrevPhoto(vehicleId) { cardChangePhoto(vehicleId, -1); }
function cardNextPhoto(vehicleId) { cardChangePhoto(vehicleId, 1); }

// ── Vehicle Detail Modal ──
function openVehicleModal(vehicleId) {
  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  if (!vehicle) return;

  const modal = document.getElementById('vehicle-modal');
  const content = document.getElementById('modal-vehicle-content');

  if (!modal || !content) return;

  const mainImg = vehicle.imagen || getPlaceholderSVG(vehicle.marca, vehicle.modelo);
  const hasMultiplePhotos = vehicle.fotos.length > 1;

  // Store current modal vehicle for arrow navigation
  window._modalVehicleId = vehicleId;
  window._modalPhotoIdx = 0;

  // Flechas de navegación en el modal
  const modalArrowsHTML = hasMultiplePhotos ? `
    <button class="modal-arrow left" onclick="modalPrevPhoto()">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <button class="modal-arrow right" onclick="modalNextPhoto()">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
    <div class="modal-photo-counter">
      <span id="modal-photo-current">1</span> / ${vehicle.fotos.length}
    </div>
  ` : '';

  content.innerHTML = `
    <div class="relative">
      <img id="modal-main-photo" src="${mainImg}"
           alt="${vehicle.marca} ${vehicle.modelo}"
           class="w-full object-contain bg-brand-950" style="max-height: 480px; min-height: 280px;"
           onerror="this.src='${getPlaceholderSVG(vehicle.marca, vehicle.modelo)}'">
      <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-brand-900/50 to-transparent pointer-events-none"></div>
      <div class="absolute bottom-4 left-6">
        <span class="bg-brand-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">${vehicle.combustible || 'Vehículo'}</span>
      </div>
      ${modalArrowsHTML}
    </div>
    <div class="p-6 md:p-8">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 class="font-heading font-bold text-2xl md:text-3xl text-brand-900">
            ${vehicle.marca} ${vehicle.modelo}
          </h2>
          <p class="text-slate-500 mt-1">${vehicle.año ? `Año ${vehicle.año}` : ''}</p>
        </div>
        <div class="flex flex-col items-end">
          ${vehicle.estado === 'Vendido' ? `
            <span class="text-3xl md:text-4xl font-heading font-bold text-slate-500 whitespace-nowrap">
              Vendido
            </span>
            <span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded mt-1 uppercase tracking-tight">NO DISPONIBLE</span>
          ` : vehicle.isOffer ? `
            <span class="text-sm md:text-base text-slate-400 line-through decoration-red-500/50 decoration-2 font-medium mb-1">
              ${vehicle.precio}
            </span>
            <span class="text-3xl md:text-4xl font-heading font-bold text-red-600 whitespace-nowrap">
              ${vehicle.precioOferta}
            </span>
            <span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded mt-1 uppercase tracking-tight">OFERTA ESPECIAL</span>
          ` : `
            <span class="text-2xl md:text-3xl font-heading font-bold text-brand-500 whitespace-nowrap">
              ${vehicle.precio}
            </span>
          `}
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        ${vehicle.año ? `
        <div class="bg-slate-50 rounded-xl p-4 text-center">
          <i class="fa-solid fa-calendar text-brand-500 text-lg mb-2"></i>
          <p class="text-xs text-slate-500">Año</p>
          <p class="font-semibold text-brand-900">${vehicle.año}</p>
        </div>` : ''}
        <div class="bg-slate-50 rounded-xl p-4 text-center">
          <i class="fa-solid fa-road text-brand-500 text-lg mb-2"></i>
          <p class="text-xs text-slate-500">Kilometraje</p>
          <p class="font-semibold text-brand-900">${vehicle.kilometraje}</p>
        </div>
        ${vehicle.color ? `
        <div class="bg-slate-50 rounded-xl p-4 text-center">
          <i class="fa-solid fa-palette text-brand-500 text-lg mb-2"></i>
          <p class="text-xs text-slate-500">Color</p>
          <p class="font-semibold text-brand-900">${vehicle.color}</p>
        </div>` : ''}
        ${vehicle.combustible ? `
        <div class="bg-slate-50 rounded-xl p-4 text-center">
          <i class="fa-solid fa-gas-pump text-brand-500 text-lg mb-2"></i>
          <p class="text-xs text-slate-500">Combustible</p>
          <p class="font-semibold text-brand-900 capitalize">${vehicle.combustible}</p>
        </div>` : ''}
      </div>

      <div class="mb-8">
        <h3 class="font-heading font-semibold text-lg text-brand-900 mb-2">Descripción</h3>
        <p class="text-slate-600 leading-relaxed">${vehicle.descripcion}</p>
      </div>

      ${vehicle.estado === 'Vendido' ? `
      <div class="p-4 bg-slate-100 rounded-xl text-center">
        <p class="text-slate-500 font-semibold mb-2">Este vehículo ya ha sido vendido.</p>
        <button onclick="closeVehicleModal()" class="bg-slate-300 hover:bg-slate-400 text-slate-700 font-medium py-2 px-6 rounded-lg transition-colors">Volver al catálogo</button>
      </div>
      ` : `
      <div class="flex flex-col sm:flex-row gap-3">
        <button onclick="consultVehicle('${vehicle.marca}', '${vehicle.modelo}', '${vehicle.año}')"
                class="flex-1 submit-btn bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-300">
          <i class="fa-solid fa-envelope mr-2"></i> Consultar por este vehículo
        </button>
        <a href="https://wa.me/3562529773?text=${encodeURIComponent(`Hola, vi tu anuncio sobre el ${vehicle.marca} ${vehicle.modelo} ${vehicle.año}`)}"
           target="_blank"
           class="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-6 rounded-xl text-center transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
          <i class="fa-brands fa-whatsapp text-lg"></i> WhatsApp
        </a>
      </div>
      `}
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ── Modal Photo Navigation ──
function modalChangePhoto(direction) {
  const vehicle = VEHICLES.find(v => v.id === window._modalVehicleId);
  if (!vehicle || vehicle.fotos.length <= 1) return;

  window._modalPhotoIdx += direction;
  if (window._modalPhotoIdx < 0) window._modalPhotoIdx = vehicle.fotos.length - 1;
  if (window._modalPhotoIdx >= vehicle.fotos.length) window._modalPhotoIdx = 0;

  const mainPhoto = document.getElementById('modal-main-photo');
  if (mainPhoto) {
    mainPhoto.style.opacity = '0';
    setTimeout(() => {
      mainPhoto.src = vehicle.fotos[window._modalPhotoIdx];
      mainPhoto.style.opacity = '1';
    }, 150);
    mainPhoto.style.transition = 'opacity 0.15s ease';
  }

  // Update counter
  const counter = document.getElementById('modal-photo-current');
  if (counter) counter.textContent = window._modalPhotoIdx + 1;
}

function modalPrevPhoto() { modalChangePhoto(-1); }
function modalNextPhoto() { modalChangePhoto(1); }

function closeVehicleModal() {
  const modal = document.getElementById('vehicle-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    window._modalVehicleId = null;
  }
}

// ── Consult Vehicle (navigate to form) ──
function consultVehicle(marca, modelo, año) {
  closeVehicleModal();

  // Auto-fill form
  const vehicleInput = document.getElementById('vehiculo-consultado');
  if (vehicleInput) {
    vehicleInput.value = `${marca} ${modelo} ${año}`;
    vehicleInput.classList.add('vehicle-auto');
  }

  // Scroll to contact section
  const contactSection = document.getElementById('contacto');
  if (contactSection) {
    setTimeout(() => {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
}

// ── Filter & Search Handlers ──
function setFilter(filter) {
  currentFilter = filter;
  visibleCount = 9;

  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderVehicles();
}

function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  visibleCount = 9;
  renderVehicles();
}

function handleBrandFilter(e) {
  brandFilter = e.target.value;
  visibleCount = 9;
  renderVehicles();
}

function setYearFilter(range) {
  yearFilter = range;
  visibleCount = 9;

  // Update active year pill
  document.querySelectorAll('.year-btn').forEach(btn => {
    const isActive = btn.dataset.year === range;
    btn.classList.toggle('active-year', isActive);
    btn.classList.toggle('text-brand-200', isActive);
    btn.classList.toggle('text-brand-300/60', !isActive);
  });

  renderVehicles();
}

function resetAllFilters() {
  searchQuery = '';
  brandFilter = '';
  yearFilter  = 'todos';
  visibleCount = 9;

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const brandSelect = document.getElementById('brand-filter');
  if (brandSelect) brandSelect.value = '';

  // Reset year pills
  document.querySelectorAll('.year-btn').forEach(btn => {
    const isAll = btn.dataset.year === 'todos';
    btn.classList.toggle('active-year', isAll);
    btn.classList.toggle('text-brand-200', isAll);
    btn.classList.toggle('text-brand-300/70', !isAll);
  });

  renderVehicles();
}

function loadMore() {
  visibleCount += 6;
  renderVehicles();
}

// ── Intersection Observer for Card Animations ──
function observeElement(el) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  observer.observe(el);
}

// ── Initialize Catalog ──
function initCatalog() {
  // Cargar vehículos desde el servidor
  fetchVehicles();

  // Auto-refresh cada 30 segundos para datos en tiempo real
  setInterval(fetchVehicles, REFRESH_INTERVAL);

  // Bind filter buttons (type)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  // Bind year pills
  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => setYearFilter(btn.dataset.year));
  });

  // Bind brand dropdown
  const brandSelect = document.getElementById('brand-filter');
  if (brandSelect) {
    brandSelect.addEventListener('change', handleBrandFilter);
  }

  // Bind reset button
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }

  // Bind search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // Bind load more
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMore);
  }

  // Close modal on overlay click
  const modal = document.getElementById('vehicle-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVehicleModal();
    });
  }

  // Close modal on Escape + Arrow keys for photo navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVehicleModal();
    if (e.key === 'ArrowLeft' && window._modalVehicleId) modalPrevPhoto();
    if (e.key === 'ArrowRight' && window._modalVehicleId) modalNextPhoto();
  });
}
