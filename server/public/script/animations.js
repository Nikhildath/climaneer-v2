// Advanced animations and visual effects for AQUACLIMA dashboard

// Particle system for floating background elements
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.init();
  }

  init() {
    // Create canvas for particles
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.opacity = '0.1';
    
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    this.resize();
    this.createParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 15000);
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        color: `hsl(${200 + Math.random() * 60}, 70%, 60%)`
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.x > this.canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas.height;
      if (particle.y > this.canvas.height) particle.y = 0;
      
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fill();
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

// Smooth scroll animations
class ScrollAnimations {
  constructor() {
    this.observedElements = new Set();
    this.init();
  }

  init() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    this.observeElements();
  }

  observeElements() {
    const elements = document.querySelectorAll('.sensor-card, .status-card, .info-card, .control-panel');
    elements.forEach(el => {
      if (!this.observedElements.has(el)) {
        el.classList.add('animate-on-scroll');
        this.observer.observe(el);
        this.observedElements.add(el);
      }
    });
  }
}

// Advanced hover effects
class HoverEffects {
  constructor() {
    this.init();
  }

  init() {
    this.addCardHoverEffects();
    this.addButtonHoverEffects();
    this.addIconAnimations();
  }

  addCardHoverEffects() {
    const cards = document.querySelectorAll('.sensor-card, .status-card, .info-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', (e) => {
        this.createHoverGlow(e.target);
      });
      
      card.addEventListener('mouseleave', (e) => {
        this.removeHoverGlow(e.target);
      });
      
      card.addEventListener('mousemove', (e) => {
        this.updateCardTilt(e);
      });
    });
  }

  createHoverGlow(element) {
    const glow = element.querySelector('.card-glow');
    if (glow) {
      glow.style.opacity = '0.1';
    }
  }

  removeHoverGlow(element) {
    const glow = element.querySelector('.card-glow');
    if (glow) {
      glow.style.opacity = '0';
    }
    
    // Reset tilt
    element.style.transform = '';
  }

  updateCardTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);
    
    const tiltX = deltaY * 5;
    const tiltY = deltaX * -5;
    
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)`;
  }

  addButtonHoverEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px) scale(1.02)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = '';
      });
    });
  }

  addIconAnimations() {
    const icons = document.querySelectorAll('.sensor-icon, .info-icon');
    
    icons.forEach(icon => {
      icon.addEventListener('mouseenter', () => {
        icon.style.transform = 'scale(1.1) rotate(5deg)';
      });
      
      icon.addEventListener('mouseleave', () => {
        icon.style.transform = '';
      });
    });
  }
}

// Progress animations
class ProgressAnimations {
  constructor() {
    this.init();
  }

  init() {
    this.animateProgressRings();
    this.animateProgressBars();
  }

  animateProgressRings() {
    const rings = document.querySelectorAll('.progress-ring-fill');
    
    rings.forEach(ring => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateRing(ring);
          }
        });
      });
      
      observer.observe(ring);
    });
  }

  animateRing(ring) {
    const circumference = 220;
    ring.style.strokeDashoffset = circumference;
    
    setTimeout(() => {
      ring.style.transition = 'stroke-dashoffset 1.5s ease-out';
      const targetOffset = ring.style.strokeDashoffset || circumference;
      ring.style.strokeDashoffset = targetOffset;
    }, 100);
  }

  animateProgressBars() {
    const bars = document.querySelectorAll('.gauge-fill, .confidence-fill, .aqi-fill');
    
    bars.forEach(bar => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateBar(bar);
          }
        });
      });
      
      observer.observe(bar);
    });
  }

  animateBar(bar) {
    const targetWidth = bar.style.width || '0%';
    bar.style.width = '0%';
    
    setTimeout(() => {
      bar.style.transition = 'width 1.2s ease-out';
      bar.style.width = targetWidth;
    }, 200);
  }
}

// Water flow animation
class WaterFlowAnimation {
  constructor() {
    this.init();
  }

  init() {
    this.createFlowParticles();
  }

  createFlowParticles() {
    const flowContainers = document.querySelectorAll('.flow-animation');
    
    flowContainers.forEach(container => {
      this.animateFlow(container);
    });
  }

  animateFlow(container) {
    const particles = container.querySelector('.flow-particles');
    if (!particles) return;
    
    // Create multiple flowing particles
    for (let i = 0; i < 3; i++) {
      const particle = document.createElement('div');
      particle.className = 'flow-particle';
      particle.style.cssText = `
        position: absolute;
        width: 6px;
        height: 6px;
        background: var(--primary-color);
        border-radius: 50%;
        top: 50%;
        left: -10px;
        transform: translateY(-50%);
        animation: flow 3s infinite linear;
        animation-delay: ${i * 1}s;
        opacity: 0.7;
      `;
      
      particles.appendChild(particle);
    }
  }
}

// Notification animations
class NotificationAnimations {
  constructor() {
    this.init();
  }

  init() {
    this.observeNotifications();
  }

  observeNotifications() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const notification = mutation.target;
          if (notification.classList.contains('notification')) {
            this.animateNotification(notification);
          }
        }
      });
    });

    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
      observer.observe(notification, { attributes: true });
    });
  }

  animateNotification(notification) {
    if (notification.style.display === 'flex') {
      notification.style.animation = 'slideInRight 0.4s ease-out';
    }
  }
}

// Loading animations
class LoadingAnimations {
  constructor() {
    this.init();
  }

  init() {
    this.createLoadingSpinners();
    this.animateSkeletonLoaders();
  }

  createLoadingSpinners() {
    const loadingElements = document.querySelectorAll('[data-loading]');
    
    loadingElements.forEach(element => {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.innerHTML = '<div class="spinner-ring"></div>';
      element.appendChild(spinner);
    });
  }

  animateSkeletonLoaders() {
    const skeletons = document.querySelectorAll('.skeleton');
    
    skeletons.forEach(skeleton => {
      skeleton.style.background = `
        linear-gradient(90deg, 
          var(--gray-200) 25%, 
          var(--gray-100) 50%, 
          var(--gray-200) 75%
        )
      `;
      skeleton.style.backgroundSize = '200% 100%';
      skeleton.style.animation = 'skeleton-loading 1.5s infinite';
    });
  }
}

// Chart animations (placeholder for integration with charts.js)
class ChartAnimations {
  constructor() {
    this.init();
  }

  init() {
    this.animateChartElements();
  }

  animateChartElements() {
    const charts = document.querySelectorAll('canvas');
    
    charts.forEach(chart => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.triggerChartAnimation(chart);
          }
        });
      });
      
      observer.observe(chart);
    });
  }

  triggerChartAnimation(chart) {
    // This will be implemented when charts are added
    chart.style.opacity = '0';
    chart.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      chart.style.transition = 'all 0.8s ease-out';
      chart.style.opacity = '1';
      chart.style.transform = 'scale(1)';
    }, 100);
  }
}

// Add CSS animations dynamically
function addAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes flow {
      0% { left: -10px; opacity: 0; }
      10% { opacity: 0.7; }
      90% { opacity: 0.7; }
      100% { left: calc(100% + 10px); opacity: 0; }
    }

    .animate-on-scroll {
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.6s ease-out;
    }

    .animate-on-scroll.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .loading-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
    }

    .spinner-ring {
      width: 24px;
      height: 24px;
      border: 3px solid var(--gray-200);
      border-top: 3px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .sensor-card, .status-card, .info-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sensor-card:hover, .status-card:hover, .info-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .btn {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sensor-icon, .info-icon {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .progress-ring-fill {
      transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gauge-fill, .confidence-fill, .aqi-fill {
      transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .water-fill {
      transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .ph-indicator {
      transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .battery-level {
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .pump-animation.active {
      animation: pump-pulse 1.5s infinite ease-in-out;
    }

    @keyframes pump-pulse {
      0%, 100% { 
        transform: scale(1); 
        filter: drop-shadow(0 0 5px var(--primary-color));
      }
      50% { 
        transform: scale(1.1); 
        filter: drop-shadow(0 0 15px var(--primary-color));
      }
    }

    .thinking-dot {
      animation: thinking 1.4s infinite ease-in-out;
    }

    @keyframes thinking {
      0%, 80%, 100% { 
        transform: scale(0);
        opacity: 0.5;
      }
      40% { 
        transform: scale(1);
        opacity: 1;
      }
    }

    .alert-badge {
      animation: badge-pulse 2s infinite;
    }

    @keyframes badge-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .status-indicator.active::after {
      animation: status-pulse 2s infinite;
    }

    @keyframes status-pulse {
      0% { 
        transform: scale(1); 
        opacity: 0.3; 
      }
      50% { 
        transform: scale(1.3); 
        opacity: 0.1; 
      }
      100% { 
        transform: scale(1); 
        opacity: 0.3; 
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize all animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  addAnimationStyles();
  
  // Initialize animation systems
  new ParticleSystem();
  new ScrollAnimations();
  new HoverEffects();
  new ProgressAnimations();
  new WaterFlowAnimation();
  new NotificationAnimations();
  new LoadingAnimations();
  new ChartAnimations();
});

// Export for use in other modules
window.AnimationSystems = {
  ParticleSystem,
  ScrollAnimations,
  HoverEffects,
  ProgressAnimations,
  WaterFlowAnimation,
  NotificationAnimations,
  LoadingAnimations,
  ChartAnimations
};