/**
 * Main JavaScript - Portfolio Interactions
 * Handles scroll animations, 3D tilt effects, navigation, and parallax
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initNavigation();
  initScrollReveal();
  init3DTilt();
  initHeroParallax();
  initSmoothScroll();
  initContactForm();
});

/**
 * Navigation functionality
 */
function initNavigation() {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  
  // Scroll effect for nav
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });
  
  // Mobile menu toggle
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
  
  // Close mobile menu on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      navToggle.classList.remove('active');
    });
  });
}

/**
 * Scroll reveal animations using Intersection Observer
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optionally unobserve after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  revealElements.forEach(el => observer.observe(el));
}

/**
 * 3D Tilt effect for project cards
 */
function init3DTilt() {
  const cards = document.querySelectorAll('[data-tilt]');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20; // Max ~5deg
      const rotateY = (x - centerX) / 20;
      
      card.style.transform = `
        perspective(1000px)
        rotateX(${-rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(1.02, 1.02, 1.02)
      `;
      card.style.transition = 'transform 0.1s ease-out';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  });
}

/**
 * Hero parallax effect on mouse move
 */
function initHeroParallax() {
  const hero = document.getElementById('hero');
  const heroContent = document.getElementById('hero-content');
  
  if (!hero || !heroContent) return;
  
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Subtle movement opposite to mouse (max ~15px)
    const moveX = -x * 15;
    const moveY = -y * 15;
    
    heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
  
  hero.addEventListener('mouseleave', () => {
    heroContent.style.transform = 'translate(0, 0)';
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        const navHeight = document.getElementById('nav').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Contact form handling
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = `
      <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      Sending...
    `;
    submitBtn.disabled = true;
    
    // Simulate form submission (replace with actual endpoint)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Show success state
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Message Sent!
    `;
    submitBtn.style.background = '#10b981';
    
    // Reset form
    form.reset();
    
    // Reset button after delay
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.style.background = '';
      submitBtn.disabled = false;
    }, 3000);
  });
}

/**
 * Add CSS for spinner animation
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);
