   Initialization, navigation, and animations
   ============================================ */

// Configuración de WhatsApp (Rotación de vendedores)
const WA_NUMBERS = ['5493562529773', '5493562572881']; 

function getWhatsAppUrl(mensaje) {
  const num = WA_NUMBERS[Math.floor(Math.random() * WA_NUMBERS.length)];
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initMobileMenu();
  initScrollAnimations();
  initBackToTop();
  initCatalog();
  initForm();
  initReviews();
  initWhatsAppRotation();
});

// ── Navbar Scroll Behavior ──
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check
}

// ── Smooth Scroll for Anchor Links ──
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId.split('?')[0]);
      if (target) {
        e.preventDefault();
        closeMobileMenu();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ── Mobile Menu ──
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

function closeMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger) hamburger.classList.remove('active');
  if (mobileMenu) mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Scroll Animations (Intersection Observer) ──
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// ── Back to Top Button ──
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Active Nav Link Highlighting ──
function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');

  let current = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// ── Review Ticker (Continuous Scroll) ──
function initReviews() {
  const track = document.getElementById('reviews-track');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.review-slide'));
  if (slides.length === 0) return;

  // Clear track and re-populate (to avoid duplicate clones on re-init)
  track.innerHTML = '';
  slides.forEach(slide => track.appendChild(slide.cloneNode(true)));
  
  // Clone slides to ensure continuity for the -50% jump
  slides.forEach(slide => {
    const clone = slide.cloneNode(true);
    track.appendChild(clone);
  });

  function updateAnimationSpeed() {
    const isMobile = window.innerWidth < 768;
    // Seconds per slide (shorter = faster). More seconds = slower on mobile.
    const speedFactor = isMobile ? 18 : 10; 
    const duration = slides.length * speedFactor;
    track.style.animationDuration = `${duration}s`;
  }

  updateAnimationSpeed();
  
  // Handle window resize to adjust speed responsiveness
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateAnimationSpeed, 250);
  });
}

// ── WhatsApp Floating Button Rotation ──
function initWhatsAppRotation() {
  const waBtn = document.querySelector('.whatsapp-float');
  if (waBtn) {
    waBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = getWhatsAppUrl('Hola, quiero consultar por un vehículo');
      window.open(url, '_blank');
    });
  }
}
