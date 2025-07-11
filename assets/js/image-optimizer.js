/**
 * Nikagenyx Image Optimization Utilities
 * Provides lazy loading, progressive loading, and fallback support
 */

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      lazyLoadSelector: 'img[loading="lazy"]',
      rootMargin: '200px',
      threshold: 0.01,
      placeholderColor: '#1f2937',
      ...options
    };
    
    this.init();
  }
  
  init() {
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      this.loadAllImages();
    }
    
    this.setupProgressiveImages();
  }
  
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold
    });
    
    // Find and observe all lazy images
    document.querySelectorAll(this.options.lazyLoadSelector).forEach(img => {
      this.observer.observe(img);
    });
  }
  
  loadImage(img) {
    if (img.dataset.src) {
      const originalSrc = img.src;
      
      img.onload = () => {
        img.style.opacity = '1';
        if (img.parentElement && img.parentElement.classList.contains('image-placeholder')) {
          img.parentElement.classList.remove('image-placeholder');
        }
      };
      
      img.onerror = () => {
        console.warn('Failed to load image:', img.dataset.src);
        // Try original source if available
        if (originalSrc && originalSrc !== img.dataset.src) {
          img.src = originalSrc;
        }
      };
      
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  }
  
  loadAllImages() {
    document.querySelectorAll(this.options.lazyLoadSelector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  }
  
  setupProgressiveImages() {
    document.querySelectorAll('.progressive-image-container').forEach(container => {
      const placeholder = container.querySelector('.placeholder-image');
      const mainImage = container.querySelector('.main-image');
      
      if (placeholder && mainImage && mainImage.dataset.src) {
        // Load main image
        const img = new Image();
        img.onload = () => {
          mainImage.src = img.src;
          mainImage.classList.add('loaded');
          placeholder.style.opacity = 0;
        };
        img.src = mainImage.dataset.src;
      }
    });
  }
  
  // Create a progressive image container
  static createProgressiveContainer(lowQualitySrc, highQualitySrc, alt, className = '') {
    return `
      <div class="progressive-image-container relative ${className}">
        <img 
          src="${lowQualitySrc}" 
          class="placeholder-image absolute inset-0 w-full h-full object-cover transition-opacity duration-500" 
          alt=""
          aria-hidden="true"
        />
        <img 
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
          data-src="${highQualitySrc}" 
          alt="${alt}"
          class="main-image relative w-full h-full object-cover transition-opacity duration-500 opacity-0"
          loading="lazy"
        />
      </div>
    `;
  }
}

// Initialize globally
window.imageOptimizer = new ImageOptimizer();

// Setup on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  window.imageOptimizer = new ImageOptimizer();
});
