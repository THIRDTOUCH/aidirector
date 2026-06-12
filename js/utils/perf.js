/**
 * AI 导演台 · 性能工具集
 * 源自 TVLIB core-lib - 已迁移到 aidirector
 * 功能：防抖 / 节流 / RAF节流 / LRU缓存 / 虚拟滚动 / 懒加载 / 图片压缩
 * 约定：所有接口挂在 window.DC.Perf
 */
(function () {
  'use strict';

  window.DC = window.DC || {};

  // ============ PerformanceUtils ============
  const PerformanceUtils = {
    debounce(fn, delay = 300) {
      let timer = null;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    throttle(fn, delay = 100) {
      let lastTime = 0;
      return function (...args) {
        const now = Date.now();
        if (now - lastTime >= delay) {
          lastTime = now;
          fn.apply(this, args);
        }
      };
    },
    rafThrottle(fn) {
      let rafId = null;
      return function (...args) {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          fn.apply(this, args);
          rafId = null;
        });
      };
    }
  };

  // ============ LRUCache ============
  class LRUCache {
    constructor(maxSize = 100) {
      this.maxSize = maxSize;
      this.cache = new Map();
    }
    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    set(key, value) {
      if (this.cache.has(key)) this.cache.delete(key);
      else if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
    has(key) { return this.cache.has(key); }
    delete(key) { return this.cache.delete(key); }
    clear() { this.cache.clear(); }
    get size() { return this.cache.size; }
  }

  // ============ VirtualScroll ============
  class VirtualScroll {
    constructor(container, options = {}) {
      this.container = (typeof container === 'string') ? document.getElementById(container) : container;
      this.options = Object.assign({ itemHeight: 60, bufferSize: 5, renderItem: (() => '') }, options);
      this.items = [];
      this.visibleCount = 0;
      this.scrollHandler = null;
      this._contentEl = null;
      this.init();
    }
    init() {
      if (!this.container) return;
      this.container.style.overflow = 'auto';
      this.container.style.position = 'relative';
      this.scrollHandler = PerformanceUtils.rafThrottle(() => this.render());
      this.container.addEventListener('scroll', this.scrollHandler);
      this._resizeObserver = new ResizeObserver(() => this.onResize());
      this._resizeObserver.observe(this.container);
    }
    onResize() {
      this.visibleCount = Math.ceil(this.container.clientHeight / this.options.itemHeight);
      this.render();
    }
    setItems(items) {
      this.items = items || [];
      this.onResize();
    }
    render() {
      if (!this.container) return;
      const { itemHeight, bufferSize, renderItem } = this.options;
      const scrollTop = this.container.scrollTop;
      const total = this.items.length;
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
      const endIndex = Math.min(total, Math.ceil((scrollTop + this.container.clientHeight) / itemHeight) + bufferSize);

      if (!this._contentEl) {
        this._contentEl = document.createElement('div');
        this.container.appendChild(this._contentEl);
      }
      this._contentEl.style.position = 'relative';
      this._contentEl.style.height = (total * itemHeight) + 'px';
      // 简化实现：直接innerHTML重渲染可见区域
      const visibleHtml = [];
      for (let i = startIndex; i < endIndex; i++) {
        visibleHtml.push(`<div style="position:absolute;top:${i * itemHeight}px;left:0;right:0;height:${itemHeight}px">${renderItem(this.items[i], i)}</div>`);
      }
      this._contentEl.innerHTML = visibleHtml.join('');
    }
    destroy() {
      if (this.scrollHandler) this.container.removeEventListener('scroll', this.scrollHandler);
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this._contentEl) this._contentEl.remove();
    }
  }

  // ============ LazyLoader ============
  const LazyLoader = {
    observe(el, callback, options = {}) {
      if (!el || !('IntersectionObserver' in window)) {
        if (callback) callback(el);
        return null;
      }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { root: options.root || null, rootMargin: options.rootMargin || '50px', threshold: options.threshold || 0 });
      observer.observe(el);
      return observer;
    }
  };

  // ============ ImageOptimizer ============
  const ImageOptimizer = {
    compress(file, options = {}) {
      const maxWidth = options.maxWidth || 1920;
      const quality = options.quality || 0.8;
      return new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let w = img.width;
              let h = img.height;
              if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } catch (err) { reject(err); }
      });
    },
    getPlaceholder(width, height, color = '#1e293b') {
      return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect fill="${color}" width="100%" height="100%"/></svg>`
      )}`;
    }
  };

  // ============ 导出 ============
  window.DC.Perf = {
    debounce: PerformanceUtils.debounce.bind(PerformanceUtils),
    throttle: PerformanceUtils.throttle.bind(PerformanceUtils),
    rafThrottle: PerformanceUtils.rafThrottle.bind(PerformanceUtils),
    LRUCache,
    VirtualScroll,
    LazyLoader,
    ImageOptimizer
  };

  console.log('[DC] 性能工具集已就绪 (debounce/throttle/LRUCache/VirtualScroll/LazyLoader/ImageOptimizer)');
})();
